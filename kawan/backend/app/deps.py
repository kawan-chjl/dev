"""FastAPI dependencies: the HttpOnly session → current user. Tokens never reach
the browser; the cookie carries only user_id (signed by SESSION_SECRET)."""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import User


def current_user_id(request: Request) -> str:
    uid = request.session.get("user_id")
    if not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not signed in")
    return uid


async def current_user(
    user_id: str = Depends(current_user_id),
    db: AsyncSession = Depends(get_session),
) -> User:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "session user not found")
    return user
