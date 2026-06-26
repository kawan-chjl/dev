"""Push routes: subscribe (POST) + VAPID public key read (GET).
The service worker that produces subscriptions is Lane D (D3)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_session
from app.deps import current_user
from app.models import User
from app.push import save_subscription
from app.schemas import PushSubscribeIn

router = APIRouter(prefix="/push")


@router.get("/vapid-public-key")
async def vapid_public_key() -> dict:
    """Return the VAPID public key so the client can subscribe without a build-time env var.
    Public value — no auth required. Empty string when keys are not configured."""
    return {"vapid_public_key": settings.vapid_public_key}


@router.post("/subscribe")
async def subscribe(body: PushSubscribeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    await save_subscription(db, user.id, body.subscription)
    return {"ok": True}
