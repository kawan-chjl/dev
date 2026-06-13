"""WS /ws — workspace chat (spec §5.2). Goal-scoped: turns require an open
commitment (no general chatbot mode, even idle — TR-03). Each turn is Contact;
a proposal turn becomes an O1 card (a Proposal row), never a hard-field write."""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Commitment, Proposal, SoftContext
from app.pipeline import record_contact
from app.wiring import LLM
from app.ws import hub

router = APIRouter()

_SOFT_SLOTS = ("why", "obstacles", "time_constraints", "skill")
_OPEN_STATUSES = ("draft", "active", "lapsed", "verifying", "grace")


@router.websocket("/ws")
async def workspace(ws: WebSocket):
    uid = ws.session.get("user_id")
    if not uid:
        await ws.close(code=1008)  # policy violation — not signed in
        return
    await hub.connect(uid, ws)
    try:
        while True:
            data = await ws.receive_json()
            text = (data or {}).get("say", "")
            async with SessionLocal() as db:
                c = await db.scalar(
                    select(Commitment).where(Commitment.user_id == uid, Commitment.status.in_(_OPEN_STATUSES))
                    .order_by(Commitment.created_at.desc()).limit(1)
                )
                if c is None:
                    await ws.send_json({"type": "error", "say": "Ready to commit to something?"})
                    continue
                await record_contact(db, c)
                sc = await db.get(SoftContext, c.id)
                soft = {k: getattr(sc, k) for k in _SOFT_SLOTS} if sc else {}
                result = await LLM.workspace_turn(c, soft, text)
                if result.get("response_type") == "proposal" and result.get("proposal"):
                    pr = result["proposal"]
                    prop = Proposal(commitment_id=c.id, field=pr["field"],
                                    proposed_value=pr.get("proposed_value"), reason=pr.get("reason", ""))
                    db.add(prop)
                    await db.commit()
                    result["proposal_id"] = prop.id
            await ws.send_json({"type": "workspace", **result})
    except WebSocketDisconnect:
        pass
    finally:
        hub.disconnect(uid, ws)  # always release the hub slot, even on unexpected errors
