"""Telegram check-in Channel (X-NOTIF, ADR-0006): Bot API `sendMessage` + the long-poll
linking loop. No `KAWAN_TELEGRAM_BOT_TOKEN` configured → every send is a no-op and the
poller never starts (mirrors push.py without VAPID). A Postgres advisory lock keeps exactly
one `getUpdates` consumer across instances/workers; webhook is the post-demo upgrade.

Linking: Settings issues a short-lived deep-link token (`mint_link_token`) and opens
`t.me/<bot>?start=<token>`; the user taps Start; the poller sees `/start <token>`, binds
the chat to that user (`telegram_chat_id`), and confirms. "Linked" == chat_id set —
there is no preferences table.
"""

from __future__ import annotations

import asyncio
import logging
import secrets
from datetime import timedelta

import httpx
from sqlalchemy import select
from sqlalchemy import text as sql_text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import SessionLocal, engine
from app.models import User
from app.util import as_utc, now_utc

logger = logging.getLogger("kawan.telegram")

_LINK_TTL = timedelta(minutes=15)
_POLL_TIMEOUT = 30  # seconds the Bot API holds getUpdates open (long-poll)
_POLL_LOCK_KEY = 0x4B41574E  # 'KAWN' — Postgres advisory-lock key: one poller across instances
_bot_username_cache: str | None = None


def _api(method: str) -> str:
    return f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}"


async def send_message(chat_id: str | None, text: str) -> bool:
    """Best-effort sendMessage. No token / no chat → no-op (returns False)."""
    if not settings.telegram_bot_token or not chat_id:
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(_api("sendMessage"), json={"chat_id": chat_id, "text": text})
        if r.status_code >= 400:
            logger.warning("telegram sendMessage rejected: %s %s", r.status_code, r.text[:200])
            return False
        return True
    except httpx.HTTPError as exc:
        logger.warning("telegram send failed: %s", exc)
        return False


async def bot_username() -> str:
    """The bot's @username for the t.me deep link. Prefer the configured value; else fetch
    once via getMe and cache. Empty string when unknown (e.g. no token)."""
    global _bot_username_cache
    if settings.telegram_bot_username:
        return settings.telegram_bot_username
    if _bot_username_cache is not None:
        return _bot_username_cache
    if not settings.telegram_bot_token:
        return ""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(_api("getMe"))
        if r.status_code == 200:
            _bot_username_cache = (r.json().get("result") or {}).get("username", "")
            return _bot_username_cache
        logger.warning("telegram getMe HTTP %s", r.status_code)
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("telegram getMe failed: %s", exc)
    return ""  # don't cache a transient failure — a later call can retry


async def mint_link_token(db: AsyncSession, user: User) -> str:
    """Issue a short-lived deep-link token bound to this user (for `?start=<token>`)."""
    token = secrets.token_urlsafe(24)
    user.telegram_link_token = token
    user.telegram_link_expires = now_utc() + _LINK_TTL
    await db.commit()
    return token


async def _consume_link_token(db: AsyncSession, token: str) -> User | None:
    """Match an unexpired link token → its user, clearing the token (single use)."""
    user = await db.scalar(select(User).where(User.telegram_link_token == token))
    if user is None or user.telegram_link_expires is None or as_utc(user.telegram_link_expires) < now_utc():
        return None
    user.telegram_link_token = None
    user.telegram_link_expires = None
    return user


async def _handle_update(update: dict) -> None:
    """Dispatch one getUpdates entry: only `/start <token>` (the linking deep link) acts."""
    msg = update.get("message") or {}
    text = (msg.get("text") or "").strip()
    chat_id = (msg.get("chat") or {}).get("id")
    if chat_id is None or not text.startswith("/start"):
        return
    parts = text.split(maxsplit=1)
    token = parts[1].strip() if len(parts) > 1 else ""
    async with SessionLocal() as db:
        user = await _consume_link_token(db, token) if token else None
        if user is None:
            await send_message(str(chat_id),
                               "That link is invalid or expired. In Kawan: Settings → Connect Telegram for a fresh one.")
            return
        user.telegram_chat_id = str(chat_id)
        await db.commit()
    await send_message(str(chat_id), "✅ Linked! I'll send your Kawan check-ins here.")


async def _poll_forever() -> None:
    """The getUpdates long-poll loop: dispatch `/start` linking until cancelled."""
    offset: int | None = None
    async with httpx.AsyncClient(timeout=_POLL_TIMEOUT + 15) as client:
        while True:
            try:
                params: dict[str, int] = {"timeout": _POLL_TIMEOUT}
                if offset is not None:
                    params["offset"] = offset
                r = await client.get(_api("getUpdates"), params=params)
                if r.status_code != 200:
                    # Back off instead of hot-looping on 401 (bad token) / 409 (another
                    # getUpdates consumer — e.g. a second instance or a stale webhook).
                    logger.warning("getUpdates HTTP %s: %s", r.status_code, r.text[:200])
                    await asyncio.sleep(5)
                    continue
                updates = r.json().get("result") or []
            except (httpx.HTTPError, ValueError) as exc:
                logger.warning("getUpdates failed: %s", exc)
                await asyncio.sleep(3)
                continue
            for u in updates:
                offset = u["update_id"] + 1
                try:
                    await _handle_update(u)
                except Exception as exc:  # noqa: BLE001 - one bad update mustn't kill the loop
                    logger.warning("telegram update handling failed: %s", exc)


async def run_poller() -> None:
    """Started in the FastAPI lifespan when a bot token is set; cancelled on shutdown.

    Telegram allows only ONE getUpdates consumer, so across multiple web instances/workers a
    Postgres advisory lock elects a single poller (held for the loop's lifetime on the session
    pooler — see DEPLOY.md); the rest stand by and take over if the leader's connection drops.
    Non-Postgres (SQLite/dev) has no advisory locks → poll directly (single process anyway)."""
    logger.info("telegram poller starting")
    try:
        if not settings.database_url.startswith("postgresql"):
            await _poll_forever()
            return
        while True:
            # Hold the lock by keeping this connection open; closing it (on cancel/shutdown,
            # or if the instance dies) releases the session-level lock for another instance.
            async with engine.connect() as conn:
                got = await conn.scalar(sql_text("SELECT pg_try_advisory_lock(:k)"), {"k": _POLL_LOCK_KEY})
                await conn.commit()  # end the autobegun tx; the session-level lock persists
                if got:
                    logger.info("telegram poller holds the single-consumer lock; polling")
                    await _poll_forever()
                    return
            logger.info("telegram: another instance holds the poll lock; standing by")
            await asyncio.sleep(30)
    except asyncio.CancelledError:
        logger.info("telegram poller stopped")
        raise
