"""Web Push send side (VAPID) — Lane B owns this; the service worker + client
subscription are Lane D (D3). Tier 2 of the delivery ladder. Payloads carry the
headline only (privacy + iOS limits, TR-17). No VAPID keys configured → no-op."""

from __future__ import annotations

import asyncio
import json
import logging

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import PushSubscription

logger = logging.getLogger("kawan.push")

_GONE_STATUSES = {404, 410}


async def save_subscription(db: AsyncSession, user_id: str, subscription: dict) -> None:
    """Upsert by endpoint: update the existing row if found, insert otherwise."""
    endpoint = subscription.get("endpoint")
    existing = await db.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == endpoint)
    ) if endpoint else None
    if existing is not None:
        existing.subscription = subscription
    else:
        db.add(PushSubscription(user_id=user_id, subscription=subscription, endpoint=endpoint))
    await db.commit()


def _send_one(subscription: dict, headline: str) -> tuple[bool, bool]:
    """Return (delivered, is_gone). is_gone=True when the push service signals the sub is dead."""
    from pywebpush import WebPushException, webpush  # imported lazily so the dep is optional in dev
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps({"headline": headline}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_subject},
        )
        return True, False
    except WebPushException as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        is_gone = status_code in _GONE_STATUSES
        logger.warning("web push failed (status=%s): %s", status_code, exc)
        return False, is_gone


async def push_to_user(db: AsyncSession, user_id: str, headline: str) -> bool:
    """Returns True if at least one subscription accepted the push.
    Prunes subscriptions the push service reports as gone (404/410)."""
    if not settings.vapid_private_key:
        return False
    subs = (await db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id))).all()
    if not subs:
        return False
    results = await asyncio.gather(*(asyncio.to_thread(_send_one, s.subscription, headline) for s in subs))
    dead_ids = [s.id for s, (_, is_gone) in zip(subs, results) if is_gone]
    if dead_ids:
        await db.execute(delete(PushSubscription).where(PushSubscription.id.in_(dead_ids)))
        await db.commit()
    return any(delivered for delivered, _ in results)
