"""Off-device reminder fan-out (X-NOTIF, ADR-0006): a cadence/winback tick emails the
user's notify_email and pings a linked Telegram chat — in parallel with the device tier —
while on_demand and a missing address send nothing off-device."""

from datetime import timedelta

import app.wiring as wiring
from app import email, pipeline, telegram
from app.contracts import EvidenceBundle, Verdict
from app.models import Commitment, User
from app.util import new_id, now_utc


class _SilentAdapter:
    type = "github"
    trust = "high"

    async def fetch(self, c, since):
        return EvidenceBundle(adapter="github", raw_ref={}, items=[], summary="nothing new")

    async def judge(self, c, b, llm):
        return Verdict("unclear", 0.5, [], "n/a", None)


async def _user(db):
    u = User(id=new_id(), username="t", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    return u


async def _commitment(db, user, *, status="active", **kw):
    c = Commitment(user_id=user.id, action="ship", deliverable="the landing page",
                   deadline=now_utc() + timedelta(days=1), status=status, evidence_type="github", **kw)
    db.add(c)
    await db.commit()
    return c


async def test_cadence_emails_notify_email(db, monkeypatch):
    monkeypatch.setitem(wiring.ADAPTERS, "github", _SilentAdapter())
    email.outbox.clear()
    u = await _user(db)
    c = await _commitment(db, u, notify_email="me@example.com")

    await pipeline.run_checkin(db, c, "cadence")

    assert [m["to"] for m in email.outbox] == ["me@example.com"]
    assert "landing page" in email.outbox[0]["subject"]


async def test_on_demand_does_not_email(db, monkeypatch):
    monkeypatch.setitem(wiring.ADAPTERS, "github", _SilentAdapter())
    email.outbox.clear()
    u = await _user(db)
    c = await _commitment(db, u, notify_email="me@example.com")

    await pipeline.run_checkin(db, c, "on_demand")

    assert email.outbox == []  # user is present — no off-device fan-out


async def test_cadence_without_notify_email_sends_nothing(db, monkeypatch):
    monkeypatch.setitem(wiring.ADAPTERS, "github", _SilentAdapter())
    email.outbox.clear()
    u = await _user(db)
    c = await _commitment(db, u)  # no notify_email

    await pipeline.run_checkin(db, c, "cadence")

    assert email.outbox == []


async def test_winback_fans_out_email_and_telegram(db, monkeypatch):
    email.outbox.clear()
    sent: list[tuple[str, str]] = []

    async def _fake_tg(chat_id, text):
        sent.append((chat_id, text))
        return True

    monkeypatch.setattr(telegram, "send_message", _fake_tg)
    u = await _user(db)
    u.telegram_chat_id = "999"
    c = await _commitment(db, u, status="lapsed", notify_email="me@example.com")

    await pipeline.send_winback(db, c)

    assert [m["to"] for m in email.outbox] == ["me@example.com"]
    assert sent and sent[0][0] == "999"
