"""Telegram linking routes (X-NOTIF, ADR-0006): mint a deep link, report status, unlink.
The `/start` capture that actually binds the chat happens in the long-poll loop
(app/telegram.py), not here. "Linked" == the user has a telegram_chat_id."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app import telegram
from app.db import get_session
from app.deps import current_user
from app.models import User

router = APIRouter(prefix="/telegram")


@router.get("/status")
async def status(user: User = Depends(current_user)) -> dict:
    return {"linked": bool(user.telegram_chat_id)}


@router.post("/link")
async def link(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)) -> dict:
    """Issue a one-time deep link; the user taps Start in Telegram to bind their chat.
    Returns configured=False when no bot is set up, so the UI can show it unavailable."""
    username = await telegram.bot_username()
    if not username:
        return {"configured": False}
    token = await telegram.mint_link_token(db, user)
    return {"configured": True, "url": f"https://t.me/{username}?start={token}"}


@router.post("/unlink")
async def unlink(user: User = Depends(current_user), db: AsyncSession = Depends(get_session)) -> dict:
    user.telegram_chat_id = None
    user.telegram_link_token = None
    user.telegram_link_expires = None
    await db.commit()
    return {"linked": False}
