"""The check-in pipeline and final verifier (spec §5.2, §7.3). ONE code path runs
for a cron `cadence` tick and an on-demand `check now` (TR-16): fetch evidence →
status snapshot → LLM check-in line → persist → deliver down the ladder.

Evidence is fetched/judged only through the Lane-C ports (wiring.py); status only
moves through state.py. Delivery ladder: WS → Web Push → in-app timeline (TR-17)."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import email, push, scheduler, state
from app.models import Checkin, Commitment, Evidence
from app.util import as_utc, now_utc
from app.wiring import LLM, adapter_for
from app.ws import hub


async def record_contact(db: AsyncSession, c: Commitment) -> None:
    """Any user-initiated action resets the Lapse silence clock (ADR-0002).
    A return from `lapsed` reactivates the commitment (spec §5.3)."""
    c.last_contact_at = now_utc()
    await db.commit()
    if c.status == "lapsed":
        await state.mark_returned(db, c)


async def deliver(db: AsyncSession, user_id: str, payload: dict) -> str:
    """WS if connected → else Web Push → else in-app timeline (the persisted row)."""
    if hub.is_connected(user_id) and await hub.send(user_id, payload):
        return "ws"
    if await push.push_to_user(db, user_id, payload.get("say") or payload.get("headline", "Kawan")):
        return "webpush"
    return "timeline"


def _hours_left(c: Commitment) -> int:
    return max(0, round((as_utc(c.deadline) - now_utc()).total_seconds() / 3600))


async def _last_tick_time(db: AsyncSession, c: Commitment):
    last = await db.scalar(
        select(Checkin).where(Checkin.commitment_id == c.id).order_by(Checkin.created_at.desc()).limit(1)
    )
    return as_utc(last.created_at) if last else as_utc(c.created_at)


async def run_checkin(db: AsyncSession, c: Commitment, kind: str) -> Checkin:
    adapter = adapter_for(c.evidence_type)
    bundle = await adapter.fetch(c, await _last_tick_time(db, c))
    had_new = bool(bundle.items)

    evidence_id = None
    if had_new:
        verdict = await adapter.judge(c, bundle, LLM)
        ev = Evidence(commitment_id=c.id, adapter=adapter.type, raw_ref=bundle.raw_ref,
                      verdict=verdict.verdict, confidence=verdict.confidence, reasoning=verdict.reasoning)
        db.add(ev)
        await db.flush()
        evidence_id = ev.id
        c.escalation = 0  # any evidence resets escalation (TR-18)
    else:
        c.escalation = min(2, c.escalation + 1)  # rises on consecutive no-new-evidence ticks

    snapshot = {
        "had_new_evidence": had_new,
        "evidence_summary": bundle.summary,
        "hours_left": _hours_left(c),
        "escalation": c.escalation,
        "skip_days_left": c.skip_days_total - c.skip_days_used,
    }
    line = await LLM.checkin_line(snapshot)

    # capture the prior tick BEFORE inserting this one, for lapse detection
    prior = await db.scalar(
        select(Checkin).where(Checkin.commitment_id == c.id, Checkin.kind.in_(("cadence", "winback")))
        .order_by(Checkin.created_at.desc()).limit(1)
    )
    ck = Checkin(commitment_id=c.id, kind=kind, evidence_id=evidence_id,
                 message=line["say"], escalation=c.escalation)
    db.add(ck)
    await db.commit()

    if kind in ("cadence", "winback"):
        await _maybe_lapse(db, c, prior, had_new)

    payload = {"type": "checkin", "kind": kind, "say": line["say"],
               "emotion": line.get("emotion"), "escalation": c.escalation, "evidence_id": evidence_id}
    ck.delivered_via = await deliver(db, c.user_id, payload)
    await db.commit()
    return ck


async def _maybe_lapse(db: AsyncSession, c: Commitment, prior: Checkin | None, had_new: bool) -> None:
    """Lapse = 2 consecutive silent ticks (no evidence AND no contact), spec §5.3.
    MVP approximation: a tick is silent if it found no evidence and no Contact has
    happened since the previous tick; consecutiveness uses the prior tick's
    evidence_id. Sufficient for the deterministic demo (a quiet 2nd account)."""
    if c.status != "active":
        return
    contact = as_utc(c.last_contact_at)
    prior_time = as_utc(prior.created_at) if prior else as_utc(c.created_at)
    this_silent = (not had_new) and not (contact and contact > prior_time)
    prior_silent = prior is not None and prior.evidence_id is None and not (contact and contact > as_utc(prior.created_at))
    if this_silent and prior_silent and await state.mark_lapsed(db, c):
        scheduler.arm_winback(c.id)  # exactly one win-back per lapse (TR-23)


async def send_winback(db: AsyncSession, c: Commitment) -> Checkin:
    """The single relational nudge after a lapse (spec §5.4)."""
    say = "You went quiet on me. Not mad — bummed. One 20-minute thing tonight and we're square."
    ck = Checkin(commitment_id=c.id, kind="winback", message=say, escalation=c.escalation)
    db.add(ck)
    await db.commit()
    ck.delivered_via = await deliver(db, c.user_id, {"type": "winback", "say": say})
    await db.commit()
    return ck


# --- final verify + outcomes ---------------------------------------------------

async def run_final_verify(db: AsyncSession, c: Commitment) -> Evidence:
    await state.begin_verifying(db, c)
    adapter = adapter_for(c.evidence_type)
    bundle = await adapter.fetch(c, None)
    verdict = await adapter.judge(c, bundle, LLM)
    ev = Evidence(commitment_id=c.id, adapter=adapter.type, raw_ref=bundle.raw_ref,
                  verdict=verdict.verdict, confidence=verdict.confidence, reasoning=verdict.reasoning)
    db.add(ev)
    await db.flush()
    outcome = await state.apply_final_verdict(db, c, verdict.verdict)
    await _after_outcome(db, c, ev, verdict, outcome)
    return ev


async def judge_upload(db: AsyncSession, c: Commitment, raw_ref: dict) -> Evidence:
    """Screenshot upload (spec §10.3). At/after the deadline it's a final verify; before,
    it's progress evidence that can reset escalation. File is deleted post-verdict by caller."""
    adapter = adapter_for("screenshot")
    bundle = await adapter.fetch(c, None)
    verdict = await adapter.judge(c, bundle, LLM)
    ev = Evidence(commitment_id=c.id, adapter="screenshot", raw_ref=raw_ref,
                  verdict=verdict.verdict, confidence=verdict.confidence, reasoning=verdict.reasoning)
    db.add(ev)
    await db.flush()
    if c.status in ("verifying", "grace"):
        outcome = await state.apply_final_verdict(db, c, verdict.verdict)
        await _after_outcome(db, c, ev, verdict, outcome)
    else:
        if verdict.verdict == "pass":
            c.escalation = 0
        await db.commit()
        await deliver(db, c.user_id, _verdict_payload(ev, verdict))
    return ev


async def expire_grace(db: AsyncSession, c: Commitment) -> None:
    outcome = await state.grace_expire(db, c)
    if outcome == "missed":
        await _on_missed(db, c, evidence=None)


def _verdict_payload(ev: Evidence, verdict) -> dict:
    return {"type": "verdict", "verdict": verdict.verdict, "observations": verdict.observations,
            "reasoning": verdict.reasoning, "follow_up_request": verdict.follow_up_request, "evidence_id": ev.id}


async def _after_outcome(db: AsyncSession, c: Commitment, ev: Evidence, verdict, outcome: str) -> None:
    await deliver(db, c.user_id, _verdict_payload(ev, verdict))
    if outcome == "grace":
        scheduler.arm_grace_expire(c.id, now_utc() + timedelta(hours=state.GRACE_HOURS))
        await deliver(db, c.user_id, {"type": "checkin", "kind": "deadline",
                                      "say": "Not quite — you've got a 6-hour grace window. Use it."})
    elif outcome == "completed":
        await _on_completed(db, c, ev)
    elif outcome == "missed":
        await _on_missed(db, c, ev)


async def _on_completed(db: AsyncSession, c: Commitment, ev: Evidence) -> None:
    scheduler.remove_commitment_jobs(c.id)
    await deliver(db, c.user_id, {"type": "celebration",
                                  "say": "Verified. First ship — noted. That counts."})


async def _on_missed(db: AsyncSession, c: Commitment, evidence: Evidence | None) -> None:
    scheduler.remove_commitment_jobs(c.id)
    stake_note = None
    if c.stake_enabled and c.stake_contact_email:
        body = (f"{c.stake_contact_name or 'Friend'}, this is Kawan.\n\n"
                f'"{c.action} {c.deliverable}" didn\'t happen by the deadline. '
                f"You were named as the person who'd be told. That's the whole mechanism.\n\n— Kawan")
        sent = await email.send_email(c.stake_contact_email, "A Kawan commitment was missed", body)
        stake_note = "stake_sent" if sent else "stake_bounced"  # TR-65: told to the user either way
    say = "It didn't happen. I won't pretend it did — that's the deal."
    if stake_note == "stake_bounced":
        say += " (Couldn't reach your contact — that one's on the house.)"
    await deliver(db, c.user_id, {"type": "reckoning", "say": say, "stake": stake_note})


async def abandon(db: AsyncSession, c: Commitment) -> str:
    """Abandon → missed path (TR-21): user-audited status change, then the same stake
    email + reckoning the deadline-driven miss fires. Stake fires only if enabled."""
    outcome = await state.abandon(db, c)
    await _on_missed(db, c, evidence=None)
    return outcome
