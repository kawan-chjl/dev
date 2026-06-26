# Persist Achievements in a table rather than deriving them

The reward stack is otherwise **derived with no schema**: Identity titles, the
productivity meter, and the win streak are all pure functions of
`success_patterns` (outcome history + a `features` JSON). Achievements (B6,
`[deviation: not in spec]`) could be derived the same way — every badge in the
chosen catalogue (comeback, clean win, early-bird, screenshot win, on-fire) is
computable from that history at read time. We nonetheless **persist them in an
`achievements` table** (one award row per `(user_id, code)`), awarded
idempotently on the verified-win path.

## Considered options

- **Derive at read time (no table)** — consistent with titles/meter/streak,
  zero migration, fully reconstructable (TR-15/62). Rejected by PO directive:
  explicit award rows carry an `awarded_at` and a provenance `commitment_id`,
  and leave room for future badges whose condition is _not_ a function of
  `success_patterns` (e.g. "linked Telegram", "used three personas") without
  introducing a second mechanism later.
- **Award on a separate cron sweep** — rejected: awards belong on the same
  transaction that records the outcome, so they can't drift from it.

## Consequences

- The one reward mechanic that touches the schema; everything else stays
  derived. The `achievements` table + a `unique(user_id, code)` constraint make
  awards idempotent (INSERT-OR-IGNORE), so re-running the award helper is safe.
- Award logic lives next to `_record_outcome` in `state.py`, firing only on a
  verified completion; the catalogue is intentionally **behavioral** so it never
  duplicates the count-based Identity titles.
- A future non-derivable badge needs only a new `code` + condition, not a new
  storage decision.
