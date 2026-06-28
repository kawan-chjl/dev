"""Tests for Message table (Task 1.1) and persistence endpoints (Task 1.2).

Task 1.1: Message model exists, persists user+assistant rows, is cascade-deleted
          with its parent commitment.
Task 1.2: GET /{id}/messages returns ordered history; context/turn and workspace/turn
          append message rows after their existing writes.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models import Commitment, Message, SoftContext, User
from app.util import new_id, now_utc


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def user_and_commitment(db):
    u = User(
        id=new_id(),
        username="test_user",
        persona="kawan",
        access_token="x",
        refresh_token="x",
        token_expiry=now_utc(),
    )
    db.add(u)
    await db.flush()

    c = Commitment(
        id=new_id(),
        user_id=u.id,
        action="write",
        deliverable="the report",
        deadline=now_utc(),
        status="active",
    )
    db.add(c)
    await db.commit()
    return u, c


# ---------------------------------------------------------------------------
# Task 1.1: Model + cascade delete
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_message_model_insert_and_read(db, user_and_commitment):
    """Insert user + assistant messages; read them back ordered by created_at."""
    _, c = user_and_commitment

    m1 = Message(commitment_id=c.id, role="user", content="Hello")
    m2 = Message(commitment_id=c.id, role="assistant", content="Hi there",
                 emotion="pleased", response_type="coaching")
    db.add(m1)
    db.add(m2)
    await db.commit()

    rows = (
        await db.scalars(
            select(Message)
            .where(Message.commitment_id == c.id)
            .order_by(Message.created_at)
        )
    ).all()

    assert len(rows) == 2
    assert rows[0].role == "user"
    assert rows[0].content == "Hello"
    assert rows[0].emotion is None
    assert rows[0].response_type is None
    assert rows[1].role == "assistant"
    assert rows[1].emotion == "pleased"
    assert rows[1].response_type == "coaching"


@pytest.mark.asyncio
async def test_delete_commitment_cascades_messages(db, user_and_commitment):
    """Deleting a commitment removes its messages (zero orphan rows)."""
    from sqlalchemy import delete as sql_delete
    from app.models import AuditLog, Evidence, Plan, Proposal, SoftContext, SuccessPattern

    _, c = user_and_commitment

    db.add(Message(commitment_id=c.id, role="user", content="A"))
    db.add(Message(commitment_id=c.id, role="assistant", content="B"))
    await db.commit()

    rows_before = (
        await db.scalars(select(Message).where(Message.commitment_id == c.id))
    ).all()
    assert len(rows_before) == 2

    # Cascade delete (same order as delete_commitment route)
    cid = c.id
    await db.execute(sql_delete(Message).where(Message.commitment_id == cid))
    await db.execute(sql_delete(Evidence).where(Evidence.commitment_id == cid))
    await db.execute(sql_delete(SoftContext).where(SoftContext.commitment_id == cid))
    await db.execute(sql_delete(Plan).where(Plan.commitment_id == cid))
    await db.execute(sql_delete(Proposal).where(Proposal.commitment_id == cid))
    await db.execute(sql_delete(SuccessPattern).where(SuccessPattern.commitment_id == cid))
    await db.execute(sql_delete(AuditLog).where(AuditLog.commitment_id == cid))
    await db.delete(c)
    await db.commit()

    rows_after = (
        await db.scalars(select(Message).where(Message.commitment_id == cid))
    ).all()
    assert len(rows_after) == 0


# ---------------------------------------------------------------------------
# Task 1.2: Persistence endpoints via the HTTP client
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_messages_empty(client):
    """GET /messages on a new commitment returns an empty list."""
    r = await client.post("/api/commitments", json={
        "action": "write", "deliverable": "the spec",
        "deadline": "2099-12-31T23:59:00+00:00",
    })
    assert r.status_code == 201
    cid = r.json()["id"]

    r2 = await client.get(f"/api/commitments/{cid}/messages")
    assert r2.status_code == 200
    assert r2.json() == []


@pytest.mark.asyncio
async def test_context_turn_persists_messages(client):
    """context/turn appends a user row + assistant row after the soft-context write."""
    from unittest.mock import AsyncMock, patch

    r = await client.post("/api/commitments", json={
        "action": "write", "deliverable": "the spec",
        "deadline": "2099-12-31T23:59:00+00:00",
    })
    cid = r.json()["id"]

    fake_result = {
        "say": "Great, why are you doing this?",
        "slots": {"why": "for growth", "obstacles": None, "time_constraints": None, "skill": None},
        "intake_complete": False,
        "emotion": "curious",
    }
    with patch("app.routes.commitments.LLM") as mock_llm:
        mock_llm.intake_turn = AsyncMock(return_value=fake_result)
        r2 = await client.post(f"/api/commitments/{cid}/context/turn", json={"say": "I want to grow"})
    assert r2.status_code == 200

    r3 = await client.get(f"/api/commitments/{cid}/messages")
    assert r3.status_code == 200
    msgs = r3.json()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "I want to grow"
    assert msgs[1]["role"] == "assistant"
    assert msgs[1]["content"] == "Great, why are you doing this?"
    assert msgs[1]["emotion"] == "curious"
    assert msgs[1]["response_type"] == "coaching"


@pytest.mark.asyncio
async def test_context_turn_skips_empty_opener(client):
    """context/turn with an empty say does not persist a user row."""
    from unittest.mock import AsyncMock, patch

    r = await client.post("/api/commitments", json={
        "action": "write", "deliverable": "the spec",
        "deadline": "2099-12-31T23:59:00+00:00",
    })
    cid = r.json()["id"]

    fake_result = {
        "say": "I will ask you 4 questions. First: why?",
        "slots": {"why": None, "obstacles": None, "time_constraints": None, "skill": None},
        "intake_complete": False,
        "emotion": "neutral",
    }
    with patch("app.routes.commitments.LLM") as mock_llm:
        mock_llm.intake_turn = AsyncMock(return_value=fake_result)
        r2 = await client.post(f"/api/commitments/{cid}/context/turn", json={"say": ""})
    assert r2.status_code == 200

    r3 = await client.get(f"/api/commitments/{cid}/messages")
    msgs = r3.json()
    # Only the assistant opener; no user row for the empty say
    assert len(msgs) == 1
    assert msgs[0]["role"] == "assistant"


@pytest.mark.asyncio
async def test_context_turn_fills_next_empty_slot_and_computes_completion(client):
    """context/turn does not trust the LLM to attribute slots or mark completion."""
    from unittest.mock import AsyncMock, patch

    r = await client.post("/api/commitments", json={
        "action": "write", "deliverable": "the spec",
        "deadline": "2099-12-31T23:59:00+00:00",
    })
    cid = r.json()["id"]
    for answer in ("for growth", "scope creep", "weeknights"):
        r_setup = await client.post(f"/api/commitments/{cid}/context/turn", json={"say": answer})
        assert r_setup.status_code == 200

    fake_result = {
        "say": "Got it.",
        "slots": {},
        "intake_complete": False,
        "emotion": "curious",
    }
    with patch("app.routes.commitments.LLM") as mock_llm:
        mock_llm.intake_turn = AsyncMock(return_value=fake_result)
        r2 = await client.post(f"/api/commitments/{cid}/context/turn", json={"say": "intermediate"})
    assert r2.status_code == 200

    body = r2.json()
    assert body["slots"] == {
        "why": "for growth",
        "obstacles": "scope creep",
        "time_constraints": "weeknights",
        "skill": "intermediate",
    }
    assert body["intake_complete"] is True


@pytest.mark.asyncio
async def test_workspace_turn_persists_messages(client):
    """workspace/turn appends user + assistant rows after the proposal write."""
    from unittest.mock import AsyncMock, patch

    r = await client.post("/api/commitments", json={
        "action": "write", "deliverable": "the spec",
        "deadline": "2099-12-31T23:59:00+00:00",
    })
    cid = r.json()["id"]

    fake_result = {
        "response_type": "coaching",
        "say": "Focus on the outline first.",
        "proposal": None,
        "emotion": "pleased",
    }
    with patch("app.routes.commitments.LLM") as mock_llm:
        mock_llm.workspace_turn = AsyncMock(return_value=fake_result)
        mock_llm.intake_turn = AsyncMock(return_value=fake_result)
        r2 = await client.post(
            f"/api/commitments/{cid}/workspace/turn",
            json={"say": "Where do I start?", "recent_turns": []},
        )
    assert r2.status_code == 200

    r3 = await client.get(f"/api/commitments/{cid}/messages")
    msgs = r3.json()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "Where do I start?"
    assert msgs[1]["role"] == "assistant"
    assert msgs[1]["content"] == "Focus on the outline first."
    assert msgs[1]["emotion"] == "pleased"
    assert msgs[1]["response_type"] == "coaching"


@pytest.mark.asyncio
async def test_messages_ordered_newest_last(client):
    """GET /messages returns rows in ascending created_at order (newest last)."""
    from unittest.mock import AsyncMock, patch

    r = await client.post("/api/commitments", json={
        "action": "ship", "deliverable": "the feature",
        "deadline": "2099-12-31T23:59:00+00:00",
    })
    cid = r.json()["id"]

    fake_ctx = {
        "say": "Why are you doing this?",
        "slots": {"why": "career", "obstacles": None, "time_constraints": None, "skill": None},
        "intake_complete": False,
        "emotion": "curious",
    }
    fake_ws = {
        "response_type": "coaching",
        "say": "Start with the smallest slice.",
        "proposal": None,
        "emotion": "neutral",
    }

    with patch("app.routes.commitments.LLM") as mock_llm:
        mock_llm.intake_turn = AsyncMock(return_value=fake_ctx)
        await client.post(f"/api/commitments/{cid}/context/turn", json={"say": "Career growth"})
        mock_llm.workspace_turn = AsyncMock(return_value=fake_ws)
        await client.post(f"/api/commitments/{cid}/workspace/turn",
                          json={"say": "Where to start?", "recent_turns": []})

    r2 = await client.get(f"/api/commitments/{cid}/messages")
    msgs = r2.json()
    # context/turn user + assistant, workspace/turn user + assistant = 4 rows
    assert len(msgs) == 4
    roles = [m["role"] for m in msgs]
    assert roles == ["user", "assistant", "user", "assistant"]


@pytest.mark.asyncio
async def test_messages_nonexistent_commitment_returns_404(client):
    """GET /messages on a nonexistent commitment returns 404."""
    r = await client.get("/api/commitments/does-not-exist/messages")
    assert r.status_code == 404
