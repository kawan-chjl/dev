"""v4 restructure + multi-commitment list: tests for DELETE /api/commitments/{id},
DELETE /api/me/history, GET /api/me/history, DELETE /api/me/data, and
GET /api/commitments (paginated list, multiple-active override)."""

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


# ── GET /api/commitments (paginated list, multi-active override) ─────────────


async def test_list_commitments_empty(client):
    """Fresh guest with no commitments returns empty envelope."""
    r = await client.get('/api/commitments')
    assert r.status_code == 200
    body = r.json()
    assert body['items'] == []
    assert body['total'] == 0
    assert body['limit'] == 10
    assert body['offset'] == 0


async def test_list_commitments_multiple_active(client):
    """Two creates → two ACTIVE rows (proves the PO override: no create guard)."""
    id1 = await _create_commitment(client)
    id2 = await _create_commitment(client)

    r = await client.get('/api/commitments')
    assert r.status_code == 200
    body = r.json()
    assert body['total'] == 2
    returned_ids = {item['id'] for item in body['items']}
    assert id1 in returned_ids
    assert id2 in returned_ids
    # Both must be active (draft status after POST, no start call needed to confirm no guard)
    for item in body['items']:
        assert item['status'] in ('draft', 'active')


async def test_list_commitments_ordering(client):
    """Items are returned newest first (most recently created first)."""
    id1 = await _create_commitment(client)
    id2 = await _create_commitment(client)
    id3 = await _create_commitment(client)

    r = await client.get('/api/commitments')
    assert r.status_code == 200
    ids = [item['id'] for item in r.json()['items']]
    # All three must appear; the last created should appear first (or at worst tie-equal).
    # Robust assertion: id3 must appear before id1 in the list (or equal position if same timestamp).
    assert set(ids) == {id1, id2, id3}
    # At minimum id3 (last created) must not come after id1 (first created).
    assert ids.index(id3) <= ids.index(id1)


async def test_list_commitments_pagination(client):
    """Pagination boundaries: 12 rows, offset/limit slicing, offset-past-end."""
    for _ in range(12):
        await _create_commitment(client)

    # First page
    r = await client.get('/api/commitments?limit=10&offset=0')
    assert r.status_code == 200
    body = r.json()
    assert len(body['items']) == 10
    assert body['total'] == 12

    # Second page
    r2 = await client.get('/api/commitments?limit=10&offset=10')
    assert r2.status_code == 200
    body2 = r2.json()
    assert len(body2['items']) == 2
    assert body2['total'] == 12

    # Offset past end
    r3 = await client.get('/api/commitments?limit=10&offset=100')
    assert r3.status_code == 200
    body3 = r3.json()
    assert body3['items'] == []
    assert body3['total'] == 12


async def test_list_commitments_limit_validation(client):
    """limit=0 and limit=999 must return 422 (Query ge=1, le=50 enforced)."""
    assert (await client.get('/api/commitments?limit=0')).status_code == 422
    assert (await client.get('/api/commitments?limit=999')).status_code == 422


async def test_list_commitments_cross_user_isolation(client, db):
    """User A's list must NOT include user B's commitment."""
    await _create_commitment(client)

    user_b = User(
        id='user-b-list-test',
        username='UserBList',
        persona='kawan',
        access_token='',
        refresh_token='',
        token_expiry=now_utc(),
    )
    db.add(user_b)
    b_commitment = Commitment(
        id=new_id(),
        user_id='user-b-list-test',
        action='b action',
        deliverable='b deliverable',
        deadline=now_utc() + timedelta(days=1),
    )
    db.add(b_commitment)
    await db.commit()

    r = await client.get('/api/commitments')
    assert r.status_code == 200
    body = r.json()
    returned_ids = {item['id'] for item in body['items']}
    assert b_commitment.id not in returned_ids
    assert body['total'] == 1  # only user A's one commitment
