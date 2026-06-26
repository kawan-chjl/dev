"""Persona presets (spec §11.1, §11.3). A persona is a stateless preset the
messenger wears — tone fragment + Live2D model + Piper voice + Chutes model id.
Switching it changes the messenger, never the Commitment state. The hero ('kawan')
gets the deep tone QA; the two variants ship functional (spec §11.2)."""

from __future__ import annotations

from dataclasses import dataclass

# Conversational calls need a model that returns the JSON in `content` AND responds
# fast. Reasoning models (Qwen3.6, Qwen3.5-397B, Kimi-K2.6) emit to reasoning_content
# (content null — unusable; ADR-0005), and gemma-4 showed variable >60s latency on long
# chat prompts (persona_qa.py). So every persona runs DeepSeek-V3.2 (fast, reliable
# content) primary with gemma-4 as failover; tone is carried by the per-persona system
# prompt, not the base model. Verified via scripts/smoke_chutes.py + scripts/persona_qa.py.
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
        chat_models=f"{_DEEPSEEK},{_GEMMA}",
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
