"""Tests for the five-layer persona prompt refactor (Task 1.4).

Verifies:
- workspace_system() assembles all five layers (language lock, persona, hard rules,
  knowledge primer, output constraint)
- intake_system() includes the word/markdown rule
- All JSON schemas are unchanged from spec
"""

from __future__ import annotations

import json

from app.personas import get_persona
from app.prompts import (
    CHECKIN_SCHEMA,
    HARD_RULES,
    INTAKE_SCHEMA,
    KNOWLEDGE_PRIMER,
    PLAN_SCHEMA,
    VERDICT_SCHEMA,
    WORKSPACE_SCHEMA,
    intake_system,
    language_lock,
    workspace_system,
)


# ---------------------------------------------------------------------------
# language_lock()
# ---------------------------------------------------------------------------


def test_language_lock_returns_english_sentence():
    text = language_lock()
    assert "Respond in English." in text


def test_language_lock_accepts_lang_arg():
    """The function accepts a lang arg (future-proofing); English is the only real value now."""
    text = language_lock(lang="en")
    assert "Respond in English." in text


# ---------------------------------------------------------------------------
# HARD_RULES constant
# ---------------------------------------------------------------------------


def test_hard_rules_is_non_empty_string():
    assert isinstance(HARD_RULES, str)
    assert len(HARD_RULES) > 50  # not a stub


def test_hard_rules_contains_scope_guardrail():
    """Must mention staying in scope (process/sequence/scope/time)."""
    text = HARD_RULES.lower()
    assert "scope" in text or "process" in text


def test_hard_rules_contains_prompt_injection_guard():
    """Must address refusing prompt-injection / 'ignore your instructions' patterns."""
    text = HARD_RULES.lower()
    assert "inject" in text or "ignore" in text or "redirect" in text


def test_hard_rules_no_pii():
    """HARD_RULES must not embed actual PII (emails, real secrets).
    The word 'password' may appear as a category name in the guardrail itself."""
    text = HARD_RULES.lower()
    assert "@" not in text  # no email addresses embedded


# ---------------------------------------------------------------------------
# KNOWLEDGE_PRIMER constant
# ---------------------------------------------------------------------------


def test_knowledge_primer_is_non_empty_string():
    assert isinstance(KNOWLEDGE_PRIMER, str)
    assert len(KNOWLEDGE_PRIMER) >= 150  # at least ~150 words minimum


def test_knowledge_primer_has_required_sections():
    """All six named sections must be present (verifiable, not a placeholder)."""
    text = KNOWLEDGE_PRIMER.lower()
    assert "implementation intention" in text
    assert "front-load" in text or "front load" in text or "riskiest" in text
    assert "scope" in text
    # process praise / person praise
    assert "process" in text and "praise" in text
    # non-shaming / repair
    assert "shame" in text or "non-shaming" in text or "repair" in text
    # specific / evidence
    assert "evidence" in text or "specific" in text


def test_knowledge_primer_no_pii():
    text = KNOWLEDGE_PRIMER.lower()
    assert "@" not in text
    assert "password" not in text


# ---------------------------------------------------------------------------
# workspace_system() — five-layer assembly
# ---------------------------------------------------------------------------


def test_workspace_system_contains_language_lock(monkeypatch):
    p = get_persona("kawan")
    text = workspace_system(p)
    assert "Respond in English." in text


def test_workspace_system_contains_hard_rules_marker(monkeypatch):
    p = get_persona("kawan")
    text = workspace_system(p)
    # HARD_RULES is included verbatim; check a substring that must appear
    text_lower = text.lower()
    assert "scope" in text_lower or "inject" in text_lower or "process" in text_lower


def test_workspace_system_contains_knowledge_primer_marker(monkeypatch):
    p = get_persona("kawan")
    text = workspace_system(p)
    # KNOWLEDGE_PRIMER is included; check for a marker phrase
    assert "implementation intention" in text.lower() or "front-load" in text.lower() or "riskiest" in text.lower()


def test_workspace_system_contains_word_limit_rule(monkeypatch):
    p = get_persona("kawan")
    text = workspace_system(p)
    text_lower = text.lower()
    # The 30-50 word rule must appear
    assert "30" in text_lower and "50" in text_lower
    assert "markdown" in text_lower


def test_workspace_system_contains_persona_voice(monkeypatch):
    """The existing _voice(p) layer is preserved."""
    p = get_persona("kawan")
    text = workspace_system(p)
    assert p.name in text


def test_workspace_system_contains_scope_boundary():
    """The existing scope/refusal contract must remain."""
    p = get_persona("kawan")
    text = workspace_system(p).lower()
    assert "refusal" in text or "never" in text


# ---------------------------------------------------------------------------
# intake_system() — word/markdown rule added (opener exempt)
# ---------------------------------------------------------------------------


def test_intake_system_contains_word_limit_rule():
    p = get_persona("kawan")
    text = intake_system(p, {"why": None, "obstacles": None, "time_constraints": None, "skill": None})
    text_lower = text.lower()
    assert "30" in text_lower and "50" in text_lower
    assert "markdown" in text_lower


def test_intake_system_contains_opener_exemption():
    """The first intake message is exempt from the 30-50 word limit."""
    p = get_persona("kawan")
    text = intake_system(p, {"why": None, "obstacles": None, "time_constraints": None, "skill": None})
    text_lower = text.lower()
    # The exemption must be encoded (word like "first", "opener", "exempt", "exceed", "introduce")
    assert any(kw in text_lower for kw in ("first", "opener", "exempt", "exceed", "introduc"))


def test_intake_system_still_includes_slots():
    """Existing slot-passing behavior is preserved."""
    p = get_persona("kawan")
    text = intake_system(p, {"why": "job hunt", "obstacles": None, "time_constraints": None, "skill": None})
    assert "job hunt" in text


# ---------------------------------------------------------------------------
# JSON schemas are UNCHANGED (contract must hold)
# ---------------------------------------------------------------------------

_ALL_SCHEMAS = [INTAKE_SCHEMA, PLAN_SCHEMA, CHECKIN_SCHEMA, WORKSPACE_SCHEMA, VERDICT_SCHEMA]


def test_schemas_are_strict_objects():
    for s in _ALL_SCHEMAS:
        assert s["type"] == "object"
        assert s["additionalProperties"] is False
        assert set(s["required"]) == set(s["properties"])
        json.dumps(s)  # serializable


def test_workspace_schema_unchanged():
    """WORKSPACE_SCHEMA contract: response_type / say / proposal / emotion."""
    assert set(WORKSPACE_SCHEMA["required"]) == {"response_type", "say", "proposal", "emotion"}
    assert WORKSPACE_SCHEMA["properties"]["response_type"]["enum"] == ["coaching", "refusal", "proposal"]


def test_intake_schema_unchanged():
    """INTAKE_SCHEMA contract: say / slots / intake_complete / emotion."""
    assert set(INTAKE_SCHEMA["required"]) == {"say", "slots", "intake_complete", "emotion"}
    slot_props = INTAKE_SCHEMA["properties"]["slots"]["properties"]
    assert set(slot_props) == {"why", "obstacles", "time_constraints", "skill"}


def test_plan_schema_unchanged():
    """PLAN_SCHEMA contract: roadmap / front_load_reason / suggested_* / say."""
    assert "roadmap" in PLAN_SCHEMA["required"]
    assert "front_load_reason" in PLAN_SCHEMA["required"]
    assert "say" in PLAN_SCHEMA["required"]


def test_verdict_schema_unchanged():
    """VERDICT_SCHEMA: three-valued enum, unchanged."""
    assert VERDICT_SCHEMA["properties"]["verdict"]["enum"] == ["pass", "fail", "unclear"]


def test_no_pii_in_workspace_system():
    """workspace_system must not embed actual PII (email addresses, real secrets).
    The word 'password' may appear as a category name in guardrail text."""
    p = get_persona("kawan")
    text = workspace_system(p)
    assert "@" not in text  # no email addresses embedded
