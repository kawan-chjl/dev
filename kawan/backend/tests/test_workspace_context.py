"""C6: the workspace turn carries a server-assembled progress snapshot + the
frontend-held recent transcript, without ever gaining a hard-field write path."""

from datetime import timedelta

import app.wiring as wiring
from app import pipeline
from app.models import Checkin, Commitment, Evidence, User
from app.util import new_id, now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def _seed_active(db, **kw) -> Commitment:
    u = User(id=new_id(), username="u", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    c = Commitment(user_id=u.id, action="ship", deliverable="d",
                   deadline=now_utc() + timedelta(days=1), status="active", **kw)
    db.add(c)
    await db.commit()
    return c


def test_clamp_turns_bounds():
    out = pipeline.clamp_turns([{"role": "user", "content": f"m{i}"} for i in range(20)])
    assert len(out) == 8 and out[0]["content"] == "m12"  # last 8 only
    assert pipeline.clamp_turns([{"role": "bogus", "content": "x"}])[0]["role"] == "user"  # role normalized
    assert pipeline.clamp_turns([{"say": "legacy"}])[0]["content"] == "legacy"  # tolerant of {say}
    assert pipeline.clamp_turns([{"content": ""}]) == []  # empty dropped
    assert pipeline.clamp_turns(None) == []
    assert pipeline.clamp_turns([{"role": "user", "content": "z" * 2000}])[0]["content"] == "z" * 600  # capped


async def test_assemble_progress_shape(db):
    c = await _seed_active(db, evidence_type="screenshot", escalation=1)
    db.add(Checkin(commitment_id=c.id, kind="cadence", message="nothing today", escalation=1))
    db.add(Evidence(commitment_id=c.id, adapter="screenshot", verdict="pass", reasoning="site is live"))
    await db.commit()
    prog = await pipeline.assemble_progress(db, c)
    assert prog["status"] == "active"
    assert prog["escalation"] == 1 and prog["skip_days_left"] == 1
    assert prog["recent_checkins"][-1]["message"] == "nothing today"
    assert prog["latest_verdict"]["verdict"] == "pass"


async def test_workspace_route_passes_progress_and_transcript(client, monkeypatch):
    captured: dict = {}

    async def fake_ws(commitment, soft, says, recent_turns=None, progress=None):
        captured["recent_turns"] = recent_turns
        captured["progress"] = progress
        return {"response_type": "coaching", "say": "ok", "proposal": None, "emotion": "neutral"}

    monkeypatch.setattr(wiring.LLM, "workspace_turn", fake_ws)
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    await client.post(f"/api/commitments/{cid}/start")
    await client.post(f"/api/commitments/{cid}/check")  # a check-in (+ evidence) for the snapshot
    r = await client.post(f"/api/commitments/{cid}/workspace/turn",
                          json={"say": "where do I start?",
                                "recent_turns": [{"role": "user", "content": "earlier"},
                                                 {"role": "assistant", "content": "reply"}]})
    assert r.status_code == 200
    assert captured["progress"]["status"] == "active"
    assert captured["progress"]["recent_checkins"]  # the check-in is visible to the workspace call
    assert captured["recent_turns"] == [{"role": "user", "content": "earlier"},
                                        {"role": "assistant", "content": "reply"}]
