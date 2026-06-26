"""ScreenshotAdapter: builds the §9.3 multimodal message and maps the verdict;
returns 'unclear' (no spend) when no image was supplied. Offline (fake ChutesClient)."""

from datetime import datetime, timezone

from app.adapters.screenshot import ScreenshotAdapter
from app.contracts import EvidenceBundle


class _Commitment:
    user_id = "u1"
    action = "deploy"
    deliverable = "the site"
    deadline = datetime(2026, 7, 1, 18, 0, tzinfo=timezone.utc)


class _FakeChutes:
    def __init__(self, result):
        self.result = result
        self.calls = []

    async def structured(self, **kwargs):
        self.calls.append(kwargs)
        return self.result


async def test_judge_builds_image_message_and_maps_verdict():
    fake = _FakeChutes({"verdict": "pass", "confidence": 0.85,
                        "observations": ["the deployed site with the URL bar is visible"],
                        "reasoning": "visible work product matches the deliverable",
                        "follow_up_request": None})
    adapter = ScreenshotAdapter(fake)
    bundle = EvidenceBundle(adapter="screenshot", raw_ref={"filename": "shot.png"},
                            items=[{"b64": "aGVsbG8="}], summary="one uploaded screenshot")
    verdict = await adapter.judge(_Commitment(), bundle, None)

    assert verdict.verdict == "pass"
    call = fake.calls[0]
    from app.prompts import JUDGE_MODELS
    assert call["model"] == JUDGE_MODELS  # uses the configured vision-judge model(s)
    # the user message is multimodal: a text part + an image_url data URI
    parts = call["messages"][1]["content"]
    assert any(p.get("type") == "image_url" and "data:image/png;base64,aGVsbG8=" in p["image_url"]["url"]
               for p in parts)


async def test_judge_unclear_without_image():
    fake = _FakeChutes({})  # must not be called
    adapter = ScreenshotAdapter(fake)
    bundle = EvidenceBundle(adapter="screenshot", raw_ref={"filename": "x"}, items=[], summary="")
    verdict = await adapter.judge(_Commitment(), bundle, None)
    assert verdict.verdict == "unclear"
    assert fake.calls == []


async def test_judge_detects_jpeg_mime():
    # Magic-byte sniffing labels a JPEG upload image/jpeg, not hardcoded png (spec §10.3).
    import base64
    jpeg_b64 = base64.b64encode(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01").decode()
    fake = _FakeChutes({"verdict": "pass", "confidence": 0.8, "observations": ["x"],
                        "reasoning": "y", "follow_up_request": None})
    adapter = ScreenshotAdapter(fake)
    bundle = EvidenceBundle(adapter="screenshot", raw_ref={"filename": "shot.jpg"},
                            items=[{"b64": jpeg_b64}], summary="")
    await adapter.judge(_Commitment(), bundle, None)
    parts = fake.calls[0]["messages"][1]["content"]
    assert any(p.get("type") == "image_url" and p["image_url"]["url"].startswith("data:image/jpeg;base64,")
               for p in parts)
