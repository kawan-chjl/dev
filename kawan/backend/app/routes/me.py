"""GET /me — username + Chutes balance (TR-52: the special-track frame is showing
inference bills to the signed-in user). Balance comes from /users/me with the user's
own token."""

import httpx
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import delete as sql_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import GUEST_USER_ID, access_token_for
from app.config import settings
from app.db import get_session
from app.deps import current_user
from app.models import AuditLog, Commitment, PushSubscription, SuccessPattern, User
from app.schemas import MePatch

router = APIRouter()


class AuditRowOut(BaseModel):
    id: str
    commitment_id: str | None
    field: str | None
    old_value: str | None
    new_value: str | None
    actor: str
    at: str


@router.patch("/me")
async def patch_me(body: MePatch, user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    user.persona = body.persona
    await db.commit()
    return {"username": user.username, "persona": user.persona,
            "guest": user.id == GUEST_USER_ID, "balance": None}


@router.get("/me/history", response_model=list[AuditRowOut])
async def get_history(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    """List the current user's audit-log rows across all their commitments, newest-first.
    Current-user scoped: only rows whose commitment belongs to this user."""
    cids = (await db.scalars(select(Commitment.id).where(Commitment.user_id == user.id))).all()
    if not cids:
        return []
    rows = (await db.scalars(
        select(AuditLog)
        .where(AuditLog.commitment_id.in_(cids))
        .order_by(AuditLog.created_at.desc())
    )).all()
    return [
        AuditRowOut(
            id=r.id,
            commitment_id=r.commitment_id,
            field=r.field,
            old_value=str(r.old_value) if r.old_value is not None else None,
            new_value=str(r.new_value) if r.new_value is not None else None,
            actor=r.actor,
            at=r.created_at.isoformat(),
        )
        for r in rows
    ]


@router.delete("/me/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    """Delete all audit_log rows for the current user (current-user scoped via their commitments).
    Permanently removes history. No undo."""
    cids = (await db.scalars(select(Commitment.id).where(Commitment.user_id == user.id))).all()
    if cids:
        await db.execute(sql_delete(AuditLog).where(AuditLog.commitment_id.in_(cids)))
        await db.commit()


@router.delete("/me/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    """Delete all the current user's commitments and every row FK'd to them, plus user-level
    PushSubscription and SuccessPattern rows. The User row (login/session) is kept.
    Returns 204 on success. No undo. Current-user scoped throughout."""
    from app.models import Checkin, Evidence, Plan, Proposal, SoftContext
    cids = (await db.scalars(select(Commitment.id).where(Commitment.user_id == user.id))).all()
    if cids:
        # Mirror the cascade order from delete_commitment in commitments.py
        await db.execute(sql_delete(Evidence).where(Evidence.commitment_id.in_(cids)))
        await db.execute(sql_delete(Checkin).where(Checkin.commitment_id.in_(cids)))
        await db.execute(sql_delete(Proposal).where(Proposal.commitment_id.in_(cids)))
        await db.execute(sql_delete(SoftContext).where(SoftContext.commitment_id.in_(cids)))
        await db.execute(sql_delete(Plan).where(Plan.commitment_id.in_(cids)))
        await db.execute(sql_delete(SuccessPattern).where(SuccessPattern.commitment_id.in_(cids)))
        await db.execute(sql_delete(AuditLog).where(AuditLog.commitment_id.in_(cids)))
        await db.execute(sql_delete(Commitment).where(Commitment.id.in_(cids)))
    # Delete user-level rows FK'd directly to users.id
    await db.execute(sql_delete(SuccessPattern).where(
        SuccessPattern.user_id == user.id,
        SuccessPattern.commitment_id.is_(None)
    ))
    await db.execute(sql_delete(PushSubscription).where(PushSubscription.user_id == user.id))
    await db.commit()


@router.get("/me")
async def me(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    balance = None
    try:
        token = await access_token_for(db, user)
        if token:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(settings.users_me_url, headers={"Authorization": f"Bearer {token}"})
            if r.status_code == 200:
                balance = r.json().get("balance")  # current USD balance, float (reference §Balance & Billing)
    except Exception:  # noqa: BLE001 - balance is best-effort; never block /me on it
        balance = None
    return {"username": user.username, "persona": user.persona,
            "guest": user.id == GUEST_USER_ID, "balance": balance}
