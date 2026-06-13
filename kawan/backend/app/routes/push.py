"""POST /push/subscribe — store a Web Push subscription (TR-17). The service worker
that produces these is Lane D (D3)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.deps import current_user
from app.models import User
from app.push import save_subscription
from app.schemas import PushSubscribeIn

router = APIRouter(prefix="/push")


@router.post("/subscribe")
async def subscribe(body: PushSubscribeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_session)):
    await save_subscription(db, user.id, body.subscription)
    return {"ok": True}
