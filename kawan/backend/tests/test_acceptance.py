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
from app.models import AuditLog, Checkin, Commitment, Proposal, SuccessPattern, User
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


# --- missed-retry witness email: cadence fires after grace window, no evidence ----

class _SilentAdapter:
    type = "github"
    trust = "high"

    async def fetch(self, c, since):
        return EvidenceBundle(adapter="github", raw_ref={}, items=[], summary="nothing new")

    async def judge(self, c, b, llm):
        return Verdict("unclear", 0.5, [], "n/a", None)


async def test_cadence_late_with_witness_emails_witness(db, monkeypatch):
    """When a cadence tick fires after the grace window has elapsed (is_late=True)
    and no evidence was submitted, the stake witness is emailed."""
    import app.pipeline as pipeline_mod

    monkeypatch.setitem(wiring.ADAPTERS, "github", _SilentAdapter())
    # Patch is_checkin_late in the pipeline module's namespace (it was imported directly).
    monkeypatch.setattr(pipeline_mod, "is_checkin_late", lambda now, tick, remaining: True)
    email_mod.outbox.clear()

    c = await _seed_active(db, evidence_type="github", skip_days_total=0,
                           stake_enabled=True, stake_contact_name="Witness",
                           stake_contact_email="witness@example.com")
    await pipeline.run_checkin(db, c, "cadence")

    assert any(m["to"] == "witness@example.com" for m in email_mod.outbox)


async def test_cadence_late_without_witness_sends_nothing_extra(db, monkeypatch):
    """Late cadence tick with no stake witness configured — no extra email sent."""
    import app.pipeline as pipeline_mod

    monkeypatch.setitem(wiring.ADAPTERS, "github", _SilentAdapter())
    monkeypatch.setattr(pipeline_mod, "is_checkin_late", lambda now, tick, remaining: True)
    email_mod.outbox.clear()

    c = await _seed_active(db, evidence_type="github", skip_days_total=0)
    await pipeline.run_checkin(db, c, "cadence")

    assert email_mod.outbox == []


async def test_cadence_not_late_does_not_email_witness(db, monkeypatch):
    """A cadence tick that fires on-time (is_late=False) does NOT email the witness."""
    import app.pipeline as pipeline_mod

    monkeypatch.setitem(wiring.ADAPTERS, "github", _SilentAdapter())
    monkeypatch.setattr(pipeline_mod, "is_checkin_late", lambda now, tick, remaining: False)
    email_mod.outbox.clear()

    c = await _seed_active(db, evidence_type="github", skip_days_total=0,
                           stake_enabled=True, stake_contact_name="Witness",
                           stake_contact_email="witness@example.com")
    await pipeline.run_checkin(db, c, "cadence")

    assert not any(m["to"] == "witness@example.com" for m in email_mod.outbox)


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


async def test_proposal_apply_rejects_non_whitelisted_field(client, db):
    """A proposal naming a non-hard-field (e.g. status) must not reach setattr — that
    would be a state-machine bypass (TR-37)."""
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    p = Proposal(commitment_id=cid, field="status", proposed_value="completed", reason="sneaky")
    db.add(p)
    await db.commit()
    r = await client.post(f"/api/commitments/{cid}/proposals/{p.id}/apply")
    assert r.status_code == 422
    assert (await db.get(Commitment, cid)).status == "draft"  # untouched


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


# ── X1: POST /api/commitments/{id}/debrief merges note into success_patterns ───

class _PassAdapter:
    type = "github"
    trust = "high"

    async def fetch(self, c, since):
        return EvidenceBundle(adapter="github", raw_ref={}, items=["sha1"], summary="shipped")

    async def judge(self, c, b, llm):
        return Verdict("pass", 0.95, ["commit merged"], "deliverable confirmed", None)



async def test_debrief_endpoint_happy_path(client, db):
    """The debrief endpoint via the authenticated guest client: 200 { ok: true }."""
    # Create and complete a commitment via the guest client.
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    # Seed a SuccessPattern row directly (skip the pipeline; the route only reads it).
    db.add(SuccessPattern(user_id="guest", commitment_id=cid, outcome="completed",
                          features={"deadline_hour": 18, "cadence": "daily_evening",
                                    "duration_days": 1, "used_skip": False}))
    await db.commit()

    r = await client.post(f"/api/commitments/{cid}/debrief",
                          json={"note": "shipped before the deadline"})
    assert r.status_code == 200 and r.json() == {"ok": True}

    sp = await db.scalar(select(SuccessPattern).where(SuccessPattern.commitment_id == cid))
    assert sp is not None and sp.features["debrief"] == "shipped before the deadline"
    assert "cadence" in sp.features  # structured keys preserved


async def test_debrief_409_when_not_completed(client):
    """Debrief on a draft/active commitment (no terminal row) → 409 Conflict."""
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    r = await client.post(f"/api/commitments/{cid}/debrief", json={"note": "too early"})
    assert r.status_code == 409


# ── Finish-Now: ?finish=true on an ACTIVE commitment must complete it on pass ────

async def test_finish_now_active_commitment_pass_completes(client, db):
    """Finish-Now with ?finish=true on an active commitment: a pass verdict must
    transition the commitment to 'completed' (not just return 'pass' and leave it active).
    This is the MAJOR-1 QA fix: active/lapsed → verifying before judging, then
    apply_final_verdict runs as in the normal deadline path."""
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    await client.post(f"/api/commitments/{cid}/start")

    # Confirm it's active before finishing.
    r = await client.get(f"/api/commitments/{cid}")
    assert r.json()["status"] == "active"

    # Submit file evidence with ?finish=true — StubFileAdapter returns pass for any non-empty upload.
    r = await client.post(
        f"/api/commitments/{cid}/evidence/file?finish=true",
        files={"file": ("proof.txt", b"shipped the feature", "text/plain")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["verdict"] == "pass"
    assert body["status"] == "completed"  # backend confirms completion

    # Confirm DB is actually completed (not just a response field).
    c = await db.get(Commitment, cid)
    assert c.status == "completed"


async def test_finish_now_fail_stays_active(client, db):
    """Finish-Now with a fail verdict must NOT complete the commitment; it should
    stay active (or lapsed) so the user can try again."""
    import app.wiring as _wiring

    class _FailFileAdapter:
        type = "file"
        trust = "medium"
        async def fetch(self, c, since): ...
        async def judge(self, c, b, llm):
            from app.contracts import Verdict
            return Verdict("fail", 0.8, ["not convincing"], "Evidence doesn't match.", None)

    original = _wiring.ADAPTERS.get("file")
    _wiring.ADAPTERS["file"] = _FailFileAdapter()
    try:
        cid = (await client.post("/api/commitments",
                                 json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
        await client.post(f"/api/commitments/{cid}/start")
        r = await client.post(
            f"/api/commitments/{cid}/evidence/file?finish=true",
            files={"file": ("proof.txt", b"weak", "text/plain")},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["verdict"] == "fail"
        # On fail with no skip days the state machine transitions to missed (grace=0 by default)
        # OR it stays in grace if skip days > 0. Either way it must NOT be completed.
        assert body["status"] != "completed"
        c = await db.get(Commitment, cid)
        assert c.status != "completed"
    finally:
        if original is not None:
            _wiring.ADAPTERS["file"] = original


async def test_debrief_no_audit_log_row(client, db):
    """Debrief must not write an AuditLog row (no AI actor, no hard-field mutation)."""
    cid = (await client.post("/api/commitments",
                             json={"action": "ship", "deliverable": "d", "deadline": _future()})).json()["id"]
    db.add(SuccessPattern(user_id="guest", commitment_id=cid, outcome="missed",
                          features={"deadline_hour": 9, "cadence": "daily_morning",
                                    "duration_days": 3, "used_skip": True}))
    await db.commit()

    await client.post(f"/api/commitments/{cid}/debrief", json={"note": "ran out of time"})

    audit_rows = (await db.scalars(select(AuditLog).where(AuditLog.commitment_id == cid))).all()
    # No audit row at all for the debrief (the commitment itself has no auditable mutation here).
    debrief_rows = [row for row in audit_rows if row.field == "debrief"]
    assert debrief_rows == []
