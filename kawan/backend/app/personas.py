"""Persona presets (spec §11.1, §11.3). A persona is a stateless preset the
messenger wears — tone fragment + Live2D model + Piper voice + Chutes model id.
Switching it changes the messenger, never the Commitment state. The hero ('kawan')
gets the deep tone QA; the two variants ship functional (spec §11.2)."""

from __future__ import annotations

from dataclasses import dataclass

# Conversational calls vary the model per persona (spec §11.1), but ONLY across models
# that return the JSON in `content`. Reasoning models (Qwen3.6, Qwen3.5-397B, Kimi-K2.6)
# intermittently emit to reasoning_content and leave `content` null — unusable for our
# structured() parse, and Chutes' 200-failover won't catch it (ADR-0005, verified via
# scripts/smoke_chutes.py --invoke). gemma-4 + DeepSeek-V3.2 are the reliable pair.
_GEMMA = "google/gemma-4-31B-turbo-TEE"
_DEEPSEEK = "deepseek-ai/DeepSeek-V3.2-TEE"


@dataclass(frozen=True)
class Persona:
    id: str
    name: str
    archetype: str
    live2d: str
    voice: str
    chat_models: str  # "primary,failover" — passed straight to ChutesClient.structured
    tone: str


PERSONAS: dict[str, Persona] = {
    "kawan": Persona(
        id="kawan", name="Kawan", archetype="skeptical concierge",
        live2d="models/haru_greeter", voice="en_US-amy-medium",
        chat_models=f"{_GEMMA},{_DEEPSEEK}",
        tone="warm, teasing, allergic to excuses; short sentences; never preachy",
    ),
    "adik": Persona(
        id="adik", name="Adik", archetype="gentle cheerleader",
        live2d="models/hiyori", voice="en_US-amy-low",
        chat_models=f"{_DEEPSEEK},{_GEMMA}",
        tone="soft encouragement, worried-not-stern; believes in you out loud",
    ),
    "cik_maid": Persona(
        id="cik_maid", name="Cik Maid", archetype="playful taskmaster",
        live2d="models/liveroid", voice="en_US-ryan-medium",
        chat_models=f"{_DEEPSEEK},{_GEMMA}",
        tone="teasing, theatrical disappointment; never actually cruel",
    ),
}

DEFAULT_PERSONA = "kawan"


def get_persona(persona_id: str | None) -> Persona:
    return PERSONAS.get(persona_id or DEFAULT_PERSONA, PERSONAS[DEFAULT_PERSONA])
