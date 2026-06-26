"""Manual live smoke test (NOT run in CI — needs a real token). Verifies one real
structured call end-to-end. Usage: KAWAN_CHUTES_API_KEY=cpk_... uv run python scripts/smoke_chutes.py"""

import asyncio
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))  # make `app` importable when run directly

from app.chutes import ChutesClient  # noqa: E402
from app.config import settings  # noqa: E402
from app.personas import get_persona  # noqa: E402
from app.prompts import INTAKE_SCHEMA, intake_system  # noqa: E402


class _CpkTokens:
    async def get_access_token(self, user_id: str) -> str:
        return settings.chutes_api_key

    async def refresh(self, user_id: str) -> str:
        return settings.chutes_api_key


async def main() -> None:
    assert settings.chutes_api_key, "set KAWAN_CHUTES_API_KEY to a cpk_ token"
    chutes = ChutesClient(_CpkTokens(), base_url=settings.chutes_inference_base_url)
    hero = get_persona("kawan")
    out = await chutes.structured(
        user_id="smoke", model=hero.chat_models,
        messages=[{"role": "system", "content": intake_system(hero, {"why": None, "obstacles": None,
                                                                      "time_constraints": None, "skill": None})},
                  {"role": "user", "content": "I want to ship my portfolio site this week"}],
        schema=INTAKE_SCHEMA, schema_name="intake",
    )
    print("intake_turn →", out)


if __name__ == "__main__":
    asyncio.run(main())
