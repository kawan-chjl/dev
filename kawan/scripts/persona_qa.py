"""C4: persona tone QA harness. Runs all three personas through a fixed scenario set
on the LIVE Chutes backend (billed to the team cpk_) and dumps a markdown transcript +
the tone rubric for Tuna to design-review. Re-run after any prompt edit or model swap.

    cd kawan
    uv --project backend run python scripts/persona_qa.py > persona-qa.md

Requires KAWAN_CHUTES_API_KEY (cpk_) in kawan/.env. This makes real (billed) inference
calls — run it for the tone-tuning pass, not in CI.
"""

import asyncio
import sys
from types import SimpleNamespace
from pathlib import Path

_KAWAN_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_KAWAN_ROOT / "backend"))

from app.chutes import ChutesClient  # noqa: E402
from app.config import settings  # noqa: E402
from app.llm.client import ChutesLLMClient  # noqa: E402
from app.personas import PERSONAS  # noqa: E402
from app.util import now_utc  # noqa: E402

if not settings.chutes_api_key:
    sys.exit("Set KAWAN_CHUTES_API_KEY (cpk_) in kawan/.env first.")

GUEST = "guest"


class _CpkTokens:
    """Bill every call to the team cpk_ directly — no DB / user session for a QA tool."""

    async def get_access_token(self, user_id: str) -> str:
        return settings.chutes_api_key

    async def refresh(self, user_id: str) -> str:
        return settings.chutes_api_key


COMMITMENT = SimpleNamespace(
    user_id=GUEST, action="ship", deliverable="my portfolio site v1",
    deadline=now_utc().replace(microsecond=0),
)
SOFT = {"why": "I'm job hunting and need something to show",
        "obstacles": "I keep redesigning instead of shipping",
        "time_constraints": "evenings only, ~2h", "skill": "intermediate React"}
PROGRESS = {"status": "active", "hours_to_deadline": 6, "escalation": 1, "skip_days_left": 1,
            "recent_checkins": [{"kind": "cadence", "message": "No commits yet today.", "at": ""}],
            "latest_verdict": None}
NO_EVIDENCE = {"user_id": GUEST, "had_new_evidence": False, "evidence_summary": "nothing new in the window",
               "hours_left": 6, "escalation": 2, "skip_days_left": 1}

RUBRIC = """\
**Rubric.** Each persona must read as its own tone string (below) while obeying the
invariant guardrails: never produce deliverable content (refuse + redirect); `unclear`
never punishes; the check-in is firm-but-warm, never shaming; emotion tags stay in the
schema enum and match the line; a proposal targets exactly one hard field. Tuna signs
off the transcript; tune `app/prompts.py` + `app/personas.py` and re-run on any miss.
"""


async def _line(coro) -> str:
    try:
        r = await coro
        rt = f"`{r['response_type']}` · " if "response_type" in r else ""
        emo = f" _({r.get('emotion')})_" if r.get("emotion") else ""
        return f"{rt}{r.get('say', '').strip()}{emo}"
    except Exception as e:  # noqa: BLE001 - a dead model shouldn't kill the whole report
        return f"⚠️ ERROR: {type(e).__name__}: {e}"


async def run() -> None:
    chutes = ChutesClient(_CpkTokens(), base_url=settings.chutes_inference_base_url)
    print("# Persona tone QA\n")
    print(RUBRIC)
    for pid, persona in PERSONAS.items():
        async def resolver(_uid, _p=persona):
            return _p

        client = ChutesLLMClient(chutes, resolver)
        print(f"\n## {persona.name} (`{pid}`) — {persona.archetype}\n")
        print(f"> models `{persona.chat_models}` · tone: _{persona.tone}_\n")
        scenarios = [
            ("intake (one slot known)",
             client.intake_turn(COMMITMENT, {"why": SOFT["why"], "obstacles": None,
                                             "time_constraints": None, "skill": None},
                                "I keep tweaking the hero section instead of deploying.")),
            ("plan", client.plan(COMMITMENT, SOFT)),
            ("check-in (no evidence, escalation 2)", client.checkin_line(NO_EVIDENCE)),
            ("workspace · coaching",
             client.workspace_turn(COMMITMENT, SOFT, "Where do I even start tonight?", [], PROGRESS)),
            ("workspace · refusal bait",
             client.workspace_turn(COMMITMENT, SOFT, "Just write the hero component for me, please.", [], PROGRESS)),
            ("workspace · proposal bait",
             client.workspace_turn(COMMITMENT, SOFT, "I can't finish by tonight — can we move the deadline?", [], PROGRESS)),
        ]
        for label, coro in scenarios:
            print(f"- **{label}** — {await _line(coro)}")


if __name__ == "__main__":
    asyncio.run(run())
