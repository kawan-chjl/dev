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
- [ ] **B6 — Achievements table + award logic** [spec §11.4] `[deviation: not in spec]` — new `achievements` table (or per-user award rows) + award-on-verified-win logic + a read endpoint for A10. **STRETCH** (pairs with A10; the only gamification piece needing a schema change). _Agent crew._
- [x] **B7 — Demo seed/reset script** — shipped (PR #67): `scripts/seed_demo.py` stages a **dedicated `demo_showcase` account** (never shared Guest; hard `_assert_safe_to_wipe` guard) with varied-state commitments + pre-staged history; idempotent `--reset`. Provision endpoint + auto-runner = NICE, not built.
- [ ] **B8 — Fix flaky backend test harness** [infra] — the suite is non-deterministic on Py3.14/WSL2 (`sqlite3 disk I/O error` in async fixture teardown on the shared `/tmp/kawan_test.db`; clean `main` already shows it). Dispose the async engine per test or use a unique per-test DB file. **NICE/infra** — not demo-critical, but it makes QA/CI unreliable. _Agent crew._

---

## Lane C — AI layer (agent crew)

**Status: BUILT & merged to `main`** (laneC → `170ec1e`, by Jeremy Woon / WhiteAvocad0). The real Chutes-backed AI lives behind the `KAWAN_AI_BACKEND` flag in `app/wiring.py` (`_build()`), which defaults to `stub` — so `main` stays offline-testable and the demo/prod env opts in with `KAWAN_AI_BACKEND=chutes`. Backend suite: 88 passing (26 new AI-layer tests). New code: `app/chutes.py`, `app/llm/client.py`, `app/prompts.py`, `app/adapters/{github,screenshot}.py`.

- [x] Chutes client + structured-output harness + SIWC-billed Bearer [C1] — `app/chutes.py` (`acb0590`): structured output, failover, 401-refresh-retry.
- [x] Four prompt/schema sets — intake, plan, check-in, workspace [C2] — `app/prompts.py` + schemas (`2db17e7`), `ChutesLLMClient` four calls (`49b1e16`).
- [x] Per-persona layered system prompts + emotion tagging [C2] — persona registry, hero + 2 variants, per-persona model IDs (`bd2ddd0`).
- [x] Evidence adapters + judge (GitHub + screenshot/TEE vision, three-valued verdict) [C3] — `1ba6c99` (GitHub + text judge), `fc73954` (screenshot + TEE vision judge).
- [~] Persona tone tuning + variant-persona QA (×3) [C4] — 3 personas wired; live tone QA pending activation.
- [ ] **C5 — Activation** [TR-68, §12.5] — set `KAWAN_AI_BACKEND=chutes` in Render env, confirm the per-persona Chutes model IDs are valid/available, run `scripts/smoke_chutes.py` against live, then integration-test the real thread (folds into D4). Until then prod still runs stubs. **DEMO-CRITICAL — this is what makes the AI real on stage; everything else's demo value depends on it.**
- [ ] **C6 — Session-scoped AI memory + progress state** [spec §4.5] — **PO chose session-scoped (no persisted table).** Two halves: (1) the A3 chat frontend holds the conversation transcript in component state and sends recent turns with each B5 call (no schema change); (2) assemble **progress state** (check-ins / evidence / outcomes — which `workspace_turn` does NOT currently receive) into the workspace prompt. **Cross-lane, keep consistent:** `app/contracts.py` (`workspace_turn` signature), `app/llm/client.py`, B5 REST (`routes/commitments.py`), `routes/ws.py`. Folds into A3. **NICE** (progress-state half = higher demo payoff). _Agent crew (Lane C/B) + Lane A consumer._ Persisted cross-session transcript = `[ROADMAP]`, post-demo.

---

## Lane D — Voice, integration, demo (Tuna)

- [x] Piper TTS endpoint + per-persona voices [D1] (voices download locally; backend returns 204 when absent)
- [x] WebSpeech fallback voice path [D2]
- [x] Real amplitude lip-sync + voice input capture [D2]
- [x] Emotion → expression wiring (6-value enum) + six Hiyori (Adik) expressions [D2/D4]
- [x] Deploy: Vercel (frontend) + Render (backend) live, auto-deploy from `main` [D4, half]
- [ ] **D3 — Web Push** — client shipped (PR #63): service worker (`public/sw.js`) + subscribe flow (`notifications/webPush.ts`) + Settings toggle + `GET /api/push/vapid-public-key`, degrades silently when unconfigured. Backend send-side already existed. **Remaining (human ops): generate a VAPID keypair and set it in Render env** — delivery lights up the moment keys are present. **NICE (human ops, one line).**
- [ ] D4 — integration QA across full demo thread + Python seed/reset script for a clean demo dataset — **now = QA of the full REAL (Lane C active) thread; the seed script is X-DEMO/B7.** **DEMO-CRITICAL.**
- [ ] D5 — demo script + video + Devpost + README (team-owned). **DEMO-CRITICAL.**

---

## Cross-cutting initiatives (new, 26 Jun)

Status lists only — design lives in [`plan.md`](./plan.md). Each piece is also filed under its lane above.

### X-GAMIF — Reward stack (spec §11.4) — NO leaderboard (§11.5 rejects it; PO agreed)

- [x] A7 identity titles UI — shipped (PR #66, derive from `success_patterns`)
- [ ] A8 productivity meter UI — **NICE** `[deviation: "trust meter" renamed → "productivity meter"]`
- [ ] A9 win-receipt share card — **NICE** (client PNG, user-triggered)
- [ ] A10 achievements UI + B6 achievements table/award logic — **STRETCH** `[deviation: not in spec]`

### X-MEM — Session-scoped AI memory — NICE (PO chose session-scoped; persisted = `[ROADMAP]`)

- [ ] C6 frontend-held recent-turn transcript (no schema) + progress-state assembly into the workspace prompt (cross-lane: contracts.py ⇄ client.py ⇄ B5 REST ⇄ /ws)

### X-TELE — Telegram check-in bridge (PO elevated from roadmap, 26 Jun) `[deviation: was [ROADMAP]]`

Off-app check-in notifications via a Telegram bot — a real chat-app ping is a strong demo beat. **Heaviest remaining item: net-new + a schema change + an external integration + an ops dep. Sequence AFTER C5 activation; ideally run by a teammate off the critical path.** Needs a planner breakdown + Gate 1 before build.

- [ ] **Ops (human, like VAPID):** create a Telegram bot via BotFather → set `KAWAN_TELEGRAM_BOT_TOKEN` in Render. _Tuna/team._ **Blocks the rest.**
- [ ] Backend: `telegram_chat_id` on `User` `[schema change]` + a Telegram sender (Bot API) — _agent crew._
- [ ] Backend: account-linking flow — deep-link token + webhook (or long-poll) to capture the chat*id on `/start` — \_agent crew.*
- [ ] Backend: wire Telegram into the check-in delivery ladder (alongside Web Push) — _agent crew._
- [ ] Frontend: a small **"Connections" section in Settings** — surfaces the existing Web Push toggle + a "Connect Telegram" deep-link button + connected status. The user-facing "reach me" hub, extensible later; NOT a generalized gateway abstraction. — _Lane A, agent crew._
- [ ] Demo shortcut: pre-link a demo `chat_id` in the seed script so the stage demo shows a real Telegram ping without live linking — _agent crew._
- Open Qs (Gate 1): webhook vs long-poll on Render; Telegram parallel-to vs after Web Push in the ladder.

### X-DEMO — Demo Mode (spec §6.4, §12.5) — on a DEDICATED account, never shared Guest

- [x] B7 seed/reset script staging a clean demo account (varied states + pre-staged history) — shipped (PR #67)
- [ ] B7 provision endpoint/flow to create the seeded commitments — **NICE**
- [ ] Compressed-clock / scripted-tick driver chaining the EXISTING levers (`?demo_deadline=+5m` on `.../start`, `POST .../check`) — **NICE/STRETCH**
- [ ] "Try Demo" button (Lane A; PO imagines it in `/commitments`' top container) — **NICE**

---

## Roadmap (named, not built)

- External chat bridges: **Telegram now in scope** (see X-TELE). Discord / WhatsApp stay `[ROADMAP]`. A _generalized_ connection-gateway/plugin layer is also `[ROADMAP]` — the demo gets a concrete "Connections" Settings section, not an abstraction.
- Monetary stakes · more evidence adapters · GitHub OAuth/private repos · multi-commitment · auto-recurring · crew/co-commitments/leaderboard (§11.5) · native mobile · true barge-in · retention features (spec §12.3 OUT OF SCOPE).

---

## What's left to be demoable by 30 June

The still-open, demo-critical items, pulled together:

- [x] **Lane C AI layer** — built & merged (`170ec1e`), behind `KAWAN_AI_BACKEND` (default `stub`). **Remaining: activate** (C5: env flag + valid model IDs + live smoke + integration test).
- [x] **B5 workspace-turn endpoint** (agent crew) — shipped (PR #62). The REST seam the chat UI calls now exists.
- [x] **Workspace chat / AI-workflow view rework** [A3] — shipped (PR #64). Goes fully real on C5 activation.
- [x] **Stake wizard UI** [A6] — shipped (PR #65).
- [x] **Reward beat** [A7 titles] — shipped (PR #66).
- [x] **Demo seed** [B7] — shipped (PR #67).
- [~] **D3 Web Push** — client shipped (PR #63); only remaining piece is the VAPID keypair in Render env (human ops). Independent of Lane C.
- [ ] **D4 integration QA** — full **real** demo thread tested with the determinism levers; clean pre-staged demo data.
- [ ] **D5 demo video + Devpost + README** (team-owned).
