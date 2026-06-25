"""Persona registry: three presets, hero fallback, keys match schemas._VALID_PERSONAS."""

from app.personas import DEFAULT_PERSONA, PERSONAS, get_persona
from app.schemas import _VALID_PERSONAS


def test_registry_matches_schema_personas():
    assert set(PERSONAS) == set(_VALID_PERSONAS)
    assert DEFAULT_PERSONA == "kawan"


def test_each_persona_has_failover_chat_models():
    for p in PERSONAS.values():
        assert "," in p.chat_models  # primary,failover — free demo resilience
        assert p.tone and p.name


def test_get_persona_falls_back_to_hero():
    assert get_persona("cik_maid").id == "cik_maid"
    assert get_persona(None).id == "kawan"
    assert get_persona("nonexistent").id == "kawan"
