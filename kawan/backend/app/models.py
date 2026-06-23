"""SQLAlchemy models mirroring the normative DDL (spec §8.1, TR-71). Schema drift
requires a spec update, not a silent change — the one deliberate addition,
commitments.last_contact_at, is ratified via ADR-0002.

Structural permissions (spec §8.2): hard fields live on Commitment and only GUI
handlers + the scheduler/verifier write them; the AI layer can write soft_context
and nothing else; audit_log.actor cannot be 'ai' by construction (CHECK)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db import Base
from app.util import new_id, now_utc

# Enumerated values are stored as plain TEXT (Postgres-portable) and validated in
# the app/state machine, matching the spec DDL (no DB-level enum types).


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(primary_key=True)  # chutes user_id (idp/userinfo)
    username: Mapped[str]
    persona: Mapped[str] = mapped_column(default="kawan")  # §11
    access_token: Mapped[str]  # encrypted at rest (Fernet) — never the raw token
    refresh_token: Mapped[str]
    token_expiry: Mapped[datetime]
    # Email/password auth (PO-authorized spec deviation; additive — SIWC/guest use email=None).
    email: Mapped[str | None] = mapped_column(unique=True, default=None)
    password_hash: Mapped[str | None] = mapped_column(default=None)  # argon2id; never plaintext
    created_at: Mapped[datetime] = mapped_column(default=now_utc)


class Commitment(Base):
    """HARD FIELDS — GUI-set, AI-read-only. No agent code path may UPDATE this table;
    status transitions come from the scheduler/verifier only (spec §8.2)."""

    __tablename__ = "commitments"

    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str]
    deliverable: Mapped[str]
    deadline: Mapped[datetime]
    cadence: Mapped[str] = mapped_column(default="daily_evening")
    evidence_type: Mapped[str] = mapped_column(default="screenshot")  # 'github' | 'screenshot'
    evidence_config: Mapped[dict[str, Any] | None] = mapped_column(JSON, default=None)  # {"repo": "o/r", "branch": "main"}
    stake_enabled: Mapped[bool] = mapped_column(default=False)
    stake_contact_name: Mapped[str | None] = mapped_column(default=None)
    stake_contact_email: Mapped[str | None] = mapped_column(default=None)
    skip_days_total: Mapped[int] = mapped_column(default=1)
    skip_days_used: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(default="draft")  # §5.3 enum
    escalation: Mapped[int] = mapped_column(default=0)  # 0|1|2
    # ADR-0002: the Lapse "no contact" signal (not in the original §8.1 DDL).
    last_contact_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)


class SoftContext(Base):
    """The ONLY table the AI may write (intake UPSERT, spec §8.2)."""

    __tablename__ = "soft_context"

    commitment_id: Mapped[str] = mapped_column(ForeignKey("commitments.id"), primary_key=True)
    why: Mapped[str | None] = mapped_column(default=None)
    obstacles: Mapped[str | None] = mapped_column(default=None)
    time_constraints: Mapped[str | None] = mapped_column(default=None)
    skill: Mapped[str | None] = mapped_column(default=None)
    updated_at: Mapped[datetime | None] = mapped_column(default=None)


class Plan(Base):
    """ADVICE ONLY: no schedule, no per-step state (spec §8.1)."""

    __tablename__ = "plans"

    commitment_id: Mapped[str] = mapped_column(ForeignKey("commitments.id"), primary_key=True)
    roadmap_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON)  # [{order,title,est_minutes,note}]
    rationale: Mapped[str | None] = mapped_column(default=None)


class Proposal(Base):
    """AI proposes; ONLY the user applies (spec §8.2)."""

    __tablename__ = "proposals"

    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)
    commitment_id: Mapped[str] = mapped_column(ForeignKey("commitments.id"))
    field: Mapped[str]  # deadline|deliverable|cadence|evidence_type|stake
    proposed_value: Mapped[Any] = mapped_column(JSON)
    reason: Mapped[str]
    status: Mapped[str] = mapped_column(default="open")  # open|applied|dismissed
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
    applied_at: Mapped[datetime | None] = mapped_column(default=None)


class Checkin(Base):
    __tablename__ = "checkins"

    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)
    commitment_id: Mapped[str] = mapped_column(ForeignKey("commitments.id"))
    kind: Mapped[str]  # cadence|on_demand|deadline|winback
    evidence_id: Mapped[str | None] = mapped_column(default=None)
    message: Mapped[str]
    escalation: Mapped[int]
    delivered_via: Mapped[str | None] = mapped_column(default=None)  # ws|webpush|timeline
    created_at: Mapped[datetime] = mapped_column(default=now_utc)


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)
    commitment_id: Mapped[str] = mapped_column(ForeignKey("commitments.id"))
    adapter: Mapped[str]  # github|screenshot
    raw_ref: Mapped[Any | None] = mapped_column(JSON, default=None)  # shas / file path (file deleted post-verdict)
    verdict: Mapped[str]  # pass|fail|unclear
    confidence: Mapped[float | None] = mapped_column(default=None)
    reasoning: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)


class SuccessPattern(Base):
    """Habit-loop calibration (spec §8.1, §11.4)."""

    __tablename__ = "success_patterns"

    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    commitment_id: Mapped[str | None] = mapped_column(default=None)
    outcome: Mapped[str]  # completed|missed
    features: Mapped[dict[str, Any]] = mapped_column(JSON)  # {deadline_hour,cadence,duration_days,used_skip}
    created_at: Mapped[datetime] = mapped_column(default=now_utc)


class AuditLog(Base):
    """Every hard-field mutation, with actor. 'ai' is UNREPRESENTABLE (CHECK, TR-24)."""

    __tablename__ = "audit_log"
    __table_args__ = (CheckConstraint("actor IN ('user','system')", name="ck_audit_log_actor"),)

    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)
    commitment_id: Mapped[str | None] = mapped_column(default=None)
    field: Mapped[str | None] = mapped_column(default=None)
    old_value: Mapped[Any | None] = mapped_column(JSON, default=None)
    new_value: Mapped[Any | None] = mapped_column(JSON, default=None)
    actor: Mapped[str] = mapped_column(String)  # 'user' | 'system'
    via_proposal_id: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)


class PushSubscription(Base):
    """Web Push subscriptions (spec §8.1). The spec DDL has no PK; an id is added
    for ORM identity (additive, no behavioral change)."""

    __tablename__ = "push_subscriptions"

    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    subscription: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
