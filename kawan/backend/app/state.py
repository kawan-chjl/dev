"""The commitment state machine (spec §5.3). This module is the ONLY writer of
commitments.status (besides nothing — even Start goes through here), keeping the
"nothing, not even Kawan, moves your goalposts" guarantee structural (spec §8.2).
Every status change and skip-day spend is audit-logged with actor='system'; the AI
layer has no path here (TR-25).

States: draft, active, lapsed, verifying, grace, completed, missed.
"""

from __future__ import annotations

from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import AuditLog, Commitment, SuccessPattern
from app.util import as_utc, now_utc

GRACE_HOURS = 6  # spec §5.3 [DECISION] — sized to GitHub's ≤6 h stat delay


async def audit(db: AsyncSession, *, commitment_id, field, old, new, actor, via_proposal_id=None) -> None:
    db.add(AuditLog(commitment_id=commitment_id, field=field, old_value=old, new_value=new,
                    actor=actor, via_proposal_id=via_proposal_id))


async def _set_status(db: AsyncSession, c: Commitment, new_status: str) -> None:
    if c.status == new_status:
        return
    old, c.status = c.status, new_status
    await audit(db, commitment_id=c.id, field="status", old=old, new=new_status, actor="system")


def _features(c: Commitment) -> dict:
    deadline = as_utc(c.deadline).astimezone(ZoneInfo(settings.app_tz))
    duration = (now_utc() - as_utc(c.created_at)).days
    return {
        "deadline_hour": deadline.hour,
        "cadence": c.cadence,
        "duration_days": duration,
        "used_skip": c.skip_days_used > 0,
    }


async def _record_outcome(db: AsyncSession, c: Commitment, outcome: str) -> None:
    db.add(SuccessPattern(user_id=c.user_id, commitment_id=c.id, outcome=outcome, features=_features(c)))


async def start(db: AsyncSession, c: Commitment) -> None:
    if c.status != "draft":
        raise ValueError(f"cannot start from {c.status}")
    await _set_status(db, c, "active")
    await db.commit()


async def mark_lapsed(db: AsyncSession, c: Commitment) -> bool:
    if c.status != "active":
        return False
    await _set_status(db, c, "lapsed")
    await db.commit()
    return True


async def mark_returned(db: AsyncSession, c: Commitment) -> None:
    if c.status == "lapsed":
        await _set_status(db, c, "active")
        await db.commit()


async def begin_verifying(db: AsyncSession, c: Commitment) -> None:
    if c.status in ("active", "lapsed"):
        await _set_status(db, c, "verifying")
        await db.commit()


_FINALIZABLE_STATUSES = {"verifying", "grace"}


async def apply_final_verdict(db: AsyncSession, c: Commitment, verdict: str) -> str:
    """Resolve a final-verify Verdict into completed | grace | missed (spec §5.3).
    Guard: only acts from verifying/grace; returns current status unchanged otherwise.
    Grace is entered only on a non-pass with a skip-day available, and spends it."""
    if c.status not in _FINALIZABLE_STATUSES:
        return c.status

    if verdict == "pass":
        await _set_status(db, c, "completed")
        await _record_outcome(db, c, "completed")
        from app import achievements  # local import avoids a module load-order cycle
        await achievements.award(db, c)  # behavioral badges on the verified win (B6, ADR-0004)
        await db.commit()
        return "completed"

    if c.status == "grace":  # the grace re-check failed → terminal
        await _set_status(db, c, "missed")
        await _record_outcome(db, c, "missed")
        await db.commit()
        return "missed"

    if c.skip_days_used < c.skip_days_total:  # FAIL/UNCLEAR + grace available
        c.skip_days_used += 1
        await audit(db, commitment_id=c.id, field="skip_days_used",
                    old=c.skip_days_used - 1, new=c.skip_days_used, actor="system")
        await _set_status(db, c, "grace")
        await db.commit()
        return "grace"

    await _set_status(db, c, "missed")  # FAIL, no grace
    await _record_outcome(db, c, "missed")
    await db.commit()
    return "missed"


async def grace_expire(db: AsyncSession, c: Commitment) -> str:
    if c.status != "grace":
        return c.status
    await _set_status(db, c, "missed")
    await _record_outcome(db, c, "missed")
    await db.commit()
    return "missed"


_TERMINAL_STATUSES = {"completed", "missed"}


async def abandon(db: AsyncSession, c: Commitment) -> str:
    """User-initiated abandon → missed (TR-21, §6.3). The status change is the user's
    own decision, so it is audited actor='user'; the stake (if any) fires as a system
    consequence in the pipeline. The frontend gates this behind a confirm dialog.
    No-op if already terminal."""
    if c.status in _TERMINAL_STATUSES:
        return c.status
    old, c.status = c.status, "missed"
    await audit(db, commitment_id=c.id, field="status", old=old, new="missed", actor="user")
    await _record_outcome(db, c, "missed")
    await db.commit()
    return "missed"
