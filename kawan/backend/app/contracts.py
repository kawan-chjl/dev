"""Lane B owns the interfaces it consumes from Lane C (ADR-0001). Lane C provides
real implementations behind these exact signatures; Lane B ships deterministic
stubs (app/stubs.py) so the scheduler, state machine, WS hub, and `check now`
run end-to-end today.

These are structural-permission boundaries too: the only DB write reachable from
any LLM output is the soft_context UPSERT the intake handler performs from
LLMClient.intake_turn — no port here can mutate a Commitment's hard fields
(spec §8.2, TR-25).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:  # avoid a models<->contracts import cycle
    from app.models import Commitment


@dataclass
class EvidenceBundle:
    """What an adapter fetched, before judging (spec §10.1)."""

    adapter: str  # 'github' | 'screenshot'
    raw_ref: Any  # commit shas / file path — persisted to evidence.raw_ref
    items: list[Any] = field(default_factory=list)  # commits, image descriptors, ...
    summary: str = ""  # compact, human-readable; folded into the status snapshot


@dataclass
class Verdict:
    """Three-valued judge ruling (spec §9.3, TR-39). `unclear` never punishes."""

    verdict: str  # 'pass' | 'fail' | 'unclear'
    confidence: float
    observations: list[str]
    reasoning: str
    follow_up_request: str | None = None


@runtime_checkable
class EvidenceAdapter(Protocol):
    """One tiny pluggable interface; a new adapter = one file + one enum value (spec §10.1)."""

    type: str  # 'github' | 'screenshot'
    trust: str  # 'high' | 'medium' — shown at compose time

    async def fetch(self, commitment: "Commitment", since: datetime | None) -> EvidenceBundle: ...

    async def judge(self, commitment: "Commitment", bundle: EvidenceBundle, llm: "LLMClient") -> Verdict: ...


@runtime_checkable
class LLMClient(Protocol):
    """The four structured calls Lane C builds (spec §9.2). Lane B only orchestrates them.

    Each returns the parsed, schema-valid dict for its set; Lane B reads documented
    keys (`say`, `emotion`, `escalate`, `slots`, `intake_complete`, `roadmap`,
    `response_type`, `proposal`, ...) and never lets the result write hard fields.
    """

    async def intake_turn(self, commitment: "Commitment", soft_context: dict, user_says: str) -> dict: ...

    async def plan(self, commitment: "Commitment", soft_context: dict) -> dict: ...

    async def checkin_line(self, status: dict) -> dict: ...

    async def workspace_turn(self, commitment: "Commitment", soft_context: dict, user_says: str) -> dict: ...


@runtime_checkable
class TokenProvider(Protocol):
    """Lane B's auth layer hands Lane C's Chutes client a fresh user token; on a 401
    the client calls refresh() once then retries (TR-29). Tokens never leave the server."""

    async def get_access_token(self, user_id: str) -> str: ...

    async def refresh(self, user_id: str) -> str: ...
