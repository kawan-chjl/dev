"""Schemas are strict & well-formed; the workspace prompt carries the scope boundary."""

import json

from app.personas import get_persona
from app.prompts import (
    CHECKIN_SCHEMA, INTAKE_SCHEMA, PLAN_SCHEMA, VERDICT_SCHEMA, WORKSPACE_SCHEMA,
    intake_system, workspace_system,
)

_ALL = [INTAKE_SCHEMA, PLAN_SCHEMA, CHECKIN_SCHEMA, WORKSPACE_SCHEMA, VERDICT_SCHEMA]


def test_schemas_are_strict_objects():
    for s in _ALL:
        assert s["type"] == "object"
        assert s["additionalProperties"] is False
        # strict mode: every property must be required
        assert set(s["required"]) == set(s["properties"])
        json.dumps(s)  # serializable


def test_verdict_enum_is_three_valued():
    assert VERDICT_SCHEMA["properties"]["verdict"]["enum"] == ["pass", "fail", "unclear"]


def test_workspace_prompt_carries_scope_boundary():
    text = workspace_system(get_persona("kawan")).lower()
    assert "never" in text and "deliverable" in text and "refusal" in text


def test_intake_prompt_includes_current_slots():
    text = intake_system(get_persona("kawan"), {"why": "job hunt", "obstacles": None,
                                                 "time_constraints": None, "skill": None})
    assert "job hunt" in text
