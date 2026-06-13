"""Lane B acceptance gates (docs/task-list.md §5) made demonstrable. Each test maps
to a specific acceptance clause for B2/B3/B4 that wasn't already covered elsewhere."""

from datetime import timedelta

import httpx
from sqlalchemy import select

import app.email as email_mod
import app.wiring as wiring
from app import crypto, pipeline, scheduler
from app.auth import AuthTokenProvider, ensure_guest_user
from app.config import settings
from app.contracts import EvidenceBundle, Verdict
from app.models import AuditLog, Checkin, Commitment, Proposal, User
from app.util import new_id, now_utc


def _future() -> str:
    return (now_utc() + timedelta(days=1)).isoformat()


async def _seed_active(db, status="active", **kw) -> Commitment:
    u = User(id=new_id(), username="u", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    c = Commitment(user_id=u.id, action="ship", deliverable="d",
                   deadline=now_utc() + timedelta(days=1), status=status, **kw)
    db.add(c)
    await db.commit()
    return c


# --- B2: user token → inference billed to user (the Lane-C token seam) ------------

async def test_token_provider_decrypts_user_token(db):
    u = User(id=new_id(), username="u", access_token=crypto.encrypt("tok-123"),
             refresh_token=crypto.encrypt("r"), token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.commit()
    assert await AuthTokenProvider().get_access_token(u.id) == "tok-123"


async def test_guest_token_is_team_cpk(db, monkeypatch):
    monkeypatch.setattr(settings, "chutes_api_key", "cpk_demo_key")
    await ensure_guest_user(db)
    assert await AuthTokenProvider().get_access_token("guest") == "cpk_demo_key"


# --- B3: check now (cron-independent) + delivery ladder falls back to timeline -----

async def test_check_now_runs_pipeline_and_delivers(client):
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    await client.post(f"/api/commitments/{cid}/start")
    r = await client.post(f"/api/commitments/{cid}/check")  # no cron involved
    assert r.status_code == 200
    body = r.json()
    assert body["message"]
    assert body["delivered_via"] == "timeline"  # no WS connected, no push subs → bottom of the ladder


# --- B3: APScheduler jobs rebuilt from DB at boot ---------------------------------

async def test_scheduler_rebuilds_jobs_from_db(db):
    c = await _seed_active(db)
    await scheduler.rebuild_from_db()
    assert scheduler.scheduler.get_job(f"cadence:{c.id}") is not None
    assert scheduler.scheduler.get_job(f"deadline:{c.id}") is not None


async def test_winback_rebuilt_from_db_at_boot(db):
    """A lapsed commitment owed a win-back gets it re-armed at boot (restart-safe)."""
    c = await _seed_active(db, status="lapsed")
    db.add(Checkin(commitment_id=c.id, kind="cadence", message="nothing today", escalation=2))
    await db.commit()
    await scheduler.rebuild_from_db()
    assert scheduler.scheduler.get_job(f"winback:{c.id}") is not None


# --- B4: miss path fires the stake email ------------------------------------------

class _FailAdapter:
    type = "github"
    trust = "high"

    async def fetch(self, c, since):
        return EvidenceBundle(adapter="github", raw_ref={}, items=["x"], summary="present but wrong")

    async def judge(self, c, b, llm):
        return Verdict("fail", 0.9, ["no deploy visible"], "deliverable absent at deadline", None)


async def test_miss_path_sends_stake_email(db, monkeypatch):
    monkeypatch.setitem(wiring.ADAPTERS, "github", _FailAdapter())
    email_mod.outbox.clear()
    c = await _seed_active(db, evidence_type="github", skip_days_total=0,
                           stake_enabled=True, stake_contact_name="Brother",
                           stake_contact_email="brother@example.com")
    await pipeline.run_final_verify(db, c)
    assert c.status == "missed"
    assert any(m["to"] == "brother@example.com" for m in email_mod.outbox)  # templated stake email landed


# --- B4: proposal-apply is the user's action, audited as actor='user' -------------

async def test_proposal_apply_user_session_audited(client, db):
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    p = Proposal(commitment_id=cid, field="deliverable", proposed_value="portfolio v2 (descoped)",
                 reason="scope honesty beats a fake Friday")
    db.add(p)
    await db.commit()

    r = await client.post(f"/api/commitments/{cid}/proposals/{p.id}/apply")
    assert r.status_code == 200 and r.json()["deliverable"] == "portfolio v2 (descoped)"

    await db.refresh(p)
    assert p.status == "applied" and p.applied_at is not None
    row = await db.scalar(select(AuditLog).where(AuditLog.via_proposal_id == p.id))
    assert row is not None and row.actor == "user" and row.field == "deliverable"


async def test_proposal_apply_requires_a_session(db):
    """Applying needs the user's session; without one the endpoint is unreachable (401),
    so an AI-driven apply is impossible (spec §8.2)."""
    from app.main import app
    c = await _seed_active(db)
    p = Proposal(commitment_id=c.id, field="cadence", proposed_value="daily_morning", reason="mornings")
    db.add(p)
    await db.commit()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as anon:
        r = await anon.post(f"/api/commitments/{c.id}/proposals/{p.id}/apply")  # no session cookie
    assert r.status_code == 401


# --- TR-21: abandon-with-stake follows the missed path ----------------------------

async def test_abandon_with_stake_follows_missed_path(client):
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    await client.patch(f"/api/commitments/{cid}",
                       json={"stake_enabled": True, "stake_contact_name": "Bro",
                             "stake_contact_email": "bro@example.com"})
    await client.post(f"/api/commitments/{cid}/start")
    email_mod.outbox.clear()
    r = await client.post(f"/api/commitments/{cid}/abandon")
    assert r.status_code == 200 and r.json()["status"] == "missed"
    assert any(m["to"] == "bro@example.com" for m in email_mod.outbox)  # stake fired (TR-21)
    assert (await client.post(f"/api/commitments/{cid}/abandon")).status_code == 409  # already closed


async def test_abandon_without_stake_just_misses(client):
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    await client.post(f"/api/commitments/{cid}/start")
    email_mod.outbox.clear()
    r = await client.post(f"/api/commitments/{cid}/abandon")
    assert r.status_code == 200 and r.json()["status"] == "missed"
    assert email_mod.outbox == []  # no stake → no email
