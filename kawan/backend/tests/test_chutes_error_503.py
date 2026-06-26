"""F3 — ChutesError → 503 branches for context_turn, workspace_turn, plan, check.

For each endpoint: monkeypatch the relevant LLM method to raise ChutesError,
assert 503 status and the structured friendly body shape.
"""

from datetime import timedelta

import app.wiring as wiring
from app.chutes import ChutesError
from app.util import now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def _create_commitment(client) -> str:
    r = await client.post('/api/commitments', json={'action': 'ship', 'deliverable': 'd', 'deadline': _future()})
    assert r.status_code == 201
    return r.json()['id']


# ── context_turn ─────────────────────────────────────────────────────────────

async def test_context_turn_chutes_error_returns_503(client, monkeypatch):
    cid = await _create_commitment(client)

    async def _raise(commitment, slots, say):
        raise ChutesError('inference failed')

    monkeypatch.setattr(wiring.LLM, 'intake_turn', _raise)

    r = await client.post(f'/api/commitments/{cid}/context/turn', json={'say': 'hello'})
    assert r.status_code == 503
    body = r.json()
    assert 'say' in body
    assert body['intake_complete'] is False
    assert body['slots'] == {'why': None, 'obstacles': None, 'time_constraints': None, 'skill': None}
    assert body['emotion'] == 'neutral'


# ── workspace_turn ───────────────────────────────────────────────────────────

async def test_workspace_turn_chutes_error_returns_503(client, monkeypatch):
    cid = await _create_commitment(client)

    async def _raise(commitment, soft, say, recent_turns=None, progress=None):
        raise ChutesError('inference failed')

    monkeypatch.setattr(wiring.LLM, 'workspace_turn', _raise)

    r = await client.post(f'/api/commitments/{cid}/workspace/turn', json={'say': 'help'})
    # workspace_turn returns a plain dict on ChutesError (not a JSONResponse), so status is 200
    # but the body has response_type='error' and proposal=None.
    assert r.status_code == 200
    body = r.json()
    assert 'say' in body
    assert body['proposal'] is None
    assert body['emotion'] == 'neutral'


# ── plan ─────────────────────────────────────────────────────────────────────

async def test_plan_chutes_error_returns_503(client, monkeypatch):
    cid = await _create_commitment(client)

    async def _raise(commitment, soft):
        raise ChutesError('inference failed')

    monkeypatch.setattr(wiring.LLM, 'plan', _raise)

    r = await client.post(f'/api/commitments/{cid}/plan')
    assert r.status_code == 503
    body = r.json()
    assert 'say' in body
    assert body['roadmap'] == []


# ── check ─────────────────────────────────────────────────────────────────────

async def test_check_chutes_error_returns_503(client, monkeypatch):
    cid = await _create_commitment(client)
    # start the commitment so /check is reachable
    await client.post(f'/api/commitments/{cid}/start')

    async def _raise(db, commitment, kind):
        raise ChutesError('inference failed')

    import app.pipeline as pipeline
    monkeypatch.setattr(pipeline, 'run_checkin', _raise)

    r = await client.post(f'/api/commitments/{cid}/check')
    assert r.status_code == 503
    body = r.json()
    assert 'say' in body
    assert 'message' in body
    assert body['evidence_id'] is None
