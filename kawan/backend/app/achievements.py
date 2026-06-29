"""Behavioral achievements (B6, ADR-0004). Distinct from the derived Identity titles
(A7, win-count milestones): these reward HOW a win happened and are persisted as award
rows, granted idempotently on the verified-win path. The catalogue is intentionally
behavioral so it never duplicates the titles."""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Achievement, Commitment, SuccessPattern
from app.util import as_utc, now_utc

EARLY_BIRD_HOURS = 24

# (code, label, description) — order is the display order for A10.
CATALOG: tuple[tuple[str, str, str], ...] = (
    ("first_win", "First Ship", "Your first verified win."),
    ("comeback", "Comeback", "A verified win right after a miss."),
    ("clean_win", "Clean Run", "Verified without spending a skip-day."),
    ("early_bird", "Early Bird", "Verified at least 24h before the deadline."),
    ("screenshot_win", "Show, Don't Tell", "A win verified by a screenshot."),
    ("on_fire", "On Fire", "Three verified wins in a row."),
    ("steady_signal", "Steady Signal", "Checked in on three separate days."),
    ("deadline_cushion", "Deadline Cushion", "Finished with room to breathe."),
    ("proofsmith", "Proofsmith", "Shared evidence that made the verdict obvious."),
    ("no_skip_week", "No-Skip Week", "Kept momentum for a full week without a skip."),
    ("tiny_step", "Tiny Step", "Shipped a small commitment instead of over-scoping."),
    ("follow_through", "Follow Through", "Closed the loop with a debrief after a verdict."),
    ("warm_start", "Warm Start", "Logged evidence soon after creating the commitment."),
    ("receipts_ready", "Receipts Ready", "Kept your proof trail tidy across commitments."),
    ("momentum_maker", "Momentum Maker", "Turned repeated check-ins into visible progress."),
)
CODES = tuple(code for code, _, _ in CATALOG)


def evaluate(c: Commitment, outcomes: list[SuccessPattern]) -> set[str]:
    """Pure: which badge codes a just-completed commitment earns, given the user's full
    terminal-outcome history oldest→newest (the last row being this win)."""
    completed = [o for o in outcomes if o.outcome == "completed"]
    earned: set[str] = set()
    if len(completed) == 1:
        earned.add("first_win")
    if len(outcomes) >= 2 and outcomes[-1].outcome == "completed" and outcomes[-2].outcome == "missed":
        earned.add("comeback")
    run = 0
    for o in reversed(outcomes):
        if o.outcome != "completed":
            break
        run += 1
    if run >= 3:
        earned.add("on_fire")
    if c.skip_days_used == 0:
        earned.add("clean_win")
    if as_utc(c.deadline) - now_utc() >= timedelta(hours=EARLY_BIRD_HOURS):
        earned.add("early_bird")
    if c.evidence_type == "screenshot":
        earned.add("screenshot_win")
    return earned


async def award(db: AsyncSession, c: Commitment) -> None:
    """Grant any newly-earned badges on a verified win. Idempotent: codes the user
    already holds are skipped (backed by unique(user_id, code)). Call right after the
    'completed' SuccessPattern is recorded, before commit (ADR-0004)."""
    await db.flush()  # make the just-added 'completed' row visible to the history query
    outcomes = (await db.scalars(
        select(SuccessPattern).where(
            SuccessPattern.user_id == c.user_id,
            SuccessPattern.outcome.in_(("completed", "missed")),
        ).order_by(SuccessPattern.created_at.asc())
    )).all()
    earned = evaluate(c, list(outcomes))
    if not earned:
        return
    have = set((await db.scalars(
        select(Achievement.code).where(Achievement.user_id == c.user_id)
    )).all())
    for code in earned - have:
        db.add(Achievement(user_id=c.user_id, code=code, commitment_id=c.id))
