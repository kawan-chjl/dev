"""Off-device reminder fan-out (X-NOTIF, ADR-0006). A reminder Check-in (`cadence` or
`winback`) is ALSO delivered, in parallel, to every enabled off-device Channel — email
(the Commitment's `notify_email`) and Telegram (the user's linked chat). Best-effort:
an unconfigured channel is skipped, a send failure is logged, never raised.

The device tier (in-app / Web Push / timeline) is handled separately by
`pipeline.deliver()`. Outcomes (verdict / celebration / Miss / Grace) and `on_demand`
checks never call this — only reminder ticks fan out off-device."""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import email, telegram
from app.config import settings
from app.models import Commitment, User

logger = logging.getLogger("kawan.notify")


def _deep_link(c: Commitment) -> str:
    return f"{settings.frontend_origin.rstrip('/')}/workspace/{c.id}"


def _subject(c: Commitment) -> str:
    return f'Kawan — checking in on "{c.deliverable}"'


def _body(c: Commitment, say: str) -> str:
    return (
        f"{say}\n\n"
        f"Open Kawan → {_deep_link(c)}\n\n"
        "— Kawan\n"
        f'You set this address as your reminder email for "{c.action} {c.deliverable}".'
    )


async def send_reminder(db: AsyncSession, c: Commitment, say: str) -> list[str]:
    """Fan out one reminder to the enabled off-device Channels in parallel. Returns the
    channels that accepted, for logging/tests. Never raises."""
    # Resolve the chat id BEFORE building any coroutine, so an await here can't strand an
    # un-awaited send.
    chat_id = await db.scalar(select(User.telegram_chat_id).where(User.id == c.user_id))
    jobs: list[tuple[str, object]] = []
    if c.notify_email:
        jobs.append(("email", email.send_email(c.notify_email, _subject(c), _body(c, say))))
    if chat_id:
        jobs.append(("telegram", telegram.send_message(chat_id, f"{say}\n\n{_deep_link(c)}")))
    if not jobs:
        return []
    results = await asyncio.gather(*(coro for _, coro in jobs), return_exceptions=True)
    sent: list[str] = []
    for (name, _), res in zip(jobs, results):
        if isinstance(res, Exception):
            logger.warning("reminder %s send raised: %s", name, res)
        elif res:
            sent.append(name)
    return sent
