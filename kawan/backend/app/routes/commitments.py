"""Commitment lifecycle endpoints (spec §7.5). Hard fields are written only here
(user session) and by the scheduler/verifier; the AI path writes soft_context only."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import pipeline, scheduler, state
from app.chutes import ChutesError
from app.db import get_session
from app.deps import current_user
from app.models import Checkin, Commitment, Evidence, Message, Plan, Proposal, SoftContext, SuccessPattern, User
from app.pipeline import record_contact
from app.schemas import CheckinStatusOut, CommitmentCreate, CommitmentListOut, CommitmentOut, CommitmentPatch, ContextTurnIn, DebriefIn, GitHubLinkIn, MessageOut, SoftContextOut, WorkspaceTurnIn
from app.util import as_utc, now_utc, to_jsonable
from app.wiring import LLM

# Graceful error shape the frontend renders as a retry bubble (Layout fix 4).
_INFERENCE_ERROR_BODY = {"say": "Kawan couldn't reply just now — try again.", "response_type": "error"}

router = APIRouter(prefix="/commitments")

_SOFT_SLOTS = ("why", "obstacles", "time_constraints", "skill")
_OPEN_STATUSES = ("draft", "active", "lapsed", "verifying", "grace")
# In-flight statuses count against the 3-active cap (PO override; excludes draft and terminal).
_IN_FLIGHT_STATUSES = ("active", "lapsed", "verifying", "grace")
_MAX_ACTIVE = 3
_PROPOSAL_FIELDS = ("deadline", "deliverable", "cadence", "evidence_type", "stake")  # TR-37 enum


async def _owned(commitment_id: str, user: User = Depends(current_user),
                 db: AsyncSession = Depends(get_session)) -> Commitment:
    c = await db.get(Commitment, commitment_id)
    if c is None or c.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "commitment not found")
    return c


async def _count_in_flight(db: AsyncSession, user_id: str) -> int:
    """Count commitments in in-flight statuses (active/lapsed/verifying/grace) for a user."""
    return await db.scalar(
        select(func.count())
        .select_from(Commitment)
        .where(Commitment.user_id == user_id, Commitment.status.in_(_IN_FLIGHT_STATUSES))
    ) or 0


@router.post("", response_model=CommitmentOut, status_code=status.HTTP_201_CREATED)
async def create(body: CommitmentCreate, user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    if await _count_in_flight(db, user.id) >= _MAX_ACTIVE:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "You can have at most 3 active commitments at once. Complete or end one first.",
        )
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
    """Return the single most-recently-active open commitment for backward compatibility.
    Ordered by last_contact_at desc (nulls last) then created_at desc.
    When multiple are active, callers should switch to GET /commitments for the full list."""
    c = await db.scalar(
        select(Commitment)
        .where(Commitment.user_id == user.id, Commitment.status.in_(_OPEN_STATUSES))
        .order_by(Commitment.last_contact_at.desc().nulls_last(), Commitment.created_at.desc())
        .limit(1)
    )
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "no active commitment")
    return c


@router.get("/{commitment_id}", response_model=CommitmentOut)
async def get_commitment(c: Commitment = Depends(_owned)) -> Commitment:
    """Return the single owned commitment by id."""
    return c


@router.get("/{commitment_id}/soft-context", response_model=SoftContextOut)
async def get_soft_context(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)) -> SoftContextOut:
    """Return the four soft-context slots for the commitment; all null when no row exists."""
    sc = await db.get(SoftContext, c.id)
    if sc is None:
        return SoftContextOut(why=None, obstacles=None, time_constraints=None, skill=None)
    return SoftContextOut(why=sc.why, obstacles=sc.obstacles, time_constraints=sc.time_constraints, skill=sc.skill)


@router.get("/{commitment_id}/checkin-status", response_model=CheckinStatusOut)
async def get_checkin_status(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)) -> CheckinStatusOut:
    """Return due_at, is_late, and escalation sourced from assemble_progress so this
    endpoint and the workspace digest always agree (no independent lateness computation)."""
    progress = await pipeline.assemble_progress(db, c)
    return CheckinStatusOut(due_at=progress["due_at"], is_late=progress["is_late"], escalation=c.escalation)


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
    try:
        result = await LLM.intake_turn(c, current, body.say)
    except ChutesError:
        return JSONResponse(status_code=503, content={**_INFERENCE_ERROR_BODY, "intake_complete": False,
                                                      "slots": {k: None for k in _SOFT_SLOTS}, "emotion": "neutral"})
    # The ONLY DB write reachable from any LLM output (spec §8.2): the soft_context UPSERT.
    for k, v in (result.get("slots") or {}).items():
        if k in _SOFT_SLOTS and v is not None:
            setattr(sc, k, v)
    sc.updated_at = now_utc()
    await db.commit()
    # Persist transcript: skip the empty opener user turn so history starts with the AI message.
    if body.say:
        db.add(Message(commitment_id=c.id, role="user", content=body.say))
    db.add(Message(commitment_id=c.id, role="assistant", content=result["say"],
                   emotion=result.get("emotion"), response_type="coaching"))
    await db.commit()
    await record_contact(db, c)
    return result


@router.post("/{commitment_id}/workspace/turn")
async def workspace_turn(body: WorkspaceTurnIn, c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    await record_contact(db, c)
    sc = await db.get(SoftContext, c.id)
    soft = {k: getattr(sc, k) for k in _SOFT_SLOTS} if sc else {}
    progress = await pipeline.assemble_progress(db, c)
    plan_row = await db.get(Plan, c.id)
    if plan_row and plan_row.roadmap_json:
        # Fold the advice-only roadmap into the progress digest so the LLM call signature
        # stays unchanged (spec §8.1: plan is advice only, never written by AI).
        progress = {**progress, "plan_roadmap": plan_row.roadmap_json}
    try:
        result = await LLM.workspace_turn(c, soft, body.say,
                                          recent_turns=pipeline.clamp_turns(body.recent_turns),
                                          progress=progress)
    except ChutesError:
        return {**_INFERENCE_ERROR_BODY, "proposal": None, "emotion": "neutral"}
    if result.get("response_type") == "proposal" and result.get("proposal"):
        pr = result["proposal"]
        prop = Proposal(commitment_id=c.id, field=pr["field"],
                        proposed_value=pr.get("proposed_value"), reason=pr.get("reason", ""))
        db.add(prop)
        await db.commit()
        result["proposal_id"] = prop.id
    # Persist transcript rows after any proposal write (ordering guarantee).
    db.add(Message(commitment_id=c.id, role="user", content=body.say))
    db.add(Message(commitment_id=c.id, role="assistant", content=result["say"],
                   emotion=result.get("emotion"), response_type=result.get("response_type")))
    await db.commit()
    return result


@router.post("/{commitment_id}/plan")
async def plan(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    sc = await db.get(SoftContext, c.id)
    soft = {k: getattr(sc, k) for k in _SOFT_SLOTS} if sc else {}
    try:
        result = await LLM.plan(c, soft)  # pre-fills GUI only — never writes hard fields (TR-11)
    except ChutesError:
        return JSONResponse(status_code=503, content={**_INFERENCE_ERROR_BODY, "roadmap": [], "front_load_reason": None})
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
    if await _count_in_flight(db, c.user_id) >= _MAX_ACTIVE:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "You can have at most 3 active commitments at once. Complete or end one first.",
        )
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
    try:
        ck = await pipeline.run_checkin(db, c, "on_demand")
    except ChutesError:
        return JSONResponse(status_code=503, content={**_INFERENCE_ERROR_BODY,
                                                      "message": "Kawan couldn't reply just now — try again.",
                                                      "escalation": c.escalation, "delivered_via": "timeline",
                                                      "evidence_id": None})
    return {"message": ck.message, "escalation": ck.escalation,
            "delivered_via": ck.delivered_via, "evidence_id": ck.evidence_id}


_ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
_MAX_EVIDENCE_BYTES = 8 * 1024 * 1024  # 8 MB (TR-46)

# Allowed MIME types for file evidence. Legacy .doc (application/msword) is deliberately
# excluded -- binary format requires disproportionate effort; the route returns 415 with
# a friendly message directing the user to .docx or a screenshot.
_ALLOWED_FILE_TYPES = {
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
}
_DOC_LEGACY_TYPES = {"application/msword"}  # .doc -- rejected with a friendly message


@router.post("/{commitment_id}/evidence")
async def evidence(file: UploadFile = File(...), finish: bool = Query(False),
                   c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    import base64
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            f"unsupported content-type '{file.content_type}'; allowed: png, jpeg, webp")
    raw = await file.read(_MAX_EVIDENCE_BYTES + 1)
    if len(raw) > _MAX_EVIDENCE_BYTES:
        raise HTTPException(413, "evidence file exceeds the 8 MB limit")
    image_b64 = base64.b64encode(raw).decode()
    await record_contact(db, c)
    if finish and c.status in ("active", "lapsed"):
        await state.begin_verifying(db, c)
    ev = await pipeline.judge_upload(db, c, {"filename": file.filename}, image_b64=image_b64)
    return {"verdict": ev.verdict, "confidence": ev.confidence, "reasoning": ev.reasoning,
            "evidence_id": ev.id, "status": c.status}


@router.post("/{commitment_id}/evidence/file")
async def evidence_file(file: UploadFile = File(...), finish: bool = Query(False),
                        c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    from app.adapters.file import _extract_text
    if file.content_type in _DOC_LEGACY_TYPES or (file.filename or "").lower().endswith(".doc"):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Legacy .doc files are not supported. Please save as .docx or submit a screenshot instead.",
        )
    if file.content_type not in _ALLOWED_FILE_TYPES:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"unsupported file type '{file.content_type}'; allowed: txt, md, csv, pdf, docx",
        )
    raw = await file.read(_MAX_EVIDENCE_BYTES + 1)
    if len(raw) > _MAX_EVIDENCE_BYTES:
        raise HTTPException(413, "evidence file exceeds the 8 MB limit")
    filename = file.filename or "upload"
    text = _extract_text(filename, raw)
    await record_contact(db, c)
    if finish and c.status in ("active", "lapsed"):
        await state.begin_verifying(db, c)
    from app.contracts import EvidenceBundle
    from app.wiring import adapter_for
    adapter = adapter_for("file")
    bundle = EvidenceBundle(
        adapter="file",
        raw_ref={"filename": filename},
        items=[{"filename": filename, "text": text}],
        summary=f"file: {filename}",
    )
    verdict = await adapter.judge(c, bundle, LLM)
    from app.models import Evidence
    ev = Evidence(commitment_id=c.id, adapter="file", raw_ref={"filename": filename},
                  verdict=verdict.verdict, confidence=verdict.confidence, reasoning=verdict.reasoning)
    db.add(ev)
    await db.flush()
    if c.status in ("verifying", "grace"):
        from app import state as _state
        outcome = await _state.apply_final_verdict(db, c, verdict.verdict)
        from app.pipeline import _after_outcome
        await _after_outcome(db, c, ev, verdict, outcome)
    else:
        if verdict.verdict == "pass":
            c.escalation = 0
        await db.commit()
        from app.pipeline import _verdict_payload, deliver
        await deliver(db, c.user_id, _verdict_payload(ev, verdict))
    return {"verdict": ev.verdict, "confidence": ev.confidence, "reasoning": ev.reasoning,
            "evidence_id": ev.id, "status": c.status}


@router.post("/{commitment_id}/evidence/github-link")
async def evidence_github_link(body: GitHubLinkIn, finish: bool = Query(False),
                               c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    from app.adapters.github import GitHubAdapter, fetch_repo_url
    from app.wiring import adapter_for
    adapter = adapter_for("github")
    # fetch_repo_url never raises -- returns empty bundle on unreachable/missing repo
    bundle = await fetch_repo_url(adapter, body.url, c)
    await record_contact(db, c)
    if finish and c.status in ("active", "lapsed"):
        await state.begin_verifying(db, c)
    verdict = await adapter.judge(c, bundle, LLM)
    from app.models import Evidence
    ev = Evidence(commitment_id=c.id, adapter="github", raw_ref=bundle.raw_ref,
                  verdict=verdict.verdict, confidence=verdict.confidence, reasoning=verdict.reasoning)
    db.add(ev)
    await db.flush()
    if c.status in ("verifying", "grace"):
        from app import state as _state
        outcome = await _state.apply_final_verdict(db, c, verdict.verdict)
        from app.pipeline import _after_outcome
        await _after_outcome(db, c, ev, verdict, outcome)
    else:
        if verdict.verdict == "pass":
            c.escalation = 0
        await db.commit()
        from app.pipeline import _verdict_payload, deliver
        await deliver(db, c.user_id, _verdict_payload(ev, verdict))
    return {"verdict": ev.verdict, "confidence": ev.confidence, "reasoning": ev.reasoning,
            "evidence_id": ev.id, "status": c.status}


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


@router.get("/{commitment_id}/messages", response_model=list[MessageOut])
async def get_messages(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    """Return the full message history for a commitment, newest-last (ascending created_at)."""
    rows = (
        await db.scalars(
            select(Message).where(Message.commitment_id == c.id).order_by(Message.created_at)
        )
    ).all()
    return [MessageOut.model_validate(m) for m in rows]


@router.delete("/{commitment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_commitment(c: Commitment = Depends(_owned), db: AsyncSession = Depends(get_session)):
    """Permanently delete a commitment and all its related rows (cascade order:
    messages -> evidence -> checkins -> proposals -> soft_context -> plan -> success_patterns -> audit_log -> commitment).
    Current-user scoped via _owned. No undo."""
    from sqlalchemy import delete as sql_delete, update as sql_update
    from app.models import Achievement, AuditLog, Checkin, Evidence, Message, Plan, Proposal, SoftContext, SuccessPattern
    cid = c.id
    await db.execute(sql_delete(Message).where(Message.commitment_id == cid))
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
