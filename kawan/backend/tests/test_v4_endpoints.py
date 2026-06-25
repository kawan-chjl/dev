"""v4 restructure: tests for DELETE /api/commitments/{id}, DELETE /api/me/history,
GET /api/me/history, and DELETE /api/me/data (v4 hotfix batch)."""

from datetime import timedelta

from sqlalchemy import select

from app.models import AuditLog, Checkin, Commitment, Evidence, User
from app.util import new_id, now_utc


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


# ── GET /api/me/history ─────────────────────────────────────────────────────


async def test_get_history_empty(client):
    """Empty list when no commitments / no audit rows."""
    r = await client.get('/api/me/history')
    assert r.status_code == 200
    assert r.json() == []


async def test_get_history_returns_rows_newest_first(client, db):
    """After a PATCH that writes audit rows, GET /api/me/history returns them newest-first."""
    cid = await _create_commitment(client)
    # Two patches produce two audit rows
    await client.patch(f'/api/commitments/{cid}', json={'deliverable': 'first'})
    await client.patch(f'/api/commitments/{cid}', json={'deliverable': 'second'})

    r = await client.get('/api/me/history')
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= 2
    # Verify required fields exist
    for row in rows:
        assert 'id' in row
        assert 'field' in row
        assert 'actor' in row
        assert 'at' in row
    # Newest first: last patch should appear before first patch
    ats = [row['at'] for row in rows]
    assert ats == sorted(ats, reverse=True)


async def test_get_history_cross_user_isolation(client, db):
    """User B's audit rows are NOT returned to the guest (user A) client."""
    # Create user B + their commitment + an audit row directly in the DB
    user_b = User(
        id='user-b-history-test',
        username='UserBHistory',
        persona='kawan',
        access_token='',
        refresh_token='',
        token_expiry=now_utc(),
    )
    db.add(user_b)
    b_commitment = Commitment(
        id=new_id(),
        user_id='user-b-history-test',
        action='b action',
        deliverable='b deliverable',
        deadline=now_utc(),
    )
    db.add(b_commitment)
    b_audit = AuditLog(
        id=new_id(),
        commitment_id=b_commitment.id,
        field='deliverable',
        old_value='old',
        new_value='new',
        actor='user',
    )
    db.add(b_audit)
    await db.commit()

    # User A fetches history — user B's row must NOT appear
    r = await client.get('/api/me/history')
    assert r.status_code == 200
    ids = [row['id'] for row in r.json()]
    assert b_audit.id not in ids


# ── DELETE /api/me/data ─────────────────────────────────────────────────────


async def test_delete_my_data_returns_204(client):
    """Happy path: 204 and all commitments gone."""
    cid = await _create_commitment(client)
    await client.patch(f'/api/commitments/{cid}', json={'deliverable': 'changed'})

    r = await client.delete('/api/me/data')
    assert r.status_code == 204


async def test_delete_my_data_removes_all_user_data(client, db):
    """All commitment rows and audit rows are removed after DELETE /api/me/data."""
    cid = await _create_commitment(client)
    await client.patch(f'/api/commitments/{cid}', json={'deliverable': 'changed'})

    r = await client.delete('/api/me/data')
    assert r.status_code == 204

    await db.rollback()
    commitment = await db.get(Commitment, cid)
    assert commitment is None

    audit_rows = (await db.scalars(select(AuditLog).where(AuditLog.commitment_id == cid))).all()
    assert len(audit_rows) == 0


async def test_delete_my_data_user_row_survives(client, db):
    """The User row and session survive DELETE /api/me/data (data-only wipe)."""
    cid = await _create_commitment(client)

    r = await client.delete('/api/me/data')
    assert r.status_code == 204

    # Session still active: GET /api/me should 200
    me_r = await client.get('/api/me')
    assert me_r.status_code == 200

    # Active commitment is now gone (404 = no active commitment)
    active_r = await client.get('/api/commitments/active')
    assert active_r.status_code == 404


async def test_delete_my_data_cross_user_isolation(client, db):
    """User A's wipe does NOT delete user B's data."""
    # Create user A's commitment
    await _create_commitment(client)

    # Create user B + their commitment directly in the DB
    user_b = User(
        id='user-b-wipe-test',
        username='UserBWipe',
        persona='kawan',
        access_token='',
        refresh_token='',
        token_expiry=now_utc(),
    )
    db.add(user_b)
    b_commitment = Commitment(
        id=new_id(),
        user_id='user-b-wipe-test',
        action='b action',
        deliverable='b deliverable',
        deadline=now_utc(),
    )
    db.add(b_commitment)
    await db.commit()

    # User A wipes
    r = await client.delete('/api/me/data')
    assert r.status_code == 204

    # User B's commitment must still exist
    await db.rollback()
    still_there = await db.get(Commitment, b_commitment.id)
    assert still_there is not None
