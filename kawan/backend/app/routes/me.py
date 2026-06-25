"""GET /me — username + Chutes balance (TR-52: the special-track frame is showing
inference bills to the signed-in user). Balance comes from /users/me with the user's
own token."""

import httpx
from fastapi import APIRouter, Depends, status
from sqlalchemy import delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import GUEST_USER_ID, access_token_for
from app.config import settings
from app.db import get_session
from app.deps import current_user
from app.models import AuditLog, Commitment, User
from app.schemas import MePatch

router = APIRouter()


@router.patch("/me")
async def patch_me(body: MePatch, user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    user.persona = body.persona
    await db.commit()
    return {"username": user.username, "persona": user.persona,
            "guest": user.id == GUEST_USER_ID, "balance": None}


@router.delete("/me/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    """Delete all audit_log rows for the current user (current-user scoped via their commitments).
    Permanently removes history. No undo."""
    from sqlalchemy import select
    cids = (await db.scalars(select(Commitment.id).where(Commitment.user_id == user.id))).all()
    if cids:
        await db.execute(sql_delete(AuditLog).where(AuditLog.commitment_id.in_(cids)))
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
