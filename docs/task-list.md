# Kawan — Task List (done / not done)

**One goal: finish the product and make it demoable by 30 June 2026.**

This doc tracks **only status** — what is done (`[x]`) vs not done (`[ ]`), per lane.
[`kawan-spec.md`](./kawan-spec.md) is the source of truth; this file just tracks where we are.
`[x]` is only marked where git history **and** the codebase confirm it shipped.

> **4 days left (26→30 Jun).** New tasks below carry a priority tag —
> **DEMO-CRITICAL** (must be on stage), **NICE** (lifts the demo, cut first), **STRETCH** (only if the criticals land early).
> `[deviation: not in spec]` marks deliberate departures from `kawan-spec.md` for the PO to ratify at Gate 1.

## Lanes & owners

| Lane  | Area                     | Owner      |
| ----- | ------------------------ | ---------- |
| **A** | Character & frontend     | Tuna (PO)  |
| **B** | Backend core             | kymil04    |
| **C** | AI layer                 | agent crew |
| **D** | Voice, integration, demo | Tuna (PO)  |

> **B5** (workspace-turn endpoint) sits in Lane B but is **executed by the agent crew**, not kymil04.
> Most new frontend tasks below are Lane A scope but **executed by the agent crew**; Tuna design-reviews.

---

## Lane A — Character & frontend (Tuna)

- [x] App skeleton: shell, routes, zones, theme [A1]
- [x] Live2D stage + lip-sync, expression hooks [A1, spec §5.1]
- [x] Compose / sentence-builder + Plan/Settings GUIs (hard fields GUI-only) [A2, spec §5.2]
- [x] First-run persona picker (3 presets) [A2]
- [x] Timeline / momentum view + celebration/identity beats + habit-loop debrief [A4, spec §5.6]
- [x] SIWC frontend (auth provider, real `/api/me`, sign-out)
- [x] Continue-as-guest login
- [x] Frontend polish: responsive PWA shell, dashboard, management, analytics [A5]
- [x] Warm-witness design system (v2) + app-shell redesign (v3)
- [x] v4 restructure: dashboard / management / analytics / real delete + clear-data
- [x] Onboarding rebuilds (discrete steps, bottom-center nav island)
- [x] Notifications, FAQ, analytics, history, settings pages
- [x] Multi-commitment list UI (paginated)
- [x] Fredoka headings + uppercase wordmark branding
- [x] Numerous layout/contrast/scroll hotfixes
- [x] Email/password auth removed — SIWC + Guest only (was added, then reverted)
- [x] Workspace chat UI rework [A3] — shipped (PR #64): wired off mocks onto B5 + real Lane C; three response types (coaching / refusal / proposal), reactive Live2D face from the real emotion tag, session-scoped memory, empty-state starter chips. Shows stub replies until C5 activates.
- [x] **A3a — Capture-and-propose design pass** — done; design note at `docs/a3-workspace-chat-design.md`, reviewed (empty-state chips; full-screen route kept).
- [x] **A6 — Stake wizard UI** — shipped (PR #65): stake toggle + witness name/email at the create wizard's Terms step; rides the existing create→PATCH; Start blocked with inline validation so a stake can't be silently dropped. Email-witness only.
- [x] **A7 — Identity titles UI** — shipped (PR #66): `Starter → Finisher → Shipper → Serial Shipper` (1/3/5/10 verified wins) on the momentum view, derived from `success_patterns` + a new session-gated `GET /api/me/stats`.
- [ ] **A8 — Productivity meter UI** [spec §11.4 "trust meter", renamed] — meter on V5 that visibly rises with verified wins; derived from `success_patterns` `outcome='completed'` count. `[deviation: rename only]` PO renames the spec's **"trust meter" → "productivity meter"** (same mechanic; "trust meter" judged cliché). Spec NICE ②. **NICE.**
- [ ] **A9 — Win-receipt share card** [spec §11.4, TR-75] — client-rendered PNG (character art + commitment sentence + "VERIFIED ✓" + date); **user-triggered only, never auto-posted**; Web Share API / X-intent + WhatsApp links / download. Spec NICE ① ("demo gold"). **NICE.**
- [ ] **A10 — Achievements UI** [spec §11.4] `[deviation: not in spec]` — surface earned achievements (badges/list) on V5. New system (see X-GAMIF below); consumes the backend award table. **STRETCH** (lowest demo-leverage per unit of work; the only reward needing new backend schema).
- [x] **A11 — Trim cadence presets to daily-only** — shipped (PR #65): removed `every_2_days`/`weekly`; daily presets only, so the wizard can't lie on stage.

---

## Lane B — Backend core (kymil04)

- [x] FastAPI + async DB skeleton; commitment CRUD persists [B1, spec §7]
- [x] SIWC end-to-end auth + billing (PKCE, HttpOnly session, `/users/me` balance) [B2]
- [x] Scheduler + WS hub + push delivery ladder [B3]
- [x] State machine + audit log (miss path, stake email, win-back, proposal-apply) [B4]
- [x] Shipped endpoints:
  - [x] Commitment CRUD + list (`GET /api/commitments`, paginated)
  - [x] Timeline (`GET .../timeline`)
  - [x] Persona update (`PATCH /api/me`)
  - [x] Debrief (`POST .../debrief`)
  - [x] Delete commitment (`DELETE .../{id}`)
  - [x] Clear user data (`DELETE /api/me/data`) + history (`GET /api/me/history`)
  - [x] Intake + plan turns (`POST .../context/turn`, `POST .../plan`) — call the stub `LLM`
  - [x] TTS (`POST /api/voice/tts`)
- [x] **B5 — workspace-turn endpoint** [spec §9.2-D] — _executed by the agent crew._ `POST /api/commitments/{id}/workspace/turn` shipped (PR #62), mirroring the `/ws` handler 1:1 (record contact, persist proposal, return `{response_type, say, proposal, emotion, proposal_id}`). Built against the stub contract, so it works now and keeps working once Lane C swaps in the real client. The chat UI (A3) can call it today; replies become real when Lane C lands.
- [x] **B6 — Achievements table + award logic** [spec §11.4] `[deviation: not in spec]` — shipped (PR #72, ADR-0004): `achievements` table + `unique(user_id,code)` + idempotent award-on-verified-win logic + `GET /api/me/achievements` for A10. **STRETCH** (pairs with A10; the only gamification piece needing a schema change). _Agent crew._
- [x] **B7 — Demo seed/reset script** — shipped (PR #67): `scripts/seed_demo.py` stages a **dedicated `demo_showcase` account** (never shared Guest; hard `_assert_safe_to_wipe` guard) with varied-state commitments + pre-staged history; idempotent `--reset`. Provision endpoint + auto-runner = NICE, not built.
- [x] **B8 — Fix flaky backend test harness** [infra] — shipped (PR #72): tests run on **in-memory SQLite + StaticPool**, removing the shared `/tmp/kawan_test.db` that caused the `sqlite3 disk I/O error` at async-fixture teardown (Py3.14/WSL2). Suite deterministic across repeated runs. **NICE/infra.** _Agent crew._
- [x] **B9 — Dynamic check-in cadence + window-aware retry** [spec §7.3; **ADR-0003** ratified the band collapse] — shipped (PR #72): derive the check-in schedule from the commitment window at creation instead of the fixed daily cron: **≥1 day → daily** (today's behavior); **~2h–1 day → one nudge at the window midpoint**; **<~2h → deadline-only**. Make the existing **winback** (already the 1 retry) **window-aware** — fire it `~25% of time-to-deadline` after a silent tick, clamped 30min–6h, instead of the hardcoded "next local morning"; still max 1, then the deadline runs the miss path. Touches `scheduler.py` (`_cadence_trigger`, `arm_winback`, `register_commitment_jobs`) + the state machine. **NICE/robustness; off the C5 path — also improves the demo (a short `?demo_deadline` window auto-fires a timely check-in).** _Agent crew._

---

## Lane C — AI layer (agent crew)

**Status: BUILT & merged to `main`** (laneC → `170ec1e`, by Jeremy Woon / WhiteAvocad0). The real Chutes-backed AI lives behind the `KAWAN_AI_BACKEND` flag in `app/wiring.py` (`_build()`), which defaults to `stub` — so `main` stays offline-testable and the demo/prod env opts in with `KAWAN_AI_BACKEND=chutes`. Backend suite: 88 passing (26 new AI-layer tests). New code: `app/chutes.py`, `app/llm/client.py`, `app/prompts.py`, `app/adapters/{github,screenshot}.py`.

- [x] Chutes client + structured-output harness + SIWC-billed Bearer [C1] — `app/chutes.py` (`acb0590`): structured output, failover, 401-refresh-retry.
- [x] Four prompt/schema sets — intake, plan, check-in, workspace [C2] — `app/prompts.py` + schemas (`2db17e7`), `ChutesLLMClient` four calls (`49b1e16`).
- [x] Per-persona layered system prompts + emotion tagging [C2] — persona registry, hero + 2 variants, per-persona model IDs (`bd2ddd0`).
- [x] Evidence adapters + judge (GitHub + screenshot/TEE vision, three-valued verdict) [C3] — `1ba6c99` (GitHub + text judge), `fc73954` (screenshot + TEE vision judge).
- [x] Persona tone tuning + variant-persona QA (×3) [C4] — shipped (PR #72): `scripts/persona_qa.py` ran live ×2; tuned + an "address the user as you" guardrail (ADR-0005); 17/18 clean, distinct + on-character, all guardrails held; Tuna signed off. Per-persona model diversity later restored (kawan→gemma-4, adik→DeepSeek, cik_maid→Kimi) once the transport fix landed — see ADR-0005 Update.
- [x] **C5 — Activation** [TR-68, §12.5] — done (PR #72): `KAWAN_AI_BACKEND=chutes` set in Render; `scripts/smoke_chutes.py --invoke` green live (catalog + structured_outputs + TEE + invocability + Pro quota). Two demo-killers caught + fixed (vision judges returned null `content`; gemma-4 chat latency) → **ADR-0005** pins DeepSeek-primary personas + gemma-4 vision judge. Live screenshot→TEE-vision verdict confirmed (~20s, reads the image, three-valued). Full real-thread QA folds into D4. **DEMO-CRITICAL.**
- [x] **C6 — Session-scoped AI memory + progress state** [spec §4.5] — shipped (PR #72): both halves done — (1) the A3 chat frontend holds the transcript in component state and sends `recent_turns` with each B5 call (frontend wired in PR #72; no schema change); (2) the server assembles **progress state** (status / time-to-deadline / escalation / skip-days / recent check-ins / latest verdict) into the workspace prompt via a shared helper for REST + `/ws`. **Cross-lane, keep consistent:** `app/contracts.py` (`workspace_turn` signature), `app/llm/client.py`, B5 REST (`routes/commitments.py`), `routes/ws.py`. Folds into A3. **NICE** (progress-state half = higher demo payoff). _Agent crew (Lane C/B) + Lane A consumer._ Persisted cross-session transcript = `[ROADMAP]`, post-demo.

---

## Lane D — Voice, integration, demo (Tuna)

- [x] Piper TTS endpoint + per-persona voices [D1] (voices download locally; backend returns 204 when absent)
- [x] WebSpeech fallback voice path [D2]
- [x] Real amplitude lip-sync + voice input capture [D2]
- [x] Emotion → expression wiring (6-value enum) + six Hiyori (Adik) expressions [D2/D4]
- [x] Deploy: Vercel (frontend) + Render (backend) live, auto-deploy from `main` [D4, half]
- [x] **D3 — Web Push** — **DONE**: client shipped (PR #63: service worker + subscribe flow + Settings toggle + `GET /api/push/vapid-public-key`) + idempotent subs/dead-sub cleanup (#31); `scripts/gen_vapid.py` added (PR #72); VAPID keypair set on Render and **verified live** (`/api/push/vapid-public-key` serves an 87-char key). Full path: Settings toggle → subscribe → closed-tab notifications. **NICE.**
- [ ] D4 — integration QA across full demo thread + Python seed/reset script for a clean demo dataset — **now = QA of the full REAL (Lane C active) thread; the seed script is X-DEMO/B7.** **DEMO-CRITICAL.**
- [ ] D5 — demo script + video + Devpost + README (team-owned). **DEMO-CRITICAL.**

---

## Cross-cutting initiatives (new, 26 Jun)

Status lists only — design lives in [`plan.md`](./plan.md). Each piece is also filed under its lane above.

### X-GAMIF — Reward stack (spec §11.4) — NO leaderboard (§11.5 rejects it; PO agreed)

- [x] A7 identity titles UI — shipped (PR #66, derive from `success_patterns`)
- [ ] A8 productivity meter UI — rises with verified wins; **growth rate scaled by the streak multiplier (1×–~3×, see Streak)** — **NICE** `[deviation: "trust meter" renamed → "productivity meter"]`
- [ ] A9 win-receipt share card — **NICE** (client PNG, user-triggered)
- [ ] A10 achievements UI (pending) + B6 achievements table/award logic (**done, PR #72**) — **STRETCH** `[deviation: not in spec]`
- [ ] **Streak — verified-win streak + productivity multiplier** (PO 26 Jun) — current run of consecutive **completed** commitments; a **miss resets to 0**. The streak drives the A8 **productivity-meter growth multiplier**: **1× baseline → climbs with the streak (e.g. +0.25×/win), capped ~3×, resets on miss** — each win on a streak adds `base × multiplier` to the meter. All derived from ordered outcome history (no schema; **no points economy**). Extend `/api/me/stats` with `current_streak` (+ multiplier) + UI beside the meter on the momentum view. **NICE.** _Agent crew._ Spec-compatible: counts verified wins, not raw activity (§11).

### X-MEM — Session-scoped AI memory — NICE (PO chose session-scoped; persisted = `[ROADMAP]`)

- [x] C6 frontend-held recent-turn transcript (no schema) + progress-state assembly into the workspace prompt (cross-lane: contracts.py ⇄ client.py ⇄ B5 REST ⇄ /ws) — shipped (PR #72)

### X-NOTIF — Multi-channel check-in notifications + user preferences (PO, 26 Jun) `[deviation: replaces the spec's laddered WS→Push→timeline with a user-selectable PARALLEL fan-out; email-for-check-ins is new — spec reserved email for stake/win-back]`

**For check-in reminders only.** Mandatory baseline = **in-app + email**; **Web Push + Telegram** are optional opt-ins added later. All ENABLED channels fire in parallel per check-in (daily cadence = one check-in event/day).

**Why per-commitment email (PO, 26 Jun):** Kawan accounts are email-less (SIWC) or shared (Guest) — no account email exists to use. So the user provides their **own reminder email per commitment at creation** (sits beside the A6 stake field; no account-level storage; works for Guest). No SIWC email-claim dependency.

**Baseline — in-app + per-commitment email (small; build-ready, NOT blocked by C5):**

- [ ] Backend: add `notify_email` to `Commitment` `[schema: additive]` — the user's own reminder address, distinct from `stake_contact_email` (the witness) — _agent crew._
- [ ] Backend: **email check-in sender** — reuse the existing email infra (today stake/win-back only) to email a "time to check in" to `notify_email` on each check-in — _agent crew._ `[ops: needs the SMTP/email provider configured in Render — the stake email already requires this]`
- [ ] Frontend: a **required reminder-email input** in the create wizard's Terms step (beside the A6 stake fields), validated like the witness email — _Lane A, agent crew._

**Optional layer — Web Push + Telegram opt-ins (heavier; sequence AFTER C5; a teammate off the critical path). Needs a planner breakdown + Gate 1.** Ops deps: VAPID keys + a Telegram bot token (both human).

- [ ] Backend: **notification-preferences store** (which optional channels each user enabled, account-level) + a **delivery fan-out** that sends in parallel to every enabled channel — _agent crew._

- [ ] **Ops (human, like VAPID):** create a Telegram bot via BotFather → set `KAWAN_TELEGRAM_BOT_TOKEN` in Render. _Tuna/team._ **Blocks the rest.**
- [ ] Backend: `telegram_chat_id` on `User` `[schema change]` + a Telegram sender (Bot API) — _agent crew._
- [ ] Backend: account-linking flow — deep-link token + webhook (or long-poll) to capture the chat*id on `/start` — \_agent crew.*
- [ ] Backend: wire Telegram into the check-in delivery ladder (alongside Web Push) — _agent crew._
- [ ] Frontend: a **"Notifications" section in Settings** — in-app shown as always-on; Web Push + Telegram (+ future) as optional toggles/connect with status. (Email is configured per-commitment in the wizard, not here.) Concrete channels, NOT a generalized gateway abstraction. — _Lane A, agent crew._
- [ ] Demo shortcut: pre-link a demo `chat_id` in the seed script so the stage demo shows a real Telegram ping without live linking — _agent crew._
- Open Qs (Gate 1): webhook vs long-poll on Render; Telegram parallel-to vs after Web Push in the ladder.

### X-DEMO — Demo Mode (spec §6.4, §12.5) — on a DEDICATED account, never shared Guest

- [x] B7 seed/reset script staging a clean demo account (varied states + pre-staged history) — shipped (PR #67)
- [ ] B7 provision endpoint/flow to create the seeded commitments — **NICE**
- [ ] Compressed-clock / scripted-tick driver chaining the EXISTING levers (`?demo_deadline=+5m` on `.../start`, `POST .../check`) — **NICE/STRETCH**
- [ ] "Try Demo" button (Lane A; PO imagines it in `/commitments`' top container) — **NICE**

---

## Roadmap (named, not built)

- External chat bridges: **Telegram now in scope** (see X-NOTIF). Discord / WhatsApp stay `[ROADMAP]`. A _generalized_ connection-gateway/plugin layer is also `[ROADMAP]` — the demo gets a concrete "Connections" Settings section, not an abstraction.
- Monetary stakes · more evidence adapters · GitHub OAuth/private repos · multi-commitment · auto-recurring · crew/co-commitments/leaderboard (§11.5) · native mobile · true barge-in · retention features (spec §12.3 OUT OF SCOPE).

---

## What's left to be demoable by 30 June

The still-open, demo-critical items, pulled together:

- [x] **Lane C AI layer** — built & merged (`170ec1e`), behind `KAWAN_AI_BACKEND` (default `stub`). **Activated** (C5, PR #72): env flag set, model IDs validated live, smoke + live vision verdict confirmed.
- [x] **B5 workspace-turn endpoint** (agent crew) — shipped (PR #62). The REST seam the chat UI calls now exists.
- [x] **Workspace chat / AI-workflow view rework** [A3] — shipped (PR #64). Goes fully real on C5 activation.
- [x] **Stake wizard UI** [A6] — shipped (PR #65).
- [x] **Reward beat** [A7 titles] — shipped (PR #66).
- [x] **Demo seed** [B7] — shipped (PR #67).
- [x] **D3 Web Push** — DONE: client (PR #63) + idempotency (#31) + `gen_vapid.py` (PR #72); VAPID keys set on Render and verified live. Closed-tab notifications work. Independent of Lane C.
- [ ] **D4 integration QA** — full **real** demo thread tested with the determinism levers; clean pre-staged demo data.
- [ ] **D5 demo video + Devpost + README** (team-owned).
