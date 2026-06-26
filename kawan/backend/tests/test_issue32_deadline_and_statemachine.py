"""Issue #32 — past-deadline PATCH rejection + state-machine source-status guards."""

from datetime import timedelta

from app import state
from app.models import Commitment, User
from app.util import new_id, now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


def _past() -> str:
    return (now_utc() - timedelta(hours=1)).isoformat()


# ── PATCH deadline validation ──────────────────────────────────────────────────


async def test_patch_past_deadline_rejected(client):
    r = await client.post(
        "/api/commitments",
        json={"action": "ship", "deliverable": "d", "deadline": _future()},
    )
    assert r.status_code == 201
    cid = r.json()["id"]
    r = await client.patch(f"/api/commitments/{cid}", json={"deadline": _past()})
    assert r.status_code == 422


async def test_patch_future_deadline_accepted(client):
    r = await client.post(
        "/api/commitments",
        json={"action": "ship", "deliverable": "d", "deadline": _future()},
    )
    cid = r.json()["id"]
    new_deadline = (now_utc() + timedelta(days=2)).isoformat()
    r = await client.patch(f"/api/commitments/{cid}", json={"deadline": new_deadline})
    assert r.status_code == 200


# ── apply_final_verdict source-status guard ────────────────────────────────────


async def _seed(db, status="verifying", **kw) -> Commitment:
    u = User(id=new_id(), username="t", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    c = Commitment(user_id=u.id, action="a", deliverable="d",
                   deadline=now_utc() + timedelta(hours=1), status=status, **kw)
    db.add(c)
    await db.commit()
    return c


async def test_apply_final_verdict_from_verifying_allowed(db):
    c = await _seed(db, status="verifying")
    result = await state.apply_final_verdict(db, c, "pass")
    assert result == "completed"
    assert c.status == "completed"


async def test_apply_final_verdict_from_grace_allowed(db):
    c = await _seed(db, status="grace", skip_days_total=1, skip_days_used=1)
    result = await state.apply_final_verdict(db, c, "fail")
    assert result == "missed"
    assert c.status == "missed"


async def test_apply_final_verdict_from_draft_is_noop(db):
    c = await _seed(db, status="draft")
    result = await state.apply_final_verdict(db, c, "pass")
    assert result == "draft"
    assert c.status == "draft"


async def test_apply_final_verdict_from_completed_is_noop(db):
    c = await _seed(db, status="completed")
    result = await state.apply_final_verdict(db, c, "pass")
    assert result == "completed"
    assert c.status == "completed"


async def test_apply_final_verdict_from_missed_is_noop(db):
    c = await _seed(db, status="missed")
    result = await state.apply_final_verdict(db, c, "pass")
    assert result == "missed"
    assert c.status == "missed"


# ── abandon terminal-state guard ───────────────────────────────────────────────


async def test_abandon_from_completed_is_noop(db):
    c = await _seed(db, status="completed")
    result = await state.abandon(db, c)
    assert result == "completed"
    assert c.status == "completed"


async def test_abandon_from_missed_is_noop(db):
    c = await _seed(db, status="missed")
    result = await state.abandon(db, c)
    assert result == "missed"
    assert c.status == "missed"


async def test_abandon_from_active_transitions_to_missed(db):
    c = await _seed(db, status="active")
    result = await state.abandon(db, c)
    assert result == "missed"
    assert c.status == "missed"
