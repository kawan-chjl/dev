"""Dynamic lateness: check-in is `late` once now > cadence_tick + grace, where
grace = clamp(remaining_window * 0.25, 30min, 6h). Final-deadline GRACE_HOURS=6
is separate and unchanged."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest


def _utc(*args):
    return datetime(*args, tzinfo=timezone.utc)


# ── checkin_grace tests (pure helper) ───────────────────────────────────────

def test_wide_window_gives_larger_grace():
    """A 20-hour remaining window gives 5h grace (25% of 20h, within 30min-6h bounds)."""
    from app.lateness import checkin_grace
    remaining = timedelta(hours=20)
    grace = checkin_grace(remaining)
    assert grace == timedelta(hours=5)


def test_near_deadline_gives_min_grace():
    """A 1-hour remaining window gives 30min grace (25% = 15min, clamped up to 30min)."""
    from app.lateness import checkin_grace
    remaining = timedelta(hours=1)
    grace = checkin_grace(remaining)
    assert grace == timedelta(minutes=30)


def test_very_large_window_gives_max_grace():
    """A 48-hour window gives 6h grace (25% = 12h, clamped down to 6h)."""
    from app.lateness import checkin_grace
    remaining = timedelta(hours=48)
    grace = checkin_grace(remaining)
    assert grace == timedelta(hours=6)


def test_boundary_24h_window():
    """A 24-hour window gives 6h grace (25% = 6h, exactly at max boundary)."""
    from app.lateness import checkin_grace
    remaining = timedelta(hours=24)
    grace = checkin_grace(remaining)
    assert grace == timedelta(hours=6)


def test_2h_window_gives_30min():
    """A 2-hour window gives 30min grace (25% = 30min, exactly at min boundary)."""
    from app.lateness import checkin_grace
    remaining = timedelta(hours=2)
    grace = checkin_grace(remaining)
    assert grace == timedelta(minutes=30)


def test_zero_remaining_gives_min_grace():
    """Zero or negative remaining still gives the minimum grace (never errors)."""
    from app.lateness import checkin_grace
    assert checkin_grace(timedelta(0)) == timedelta(minutes=30)
    assert checkin_grace(timedelta(minutes=-10)) == timedelta(minutes=30)


# ── is_checkin_late tests (pure helper) ─────────────────────────────────────

def test_is_late_flips_only_after_grace():
    """Not late immediately after tick; late only once grace period passes."""
    from app.lateness import is_checkin_late
    tick = _utc(2026, 6, 28, 9, 0)
    deadline = _utc(2026, 6, 28, 21, 0)  # 12h window -> grace = 3h
    remaining = deadline - tick

    # just before grace expires
    now_early = tick + timedelta(hours=2, minutes=59)
    assert not is_checkin_late(now_early, tick, remaining)

    # just after grace expires
    now_late = tick + timedelta(hours=3, minutes=1)
    assert is_checkin_late(now_late, tick, remaining)


def test_wide_window_has_larger_grace_than_narrow():
    """Wide window -> larger grace threshold than narrow window."""
    from app.lateness import is_checkin_late
    tick = _utc(2026, 6, 27, 0, 0)

    wide_deadline = tick + timedelta(hours=48)
    narrow_deadline = tick + timedelta(hours=2)

    # 3 hours after the tick
    now = tick + timedelta(hours=3)

    wide_remaining = wide_deadline - tick   # 48h -> 6h grace -> not late at 3h
    narrow_remaining = narrow_deadline - tick  # 2h -> 30min grace -> late at 3h

    assert not is_checkin_late(now, tick, wide_remaining)
    assert is_checkin_late(now, tick, narrow_remaining)


# ── assemble_progress includes due_at / is_late ──────────────────────────────

async def test_assemble_progress_includes_checkin_status(db):
    """assemble_progress returns due_at and is_late keys."""
    from datetime import timedelta

    from app.models import Commitment
    from app.pipeline import assemble_progress
    from app.util import now_utc

    c = Commitment(
        user_id="u1", action="finish", deliverable="the project",
        deadline=now_utc() + timedelta(hours=12),
        cadence="daily_evening",
        status="active",
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)

    progress = await assemble_progress(db, c)
    assert "due_at" in progress
    assert "is_late" in progress
    assert isinstance(progress["is_late"], bool)


# ── GRACE_HOURS final-deadline grace is unchanged ────────────────────────────

def test_final_deadline_grace_hours_unchanged():
    """state.GRACE_HOURS must remain 6 (spec §5.3 decision)."""
    from app.state import GRACE_HOURS
    assert GRACE_HOURS == 6
