"""Telegram linking (X-NOTIF, ADR-0006): the status/link/unlink endpoints and the
/start token-consume that the long-poll loop performs. No bot token in the test env →
link reports not-configured and sends are no-ops (monkeypatched where a send matters)."""

import asyncio
from datetime import timedelta

import pytest

import app.telegram as telegram
from app.config import settings
from app.db import SessionLocal
from app.models import User
from app.util import new_id, now_utc


async def test_link_reports_unconfigured_without_bot(client, monkeypatch):
    # Force the no-bot state regardless of the ambient .env (a real token may be present).
    monkeypatch.setattr(settings, "telegram_bot_token", "")
    monkeypatch.setattr(settings, "telegram_bot_username", "")

    r = await client.get("/api/telegram/status")
    assert r.json() == {"linked": False}

    r = await client.post("/api/telegram/link")
    assert r.json() == {"configured": False}  # no bot configured → unavailable

    r = await client.post("/api/telegram/unlink")
    assert r.json() == {"linked": False}


async def test_link_returns_deep_link_when_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "telegram_bot_token", "test-token")
    monkeypatch.setattr(settings, "telegram_bot_username", "kawan_test_bot")

    r = await client.post("/api/telegram/link")
    body = r.json()
    assert body["configured"] is True
    assert body["url"].startswith("https://t.me/kawan_test_bot?start=")


async def test_start_consumes_token_and_links(monkeypatch):
    sent: list[tuple[str, str]] = []

    async def _fake_send(chat_id, text):
        sent.append((chat_id, text))
        return True

    monkeypatch.setattr(telegram, "send_message", _fake_send)

    async with SessionLocal() as db:
        u = User(id=new_id(), username="t", access_token="x", refresh_token="y",
                 token_expiry=now_utc() + timedelta(hours=1))
        db.add(u)
        await db.flush()
        uid = u.id
        token = await telegram.mint_link_token(db, u)  # commits

    await telegram._handle_update({"update_id": 1, "message": {"text": f"/start {token}", "chat": {"id": 42}}})

    async with SessionLocal() as db:
        linked = await db.get(User, uid)
        assert linked.telegram_chat_id == "42"
        assert linked.telegram_link_token is None  # single-use token cleared
    assert sent and "Linked" in sent[0][1]


async def test_start_with_bad_token_does_not_link(monkeypatch):
    sent: list[tuple[str, str]] = []

    async def _fake_send(chat_id, text):
        sent.append((chat_id, text))
        return True

    monkeypatch.setattr(telegram, "send_message", _fake_send)

    await telegram._handle_update({"update_id": 2, "message": {"text": "/start nope", "chat": {"id": 99}}})

    assert sent and "invalid or expired" in sent[0][1]


async def test_run_poller_polls_directly_on_sqlite(monkeypatch):
    # On a non-Postgres DB (tests use SQLite) run_poller must poll directly and NEVER reach
    # for pg_try_advisory_lock — the advisory-lock leader election is Postgres-only.
    called = {"poll": False}

    async def _fake_poll():
        called["poll"] = True
        raise asyncio.CancelledError

    monkeypatch.setattr(telegram, "_poll_forever", _fake_poll)
    with pytest.raises(asyncio.CancelledError):
        await telegram.run_poller()
    assert called["poll"] is True
