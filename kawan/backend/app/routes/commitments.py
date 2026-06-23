"""Commitment lifecycle endpoints (spec §7.5). Hard fields are written only here
(user session) and by the scheduler/verifier; the AI path writes soft_context only."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import pipeline, scheduler, state
from app.db import get_session
from app.deps import current_user
from app.models import Checkin, Commitment, Evidence, Plan, Proposal, SoftContext, SuccessPattern, User
from app.pipeline import record_contact
from app.schemas import CommitmentCreate, CommitmentOut, CommitmentPatch, ContextTurnIn, DebriefIn
from app.util import as_utc, now_utc, to_jsonable
from app.wiring import LLM

router = APIRouter(prefix="/commitments")

_SOFT_SLOTS = ("why", "obstacles", "time_constraints", "skill")
_OPEN_STATUSES = ("draft", "active", "lapsed", "verifying", "grace")
_PROPOSAL_FIELDS = ("deadline", "deliverable", "cadence", "evidence_type", "stake")  # TR-37 enum


async def _owned(commitment_id: str, user: User = Depends(current_user),
                 db: AsyncSession = Depends(get_session)) -> Commitment:
    c = await db.get(Commitment, commitment_id)
    if c is None or c.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "commitment not found")
    return c


@router.post("", response_model=CommitmentOut, status_code=status.HTTP_201_CREATED)
async def create(body: CommitmentCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    c = Commitment(user_id=user.id, action=body.action, deliverable=body.deliverable, deadline=body.deadline)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


@router.get("/active", response_model=CommitmentOut)
async def active(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    c = await db.scalar(
        select(Commitment).where(Commitment.user_id == user.id, Commitment.status.in_(_OPEN_STATUSES))
        .order_by(Commitment.created_at.desc()).limit(1)
    )
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no active commitment")
    return c


@router.patch("/{commitment_id}", response_model=CommitmentOut)
async def patch(body: CommitmentPatch, c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    changes = body.model_dump(exclude_unset=True)
    for field, new in changes.items():
        old = getattr(c, field)
        if old == new:
            continue
        setattr(c, field, new)
        await state.audit(db, commitment_id=c.id, field=field, old=to_jsonable(old), new=to_jsonable(new), actor="user")
    await db.commit()
    await record_contact(db, c)
    if "deadline" in changes and c.status in ("active", "lapsed"):
        scheduler.register_commitment_jobs(c)  # replace_existing reschedules
    return c


@router.post("/{commitment_id}/context/turn")
async def context_turn(body: ContextTurnIn, c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    sc = await db.get(SoftContext, c.id)
    if sc is None:
        sc = SoftContext(commitment_id=c.id)
        db.add(sc)
    current = {k: getattr(sc, k) for k in _SOFT_SLOTS}
    result = await LLM.intake_turn(c, current, body.say)
    # The ONLY DB write reachable from any LLM output (spec §8.2): the soft_context UPSERT.
    for k, v in (result.get("slots") or {}).items():
        if k in _SOFT_SLOTS and v is not None:
            setattr(sc, k, v)
    sc.updated_at = now_utc()
    await db.commit()
    await record_contact(db, c)
    return result


@router.post("/{commitment_id}/plan")
async def plan(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    sc = await db.get(SoftContext, c.id)
    soft = {k: getattr(sc, k) for k in _SOFT_SLOTS} if sc else {}
    result = await LLM.plan(c, soft)  # pre-fills GUI only — never writes hard fields (TR-11)
    p = await db.get(Plan, c.id)
    if p is None:
        p = Plan(commitment_id=c.id, roadmap_json=result["roadmap"], rationale=result.get("front_load_reason"))
        db.add(p)
    else:
        p.roadmap_json = result["roadmap"]
        p.rationale = result.get("front_load_reason")
    await db.commit()
    return result


@router.post("/{commitment_id}/start", response_model=CommitmentOut)
async def start(request: Request, c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    demo = request.query_params.get("demo_deadline")  # e.g. +5m — sets the REAL deadline (TR-67)
    if demo and demo.startswith("+") and demo.endswith("m"):
        try:
            c.deadline = now_utc() + timedelta(minutes=int(demo[1:-1]))
            await state.audit(db, commitment_id=c.id, field="deadline", old=None,
                              new=to_jsonable(c.deadline), actor="user")
            await db.commit()
        except ValueError:
            pass
    await state.start(db, c)  # draft → active
    scheduler.register_commitment_jobs(c)
    await record_contact(db, c)
    return c


@router.post("/{commitment_id}/check")
async def check(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    """On-demand check-in — the demo determinism lever; identical pipeline to cron (TR-16)."""
    await record_contact(db, c)
    ck = await pipeline.run_checkin(db, c, "on_demand")
    return {"message": ck.message, "escalation": ck.escalation,
            "delivered_via": ck.delivered_via, "evidence_id": ck.evidence_id}


@router.post("/{commitment_id}/evidence")
async def evidence(file: UploadFile = File(...), c: Commitment = Depends(_owned),
                   db: AsyncSession = Depends(get_session)):
    await file.read()  # consumed then discarded — file deleted post-verdict (TR-46)
    await record_contact(db, c)
    ev = await pipeline.judge_upload(db, c, {"filename": file.filename})
    return {"verdict": ev.verdict, "confidence": ev.confidence, "reasoning": ev.reasoning, "evidence_id": ev.id}


@router.post("/{commitment_id}/abandon", response_model=CommitmentOut)
async def abandon(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    """Abandon the commitment (TR-21, §6.3). The frontend gates this behind a confirm
    dialog; on confirm we follow the missed path — the stake fires if one is set."""
    if c.status in ("completed", "missed"):
        raise HTTPException(status.HTTP_409_CONFLICT, "commitment already closed")
    await pipeline.abandon(db, c)
    return c


@router.post("/{commitment_id}/proposals/{pid}/apply", response_model=CommitmentOut)
async def apply_proposal(pid: str, c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    p = await db.get(Proposal, pid)
    if p is None or p.commitment_id != c.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "proposal not found")
    if p.status != "open":
        raise HTTPException(status.HTTP_409_CONFLICT, "proposal already resolved")
    if p.field not in _PROPOSAL_FIELDS:
        # Whitelist the mutable hard fields (TR-37) — a stray field must never reach setattr,
        # or the apply becomes a state-machine bypass.
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "proposal field not allowed")

    field = p.field
    if field == "deadline":
        old = c.deadline
        try:
            c.deadline = datetime.fromisoformat(p.proposed_value) if isinstance(p.proposed_value, str) else p.proposed_value
        except (TypeError, ValueError):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "invalid proposed deadline") from None
    elif field == "stake":
        val = p.proposed_value or {}
        old = c.stake_enabled
        c.stake_enabled = bool(val.get("enabled", True))
        if val.get("contact_name"):
            c.stake_contact_name = val["contact_name"]
        if val.get("contact_email"):
            c.stake_contact_email = val["contact_email"]
    else:  # deliverable | cadence | evidence_type
        old = getattr(c, field)
        setattr(c, field, p.proposed_value)

    # The apply is the user's action: audit actor='user', AI is unrepresentable (TR-25).
    await state.audit(db, commitment_id=c.id, field=field, old=to_jsonable(old),
                      new=to_jsonable(getattr(c, field)), actor="user", via_proposal_id=p.id)
    p.status = "applied"
    p.applied_at = now_utc()
    await db.commit()
    await record_contact(db, c)
    if field == "deadline" and c.status in ("active", "lapsed"):
        scheduler.register_commitment_jobs(c)
    return c


@router.get("/{commitment_id}/timeline")
async def timeline(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    checkins = (await db.scalars(select(Checkin).where(Checkin.commitment_id == c.id))).all()
    evidence_rows = (await db.scalars(select(Evidence).where(Evidence.commitment_id == c.id))).all()
    proposals = (await db.scalars(select(Proposal).where(Proposal.commitment_id == c.id))).all()
    events: list[dict] = []
    for ck in checkins:
        events.append({"type": "checkin", "kind": ck.kind, "message": ck.message, "escalation": ck.escalation,
                       "delivered_via": ck.delivered_via, "evidence_id": ck.evidence_id,
                       "at": as_utc(ck.created_at).isoformat()})
    for ev in evidence_rows:
        events.append({"type": "evidence", "adapter": ev.adapter, "verdict": ev.verdict,
                       "reasoning": ev.reasoning, "at": as_utc(ev.created_at).isoformat()})
    for p in proposals:
        events.append({"type": "proposal", "field": p.field, "status": p.status,
                       "reason": p.reason, "at": as_utc(p.created_at).isoformat()})
    events.sort(key=lambda e: e["at"])
    return {"status": c.status, "escalation": c.escalation, "events": events}


@router.post("/{commitment_id}/debrief")
async def debrief(body: DebriefIn, c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    """Merge the user's post-outcome reflection into the terminal success_patterns row.
    No audit_log row — this is the user's own reflection, not a hard-field mutation (spec §5.6)."""
    sp = await db.scalar(
        select(SuccessPattern).where(
            SuccessPattern.commitment_id == c.id,
            SuccessPattern.outcome.in_(("completed", "missed"))
        ).order_by(SuccessPattern.created_at.desc()).limit(1)
    )
    if sp is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "commitment not yet completed")
    # Reassign the dict so SQLAlchemy tracks the JSON mutation (not an in-place mutation).
    sp.features = {**(sp.features or {}), "debrief": body.note}
    await db.commit()
    return {"ok": True}
