"""Request/response shapes. Hard-field writes from the user go through these;
the AI layer never does (it can only return slots for the soft_context UPSERT)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.util import as_utc, now_utc


class CommitmentCreate(BaseModel):
    action: str
    deliverable: str
    deadline: datetime

    @field_validator("deadline")
    @classmethod
    def _future(cls, v: datetime) -> datetime:
        v = as_utc(v)  # normalize naive input to UTC so downstream comparisons stay aware
        if v <= now_utc():
            raise ValueError("deadline must be in the future")
        return v


class CommitmentPatch(BaseModel):
    """Every field optional; only the user's session may send this (spec §8.2)."""

    deadline: datetime | None = None
    deliverable: str | None = None
    cadence: str | None = None
    evidence_type: str | None = None
    evidence_config: dict[str, Any] | None = None
    stake_enabled: bool | None = None
    stake_contact_name: str | None = None
    stake_contact_email: str | None = None
    skip_days_total: int | None = None


class ContextTurnIn(BaseModel):
    say: str = ""


class PushSubscribeIn(BaseModel):
    subscription: dict[str, Any]


_VALID_PERSONAS = ("kawan", "adik", "cik_maid")


class MePatch(BaseModel):
    persona: str

    @field_validator("persona")
    @classmethod
    def _persona_allowed(cls, v: str) -> str:
        if v not in _VALID_PERSONAS:
            raise ValueError("unknown persona")
        return v


class DebriefIn(BaseModel):
    note: str

    @field_validator("note")
    @classmethod
    def _note_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("note must not be empty")
        if len(v) > 2000:
            raise ValueError("note must be 2000 characters or fewer")
        return v


class CommitmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: str
    deliverable: str
    deadline: datetime
    cadence: str
    evidence_type: str
    evidence_config: dict[str, Any] | None
    stake_enabled: bool
    stake_contact_name: str | None
    stake_contact_email: str | None
    skip_days_total: int
    skip_days_used: int
    status: str
    escalation: int
    created_at: datetime


class CommitmentListOut(BaseModel):
    """Paginated envelope for GET /api/commitments."""

    items: list[CommitmentOut]
    total: int
    limit: int
    offset: int
