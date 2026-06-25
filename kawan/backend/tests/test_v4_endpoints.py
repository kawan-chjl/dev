"""v4 restructure: tests for DELETE /api/commitments/{id} and DELETE /api/me/history."""

from datetime import timedelta

from sqlalchemy import select

from app.models import AuditLog, Checkin, Commitment, Evidence
from app.util import now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def _create_commitment(client) -> str:
    r = await client.post('/api/commitments', json={'action': 'ship', 'deliverable': 'd', 'deadline': _future()})
    assert r.status_code == 201
    return r.json()['id']


# ── DELETE /api/commitments/{id} ────────────────────────────────────────────


async def test_delete_commitment_returns_204(client):
    cid = await _create_commitment(client)
    r = await client.delete(f'/api/commitments/{cid}')
    assert r.status_code == 204


async def test_delete_commitment_removes_from_db(client, db):
    cid = await _create_commitment(client)
    r = await client.delete(f'/api/commitments/{cid}')
    assert r.status_code == 204
    c = await db.get(Commitment, cid)
    assert c is None


async def test_delete_commitment_cascades_related_rows(client, db):
    cid = await _create_commitment(client)
    # Patch to produce an audit_log row
    await client.patch(f'/api/commitments/{cid}', json={'deliverable': 'updated'})
    rows_before = (await db.scalars(select(AuditLog).where(AuditLog.commitment_id == cid))).all()
    assert len(rows_before) > 0

    r = await client.delete(f'/api/commitments/{cid}')
    assert r.status_code == 204

    rows_after = (await db.scalars(select(AuditLog).where(AuditLog.commitment_id == cid))).all()
    assert len(rows_after) == 0


async def test_delete_commitment_not_found(client):
    r = await client.delete('/api/commitments/nonexistent-id')
    assert r.status_code == 404


async def test_delete_commitment_not_owned_by_other(client, db):
    # Create a second user (user B) and their commitment directly in the DB,
    # bypassing the guest session so user B has a distinct user_id.
    from app.models import User
    from app.util import new_id, now_utc

    user_b = User(
        id='user-b-test',
        username='UserB',
        persona='kawan',
        access_token='',
        refresh_token='',
        token_expiry=now_utc(),
    )
    db.add(user_b)
    b_commitment = Commitment(
        id=new_id(),
        user_id='user-b-test',
        action='user b action',
        deliverable='user b deliverable',
        deadline=now_utc(),
    )
    db.add(b_commitment)
    await db.commit()

    # User A (guest client) tries to delete user B's commitment — must get 404.
    r = await client.delete(f'/api/commitments/{b_commitment.id}')
    assert r.status_code == 404

    # User B's commitment must still exist in the DB after the failed attempt.
    await db.rollback()
    still_there = await db.get(Commitment, b_commitment.id)
    assert still_there is not None


# ── DELETE /api/me/history ──────────────────────────────────────────────────


async def test_clear_history_returns_204(client):
    r = await client.delete('/api/me/history')
    assert r.status_code == 204


async def test_clear_history_removes_audit_rows(client, db):
    cid = await _create_commitment(client)
    await client.patch(f'/api/commitments/{cid}', json={'deliverable': 'change1'})
    await client.patch(f'/api/commitments/{cid}', json={'deliverable': 'change2'})

    rows_before = (await db.scalars(select(AuditLog).where(AuditLog.commitment_id == cid))).all()
    assert len(rows_before) >= 2

    r = await client.delete('/api/me/history')
    assert r.status_code == 204

    # Expire the session-level cache so the next query hits the DB
    await db.rollback()
    rows_after = (await db.scalars(select(AuditLog).where(AuditLog.commitment_id == cid))).all()
    assert len(rows_after) == 0


async def test_clear_history_no_commitments_ok(client):
    # No commitments exist yet — should still return 204 gracefully
    r = await client.delete('/api/me/history')
    assert r.status_code == 204
