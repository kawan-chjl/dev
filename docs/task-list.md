# Kawan — Task List (done / not done)

**One goal: finish the product and make it demoable by 30 June 2026.**

This doc tracks **only status** — what is done (`[x]`) vs not done (`[ ]`), per lane.
[`kawan-spec.md`](./kawan-spec.md) is the source of truth; this file just tracks where we are.
`[x]` is only marked where git history **and** the codebase confirm it shipped.

## Lanes & owners

| Lane  | Area                     | Owner      |
| ----- | ------------------------ | ---------- |
| **A** | Character & frontend     | Tuna (PO)  |
| **B** | Backend core             | kymil04    |
| **C** | AI layer                 | agent crew |
| **D** | Voice, integration, demo | Tuna (PO)  |

> **B5** (workspace-turn endpoint) sits in Lane B but is **executed by the agent crew**, not kymil04.

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
- [ ] Workspace chat UI rework [A3, spec §5.2] — still renders `getMockConversation()` in `WorkspaceLayout.tsx`; send-to-AI unwired. Needs Lane C (B5 endpoint shipped, PR #62). **Demo-critical.**

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

---

## Lane C — AI layer (agent crew)

**Status: BUILT & merged to `main`** (laneC → `170ec1e`, by Jeremy Woon / WhiteAvocad0). The real Chutes-backed AI lives behind the `KAWAN_AI_BACKEND` flag in `app/wiring.py` (`_build()`), which defaults to `stub` — so `main` stays offline-testable and the demo/prod env opts in with `KAWAN_AI_BACKEND=chutes`. Backend suite: 88 passing (26 new AI-layer tests). New code: `app/chutes.py`, `app/llm/client.py`, `app/prompts.py`, `app/adapters/{github,screenshot}.py`.

- [x] Chutes client + structured-output harness + SIWC-billed Bearer [C1] — `app/chutes.py` (`acb0590`): structured output, failover, 401-refresh-retry.
- [x] Four prompt/schema sets — intake, plan, check-in, workspace [C2] — `app/prompts.py` + schemas (`2db17e7`), `ChutesLLMClient` four calls (`49b1e16`).
- [x] Per-persona layered system prompts + emotion tagging [C2] — persona registry, hero + 2 variants, per-persona model IDs (`bd2ddd0`).
- [x] Evidence adapters + judge (GitHub + screenshot/TEE vision, three-valued verdict) [C3] — `1ba6c99` (GitHub + text judge), `fc73954` (screenshot + TEE vision judge).
- [~] Persona tone tuning + variant-persona QA (×3) [C4] — 3 personas wired; live tone QA pending activation.
- [ ] **Activation (not yet done):** set `KAWAN_AI_BACKEND=chutes` in Render env, confirm the per-persona Chutes model IDs are valid/available, run `scripts/smoke_chutes.py` against live, then integration-test the real thread (folds into D4). Until then prod still runs stubs.

---

## Lane D — Voice, integration, demo (Tuna)

- [x] Piper TTS endpoint + per-persona voices [D1] (voices download locally; backend returns 204 when absent)
- [x] WebSpeech fallback voice path [D2]
- [x] Real amplitude lip-sync + voice input capture [D2]
- [x] Emotion → expression wiring (6-value enum) + six Hiyori (Adik) expressions [D2/D4]
- [x] Deploy: Vercel (frontend) + Render (backend) live, auto-deploy from `main` [D4, half]
- [ ] **D3 — Web Push** — client shipped (PR #63): service worker (`public/sw.js`) + subscribe flow (`notifications/webPush.ts`) + Settings toggle + `GET /api/push/vapid-public-key`, degrades silently when unconfigured. Backend send-side already existed. **Remaining (human ops): generate a VAPID keypair and set it in Render env** — delivery lights up the moment keys are present.
- [ ] D4 — integration QA across full demo thread + Python seed/reset script for a clean demo dataset
- [ ] D5 — demo script + video + Devpost + README (team-owned)

---

## What's left to be demoable by 30 June

The still-open, demo-critical items, pulled together:

- [x] **Lane C AI layer** — built & merged (`170ec1e`), behind `KAWAN_AI_BACKEND` (default `stub`). **Remaining: activate** (env flag + valid model IDs + live smoke + integration test).
- [x] **B5 workspace-turn endpoint** (agent crew) — shipped (PR #62). The REST seam the chat UI calls now exists.
- [ ] **Workspace chat / AI-workflow view rework** [A3] — wire the chat UI off mocks onto B5 (shipped) + Lane C; drive the reactive Live2D face from real `{say, emotion}`. **Now unblocked — Lane C is real.**
- [~] **D3 Web Push** — client shipped (PR #63); only remaining piece is the VAPID keypair in Render env (human ops). Independent of Lane C.
- [ ] **D4 integration QA + seed/reset script** — full demo thread tested with determinism levers; clean pre-staged demo data.
- [ ] **D5 demo video + Devpost + README** (team-owned).
