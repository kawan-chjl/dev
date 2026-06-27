"""Deterministic Lane-C stand-ins (ADR-0001). They let B3/B4 run end-to-end before
Lane C lands, and — because they are deterministic — they also serve as scripted
demo levers. Every stub is obviously a stub; none of this is the real adapter/judge.

Lane C replaces these behind the identical signatures in app/contracts.py.
"""

from __future__ import annotations

from datetime import datetime

from app.contracts import EvidenceBundle, Verdict
from app.models import Commitment


class StubGitHubAdapter:
    type = "github"
    trust = "high"

    async def fetch(self, commitment: Commitment, since: datetime | None) -> EvidenceBundle:
        items = [{"sha": "abc1234", "message": "deploy skeleton to vercel", "total": 42}]
        return EvidenceBundle(adapter="github", raw_ref={"shas": ["abc1234"]}, items=items,
                              summary="1 new non-trivial commit: 'deploy skeleton to vercel'")

    async def judge(self, commitment: Commitment, bundle: EvidenceBundle, llm) -> Verdict:
        if not bundle.items:
            return Verdict("unclear", 0.5, ["no new commits in window"],
                           "Nothing fetched since the last check.", "Push something and I'll look again.")
        return Verdict("pass", 0.9, [f"commit '{bundle.items[0]['message']}' relates to the deliverable"],
                       "New non-trivial commit found in window.")


class StubFileAdapter:
    type = "file"
    trust = "medium"

    async def fetch(self, commitment: Commitment, since: datetime | None) -> EvidenceBundle:
        return EvidenceBundle(adapter="file", raw_ref={"filename": "(stub)"}, items=[],
                              summary="no file")

    async def judge(self, commitment: Commitment, bundle: EvidenceBundle, llm) -> Verdict:
        if not bundle.items:
            return Verdict("unclear", 0.4, ["no file received"], "No file supplied.", None)
        return Verdict("pass", 0.85, ["document content relates to the deliverable"],
                       "File content matches the commitment.")


class StubScreenshotAdapter:
    type = "screenshot"
    trust = "medium"

    async def fetch(self, commitment: Commitment, since: datetime | None) -> EvidenceBundle:
        return EvidenceBundle(adapter="screenshot", raw_ref={"path": "(stub)"}, items=["image"],
                              summary="one uploaded screenshot")

    async def judge(self, commitment: Commitment, bundle: EvidenceBundle, llm) -> Verdict:
        return Verdict("pass", 0.85, ["the screenshot shows the deployed site with the URL bar visible"],
                       "Visible work product matches the deliverable.")


class StubLLMClient:
    """Canned, schema-shaped responses for the four §9.2 calls."""

    async def intake_turn(self, commitment: Commitment, soft_context: dict, user_says: str) -> dict:
        slots = {k: (soft_context.get(k) or (user_says if k == "why" else None))
                 for k in ("why", "obstacles", "time_constraints", "skill")}
        complete = all(slots.values())
        say = "Got it." if complete else "Why now — what's driving this one?"
        return {"say": say, "slots": slots, "intake_complete": complete, "emotion": "curious"}

    async def plan(self, commitment: Commitment, soft_context: dict) -> dict:
        return {
            "roadmap": [
                {"order": 1, "title": "Deploy a skeleton first", "est_minutes": 30, "note": "front-load the risky part"},
                {"order": 2, "title": "Fill in content", "est_minutes": 90, "note": "ugly counts"},
            ],
            "front_load_reason": "your named obstacle is endless polish",
            "suggested_evidence": {"type": commitment.evidence_type, "reason": "matches how you work"},
            "suggested_cadence": commitment.cadence,
            "suggested_stake": {"enabled": False, "reason": "optional"},
            "say": "Here's the shape. Deploy early so polish can't eat you.",
        }

    async def checkin_line(self, status: dict) -> dict:
        had = status.get("had_new_evidence")
        if had:
            return {"say": "There it is. Noted.", "emotion": "pleased", "escalate": False}
        return {"say": "Nothing new today. What's the 20-minute version tonight?", "emotion": "concerned", "escalate": True}

    async def workspace_turn(self, commitment: Commitment, soft_context: dict, user_says: str,
                             recent_turns: list[dict] | None = None, progress: dict | None = None) -> dict:
        return {"response_type": "coaching", "say": "Timebox it, ship it ugly. Deal?", "proposal": None, "emotion": "neutral"}
