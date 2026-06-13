"""APScheduler 3.x (AsyncIOScheduler) — in-process, zero infra (spec §7.2/§7.3).

Per active commitment: a `cadence` cron job + a one-shot `deadline` job. The
`winback` job is armed on lapse and the `grace` job on entering grace — both
one-shots ("winback fires after the 2nd silent tick", spec §7.3 / TR-14). All jobs
are rebuilt from the DB at boot so a restart mid-commitment is safe (TR-15/TR-62).

NOTE: coded against APScheduler 3.x deliberately (pin `>=3.10,<4`). The 4.x API
(AsyncScheduler / add_schedule / conflict_policy) does NOT apply here.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from apscheduler.jobstores.base import JobLookupError
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import Checkin, Commitment
from app.util import as_utc, now_utc


def _app_tz():
    try:
        import pytz  # APScheduler 3.x dependency
        return pytz.timezone(settings.app_tz)
    except Exception:  # noqa: BLE001 - fall back to stdlib zoneinfo
        from zoneinfo import ZoneInfo
        return ZoneInfo(settings.app_tz)


APP_TZ = _app_tz()
scheduler = AsyncIOScheduler(timezone=APP_TZ)


def start() -> None:
    if not scheduler.running:
        scheduler.start()


def shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


def _cadence_trigger(cadence: str) -> CronTrigger:
    """Map a cadence label to a daily cron in the app timezone (MVP: daily only).
    `daily_morning`→09:00, `daily_evening`→21:00, `daily_HH:MM`→that time."""
    hour, minute = 21, 0
    if cadence == "daily_morning":
        hour = 9
    elif cadence.startswith("daily_") and ":" in cadence:
        try:
            hh, mm = cadence.split("_", 1)[1].split(":")
            hour, minute = int(hh), int(mm)
        except ValueError:
            pass
    return CronTrigger(hour=hour, minute=minute, timezone=APP_TZ)


def _next_local_morning() -> datetime:
    local = now_utc().astimezone(APP_TZ)
    target = local.replace(hour=9, minute=0, second=0, microsecond=0)
    if target <= local:
        target += timedelta(days=1)
    return target


def register_commitment_jobs(c: Commitment) -> None:
    scheduler.add_job(run_cadence, _cadence_trigger(c.cadence), args=[c.id],
                      id=f"cadence:{c.id}", replace_existing=True, misfire_grace_time=3600)
    scheduler.add_job(run_deadline, DateTrigger(run_date=as_utc(c.deadline)), args=[c.id],
                      id=f"deadline:{c.id}", replace_existing=True, misfire_grace_time=None)


def remove_commitment_jobs(commitment_id: str) -> None:
    for prefix in ("cadence", "deadline", "winback", "grace"):
        try:
            scheduler.remove_job(f"{prefix}:{commitment_id}")
        except JobLookupError:
            pass


def arm_winback(commitment_id: str) -> None:
    scheduler.add_job(run_winback, DateTrigger(run_date=_next_local_morning()), args=[commitment_id],
                      id=f"winback:{commitment_id}", replace_existing=True)


def arm_grace_expire(commitment_id: str, run_date: datetime) -> None:
    scheduler.add_job(run_grace_expire, DateTrigger(run_date=run_date), args=[commitment_id],
                      id=f"grace:{commitment_id}", replace_existing=True)


async def _winback_pending(db, c: Commitment) -> bool:
    """A lapsed commitment is owed a win-back if its latest cadence tick (the one that
    lapsed it) hasn't yet been followed by a win-back (one per lapse, TR-23)."""
    last_cadence = await db.scalar(
        select(Checkin.created_at).where(Checkin.commitment_id == c.id, Checkin.kind == "cadence")
        .order_by(Checkin.created_at.desc()).limit(1)
    )
    if last_cadence is None:
        return False
    last_winback = await db.scalar(
        select(Checkin.created_at).where(Checkin.commitment_id == c.id, Checkin.kind == "winback")
        .order_by(Checkin.created_at.desc()).limit(1)
    )
    return last_winback is None or as_utc(last_winback) < as_utc(last_cadence)


async def rebuild_from_db() -> None:
    """On boot, re-register all three job types (cadence/deadline/win-back) for every
    live commitment; fire any deadline that already passed while we were down
    (restart resilience, TR-15)."""
    from app import pipeline
    async with SessionLocal() as db:
        rows = (await db.scalars(
            select(Commitment).where(Commitment.status.in_(("active", "lapsed", "grace")))
        )).all()
        for c in rows:
            if c.status in ("active", "lapsed"):
                scheduler.add_job(run_cadence, _cadence_trigger(c.cadence), args=[c.id],
                                  id=f"cadence:{c.id}", replace_existing=True, misfire_grace_time=3600)
                if as_utc(c.deadline) <= now_utc():
                    await pipeline.run_final_verify(db, c)  # deadline passed while down
                    continue
                scheduler.add_job(run_deadline, DateTrigger(run_date=as_utc(c.deadline)), args=[c.id],
                                  id=f"deadline:{c.id}", replace_existing=True, misfire_grace_time=None)
            if c.status == "lapsed" and await _winback_pending(db, c):
                arm_winback(c.id)  # win-back survives a restart


# --- job callables: each opens its own session and reloads the commitment fresh ---

async def run_cadence(commitment_id: str) -> None:
    from app import pipeline
    async with SessionLocal() as db:
        c = await db.get(Commitment, commitment_id)
        if c and c.status in ("active", "lapsed"):
            await pipeline.run_checkin(db, c, "cadence")


async def run_deadline(commitment_id: str) -> None:
    from app import pipeline
    async with SessionLocal() as db:
        c = await db.get(Commitment, commitment_id)
        if c and c.status in ("active", "lapsed"):
            await pipeline.run_final_verify(db, c)


async def run_winback(commitment_id: str) -> None:
    from app import pipeline
    async with SessionLocal() as db:
        c = await db.get(Commitment, commitment_id)
        if c and c.status == "lapsed":
            await pipeline.send_winback(db, c)


async def run_grace_expire(commitment_id: str) -> None:
    from app import pipeline
    async with SessionLocal() as db:
        c = await db.get(Commitment, commitment_id)
        if c and c.status == "grace":
            await pipeline.expire_grace(db, c)
