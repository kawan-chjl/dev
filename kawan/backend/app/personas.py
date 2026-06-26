"""Persona presets (spec §11.1, §11.3). A persona is a stateless preset the
messenger wears — tone fragment + Live2D model + Piper voice + Chutes model id.
Switching it changes the messenger, never the Commitment state. The hero ('kawan')
gets the deep tone QA; the two variants ship functional (spec §11.2)."""

from __future__ import annotations

from dataclasses import dataclass

# Per-persona model diversity (spec §11.1), restored after ChutesClient.structured()
# disabled thinking + switched to json_object mode (ADR-0005): gemma-4, DeepSeek-V3.2 and
# Kimi-K2.6 all return schema-valid `content` fast through that path (re-validated live —
# gemma now ~5s, not the old >60s). Each string is "primary,failover"; current routing is
# kawan=gemma→DeepSeek, adik=DeepSeek→gemma, cik_maid=Kimi→gemma. The two Qwen TEE chutes
# stay out — they 400 on the enable_thinking payload.
_GEMMA = "google/gemma-4-31B-turbo-TEE"
_DEEPSEEK = "deepseek-ai/DeepSeek-V3.2-TEE"
_KIMI = "moonshotai/Kimi-K2.6-TEE"


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
        chat_models=f"{_KIMI},{_GEMMA}",
        tone="teasing, theatrical disappointment; never actually cruel",
    ),
}

DEFAULT_PERSONA = "kawan"


def get_persona(persona_id: str | None) -> Persona:
    return PERSONAS.get(persona_id or DEFAULT_PERSONA, PERSONAS[DEFAULT_PERSONA])
