"""Secondary evidence-vision judge, used ONLY as a fallback when the primary TEE vision
call fails (see pipeline.safe_judge). Deliberately low-profile and self-contained; returns
None on any problem so the caller can degrade to a neutral 'unclear' verdict."""

from __future__ import annotations

import base64
import json
import logging
from typing import TYPE_CHECKING

import httpx

from app.config import settings
from app.contracts import Verdict
from app.prompts import JUDGE_SYSTEM

if TYPE_CHECKING:
    from app.models import Commitment

logger = logging.getLogger("kawan.fallback_judge")

_MODEL = "gemini-3.1-flash-lite"
_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{_MODEL}:generateContent"

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["pass", "fail", "unclear"]},
        "confidence": {"type": "number"},
        "observations": {"type": "array", "items": {"type": "string"}},
        "reasoning": {"type": "string"},
        "follow_up_request": {"type": "string"},
    },
    "required": ["verdict", "confidence", "observations", "reasoning"],
}


def _mime(b64: str) -> str:
    try:
        head = base64.b64decode(b64[:24])
        if head.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
            return "image/webp"
        if head.startswith(b"GIF8"):
            return "image/gif"
    except Exception:
        pass
    return "image/png"


def _commitment_line(commitment: "Commitment") -> str:
    return (
        f"Commitment: I will {commitment.action} {commitment.deliverable} "
        f"by {commitment.deadline:%Y-%m-%d %H:%M}."
    )


async def _call_gemini(parts: list[dict]) -> Verdict | None:
    """POST a single user turn to the secondary provider and parse its structured verdict.
    Returns None if the provider is unconfigured or anything at all goes wrong -- this path
    must never raise, so the caller can degrade to a neutral 'unclear'."""
    if not settings.gemini_api_key:
        return None
    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": _RESPONSE_SCHEMA},
    }
    try:
        async with httpx.AsyncClient(timeout=60) as http:
            resp = await http.post(_URL, headers={"x-goog-api-key": settings.gemini_api_key}, json=payload)
        if resp.status_code != 200:
            logger.warning("fallback judge non-200: %s %s", resp.status_code, resp.text[:200])
            return None
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        data = json.loads(text)
        return Verdict(
            data["verdict"],
            float(data["confidence"]),
            list(data.get("observations") or []),
            data["reasoning"],
            data.get("follow_up_request"),
        )
    except Exception as exc:  # noqa: BLE001 - fallback must never raise; degrade to None
        logger.warning("fallback judge failed: %r", exc)
        return None


async def judge_screenshot(commitment: "Commitment", image_b64: str) -> Verdict | None:
    """Judge a screenshot via the secondary provider. Returns a Verdict, or None if the
    provider is unconfigured or the call fails (caller then degrades to 'unclear')."""
    prompt = (
        f"{JUDGE_SYSTEM}\n\n{_commitment_line(commitment)}\n"
        "Judge this screenshot as evidence of the deliverable. Return the JSON verdict."
    )
    return await _call_gemini([
        {"text": prompt},
        {"inline_data": {"mime_type": _mime(image_b64), "data": image_b64}},
    ])


async def judge_text(commitment: "Commitment", evidence_text: str) -> Verdict | None:
    """Judge text-based evidence (file contents or GitHub commits) via the secondary provider.
    Returns a Verdict, or None if unconfigured, the evidence is empty, or the call fails."""
    if not (evidence_text or "").strip():
        return None
    prompt = (
        f"{JUDGE_SYSTEM}\n\n{_commitment_line(commitment)}\n"
        f"Evidence:\n{evidence_text[:6000]}\n"
        "Judge whether this evidence shows real progress toward the deliverable. Return the JSON verdict."
    )
    return await _call_gemini([{"text": prompt}])
