# Track Contact via `commitments.last_contact_at` to close the §5.3 Lapse gap

The §5.3 Lapse rule ("2 consecutive silent check-ins — no evidence **and** no
contact") needs a "no contact" signal that the normative §8.1 DDL does not
carry, and there is deliberately no chat/messages table to derive it from
(TR-05). We add **one** column, `commitments.last_contact_at`, updated on every
user-initiated action (workspace turn, `check now`, evidence upload, proposal
apply). "2 consecutive silent ticks" is then derived from the existing `checkins`
tick history + `evidence` timestamps + `last_contact_at` — no counter column,
fully reconstructable from the DB after a restart (TR-15/TR-62).

This is a deliberate amendment to the normative DDL. **Flagged for spec §8.1 +
trd §5 ratification per TR-71** — it is the one sanctioned schema deviation, not
silent drift.

## Considered options

- **Derive from existing rows only** (treat `check now` + evidence as the sole
  Contact signals) — rejected: a user who only chats would be invisible as
  Contact and could wrongly Lapse.
- **In-memory contact tracking** — rejected: lost on restart, breaks the
  rebuild-from-DB resilience requirement (TR-15/TR-62).
