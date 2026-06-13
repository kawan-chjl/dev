"""Web Push send side (VAPID) — Lane B owns this; the service worker + client
subscription are Lane D (D3). Tier 2 of the delivery ladder. Payloads carry the
headline only (privacy + iOS limits, TR-17). No VAPID keys configured → no-op."""

from __future__ import annotations

import asyncio
import json
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import PushSubscription

logger = logging.getLogger("kawan.push")


async def save_subscription(db: AsyncSession, user_id: str, subscription: dict) -> None:
    db.add(PushSubscription(user_id=user_id, subscription=subscription))
    await db.commit()


def _send_one(subscription: dict, headline: str) -> bool:
    from pywebpush import WebPushException, webpush  # imported lazily so the dep is optional in dev
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"headline": headline}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
        return True
    except WebPushException as exc:  # expired/invalid subscription
        logger.warning("web push failed: %s", exc)
        return False


async def push_to_user(db: AsyncSession, user_id: str, headline: str) -> bool:
    """Returns True if at least one subscription accepted the push."""
    if not settings.vapid_private_key:
        return False
    subs = (await db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id))).all()
    if not subs:
        return False
    results = await asyncio.gather(*(asyncio.to_thread(_send_one, s.subscription, headline) for s in subs))
    return any(results)
