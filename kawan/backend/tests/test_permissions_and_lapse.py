"""The 'AI is unrepresentable' CHECK (TR-24) and Lapse detection (ADR-0002):
two consecutive silent ticks → lapsed + exactly one win-back armed (TR-23)."""

from datetime import timedelta

import pytest
from sqlalchemy.exc import IntegrityError

import app.wiring as wiring
from app import pipeline, scheduler
from app.contracts import EvidenceBundle, Verdict
from app.models import AuditLog, Commitment, User
from app.util import new_id, now_utc


async def test_audit_actor_ai_is_rejected(db):
    db.add(AuditLog(actor="ai", field="status"))
    with pytest.raises(IntegrityError):
        await db.commit()


class _SilentAdapter:
    type = "github"
    trust = "high"

    async def fetch(self, c, since):
        return EvidenceBundle(adapter="github", raw_ref={}, items=[], summary="nothing new")

    async def judge(self, c, b, llm):
        return Verdict("unclear", 0.5, [], "n/a", None)


async def test_two_silent_ticks_lapse(db, monkeypatch):
    monkeypatch.setitem(wiring.ADAPTERS, "github", _SilentAdapter())
    u = User(id=new_id(), username="t", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    c = Commitment(user_id=u.id, action="a", deliverable="d",
                   deadline=now_utc() + timedelta(days=1), status="active", evidence_type="github")
    db.add(c)
    await db.commit()

    await pipeline.run_checkin(db, c, "cadence")
    assert c.status == "active"  # first silent tick — not yet a lapse

    await pipeline.run_checkin(db, c, "cadence")
    assert c.status == "lapsed"  # second consecutive silent tick
    assert scheduler.scheduler.get_job(f"winback:{c.id}") is not None  # one win-back armed
