"""Dynamic check-in lateness helpers (plan §4.3).

A check-in is 'late' once: now > cadence_tick + grace, where:
  grace = clamp(remaining_window * 0.25, 30min, 6h)

This mirrors the winback delay formula in scheduler.arm_winback.
The final-deadline GRACE_HOURS=6 in state.py is SEPARATE and unchanged."""

from __future__ import annotations

from datetime import datetime, timedelta

_MIN_GRACE = timedelta(minutes=30)
_MAX_GRACE = timedelta(hours=6)


def checkin_grace(remaining_window: timedelta) -> timedelta:
    """Derive the check-in grace period from the remaining window to the deadline.

    Formula: clamp(remaining * 0.25, 30min, 6h) -- mirrors arm_winback in scheduler.py."""
    raw = remaining_window * 0.25
    if raw < _MIN_GRACE:
        return _MIN_GRACE
    if raw > _MAX_GRACE:
        return _MAX_GRACE
    return raw


def is_checkin_late(now: datetime, cadence_tick: datetime, remaining_window: timedelta) -> bool:
    """Return True if now is past the derived grace period after cadence_tick."""
    grace = checkin_grace(remaining_window)
    return now > cadence_tick + grace
