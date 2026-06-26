"""System prompts + strict JSON Schemas for the five §9.2/§9.3 structured calls.
Schemas are copied from the spec; every property is `required` and
additionalProperties is False (OpenAI strict-mode contract). Nullable fields use
the `["type","null"]` form."""

from __future__ import annotations

import json

from app.personas import Persona

# Vision judging — gemma-4 is the only TEE model that both accepts images AND reliably
# returns the JSON in `content`. The big reasoning vision models (Kimi-K2.6,
# Qwen3.5-397B) emit to reasoning_content leaving `content` null; Qwen3.6 does so
# intermittently — all unusable for our content-based structured() parse, which Chutes'
# 200-failover won't catch (ADR-0005, verified via scripts/smoke_chutes.py --invoke).
JUDGE_MODELS = "google/gemma-4-31B-turbo-TEE"
# GitHub judging is text-only — gemma + DeepSeek, both reliable content-returners.
GITHUB_JUDGE_MODELS = "google/gemma-4-31B-turbo-TEE,deepseek-ai/DeepSeek-V3.2-TEE"

_EMOTIONS = ["neutral", "curious", "pleased", "skeptical", "concerned"]

# ── Schemas ───────────────────────────────────────────────────────────────────

INTAKE_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "say": {"type": "string"},
        "slots": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "why": {"type": ["string", "null"]},
                "obstacles": {"type": ["string", "null"]},
                "time_constraints": {"type": ["string", "null"]},
                "skill": {"type": ["string", "null"]},
            },
            "required": ["why", "obstacles", "time_constraints", "skill"],
        },
        "intake_complete": {"type": "boolean"},
        "emotion": {"type": "string", "enum": _EMOTIONS},
    },
    "required": ["say", "slots", "intake_complete", "emotion"],
}

PLAN_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "roadmap": {
            "type": "array",
            "items": {
                "type": "object", "additionalProperties": False,
                "properties": {
                    "order": {"type": "integer"},
                    "title": {"type": "string"},
                    "est_minutes": {"type": "integer"},
                    "note": {"type": "string"},
                },
                "required": ["order", "title", "est_minutes", "note"],
            },
        },
        "front_load_reason": {"type": "string"},
        "suggested_evidence": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "type": {"type": "string", "enum": ["github", "screenshot"]},
                "reason": {"type": "string"},
            },
            "required": ["type", "reason"],
        },
        "suggested_cadence": {"type": "string"},
        "suggested_stake": {
            "type": "object", "additionalProperties": False,
            "properties": {"enabled": {"type": "boolean"}, "reason": {"type": "string"}},
            "required": ["enabled", "reason"],
        },
        "say": {"type": "string"},
    },
    "required": ["roadmap", "front_load_reason", "suggested_evidence",
                 "suggested_cadence", "suggested_stake", "say"],
}

CHECKIN_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "say": {"type": "string"},
        "emotion": {"type": "string", "enum": _EMOTIONS},
        "escalate": {"type": "boolean"},
    },
    "required": ["say", "emotion", "escalate"],
}

WORKSPACE_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "response_type": {"type": "string", "enum": ["coaching", "refusal", "proposal"]},
        "say": {"type": "string"},
        "proposal": {
            "type": ["object", "null"], "additionalProperties": False,
            "properties": {
                "field": {"type": "string",
                          "enum": ["deadline", "deliverable", "cadence", "evidence_type", "stake"]},
                "proposed_value": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["field", "proposed_value", "reason"],
        },
        "emotion": {"type": "string", "enum": [*_EMOTIONS, "proud"]},
    },
    "required": ["response_type", "say", "proposal", "emotion"],
}

VERDICT_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "verdict": {"type": "string", "enum": ["pass", "fail", "unclear"]},
        "confidence": {"type": "number"},
        "observations": {"type": "array", "items": {"type": "string"}},
        "reasoning": {"type": "string"},
        "follow_up_request": {"type": ["string", "null"]},
    },
    "required": ["verdict", "confidence", "observations", "reasoning", "follow_up_request"],
}

# ── System prompts ──────────────────────────────────────────────────────────────

def _voice(p: Persona) -> str:
    return f"You are {p.name}, the user's accountability companion. Voice: {p.tone}."


def intake_system(p: Persona, slots: dict) -> str:
    return (
        f"{_voice(p)}\n"
        "You are running intake for a commitment the user has ALREADY defined. The "
        "action, deliverable, and deadline are SETTLED — never ask about them. Fill four "
        "soft-context slots by asking AT MOST ONE question per turn: why (motivation), "
        "obstacles, time_constraints, skill (relevant experience/level).\n"
        f"Current slot values: {json.dumps(slots)}.\n"
        "Rules: ask only about a slot that is still null; never set intake_complete=true "
        "until every slot is non-null or the user has clearly skipped it; stay in character; "
        "one short question. Echo any slot you just learned back into `slots` (keep already-"
        "known values). Return JSON matching the schema."
    )


def plan_system(p: Persona) -> str:
    return (
        f"{_voice(p)}\n"
        "Propose a short execution plan: a roadmap of 2–5 ordered steps that front-loads the "
        "riskiest part given the user's stated obstacle. You may SUGGEST an evidence type, a "
        "cadence, and whether to enable a stake — suggestions only; you never set anything.\n"
        "PII RULE: never include repo URLs, contact names, or emails — only a generic evidence "
        "`type` and an enabled `flag`. Return JSON matching the schema."
    )


def checkin_system(p: Persona) -> str:
    return (
        f"{_voice(p)}\n"
        "Write ONE check-in line from the status JSON. Tone: relational, specific to the "
        "evidence, never shaming, never 'you must'. escalation 0 = gentle, 1 = direct, 2 = "
        "blunt about the gap but warm about the person. Set escalate=true only when there is no "
        "new evidence and a firmer nudge is warranted. Return JSON matching the schema."
    )


def workspace_system(p: Persona) -> str:
    return (
        f"{_voice(p)}\n"
        "You discuss process, sequence, scope, and time. You NEVER produce or discuss the "
        "content of the deliverable — no code, no prose, no designs, no answers, no "
        "subject-matter explanations. If asked for deliverable content, set "
        "response_type='refusal' and redirect, in character, to the user's next concrete move. "
        "You may propose a change to ONE hard field (deadline|deliverable|cadence|"
        "evidence_type|stake) via response_type='proposal' and the `proposal` object — the user "
        "alone applies it. Otherwise response_type='coaching' and proposal=null. You may be "
        "given the user's real progress (recent check-ins, latest verdict, time left) and the "
        "recent conversation — ground your reply in them, never restate them verbatim. Return "
        "JSON matching the schema."
    )


JUDGE_SYSTEM = (
    "You are a skeptical-but-fair evidence judge for an accountability app. "
    "Rules: 'pass' requires observations that SPECIFICALLY connect to the stated deliverable. "
    "Use 'unclear' (never 'fail') when evidence is plausible but unprovable, and put the "
    "single disambiguating request in follow_up_request. Reserve 'fail' for direct "
    "contradiction, or for absence at a final deadline check. 'unclear' never punishes. "
    "Return JSON matching the verdict schema."
)
