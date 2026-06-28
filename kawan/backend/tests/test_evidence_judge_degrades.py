"""Evidence judging degrades a flaky/slow inference call to a neutral 'unclear'
verdict (HTTP 200) instead of bubbling a 500 -- spec §9.3 (unclear never punishes).

Regression for the live `/evidence` 500 that blocked the demo check-in: a stalled
TEE vision model hung for >2 min, then the unhandled ChutesError became a 500.
"""

from datetime import timedelta
from types import SimpleNamespace

import app.pipeline as pipeline
import app.wiring as wiring
from app.chutes import ChutesError
from app.contracts import EvidenceBundle
from app.util import now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def _active_commitment_id(client) -> str:
    r = await client.post(
        "/api/commitments",
        json={"action": "ship", "deliverable": "d", "deadline": _future()},
    )
    assert r.status_code == 201
    cid = r.json()["id"]
    r = await client.post(f"/api/commitments/{cid}/start")
    assert r.status_code == 200
    return cid


async def test_image_evidence_inference_failure_returns_unclear_not_500(client, monkeypatch):
    """A ChutesError from the vision judge degrades to a 200 'unclear', not a 500."""

    async def _raise(commitment, bundle, llm):
        raise ChutesError("vision model unavailable")

    monkeypatch.setattr(wiring.ADAPTERS["screenshot"], "judge", _raise)

    cid = await _active_commitment_id(client)
    small_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    r = await client.post(
        f"/api/commitments/{cid}/evidence",
        files={"file": ("shot.png", small_png, "image/png")},
    )
    assert r.status_code == 200
    assert r.json()["verdict"] == "unclear"


async def test_safe_judge_times_out_to_unclear(monkeypatch):
    """A judge that hangs past the ceiling is cancelled and degrades to 'unclear'."""
    import asyncio

    monkeypatch.setattr(pipeline, "EVIDENCE_JUDGE_TIMEOUT", 0.05)

    class _SlowAdapter:
        async def judge(self, commitment, bundle, llm):
            await asyncio.sleep(5)
            raise AssertionError("should have been cancelled before returning")

    bundle = EvidenceBundle(adapter="screenshot", raw_ref={}, items=[{"b64": "x"}], summary="s")
    v = await pipeline.safe_judge(_SlowAdapter(), SimpleNamespace(id="x"), bundle)
    assert v.verdict == "unclear"


async def test_image_evidence_uses_fallback_judge_on_primary_failure(monkeypatch):
    """When the primary judge fails on image evidence, safe_judge uses the fallback verdict."""
    import app.fallback_judge as fb_mod
    from app.contracts import Verdict

    class _FailAdapter:
        async def judge(self, commitment, bundle, llm):
            raise ChutesError("primary vision down")

    async def _fake_fallback(commitment, image_b64):
        return Verdict("pass", 0.9, ["portfolio site visible"], "looks deployed")

    monkeypatch.setattr(fb_mod, "judge_screenshot", _fake_fallback)
    bundle = EvidenceBundle(adapter="screenshot", raw_ref={}, items=[{"b64": "x"}], summary="s")
    v = await pipeline.safe_judge(_FailAdapter(), SimpleNamespace(id="x"), bundle)
    assert v.verdict == "pass"


async def test_image_evidence_falls_back_to_unclear_when_fallback_unavailable(monkeypatch):
    """If the fallback returns None (unconfigured/failed), safe_judge still degrades to 'unclear'."""
    import app.fallback_judge as fb_mod

    class _FailAdapter:
        async def judge(self, commitment, bundle, llm):
            raise ChutesError("primary vision down")

    async def _none_fallback(commitment, image_b64):
        return None

    monkeypatch.setattr(fb_mod, "judge_screenshot", _none_fallback)
    bundle = EvidenceBundle(adapter="screenshot", raw_ref={}, items=[{"b64": "x"}], summary="s")
    v = await pipeline.safe_judge(_FailAdapter(), SimpleNamespace(id="x"), bundle)
    assert v.verdict == "unclear"


async def test_safe_judge_passthrough_on_success(monkeypatch):
    """When the judge succeeds, safe_judge returns its verdict unchanged."""
    from app.contracts import Verdict

    class _OkAdapter:
        async def judge(self, commitment, bundle, llm):
            return Verdict("pass", 0.9, ["looks good"], "verified")

    bundle = EvidenceBundle(adapter="screenshot", raw_ref={}, items=[{"b64": "x"}], summary="s")
    v = await pipeline.safe_judge(_OkAdapter(), SimpleNamespace(id="x"), bundle)
    assert v.verdict == "pass"
