"""Commitment lifecycle endpoints (spec §7.5). Hard fields are written only here
(user session) and by the scheduler/verifier; the AI path writes soft_context only."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import pipeline, scheduler, state
from app.db import get_session
from app.deps import current_user
from app.models import Checkin, Commitment, Evidence, Plan, Proposal, SoftContext, SuccessPattern, User
from app.pipeline import record_contact
from app.schemas import CommitmentCreate, CommitmentListOut, CommitmentOut, CommitmentPatch, ContextTurnIn, DebriefIn, WorkspaceTurnIn
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


@router.get("", response_model=CommitmentListOut)
async def list_commitments(
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session),
) -> CommitmentListOut:
    """List all the caller's commitments, newest first, paginated.
    POST /commitments remains unguarded (PO override, Gate 1)."""
    total = await db.scalar(
        select(func.count()).select_from(Commitment).where(Commitment.user_id == user.id)
    )
    rows = (
        await db.scalars(
            select(Commitment)
            .where(Commitment.user_id == user.id)
            .order_by(Commitment.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    items = [CommitmentOut.model_validate(r) for r in rows]
    return CommitmentListOut(items=items, total=total or 0, limit=limit, offset=offset)


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


@router.post("/{commitment_id}/workspace/turn")
async def workspace_turn(body: WorkspaceTurnIn, c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    await record_contact(db, c)
    sc = await db.get(SoftContext, c.id)
    soft = {k: getattr(sc, k) for k in _SOFT_SLOTS} if sc else {}
    progress = await pipeline.assemble_progress(db, c)
    result = await LLM.workspace_turn(c, soft, body.say,
                                      recent_turns=pipeline.clamp_turns(body.recent_turns), progress=progress)
    if result.get("response_type") == "proposal" and result.get("proposal"):
        pr = result["proposal"]
        prop = Proposal(commitment_id=c.id, field=pr["field"],
                        proposed_value=pr.get("proposed_value"), reason=pr.get("reason", ""))
        db.add(prop)
        await db.commit()
        result["proposal_id"] = prop.id
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
    import base64
    raw = await file.read()  # consumed then discarded — file deleted post-verdict (TR-46)
    image_b64 = base64.b64encode(raw).decode()
    await record_contact(db, c)
    ev = await pipeline.judge_upload(db, c, {"filename": file.filename}, image_b64=image_b64)
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


@router.delete("/{commitment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_commitment(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    """Permanently delete a commitment and all its related rows (cascade order:
    evidence -> checkins -> proposals -> soft_context -> plan -> success_patterns -> audit_log -> commitment).
    Current-user scoped via _owned. No undo."""
    from sqlalchemy import delete as sql_delete, update as sql_update
    from app.models import Achievement, AuditLog, Checkin, Evidence, Plan, Proposal, SoftContext, SuccessPattern
    cid = c.id
    await db.execute(sql_delete(Evidence).where(Evidence.commitment_id == cid))
    await db.execute(sql_delete(Checkin).where(Checkin.commitment_id == cid))
    await db.execute(sql_delete(Proposal).where(Proposal.commitment_id == cid))
    await db.execute(sql_delete(SoftContext).where(SoftContext.commitment_id == cid))
    await db.execute(sql_delete(Plan).where(Plan.commitment_id == cid))
    await db.execute(sql_delete(SuccessPattern).where(SuccessPattern.commitment_id == cid))
    await db.execute(sql_delete(AuditLog).where(AuditLog.commitment_id == cid))
    # Achievements are user-level trophies — keep the badge, clear the now-dangling provenance link.
    await db.execute(sql_update(Achievement).where(Achievement.commitment_id == cid).values(commitment_id=None))
    await db.delete(c)
    await db.commit()


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
