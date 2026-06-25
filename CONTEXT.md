# Kawan

The ubiquitous language of Kawan, a voiced Live2D accountability companion. One
user holds **one Commitment** at a time; Kawan gathers context, proposes a plan,
then verifies completion from **fetched Evidence** — never self-report, and it
never does the user's work.

## Language

### The commitment & its data

**Commitment**:
The single active goal a user is accountable for. Carries the Hard Fields. At
most one is active per user.
_Avoid_: goal, task, todo, objective

**Hard fields**:
The GUI-set, AI-**read-only** attributes of a Commitment (action, deliverable,
deadline, cadence, evidence type/config, stake, skip-days, status, escalation).
No AI code path may write them.
_Avoid_: settings, config, parameters

**Soft context**:
The four AI-writable slots — `why`, `obstacles`, `time_constraints`, `skill`.
The **only** data any LLM output may write (via the intake UPSERT).
_Avoid_: memory, profile, notes

**Proposal**:
An AI-suggested change to a Hard Field that only the **user** can apply. The sole
channel by which the AI influences Hard Fields; applying is audit-logged as
`actor='user'`.
_Avoid_: edit, change, suggestion (when loose)

### Accountability loop

**Check-in**:
A system-initiated accountability touch — kind `cadence | on_demand | deadline |
winback` — delivered down the ladder. `on_demand` is the `check now` lever.
_Avoid_: notification, reminder, message

**Cadence**:
The recurring schedule for routine Check-ins (e.g. `daily_evening`).
_Avoid_: frequency, interval

**Escalation**:
Tone level `0|1|2` (gentle → direct → blunt). Rises only on consecutive
no-new-Evidence ticks; any Evidence resets it. A derived dial, not a state.
_Avoid_: severity, level, urgency

**Contact**:
A user-initiated interaction with the active Commitment (workspace turn, `check
now`, evidence upload, …) that resets the silence clock. Distinct from Evidence:
talking to Kawan is Contact but not Evidence.
_Avoid_: activity, engagement, interaction (when loose)

### Evidence & judgment

**Evidence**:
Fetched proof of progress — GitHub commits or an uploaded screenshot — **never
self-report**. The screenshot file is deleted after judging.
_Avoid_: proof, submission, report

**Verdict**:
The judge's three-valued ruling on Evidence: `pass | fail | unclear`. `unclear`
**never punishes** — it asks for a follow-up.
_Avoid_: result, score, grade

### States & outcomes

**Lapse** (state `lapsed`):
The recoverable mid-commitment state entered after **2 consecutive silent
Check-ins** (no Evidence **and** no Contact). The user returning restores
`active`. Not an outcome — the Commitment is still live.
_Avoid_: miss, fail, abandon, drop

**Miss** (state `missed`):
The terminal outcome when the deadline passes unverified (`fail`, no grace left)
or the user abandons. Fires the Stake. **Distinct from Lapse.**
_Avoid_: lapse, fail, loss

**Grace** (state `grace`):
A 6-hour post-deadline window granted on a non-pass final Verdict **if a
Skip-day is available**; entering it **spends** a Skip-day.
_Avoid_: extension, buffer, overtime

**Skip-day**:
A budgeted allowance (default 1 per Commitment) that silences one missed window
or funds one Grace entry.
_Avoid_: pass, freebie, cheat-day

### Engagement

**Stake**:
An opt-in consequence — a **templated** email to a user-named Contact-of-record
sent on a Miss. The contact's name/email never enter any LLM prompt.
_Avoid_: penalty, bet, punishment, wager

**Win-back**:
The **single** relational nudge sent after a Lapse (a second lapse leaves the
door open quietly).
_Avoid_: retention nudge, re-engagement, dunning

**Persona**:
A stateless preset the messenger wears — tone fragment + Live2D model + Piper
voice + Chutes model id. Switching it changes the messenger, **never** the
Commitment state.
_Avoid_: character, mode, avatar, profile

## Spec deviations

### [2026-06-26] Multiple concurrent active commitments + no create guard (PO directive, Gate 1)

`POST /commitments` inserts unconditionally and multiple active commitments may exist at the same time. This knowingly overrides:

- `docs/kawan-spec.md` §2.2 H5 ("One-commitment-at-a-time keeps it as a feature")
- `docs/kawan-spec.md` §12.3 (multi-commitment listed as ROADMAP/OUT OF SCOPE)
- `docs/kawan-spec.md` §5.5 (idle state and scope boundary)
- `docs/design-system.md` principle 4 ("Kawan holds you to a single commitment")

Decision: PO directive at Gate 1, 2026-06-26. `docs/kawan-spec.md` is unchanged (historical source of truth). The selection model for single-pick surfaces (greeting, stat row, default workspace target) uses `GET /commitments/active` = most-recent open commitment (backward-compatible "light current").

## Flagged ambiguities

- **Lapse vs Miss** — the most important distinction. Lapse is recoverable and
  mid-commitment (silence); Miss is terminal and at-deadline (unverified). Never
  use "miss" for a quiet stretch, or "lapse" for a blown deadline.
- **Contact vs Evidence** — a workspace chat resets Escalation's silence clock
  (Contact) but is **not** Evidence and can never move a Verdict. A Lapse needs
  the absence of _both_.
- **Stake (the mechanic)** vs **stake contact** (the person) — keep "Stake" for
  the consequence; say "stake contact" for the named recipient.

## Example dialogue

> **Dev:** If someone's repo is dead for two days but they're chatting with Kawan
> every night, do they lapse?
> **Domain expert:** No. Lapse needs no Evidence _and_ no Contact. Chatting is
> Contact, so they stay `active` — but Escalation still climbs, because that only
> watches Evidence. Blunt tone, not a Lapse.
> **Dev:** And if the deadline hits while they're still mid-conversation with no
> commits?
> **Domain expert:** Then it's the `deadline` job, not a Check-in. Final verify
> runs; `fail` with a Skip-day left → Grace for six hours; no Skip-day → Miss,
> and the Stake fires. Contact doesn't save a deadline — only Evidence does.
