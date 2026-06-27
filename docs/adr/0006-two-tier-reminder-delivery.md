# Two-tier reminder delivery: parallel off-device fan-out, email opt-in per commitment

The spec delivers every Check-in down one **ladder** — `WS → Web Push → timeline`,
first success wins (TR-17) — and reserves **email for stake + win-back only**, never
routine check-ins (TR-70). X-NOTIF wants user-selectable, multi-channel check-in
reminders so that email-less (SIWC) or shared (Guest) accounts still get nudged
off-device. That requires reversing both rules, so we record the shape here.

## Decision

**Keep the device ladder for everything; add a parallel off-device tier for reminders
only.**

- The existing **device tier** — in-app while the tab is open, else Web Push, else the
  persisted timeline row — is unchanged and still carries **every** server→user message.
- A **reminder Check-in** (`cadence` or `winback`) _additionally_ fans out, in parallel,
  to every enabled **off-device** Channel: **email** (the user's own per-Commitment
  `notify_email`) and **Telegram** (an account-level link). This reverses TR-70 (email
  now carries routine reminders) and refines TR-17 (the ladder stays for the device tier
  and for all non-reminder messages; reminders gain a parallel off-device tier).
- **Web Push stays the closed-tab device fallback — not a parallel channel.** It fires
  only when the tab is closed, matching the shipped "nudged when the tab is closed" copy
  and avoiding a redundant push for a user who is actively looking at the app.
- **Email is opt-in per commitment, not mandatory.** In-app is the only always-on
  Channel; supplying `notify_email` is what turns email on. This preserves Guest
  zero-friction (no forced address to create a commitment).
- **"Enabled" = the address / subscription / link exists** — no preferences table. The
  Settings toggles _are_ subscribe/connect; email is the per-commitment field.
- **Outcomes and `on_demand` are never fanned out.** Verdict, celebration, the Miss
  reckoning and Grace stay device-tier only (the Miss already emails the _witness_ via the
  Stake); `on_demand` means the user is present.

## Considered options

- **Pure parallel fan-out for all channels incl. Web Push** (the literal 26-Jun task-list
  directive) — rejected: it double-notifies an active user on-device and contradicts the
  shipped "tab is closed" framing of push.
- **Mandatory email baseline** (also the 26-Jun note) — rejected: requiring an address to
  create _any_ commitment breaks the Guest zero-friction property the same note relied on.
  Made optional; in-app is the guaranteed channel instead.
- **Explicit notification-preferences table** — rejected: implicit-by-existence covers the
  demo; mute-a-channel-without-unlinking is roadmap.
- **Webhook for Telegram `/start`** — deferred: long-poll `getUpdates` in the FastAPI
  lifespan (alongside APScheduler) needs no public tunnel, so it is testable in local dev
  and is the smaller build. Webhook is the post-demo upgrade (it also wakes a sleeping
  free Render dyno, which long-poll cannot).
- **Email outcomes too** (verdict/celebration/miss to the user) — rejected: noisy, and the
  Miss already reaches the witness. Reminders are the scoped surface.

## Consequences

- **TR-70 is reversed for reminders** and **TR-17 is refined** — both documented
  deviations. `docs/kawan-spec.md` stays the historical source of truth, unchanged; this
  ADR + the CONTEXT.md "Delivery" section (Channel, Fan-out, Reminder email) are the
  record.
- `Checkin.delivered_via` still records only the **device** outcome (`ws|webpush|timeline`)
  — email and Telegram are best-effort side-sends (logged), so **no schema change to
  `Checkin`**. New columns are additive only: `commitments.notify_email`,
  `users.telegram_chat_id` (+ a transient link token).
- Email reminders depend on Resend (or the log-only outbox fallback) being configured in
  Render — the same dependency the Stake email already carries.
- Telegram linking **pauses while a Render free instance is asleep** (long-poll consumes no
  inbound traffic). Acceptable for an actively-used demo; webhook is the upgrade path.
- `winback` **is** emailed (the spec already called win-back "push/email"); `on_demand` is
  intentionally **not** (the user is present).
