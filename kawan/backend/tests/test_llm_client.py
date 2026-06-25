# kawan/backend/tests/test_llm_client.py
"""ChutesLLMClient: maps the four calls to ChutesClient.structured with the right
model/schema, and passes the billing user_id through. Fully offline (fake client)."""

from datetime import datetime, timezone

from app.llm.client import ChutesLLMClient
from app.personas import get_persona


class _FakeChutes:
    """Captures structured() kwargs; returns a canned, schema-shaped dict."""

    def __init__(self, result):
        self.result = result
        self.calls: list[dict] = []

    async def structured(self, **kwargs):
        self.calls.append(kwargs)
        return self.result


async def _hero_resolver(user_id):
    return get_persona("kawan")


class _Commitment:
    user_id = "u1"
    action = "ship"
    deliverable = "portfolio v1"
    deadline = datetime(2026, 7, 1, 18, 0, tzinfo=timezone.utc)


async def test_intake_turn_uses_hero_model_and_billing_user():
    fake = _FakeChutes({"say": "Why now?", "slots": {"why": "job", "obstacles": None,
                        "time_constraints": None, "skill": None},
                        "intake_complete": False, "emotion": "curious"})
    llm = ChutesLLMClient(fake, _hero_resolver)
    out = await llm.intake_turn(_Commitment(), {"why": None, "obstacles": None,
                                                "time_constraints": None, "skill": None}, "because job hunt")
    assert out["slots"]["why"] == "job"
    call = fake.calls[0]
    assert call["user_id"] == "u1"
    assert call["model"] == get_persona("kawan").chat_models
    assert call["schema_name"] == "intake"
    # the user's utterance reaches the model
    assert any("because job hunt" in str(m.get("content")) for m in call["messages"])


async def test_checkin_line_reads_user_id_from_status():
    fake = _FakeChutes({"say": "There it is.", "emotion": "pleased", "escalate": False})
    llm = ChutesLLMClient(fake, _hero_resolver)
    out = await llm.checkin_line({"user_id": "u1", "had_new_evidence": True,
                                  "evidence_summary": "1 commit", "hours_left": 5,
                                  "escalation": 0, "skip_days_left": 1})
    assert out["escalate"] is False
    assert fake.calls[0]["user_id"] == "u1"
    assert fake.calls[0]["schema_name"] == "checkin"


async def test_workspace_turn_passes_schema_and_user():
    fake = _FakeChutes({"response_type": "refusal", "say": "Not my job — what's your next move?",
                        "proposal": None, "emotion": "skeptical"})
    llm = ChutesLLMClient(fake, _hero_resolver)
    out = await llm.workspace_turn(_Commitment(), {"why": "job"}, "write the code for me")
    assert out["response_type"] == "refusal"
    assert fake.calls[0]["schema_name"] == "workspace"
    assert fake.calls[0]["user_id"] == "u1"
