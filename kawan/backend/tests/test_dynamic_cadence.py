"""B9 (ADR-0003): cadence is derived from the commitment window, and the win-back is
window-aware. Multi-day -> daily cron; sub-day -> one clamped midpoint nudge; tiny
window -> deadline-only. Win-back fires ~25% of the remaining window out, clamped."""

from datetime import timedelta

from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

from app import scheduler
from app.models import Commitment, User
from app.util import as_utc, new_id, now_utc


async def _seed(db, *, hours: float, status="active") -> Commitment:
    u = User(id=new_id(), username="u", access_token="x", refresh_token="y",
             token_expiry=now_utc() + timedelta(hours=1))
    db.add(u)
    await db.flush()
    c = Commitment(user_id=u.id, action="a", deliverable="d",
                   deadline=now_utc() + timedelta(hours=hours), status=status)
    db.add(c)
    await db.commit()
    return c


def _job(job_id: str):
    return scheduler.scheduler.get_job(job_id)


def _secs_out(dt) -> float:
    return as_utc(dt).timestamp() - now_utc().timestamp()


async def test_multiday_window_is_daily_cron(db):
    c = await _seed(db, hours=48)
    scheduler.register_commitment_jobs(c)
    job = _job(f"cadence:{c.id}")
    assert job is not None and isinstance(job.trigger, CronTrigger)
    assert _job(f"deadline:{c.id}") is not None


async def test_subday_window_is_one_midpoint_nudge(db):
    c = await _seed(db, hours=2)
    scheduler.register_commitment_jobs(c)
    job = _job(f"cadence:{c.id}")
    assert job is not None and isinstance(job.trigger, DateTrigger)
    assert abs(_secs_out(job.trigger.run_date) - 3600) < 120  # midpoint = ~1h out


async def test_tiny_window_is_deadline_only(db):
    c = await _seed(db, hours=0.05)  # 3 min — below the clamp floor
    scheduler.register_commitment_jobs(c)
    assert _job(f"cadence:{c.id}") is None        # no nudge
    assert _job(f"deadline:{c.id}") is not None    # deadline still runs the miss path


async def test_winback_is_window_aware(db):
    c = await _seed(db, hours=8, status="lapsed")
    scheduler.arm_winback(c)
    job = _job(f"winback:{c.id}")
    assert job is not None
    assert abs(_secs_out(job.trigger.run_date) - 2 * 3600) < 120  # 25% of 8h = 2h


async def test_winback_clamped_to_floor(db):
    c = await _seed(db, hours=1, status="lapsed")
    scheduler.arm_winback(c)
    out = _secs_out(_job(f"winback:{c.id}").trigger.run_date)
    assert abs(out - 30 * 60) < 120  # 25% of 1h = 15min, clamped up to the 30min floor
    assert out < 3600                # still before the deadline


async def test_demo_short_window_autofires_a_nudge(db):
    """The ?demo_deadline lever sets a short real deadline; B9 makes it fire a timely
    check-in instead of going silent until the deadline."""
    c = await _seed(db, hours=0.5)  # 30 min
    scheduler.register_commitment_jobs(c)
    job = _job(f"cadence:{c.id}")
    assert job is not None and isinstance(job.trigger, DateTrigger)
    assert abs(_secs_out(job.trigger.run_date) - 15 * 60) < 120  # midpoint = ~15min out
