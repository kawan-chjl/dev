# kawan/backend/app/llm/client.py
"""ChutesLLMClient implements contracts.LLMClient (the four §9.2 calls) on top of
ChutesClient. Persona (model + tone) is resolved per billing user via an injected
resolver, keeping this class DB-free and unit-testable. It returns parsed,
schema-valid dicts and never writes the DB — the soft_context UPSERT happens in
routes/commitments.py from intake_turn's `slots`."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Awaitable, Callable

from app.personas import DEFAULT_PERSONA, Persona, get_persona
from app.prompts import (
    CHECKIN_SCHEMA, INTAKE_SCHEMA, PLAN_SCHEMA, WORKSPACE_SCHEMA,
    checkin_system, intake_system, plan_system, workspace_system,
)

if TYPE_CHECKING:
    from app.chutes import ChutesClient
    from app.models import Commitment

PersonaResolver = Callable[[str], Awaitable[Persona]]


async def db_persona_resolver(user_id: str) -> Persona:
    """Default resolver: read User.persona via its own session (no request scope)."""
    from app.db import SessionLocal
    from app.models import User
    async with SessionLocal() as db:
        user = await db.get(User, user_id)
        return get_persona(user.persona if user else DEFAULT_PERSONA)


def _commitment_line(c: "Commitment") -> str:
    return f"Commitment: I will {c.action} {c.deliverable} by {c.deadline:%Y-%m-%d %H:%M}."


class ChutesLLMClient:
    def __init__(self, chutes: "ChutesClient", resolve_persona: PersonaResolver) -> None:
        self._chutes = chutes
        self._resolve = resolve_persona

    async def intake_turn(self, commitment: "Commitment", soft_context: dict, user_says: str) -> dict:
        p = await self._resolve(commitment.user_id)
        messages = [
            {"role": "system", "content": intake_system(p, soft_context)},
            {"role": "user", "content": user_says or "(the user has not said anything yet)"},
        ]
        return await self._chutes.structured(
            user_id=commitment.user_id, model=p.chat_models, messages=messages,
            schema=INTAKE_SCHEMA, schema_name="intake",
        )

    async def plan(self, commitment: "Commitment", soft_context: dict) -> dict:
        p = await self._resolve(commitment.user_id)
        messages = [
            {"role": "system", "content": plan_system(p)},
            {"role": "user", "content": f"{_commitment_line(commitment)}\n"
                                        f"Soft context: {json.dumps(soft_context)}\nPropose the plan."},
        ]
        return await self._chutes.structured(
            user_id=commitment.user_id, model=p.chat_models, messages=messages,
            schema=PLAN_SCHEMA, schema_name="plan",
        )

    async def checkin_line(self, status: dict) -> dict:
        user_id = status["user_id"]  # added to the snapshot in pipeline.run_checkin (Task 7)
        p = await self._resolve(user_id)
        messages = [
            {"role": "system", "content": checkin_system(p)},
            {"role": "user", "content": f"Status: {json.dumps(status)}\nWrite the check-in line."},
        ]
        return await self._chutes.structured(
            user_id=user_id, model=p.chat_models, messages=messages,
            schema=CHECKIN_SCHEMA, schema_name="checkin",
        )

    async def workspace_turn(self, commitment: "Commitment", soft_context: dict, user_says: str) -> dict:
        p = await self._resolve(commitment.user_id)
        messages = [
            {"role": "system", "content": workspace_system(p)},
            {"role": "user", "content": f"{_commitment_line(commitment)}\n"
                                        f"Soft context: {json.dumps(soft_context)}\nUser says: {user_says}"},
        ]
        return await self._chutes.structured(
            user_id=commitment.user_id, model=p.chat_models, messages=messages,
            schema=WORKSPACE_SCHEMA, schema_name="workspace",
        )
