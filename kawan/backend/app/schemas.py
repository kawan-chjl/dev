"""Request/response shapes. Hard-field writes from the user go through these;
the AI layer never does (it can only return slots for the soft_context UPSERT)."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    notify_email: str | None = None  # X-NOTIF: the user's own reminder address (ADR-0006)
    skip_days_total: int | None = None

    @field_validator("deadline")
    @classmethod
    def _future(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return v
        v = as_utc(v)
        if v <= now_utc():
            raise ValueError("deadline must be in the future")
        return v

    @field_validator("notify_email", "stake_contact_email")
    @classmethod
    def _valid_email(cls, v: str | None) -> str | None:
        """Reject malformed addresses at the boundary — both reach the email senders."""
        if v in (None, ""):
            return v
        if not re.match(r"\S+@\S+\.\S+", v):
            raise ValueError("invalid email address")
        return v


class ContextTurnIn(BaseModel):
    say: str = ""


class WorkspaceTurnIn(BaseModel):
    say: str = ""
    # C6: the frontend holds the session transcript and sends a recent tail with each turn.
    recent_turns: list[dict[str, Any]] = Field(default_factory=list)


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


class GitHubLinkIn(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def _github_repo_url(cls, v: str) -> str:
        from app.adapters.github import parse_github_repo_url
        v = v.strip()
        if not v:
            raise ValueError("url must not be empty")
        if parse_github_repo_url(v) is None:
            raise ValueError(
                "must be a valid GitHub repo URL (e.g. https://github.com/owner/repo)"
            )
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
    notify_email: str | None
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


class MessageOut(BaseModel):
    """Per-commitment chat message returned by GET /{id}/messages."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    role: str
    content: str
    emotion: str | None
    response_type: str | None
    created_at: datetime


class SoftContextOut(BaseModel):
    """Soft-context slots returned by GET /{id}/soft-context."""

    why: str | None
    obstacles: str | None
    time_constraints: str | None
    skill: str | None


class CheckinStatusOut(BaseModel):
    """Check-in lateness status returned by GET /{id}/checkin-status."""

    due_at: str | None
    is_late: bool
    escalation: int
