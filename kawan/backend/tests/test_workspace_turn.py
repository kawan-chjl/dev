"""B5 — POST /api/commitments/{id}/workspace/turn tests.

Five cases:
  - Happy path: 200, say non-empty, emotion in the 6-value set, proposal null (stub).
  - Proposal persistence: monkeypatched LLM returns response_type='proposal'; asserts
    proposal_id in response and a Proposal row in the DB.
  - 404 unknown id.
  - 404 foreign commitment (commitment belongs to a different user).
  - 401 unauthenticated (no session cookie).
"""

from datetime import timedelta

import httpx
from sqlalchemy import select

import app.wiring as wiring
from app.models import Commitment, Proposal, User
from app.util import new_id, now_utc

_EMOTIONS = {"neutral", "curious", "pleased", "skeptical", "concerned", "proud"}


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def _create_and_start(client) -> str:
    """Create a commitment via the guest client and return its id."""
    r = await client.post("/api/commitments",
                          json={"action": "ship", "deliverable": "d", "deadline": _future()})
    assert r.status_code == 201
    return r.json()["id"]


# ── Happy path ───────────────────────────────────────────────────────────────────────

async def test_workspace_turn_happy_path(client):
    cid = await _create_and_start(client)
    r = await client.post(f"/api/commitments/{cid}/workspace/turn", json={"say": "help me focus"})
    assert r.status_code == 200
    body = r.json()
    assert body["say"]  # non-empty
    assert body["emotion"] in _EMOTIONS
    assert body["proposal"] is None
    assert "proposal_id" not in body


# ── Proposal persistence (monkeypatched LLM) ─────────────────────────────────────────

async def test_workspace_turn_persists_proposal(client, db, monkeypatch):
    cid = await _create_and_start(client)

    async def _stub_proposal(commitment, soft_context, user_says, recent_turns=None, progress=None):
        return {
            "response_type": "proposal",
            "say": "What if you moved the deadline?",
            "proposal": {"field": "deadline", "proposed_value": _future(), "reason": "more time"},
            "emotion": "curious",
        }

    monkeypatch.setattr(wiring.LLM, "workspace_turn", _stub_proposal)

    r = await client.post(f"/api/commitments/{cid}/workspace/turn", json={"say": "I need more time"})
    assert r.status_code == 200
    body = r.json()
    assert "proposal_id" in body

    prop = await db.scalar(select(Proposal).where(Proposal.commitment_id == cid))
    assert prop is not None
    assert prop.field == "deadline"
    assert prop.id == body["proposal_id"]


# ── 404 unknown id ────────────────────────────────────────────────────────────────────

async def test_workspace_turn_404_unknown(client):
    r = await client.post("/api/commitments/does-not-exist/workspace/turn", json={"say": "hi"})
    assert r.status_code == 404


# ── 404 foreign commitment ────────────────────────────────────────────────────────────

async def test_workspace_turn_404_foreign(client, db):
    """Seed a commitment under a different user; the guest client must get 404."""
    other = User(id=new_id(), username="other", access_token="x", refresh_token="y",
                 token_expiry=now_utc() + timedelta(hours=1))
    db.add(other)
    await db.flush()
    c = Commitment(user_id=other.id, action="ship", deliverable="d",
                   deadline=now_utc() + timedelta(days=1))
    db.add(c)
    await db.commit()

    r = await client.post(f"/api/commitments/{c.id}/workspace/turn", json={"say": "hi"})
    assert r.status_code == 404


# ── 401 unauthenticated ───────────────────────────────────────────────────────────────

async def test_workspace_turn_401_unauthenticated():
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as unauthenticated:
        r = await unauthenticated.post("/api/commitments/any-id/workspace/turn", json={"say": "hi"})
    assert r.status_code == 401
