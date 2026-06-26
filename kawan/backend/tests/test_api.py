"""B1 + the structural-permission guarantee: CRUD persists, and the AI intake path
writes soft_context but never a hard field (spec §8.2, TR-25)."""

from datetime import timedelta

from sqlalchemy import select

from app.models import AuditLog, Commitment, SoftContext
from app.util import now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


async def test_commitment_crud_persists(client, db):
    r = await client.post("/api/commitments",
                          json={"action": "ship", "deliverable": "portfolio v1", "deadline": _future()})
    assert r.status_code == 201
    cid, body = r.json()["id"], r.json()
    assert body["status"] == "draft"

    r = await client.get("/api/commitments/active")
    assert r.status_code == 200 and r.json()["id"] == cid

    r = await client.patch(f"/api/commitments/{cid}", json={"deliverable": "portfolio v2"})
    assert r.status_code == 200 and r.json()["deliverable"] == "portfolio v2"

    rows = (await db.scalars(
        select(AuditLog).where(AuditLog.commitment_id == cid, AuditLog.field == "deliverable")
    )).all()
    assert rows and rows[0].actor == "user"  # a hard-field edit is the user's, audited


async def test_past_deadline_rejected(client):
    past = (now_utc() - timedelta(hours=1)).isoformat()
    r = await client.post("/api/commitments", json={"action": "ship", "deliverable": "d", "deadline": past})
    assert r.status_code == 422


async def test_intake_writes_only_soft_context(client, db):
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    r = await client.post(f"/api/commitments/{cid}/context/turn", json={"say": "because job hunt"})
    assert r.status_code == 200

    c = await db.get(Commitment, cid)
    assert c.deliverable == "d"  # hard field untouched by the AI path
    sc = await db.get(SoftContext, cid)
    assert sc is not None and sc.why  # soft context written (the only AI-reachable write)


async def test_siwc_login_redirects_to_idp(client):
    # Browser-navigable (GET) and a 303 so the hop to the IdP authorize endpoint is a GET.
    r = await client.get("/api/auth/siwc/login", follow_redirects=False)
    assert r.status_code == 303
    loc = r.headers["location"]
    assert "/idp/authorize" in loc
    assert "client_id=" in loc and "code_challenge=" in loc and "state=" in loc


# ── X1: PATCH /api/me { persona } persists and echoes the /me shape ────────────

async def test_patch_me_persists_persona(client, db):
    r = await client.patch("/api/me", json={"persona": "adik"})
    assert r.status_code == 200
    body = r.json()
    assert body["persona"] == "adik"
    # Confirm the response echoes the canonical /me shape
    assert "username" in body and "guest" in body and "balance" in body
    # balance is None on a PATCH (no Chutes re-fetch)
    assert body["balance"] is None

    # Confirm the change was persisted to the DB row
    r2 = await client.get("/api/me")
    assert r2.status_code == 200 and r2.json()["persona"] == "adik"


async def test_patch_me_rejects_unknown_persona(client):
    r = await client.patch("/api/me", json={"persona": "bogus"})
    assert r.status_code == 422


# ── A7: GET /api/me/stats returns verified_wins count ───────────────────────────

async def test_me_stats_zero_with_no_completions(client):
    r = await client.get("/api/me/stats")
    assert r.status_code == 200
    assert r.json() == {"verified_wins": 0}


async def test_me_stats_counts_completed_outcomes(client, db):
    from app.auth import GUEST_USER_ID
    from app.models import SuccessPattern
    # Seed one completed and one missed outcome for the guest user
    db.add(SuccessPattern(user_id=GUEST_USER_ID, outcome="completed", features={}))
    db.add(SuccessPattern(user_id=GUEST_USER_ID, outcome="missed", features={}))
    await db.commit()

    r = await client.get("/api/me/stats")
    assert r.status_code == 200
    assert r.json() == {"verified_wins": 1}  # only completed counts, not missed
