# Derive the check-in cadence from the commitment window, not a fixed daily cron

Spec §7.3 (and TR-14) scope check-ins to a per-commitment `cadence` cron plus a
one-shot `deadline` job. That assumes multi-day windows: a fixed daily tick is
meaningless for a commitment due in two hours, and leaves a short
`?demo_deadline` window silent until the deadline — the opposite of what the
demo needs. We instead **derive the cadence schedule from the window at start**:

- **≥ 1 day → daily cron** (today's behaviour, unchanged).
- **< 1 day → exactly one nudge at the window midpoint**, clamped to land at
  least ~2 min from now and ~2 min before the deadline.
- **window too short for the clamp (< ~5 min) → deadline-only.**

The **win-back** retry becomes window-aware too: instead of a hardcoded "next
local 09:00", it fires at `now + clamp(0.25 × time-to-deadline, 30 min, 6 h)`,
never past the deadline, still at most one per Lapse. (Win-back only ever bites
on multi-day windows — a sub-day window can't reach the two consecutive silent
ticks a Lapse requires, so it can't lapse.)

This collapses the task-list's three bands (≥1d / 2h–1d / <2h) into one rule and
is a deliberate amendment to the normative §7.3. **Flagged for spec §7.3 + trd §5
ratification** (the ADR-0002 pattern), not silent drift.

## Considered options

- **Literal three-band thresholds (≥1d daily; 2h–1d midpoint; <2h
  deadline-only)** — rejected: a sub-2h window (including every short
  `?demo_deadline`) fires no check-in before the deadline, contradicting the
  task's own "short demo window auto-fires a timely nudge" goal.
- **Keep the fixed daily cron, drive the demo beat from `check now` only** —
  rejected: leaves real short-window commitments with no automatic touch, and
  wastes a cheap robustness win.

## Consequences

- One extra branch in `register_commitment_jobs` / `rebuild_from_db`; the
  midpoint nudge is a one-shot `DateTrigger`, rebuilt from the DB at boot like
  the others (TR-15/62 preserved).
- A sub-day commitment gets at most one automated nudge, so it effectively
  cannot Lapse — acceptable: Lapse is a multi-day-silence concept (ADR-0002).
- The `?demo_deadline=+Nm` lever now auto-fires a timely nudge for any N above
  the ~5 min floor, making the scheduler itself demoable.
