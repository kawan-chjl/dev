"""Integration wiring: the config flag selects the backend; judge_upload threads the
image into the bundle; the check-in snapshot carries user_id. All offline."""

from datetime import timedelta

import app.pipeline as pipeline
from app.config import settings
from app.contracts import Verdict
from app.models import Commitment, User
from app.util import now_utc


def test_default_backend_is_stub():
    # Safe default: nothing breaks for teammates/CI; the demo machine sets 'chutes'.
    assert settings.ai_backend == "stub"


async def test_judge_upload_threads_image_into_bundle(db, monkeypatch):
    captured = {}

    class _Capture:
        type = "screenshot"
        trust = "medium"

        async def judge(self, c, bundle, llm):
            captured["items"] = bundle.items
            return Verdict("pass", 0.9, ["ok"], "ok")

    monkeypatch.setattr(pipeline, "adapter_for", lambda _t: _Capture())

    u = User(id="u1", username="u", access_token="", refresh_token="", token_expiry=now_utc())
    db.add(u)
    c = Commitment(user_id="u1", action="ship", deliverable="d",
                   deadline=now_utc() + timedelta(days=1), status="active")
    db.add(c)
    await db.commit()

    await pipeline.judge_upload(db, c, {"filename": "shot.png"}, image_b64="aGVsbG8=")
    assert captured["items"] == [{"b64": "aGVsbG8="}]


async def test_checkin_snapshot_includes_user_id(db, monkeypatch):
    seen = {}

    async def _fake_checkin_line(status):
        seen.update(status)
        return {"say": "noted", "emotion": "neutral", "escalate": False}

    # Stub adapter (default) finds no evidence; we only assert the snapshot shape.
    monkeypatch.setattr(pipeline.LLM, "checkin_line", _fake_checkin_line)

    u = User(id="u2", username="u", access_token="", refresh_token="", token_expiry=now_utc())
    db.add(u)
    c = Commitment(user_id="u2", action="ship", deliverable="d",
                   deadline=now_utc() + timedelta(days=1), status="active",
                   evidence_type="github")
    db.add(c)
    await db.commit()

    await pipeline.run_checkin(db, c, "on_demand")
    assert seen.get("user_id") == "u2"
