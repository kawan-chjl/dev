"""Tests for the three new owner-scoped GET endpoints added for the workspace redesign:
  GET /api/commitments/{id}
  GET /api/commitments/{id}/soft-context
  GET /api/commitments/{id}/checkin-status
"""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select

from app.models import Checkin, Commitment, Evidence, SoftContext, User
from app.util import new_id, now_utc


def _future(days: int = 1) -> str:
    return (now_utc() + timedelta(days=days)).isoformat()


async def _create(client) -> str:
    r = await client.post(
        "/api/commitments",
        json={"action": "ship", "deliverable": "d", "deadline": _future()},
    )
    assert r.status_code == 201
    return r.json()["id"]


# ── GET /api/commitments/{id} ───────────────────────────────────────────────


async def test_get_commitment_by_id_returns_commitment(client):
    cid = await _create(client)
    r = await client.get(f"/api/commitments/{cid}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == cid
    assert body["action"] == "ship"
    assert body["deliverable"] == "d"
    assert "status" in body
    assert "escalation" in body


async def test_get_commitment_by_id_not_found(client):
    r = await client.get("/api/commitments/nonexistent-id")
    assert r.status_code == 404


async def test_get_commitment_by_id_not_owned(client, db):
    # Create a second user and their commitment directly in the DB
    other_user = User(id=new_id(), username="other", access_token="x",
                      refresh_token="x", token_expiry=now_utc() + timedelta(days=1))
    db.add(other_user)
    await db.commit()

    other_c = Commitment(
        user_id=other_user.id,
        action="other action",
        deliverable="other d",
        deadline=now_utc() + timedelta(days=1),
    )
    db.add(other_c)
    await db.commit()

    r = await client.get(f"/api/commitments/{other_c.id}")
    assert r.status_code == 404


# ── GET /api/commitments/{id}/soft-context ──────────────────────────────────


async def test_soft_context_no_row_returns_all_nulls(client):
    cid = await _create(client)
    r = await client.get(f"/api/commitments/{cid}/soft-context")
    assert r.status_code == 200
    body = r.json()
    assert body == {"why": None, "obstacles": None, "time_constraints": None, "skill": None}


async def test_soft_context_returns_populated_slots(client, db):
    cid = await _create(client)
    # Insert a SoftContext row directly
    sc = SoftContext(commitment_id=cid, why="career growth", obstacles="time", skill=None, time_constraints=None)
    db.add(sc)
    await db.commit()

    r = await client.get(f"/api/commitments/{cid}/soft-context")
    assert r.status_code == 200
    body = r.json()
    assert body["why"] == "career growth"
    assert body["obstacles"] == "time"
    assert body["time_constraints"] is None
    assert body["skill"] is None


async def test_soft_context_returns_all_four_slots_when_set(client, db):
    cid = await _create(client)
    sc = SoftContext(commitment_id=cid, why="w", obstacles="o", time_constraints="tc", skill="sk")
    db.add(sc)
    await db.commit()

    r = await client.get(f"/api/commitments/{cid}/soft-context")
    assert r.status_code == 200
    body = r.json()
    assert body == {"why": "w", "obstacles": "o", "time_constraints": "tc", "skill": "sk"}


async def test_soft_context_not_found_for_nonexistent(client):
    r = await client.get("/api/commitments/nonexistent-id/soft-context")
    assert r.status_code == 404


async def test_soft_context_not_owned(client, db):
    other_user = User(id=new_id(), username="other2", access_token="x",
                      refresh_token="x", token_expiry=now_utc() + timedelta(days=1))
    db.add(other_user)
    await db.commit()
    other_c = Commitment(user_id=other_user.id, action="a", deliverable="d",
                         deadline=now_utc() + timedelta(days=1))
    db.add(other_c)
    await db.commit()

    r = await client.get(f"/api/commitments/{other_c.id}/soft-context")
    assert r.status_code == 404


# ── GET /api/commitments/{id}/checkin-status ────────────────────────────────


async def test_checkin_status_shape(client):
    cid = await _create(client)
    r = await client.get(f"/api/commitments/{cid}/checkin-status")
    assert r.status_code == 200
    body = r.json()
    assert "due_at" in body
    assert "is_late" in body
    assert "escalation" in body
    assert "last_pass_at" in body
    assert isinstance(body["is_late"], bool)
    assert isinstance(body["escalation"], int)
    assert body["last_pass_at"] is None


async def test_checkin_status_escalation_matches_commitment(client, db):
    cid = await _create(client)
    # Set escalation to 1 directly in the DB
    c = await db.get(Commitment, cid)
    c.escalation = 1
    await db.commit()

    r = await client.get(f"/api/commitments/{cid}/checkin-status")
    assert r.status_code == 200
    assert r.json()["escalation"] == 1


async def test_checkin_status_due_at_is_iso8601(client):
    cid = await _create(client)
    r = await client.get(f"/api/commitments/{cid}/checkin-status")
    assert r.status_code == 200
    due_at = r.json()["due_at"]
    # due_at is the last cadence tick or the commitment's created_at; it must be parseable
    from datetime import datetime
    dt = datetime.fromisoformat(due_at)
    assert dt is not None


async def test_checkin_status_due_at_consistent_with_assemble_progress(client, db):
    """due_at and is_late returned by checkin-status must match assemble_progress."""
    cid = await _create(client)

    status_r = await client.get(f"/api/commitments/{cid}/checkin-status")
    assert status_r.status_code == 200
    status_body = status_r.json()

    # Call assemble_progress directly to compare
    from app import pipeline
    from app.db import SessionLocal
    async with SessionLocal() as session:
        c = await session.get(Commitment, cid)
        progress = await pipeline.assemble_progress(session, c)

    assert status_body["due_at"] == progress["due_at"]
    assert status_body["is_late"] == progress["is_late"]


async def test_checkin_status_due_at_uses_last_checkin(client, db):
    """When a cadence Checkin row exists, due_at should reflect it."""
    cid = await _create(client)
    tick_time = now_utc() - timedelta(hours=2)
    ck = Checkin(commitment_id=cid, kind="cadence", message="hi", escalation=0)
    ck.created_at = tick_time
    db.add(ck)
    await db.commit()

    r = await client.get(f"/api/commitments/{cid}/checkin-status")
    assert r.status_code == 200
    body = r.json()
    # due_at should be the tick time (within a second, accounting for ISO round-trip)
    from datetime import datetime, timezone
    due = datetime.fromisoformat(body["due_at"])
    diff = abs((due - tick_time.replace(tzinfo=timezone.utc)).total_seconds())
    assert diff < 2


async def test_checkin_status_last_pass_at_uses_latest_pass_evidence(client, db):
    cid = await _create(client)
    pass_time = now_utc() - timedelta(hours=3)
    ev = Evidence(commitment_id=cid, adapter="screenshot", verdict="pass", reasoning="done")
    ev.created_at = pass_time
    db.add(ev)
    await db.commit()

    r = await client.get(f"/api/commitments/{cid}/checkin-status")
    assert r.status_code == 200
    body = r.json()
    assert body["last_pass_at"] is not None

    from datetime import datetime, timezone
    last_pass = datetime.fromisoformat(body["last_pass_at"])
    diff = abs((last_pass - pass_time.replace(tzinfo=timezone.utc)).total_seconds())
    assert diff < 2


async def test_checkin_status_not_found_for_nonexistent(client):
    r = await client.get("/api/commitments/nonexistent-id/checkin-status")
    assert r.status_code == 404


async def test_checkin_status_not_owned(client, db):
    other_user = User(id=new_id(), username="other3", access_token="x",
                      refresh_token="x", token_expiry=now_utc() + timedelta(days=1))
    db.add(other_user)
    await db.commit()
    other_c = Commitment(user_id=other_user.id, action="a", deliverable="d",
                         deadline=now_utc() + timedelta(days=1))
    db.add(other_c)
    await db.commit()

    r = await client.get(f"/api/commitments/{other_c.id}/checkin-status")
    assert r.status_code == 404
