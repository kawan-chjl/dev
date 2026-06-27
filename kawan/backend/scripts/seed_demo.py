"""Demo seed / reset script (spec §6.4, §12.5, TR-67, B7).

Provisions a clean, demo-flattering dataset on a DEDICATED demo account
(id='demo_showcase') and can RESET it idempotently.  The shared guest user
is NEVER touched — a hard guard enforces this.

Run from kawan/backend/:
    uv run python scripts/seed_demo.py            # seed (first time)
    uv run python scripts/seed_demo.py --reset    # wipe + reseed
    uv run python scripts/seed_demo.py --status   # print what is in the DB

The script works against whatever KAWAN_DATABASE_URL is configured (defaults
to the local SQLite kawan.db).  Run with a postgres URL to seed Supabase:
    KAWAN_DATABASE_URL="postgresql+asyncpg://..." uv run python scripts/seed_demo.py --reset

Account isolation guarantee:
  - DEMO_USER_ID is a constant distinct from GUEST_USER_ID ('guest').
  - _wipe_demo_user() checks the id against a hard deny-list before any
    DELETE and raises if the id ever collides with a protected account.
  - No DELETE touches the users table for any id other than DEMO_USER_ID.

Demo story staged (§12.5 beat map):
  C1 — "Build the portfolio site"       status=completed   (drives titles + momentum)
  C2 — "Ship the landing page redesign" status=completed   (2nd verified win → 'Starter')
  C3 — "Refactor the auth module"       status=completed   (3rd win → 'Finisher' title)
  C4 — "Write the API integration docs" status=active      (in-flight, deadline +2 h)
  C5 — "Submit the Chutes Hack entry"   status=active      (stake ON, deadline +4 h)
         → stake contact set → the §12.5 "stake ON" beat

Each completed commitment has:
  - A SuccessPattern(outcome='completed') row (what drives titles / productivity meter).
  - A Checkin row (cadence check-in message).
  - An Evidence row (verdict='pass') representing the submitted proof.

Active commitments have a Checkin row to show a mid-run nudge in the timeline.
"""

from __future__ import annotations

import argparse
import asyncio
import pathlib
import sys
from datetime import timedelta

# Make `app` importable when run directly from the scripts/ directory.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    AuditLog,
    Checkin,
    Commitment,
    Evidence,
    Message,
    Plan,
    Proposal,
    PushSubscription,
    SoftContext,
    SuccessPattern,
    User,
)
from app.util import new_id, now_utc  # noqa: E402

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEMO_USER_ID = "demo_showcase"
DEMO_USERNAME = "Demo (showcase)"

# Hard deny-list: the reset guard refuses to wipe any of these user ids.
# 'guest' is the shared public account; real SIWC ids start with idp-provider
# prefixes and are never the literal string 'demo_showcase'.
_PROTECTED_IDS = {"guest"}


# ---------------------------------------------------------------------------
# Guard
# ---------------------------------------------------------------------------


def _assert_safe_to_wipe(user_id: str) -> None:
    """Raise if the id is protected.  This is the only call-site before any DELETE."""
    if user_id in _PROTECTED_IDS:
        raise RuntimeError(
            f"SAFETY ABORT: refusing to wipe user_id={user_id!r} — it is a protected shared account. "
            "The demo seed script must only target DEMO_USER_ID."
        )
    if user_id != DEMO_USER_ID:
        raise RuntimeError(
            f"SAFETY ABORT: refusing to wipe user_id={user_id!r} — "
            f"the demo seed script only targets DEMO_USER_ID={DEMO_USER_ID!r}."
        )


# ---------------------------------------------------------------------------
# Wipe
# ---------------------------------------------------------------------------


async def _wipe_demo_user(db) -> None:
    """Delete ALL rows belonging to DEMO_USER_ID, then the user row itself.
    Cascades manually (SQLite has no FK cascade by default on aiosqlite)."""
    _assert_safe_to_wipe(DEMO_USER_ID)

    # Collect commitment ids first — child tables key on commitment_id.
    result = await db.execute(select(Commitment.id).where(Commitment.user_id == DEMO_USER_ID))
    cids = [row[0] for row in result.fetchall()]

    for cid in cids:
        await db.execute(delete(Message).where(Message.commitment_id == cid))
        await db.execute(delete(Checkin).where(Checkin.commitment_id == cid))
        await db.execute(delete(Evidence).where(Evidence.commitment_id == cid))
        await db.execute(delete(SoftContext).where(SoftContext.commitment_id == cid))
        await db.execute(delete(Plan).where(Plan.commitment_id == cid))
        await db.execute(delete(Proposal).where(Proposal.commitment_id == cid))
        await db.execute(delete(AuditLog).where(AuditLog.commitment_id == cid))

    await db.execute(delete(Commitment).where(Commitment.user_id == DEMO_USER_ID))
    await db.execute(delete(SuccessPattern).where(SuccessPattern.user_id == DEMO_USER_ID))
    await db.execute(delete(PushSubscription).where(PushSubscription.user_id == DEMO_USER_ID))
    await db.execute(delete(User).where(User.id == DEMO_USER_ID))
    await db.commit()


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------


def _past(days: int = 0, hours: int = 0, minutes: int = 0) -> object:
    return now_utc() - timedelta(days=days, hours=hours, minutes=minutes)


def _future(hours: int = 0, minutes: int = 0) -> object:
    return now_utc() + timedelta(hours=hours, minutes=minutes)


def _completed_commitment(user_id: str, action: str, deliverable: str,
                           days_ago_start: int, days_ago_end: int) -> Commitment:
    """Return a Commitment in 'completed' status with past dates."""
    return Commitment(
        id=new_id(),
        user_id=user_id,
        action=action,
        deliverable=deliverable,
        deadline=_past(days=days_ago_end),
        cadence="daily_evening",
        evidence_type="screenshot",
        status="completed",
        escalation=0,
        skip_days_total=1,
        skip_days_used=0,
        created_at=_past(days=days_ago_start),
    )


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------


async def _seed(db) -> None:
    now = now_utc()

    # ------------------------------------------------------------------
    # User row
    # ------------------------------------------------------------------
    user = User(
        id=DEMO_USER_ID,
        username=DEMO_USERNAME,
        persona="kawan",
        access_token="",   # no real SIWC token needed — demo is guest-mode
        refresh_token="",
        token_expiry=now + timedelta(days=3650),
        created_at=_past(days=14),
    )
    db.add(user)
    await db.flush()  # get the PK into the session before FK children

    # ------------------------------------------------------------------
    # C1 — completed 12 days ago: "Build the portfolio site"
    # ------------------------------------------------------------------
    c1 = _completed_commitment(DEMO_USER_ID, "build", "the portfolio site",
                                days_ago_start=14, days_ago_end=12)
    db.add(c1)
    await db.flush()

    db.add(SoftContext(
        commitment_id=c1.id,
        why="Show my work to potential employers",
        obstacles="Perfectionism, keeping it simple",
        time_constraints="Evenings only",
        skill="React + design",
        updated_at=_past(days=14),
    ))
    db.add(Checkin(
        id=new_id(), commitment_id=c1.id, kind="cadence",
        message="You said you'd have this done by midnight — have you pushed anything today?",
        escalation=0, delivered_via="timeline",
        created_at=_past(days=13, hours=8),
    ))
    db.add(Evidence(
        id=new_id(), commitment_id=c1.id, adapter="screenshot",
        raw_ref=None, verdict="pass", confidence=0.92,
        reasoning="Screenshot clearly shows the portfolio site deployed and live.",
        created_at=_past(days=12),
    ))
    db.add(SuccessPattern(
        id=new_id(), user_id=DEMO_USER_ID, commitment_id=c1.id,
        outcome="completed",
        features={"deadline_hour": 23, "cadence": "daily_evening",
                  "duration_days": 2, "used_skip": False},
        created_at=_past(days=12),
    ))
    db.add(AuditLog(
        id=new_id(), commitment_id=c1.id, field="status",
        old_value="active", new_value="completed", actor="system",
        created_at=_past(days=12),
    ))

    # ------------------------------------------------------------------
    # C2 — completed 9 days ago: "Ship the landing page redesign"
    # ------------------------------------------------------------------
    c2 = _completed_commitment(DEMO_USER_ID, "ship", "the landing page redesign",
                                days_ago_start=11, days_ago_end=9)
    db.add(c2)
    await db.flush()

    db.add(SoftContext(
        commitment_id=c2.id,
        why="The old landing page was embarrassing",
        obstacles="Getting sign-off from the team",
        time_constraints="Need to finish before the investor meeting",
        skill="CSS + copywriting",
        updated_at=_past(days=11),
    ))
    db.add(Checkin(
        id=new_id(), commitment_id=c2.id, kind="cadence",
        message="Still at it? The deadline is tonight. What's left?",
        escalation=1, delivered_via="timeline",
        created_at=_past(days=10, hours=6),
    ))
    db.add(Evidence(
        id=new_id(), commitment_id=c2.id, adapter="screenshot",
        raw_ref=None, verdict="pass", confidence=0.88,
        reasoning="Redesigned landing page is live; key sections are visible.",
        created_at=_past(days=9),
    ))
    db.add(SuccessPattern(
        id=new_id(), user_id=DEMO_USER_ID, commitment_id=c2.id,
        outcome="completed",
        features={"deadline_hour": 23, "cadence": "daily_evening",
                  "duration_days": 2, "used_skip": False},
        created_at=_past(days=9),
    ))
    db.add(AuditLog(
        id=new_id(), commitment_id=c2.id, field="status",
        old_value="active", new_value="completed", actor="system",
        created_at=_past(days=9),
    ))

    # ------------------------------------------------------------------
    # C3 — completed 5 days ago: "Refactor the auth module"
    # (3rd win → 'Finisher' title per spec §11.4)
    # ------------------------------------------------------------------
    c3 = _completed_commitment(DEMO_USER_ID, "refactor", "the auth module",
                                days_ago_start=7, days_ago_end=5)
    db.add(c3)
    await db.flush()

    db.add(SoftContext(
        commitment_id=c3.id,
        why="Tech debt was slowing the whole team down",
        obstacles="Understanding the legacy flow without breaking anything",
        time_constraints="Before the next sprint",
        skill="Python + SQLAlchemy",
        updated_at=_past(days=7),
    ))
    db.add(Checkin(
        id=new_id(), commitment_id=c3.id, kind="cadence",
        message="Progress report time. Have you touched the auth module today?",
        escalation=0, delivered_via="timeline",
        created_at=_past(days=6, hours=7),
    ))
    db.add(Evidence(
        id=new_id(), commitment_id=c3.id, adapter="github",
        raw_ref={"shas": ["abc1234"]}, verdict="pass", confidence=0.95,
        reasoning="GitHub shows a PR merged yesterday touching auth.py — substantial refactor.",
        created_at=_past(days=5),
    ))
    db.add(SuccessPattern(
        id=new_id(), user_id=DEMO_USER_ID, commitment_id=c3.id,
        outcome="completed",
        features={"deadline_hour": 23, "cadence": "daily_evening",
                  "duration_days": 2, "used_skip": False},
        created_at=_past(days=5),
    ))
    db.add(AuditLog(
        id=new_id(), commitment_id=c3.id, field="status",
        old_value="active", new_value="completed", actor="system",
        created_at=_past(days=5),
    ))

    # ------------------------------------------------------------------
    # C4 — active, in-flight: "Write the API integration docs"
    # deadline +2 h — the §12.5 live beat
    # ------------------------------------------------------------------
    c4 = Commitment(
        id=new_id(),
        user_id=DEMO_USER_ID,
        action="write",
        deliverable="the API integration docs",
        deadline=_future(hours=2),
        cadence="daily_evening",
        evidence_type="screenshot",
        status="active",
        escalation=0,
        skip_days_total=1,
        skip_days_used=0,
        created_at=_past(days=1),
    )
    db.add(c4)
    await db.flush()

    db.add(SoftContext(
        commitment_id=c4.id,
        why="New teammates can't onboard without documentation",
        obstacles="Writing clearly for a non-technical audience",
        time_constraints="Must be up before the Monday standup",
        skill="Technical writing",
        updated_at=_past(days=1),
    ))
    db.add(Checkin(
        id=new_id(), commitment_id=c4.id, kind="cadence",
        message="Clock's ticking. Have you opened the docs repo yet?",
        escalation=0, delivered_via="timeline",
        created_at=_past(hours=3),
    ))
    db.add(AuditLog(
        id=new_id(), commitment_id=c4.id, field="status",
        old_value="draft", new_value="active", actor="system",
        created_at=_past(days=1),
    ))

    # ------------------------------------------------------------------
    # C5 — active, stake ON: "Submit the Chutes Hack entry"
    # deadline +4 h — the §12.5 "stake ON, contact set" beat
    # ------------------------------------------------------------------
    c5 = Commitment(
        id=new_id(),
        user_id=DEMO_USER_ID,
        action="submit",
        deliverable="the Chutes Hack entry",
        deadline=_future(hours=4),
        cadence="daily_evening",
        evidence_type="screenshot",
        stake_enabled=True,
        stake_contact_name="Tuna",
        stake_contact_email="tuna@example.com",
        status="active",
        escalation=0,
        skip_days_total=1,
        skip_days_used=0,
        created_at=_past(hours=6),
    )
    db.add(c5)
    await db.flush()

    db.add(SoftContext(
        commitment_id=c5.id,
        why="This is the project we've been building toward",
        obstacles="Integration bugs, getting the demo video right",
        time_constraints="Deadline is 23:59 MYT 30 Jun 2026 — no extensions",
        skill="Full-stack + demo storytelling",
        updated_at=_past(hours=6),
    ))
    db.add(Checkin(
        id=new_id(), commitment_id=c5.id, kind="cadence",
        message="Four hours to go. If you miss this, Tuna finds out. What's your status?",
        escalation=0, delivered_via="timeline",
        created_at=_past(hours=1),
    ))
    db.add(AuditLog(
        id=new_id(), commitment_id=c5.id, field="status",
        old_value="draft", new_value="active", actor="system",
        created_at=_past(hours=6),
    ))

    await db.commit()


# ---------------------------------------------------------------------------
# Status reporter
# ---------------------------------------------------------------------------


async def _print_status(db) -> None:
    result = await db.execute(select(User).where(User.id == DEMO_USER_ID))
    user = result.scalar_one_or_none()
    if user is None:
        print(f"[status] No demo user found (id={DEMO_USER_ID!r}). Run without --status to seed.")
        return

    print(f"[status] Demo user: id={user.id!r}, username={user.username!r}, persona={user.persona!r}")

    coms = (await db.execute(
        select(Commitment).where(Commitment.user_id == DEMO_USER_ID)
    )).scalars().all()
    print(f"[status] Commitments ({len(coms)}):")
    for c in coms:
        print(f"  {c.id[:8]}  {c.status:<12} '{c.action} {c.deliverable}'  "
              f"deadline={c.deadline.strftime('%Y-%m-%d %H:%M')}  stake={c.stake_enabled}")

    patterns = (await db.execute(
        select(SuccessPattern).where(SuccessPattern.user_id == DEMO_USER_ID)
    )).scalars().all()
    completed = [p for p in patterns if p.outcome == "completed"]
    missed = [p for p in patterns if p.outcome == "missed"]
    print(f"[status] SuccessPatterns: {len(completed)} completed, {len(missed)} missed")

    # Title derivation (spec §11.4): 1→Starter, 3→Finisher, 5→Shipper, 10→Serial Shipper
    wins = len(completed)
    if wins >= 10:
        title = "Serial Shipper"
    elif wins >= 5:
        title = "Shipper"
    elif wins >= 3:
        title = "Finisher"
    elif wins >= 1:
        title = "Starter"
    else:
        title = "(no title yet)"
    print(f"[status] Current title from {wins} verified wins: {title!r}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


async def main(reset: bool, status: bool) -> None:
    # Ensure tables exist (create_all is idempotent for existing schemas).
    import app.models  # noqa: F401 — registers all ORM classes on Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        if status:
            await _print_status(db)
            return

        existing = await db.get(User, DEMO_USER_ID)

        if existing is not None and not reset:
            print(
                f"[seed_demo] Demo user already exists (id={DEMO_USER_ID!r}). "
                "Run with --reset to wipe and reseed."
            )
            await _print_status(db)
            return

        if existing is not None:
            print(f"[seed_demo] --reset: wiping demo account (id={DEMO_USER_ID!r}) ...")
            await _wipe_demo_user(db)
            print("[seed_demo] Wipe complete.")

        print(f"[seed_demo] Seeding demo account (id={DEMO_USER_ID!r}) ...")
        await _seed(db)
        print("[seed_demo] Seed complete.")
        await _print_status(db)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or reset the Kawan demo account.")
    parser.add_argument(
        "--reset", action="store_true",
        help="Wipe the demo account's data first, then reseed (idempotent).",
    )
    parser.add_argument(
        "--status", action="store_true",
        help="Print what is currently in the DB for the demo account and exit.",
    )
    args = parser.parse_args()
    asyncio.run(main(reset=args.reset, status=args.status))
