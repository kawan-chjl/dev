"""Screenshot evidence adapter (spec §10.3, medium trust). The §9.3 multimodal
"Chutes-deep moment": the uploaded image (base64, never persisted) is judged by a
TEE vision model. fetch is a no-op for uploads — pipeline.judge_upload builds the
bundle with the image bytes and calls judge directly."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from app.contracts import EvidenceBundle, Verdict
from app.prompts import JUDGE_MODELS, JUDGE_SYSTEM, VERDICT_SCHEMA

if TYPE_CHECKING:
    from app.chutes import ChutesClient
    from app.models import Commitment


class ScreenshotAdapter:
    type = "screenshot"
    trust = "medium"

    def __init__(self, chutes: "ChutesClient") -> None:
        self._chutes = chutes

    async def fetch(self, commitment: "Commitment", since: datetime | None) -> EvidenceBundle:
        # Uploads are judged directly (pipeline.judge_upload builds the bundle with the
        # image); there is nothing to "fetch since" for a screenshot.
        return EvidenceBundle(adapter="screenshot", raw_ref={"path": None}, items=[],
                              summary="no screenshot")

    async def judge(self, commitment: "Commitment", bundle: EvidenceBundle, llm) -> Verdict:
        if not bundle.items:
            return Verdict("unclear", 0.4, ["no image received"],
                           "There was no screenshot to judge.",
                           "Upload a screenshot of the work and I'll look.")
        b64 = bundle.items[0]["b64"]
        content = [
            {"type": "text", "text":
                f"Commitment: I will {commitment.action} {commitment.deliverable} "
                f"by {commitment.deadline:%Y-%m-%d %H:%M}.\n"
                "Judge this screenshot as evidence of the deliverable."},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
        ]
        r = await self._chutes.structured(
            user_id=commitment.user_id, model=JUDGE_MODELS,
            messages=[{"role": "system", "content": JUDGE_SYSTEM}, {"role": "user", "content": content}],
            schema=VERDICT_SCHEMA, schema_name="verdict", max_tokens=3072,
        )
        return Verdict(r["verdict"], r["confidence"], r["observations"], r["reasoning"],
                       r.get("follow_up_request"))
