"""The check-in pipeline and final verifier (spec §5.2, §7.3). ONE code path runs
for a cron `cadence` tick and an on-demand `check now` (TR-16): fetch evidence →
status snapshot → LLM check-in line → persist → deliver down the ladder.

Evidence is fetched/judged only through the Lane-C ports (wiring.py); status only
moves through state.py. Delivery ladder: WS → Web Push → in-app timeline (TR-17)."""

from __future__ import annotations

import asyncio
from datetime import timedelta
import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import email, notify, push, scheduler, state
from app.chutes import ChutesError
from app.contracts import EvidenceBundle, Verdict
from app.lateness import checkin_grace, is_checkin_late
from app.models import Checkin, Commitment, Evidence
from app.util import as_utc, now_utc
from app.wiring import LLM, adapter_for
from app.ws import hub

logger = logging.getLogger("kawan.pipeline")


async def record_contact(db: AsyncSession, c: Commitment) -> None:
    """Any user-initiated action resets the Lapse silence clock (ADR-0002).
    A return from `lapsed` reactivates the commitment (spec §5.3)."""
    c.last_contact_at = now_utc()
    await db.commit()
    if c.status == "lapsed":
        await state.mark_returned(db, c)


async def deliver(db: AsyncSession, user_id: str, payload: dict) -> str:
    """WS if connected -> else Web Push -> else in-app timeline (the persisted row).
    payload may carry 'commitment_url' (a /workspace/:id deep-link) which is passed to
    push_to_user as the data.url in the push payload (plan §4.4, TR-17)."""
    if hub.is_connected(user_id) and await hub.send(user_id, payload):
        return "ws"
    headline = payload.get("say") or payload.get("headline", "Kawan")
    url = payload.get("commitment_url", "/home")
    if await push.push_to_user(db, user_id, headline, url=url):
        return "webpush"
    return "timeline"


def _hours_left(c: Commitment) -> int:
    return max(0, round((as_utc(c.deadline) - now_utc()).total_seconds() / 3600))


async def _last_tick_time(db: AsyncSession, c: Commitment):
    last = await db.scalar(
        select(Checkin).where(Checkin.commitment_id == c.id).order_by(Checkin.created_at.desc()).limit(1)
    )
    return as_utc(last.created_at) if last else as_utc(c.created_at)


# --- workspace-turn context (C6) ------------------------------------------------
# Two read-only channels the workspace LLM call carries beyond soft_context: the
# frontend-held recent transcript and a server-assembled progress snapshot (spec
# §4.5). Both are prompt inputs only — neither can write hard fields.

_MAX_TURNS = 8
_MAX_TURN_CHARS = 600


def clamp_turns(raw: list[dict] | None) -> list[dict]:
    """Normalize + bound the frontend transcript: last few turns, known roles, capped
    length. The client holds the full session; the prompt carries only a recent tail."""
    turns: list[dict] = []
    for t in (raw or [])[-_MAX_TURNS:]:
        if not isinstance(t, dict):
            continue
        role = "assistant" if t.get("role") == "assistant" else "user"
        content = str(t.get("content") or t.get("say") or "")[:_MAX_TURN_CHARS]
        if content:
            turns.append({"role": role, "content": content})
    return turns


async def assemble_progress(db: AsyncSession, c: Commitment) -> dict:
    """A compact, read-only snapshot of real progress for the workspace prompt (spec
    §4.5): status, time-to-deadline, escalation, skip-days, last few check-ins, latest
    verdict. Derived on demand -- never stored, never writable by the AI.

    Also includes due_at / is_late for the dynamic check-in lateness feature (plan §4.3)."""
    recent = (await db.scalars(
        select(Checkin).where(Checkin.commitment_id == c.id)
        .order_by(Checkin.created_at.desc()).limit(3)
    )).all()
    latest_ev = await db.scalar(
        select(Evidence).where(Evidence.commitment_id == c.id)
        .order_by(Evidence.created_at.desc()).limit(1)
    )
    # Derive check-in lateness from the window (plan §4.3). The last cadence tick is
    # the reference point; if no tick yet, use the commitment start time.
    last_tick = await _last_tick_time(db, c)
    deadline = as_utc(c.deadline)
    now = now_utc()
    remaining = max(deadline - now, timedelta(0))
    grace = checkin_grace(remaining)
    due_at = last_tick  # cadence tick IS the due time
    late = is_checkin_late(now, last_tick, remaining)
    return {
        "status": c.status,
        "hours_to_deadline": _hours_left(c),
        "escalation": c.escalation,
        "skip_days_left": c.skip_days_total - c.skip_days_used,
        "recent_checkins": [
            {"kind": ck.kind, "message": ck.message, "at": as_utc(ck.created_at).isoformat()}
            for ck in reversed(recent)
        ],
        "latest_verdict": (
            {"verdict": latest_ev.verdict, "reasoning": latest_ev.reasoning,
             "at": as_utc(latest_ev.created_at).isoformat()}
            if latest_ev else None
        ),
        "due_at": due_at.isoformat(),
        "is_late": late,
    }


async def _notify_witness_missed_retry(c: Commitment) -> None:
    """Email the stake witness when the cadence check-in grace window is also missed.

    Called only when kind='cadence' AND is_late=True at the moment the tick runs.
    Guards: stake must be enabled with a valid contact email. Best-effort; never raises.
    Does NOT fire _on_missed — that is reserved for the final-deadline miss path."""
    if not (c.stake_enabled and c.stake_contact_email):
        return
    name = c.stake_contact_name or "Friend"
    body = (
        f"{name}, this is Kawan.\n\n"
        f'"{c.action} {c.deliverable}" — {c.user_id} missed the check-in window today '
        f"and hasn't submitted evidence. Just letting you know.\n\n-- Kawan"
    )
    sent = await email.send_email(c.stake_contact_email, f'Kawan — missed check-in on "{c.deliverable}"', body)
    if not sent:
        logger.warning("witness missed-retry email bounced for commitment %s", c.id)


async def run_checkin(db: AsyncSession, c: Commitment, kind: str) -> Checkin:
    last_tick = await _last_tick_time(db, c)
    adapter = adapter_for(c.evidence_type)
    bundle = await adapter.fetch(c, last_tick)
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
        "user_id": c.user_id,  # billing user + persona for the real checkin_line (Lane C)
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
               "emotion": line.get("emotion"), "escalation": c.escalation, "evidence_id": evidence_id,
               "commitment_url": notify._deep_link(c)}
    ck.delivered_via = await deliver(db, c.user_id, payload)
    await db.commit()
    if kind == "cadence":  # off-device reminder fan-out (ADR-0006); on_demand stays device-only
        await notify.send_reminder(db, c, line["say"])
        # Missed-retry witness email: if the cadence tick fires after the grace window has
        # already passed, the user missed the check-in retry window — notify the witness.
        deadline = as_utc(c.deadline)
        remaining = max(deadline - now_utc(), timedelta(0))
        if not had_new and is_checkin_late(now_utc(), last_tick, remaining):
            await _notify_witness_missed_retry(c)
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
        scheduler.arm_winback(c)  # exactly one win-back per lapse (TR-23)


async def send_winback(db: AsyncSession, c: Commitment) -> Checkin:
    """The single relational nudge after a lapse (spec §5.4)."""
    say = "You went quiet on me. Not mad — bummed. One 20-minute thing tonight and we're square."
    ck = Checkin(commitment_id=c.id, kind="winback", message=say, escalation=c.escalation)
    db.add(ck)
    await db.commit()
    ck.delivered_via = await deliver(db, c.user_id, {"type": "winback", "say": say,
                                                      "commitment_url": notify._deep_link(c)})
    await db.commit()
    await notify.send_reminder(db, c, say)  # winback is a reminder → off-device fan-out (ADR-0006)
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


# Ceiling for a TEE vision/judge call (spec §9.3). Matches the Chutes client's own per-request
# timeout so a slow-but-valid vision call isn't cut short here; it still bounds a 5xx retry storm.
EVIDENCE_JUDGE_TIMEOUT = 90.0


async def safe_judge(adapter, c: Commitment, bundle: EvidenceBundle) -> Verdict:
    """Judge evidence, degrading a flaky/slow inference call to a neutral 'unclear'
    verdict instead of a 500 (spec §9.3 — unclear never punishes, and the whole state
    machine/UI already handle it). Bounds the wait so the demo fails fast rather than
    hanging on a stalled vision model: the live `/evidence` 500 hung >2 min first."""
    try:
        return await asyncio.wait_for(adapter.judge(c, bundle, LLM), EVIDENCE_JUDGE_TIMEOUT)
    except (ChutesError, httpx.HTTPError, asyncio.TimeoutError) as exc:
        logger.warning("evidence judge failed for commitment %s: %r", c.id, exc)
        # Secondary judge for image evidence when the primary vision call fails (kept implicit).
        b64 = bundle.items[0].get("b64") if bundle.items and isinstance(bundle.items[0], dict) else None
        if b64:
            from app import fallback_judge
            fallback = await fallback_judge.judge_screenshot(c, b64)
            if fallback is not None:
                return fallback
        return Verdict("unclear", 0.0, ["evidence could not be judged right now"],
                       "I couldn't get a clear read on that just now. Give it another try in a moment.", None)


async def judge_upload(db: AsyncSession, c: Commitment, raw_ref: dict, *, image_b64: str | None = None) -> Evidence:
    """Screenshot upload (spec §10.3). At/after the deadline it's a final verify; before,
    it's progress evidence that can reset escalation. The image rides in the bundle's
    items (never persisted); raw_ref keeps only the filename. File deleted post-verdict."""
    adapter = adapter_for("screenshot")
    bundle = EvidenceBundle(adapter="screenshot", raw_ref=raw_ref,
                            items=([{"b64": image_b64}] if image_b64 else []),
                            summary="one uploaded screenshot")
    verdict = await safe_judge(adapter, c, bundle)
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
    deep_link = notify._deep_link(c)
    await deliver(db, c.user_id, {**_verdict_payload(ev, verdict), "commitment_url": deep_link})
    if outcome == "grace":
        scheduler.arm_grace_expire(c.id, now_utc() + timedelta(hours=state.GRACE_HOURS))
        await deliver(db, c.user_id, {"type": "checkin", "kind": "deadline",
                                      "say": "Not quite — you've got a 6-hour grace window. Use it.",
                                      "commitment_url": deep_link})
    elif outcome == "completed":
        await _on_completed(db, c, ev)
    elif outcome == "missed":
        await _on_missed(db, c, ev)


async def _on_completed(db: AsyncSession, c: Commitment, ev: Evidence) -> None:
    scheduler.remove_commitment_jobs(c.id)
    await deliver(db, c.user_id, {"type": "celebration",
                                  "say": "Verified. First ship — noted. That counts.",
                                  "commitment_url": notify._deep_link(c)})


async def _on_missed(db: AsyncSession, c: Commitment, evidence: Evidence | None) -> None:
    scheduler.remove_commitment_jobs(c.id)
    stake_note = None
    if c.stake_enabled and c.stake_contact_email:
        body = (f"{c.stake_contact_name or 'Friend'}, this is Kawan.\n\n"
                f'"{c.action} {c.deliverable}" didn\'t happen by the deadline. '
                f"You were named as the person who'd be told. That's the whole mechanism.\n\n-- Kawan")
        sent = await email.send_email(c.stake_contact_email, "A Kawan commitment was missed", body)
        stake_note = "stake_sent" if sent else "stake_bounced"  # TR-65: told to the user either way
    say = "It didn't happen. I won't pretend it did -- that's the deal."
    if stake_note == "stake_bounced":
        say += " (Couldn't reach your contact -- that one's on the house.)"
    await deliver(db, c.user_id, {"type": "reckoning", "say": say, "stake": stake_note,
                                   "commitment_url": notify._deep_link(c)})


async def abandon(db: AsyncSession, c: Commitment) -> str:
    """Abandon → missed path (TR-21): user-audited status change, then the same stake
    email + reckoning the deadline-driven miss fires. Stake fires only if enabled."""
    outcome = await state.abandon(db, c)
    await _on_missed(db, c, evidence=None)
    return outcome
