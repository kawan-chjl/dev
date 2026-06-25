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
- [ ] Workspace chat UI rework [A3, spec §5.2] — still renders `getMockConversation()` in `WorkspaceLayout.tsx`; send-to-AI unwired. Needs B5 + Lane C. **Demo-critical.**

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
- [ ] **B5 — workspace-turn endpoint** [spec §9.2-D] — _executed by the agent crew._ The specified `POST /commitments/{id}/workspace/turn` REST route does **not** exist. A `/ws` WebSocket handler (`routes/ws.py`) already calls `LLM.workspace_turn`, persists proposals, records contact, and pushes the reply — so the seam exists, but the REST endpoint the chat UI is meant to call is not built. **Demo-critical.**

---

## Lane C — AI layer (agent crew)

**Status: NOT built.** All AI calls run as deterministic stubs (`app/stubs.py`), swapped in one file (`app/wiring.py` → `StubLLMClient`, `StubGitHubAdapter`, `StubScreenshotAdapter`). Lane C's job is to replace these behind the identical `app/contracts.py` signatures.

- [ ] Chutes client + structured-output harness + SIWC-billed Bearer [C1, spec §3.1, §9.1]
- [ ] Four prompt/schema sets — intake, plan, check-in, workspace [C2, spec §9.2]
- [ ] Per-persona layered system prompts + 6-value emotion tagging [C2, spec §11.1]
- [ ] Evidence adapters + judge (GitHub + screenshot/TEE vision, three-valued verdict) [C3, spec §9.3]
- [ ] Persona tone tuning + variant-persona QA (×3) [C4, spec §11.2]

---

## Lane D — Voice, integration, demo (Tuna)

- [x] Piper TTS endpoint + per-persona voices [D1] (voices download locally; backend returns 204 when absent)
- [x] WebSpeech fallback voice path [D2]
- [x] Real amplitude lip-sync + voice input capture [D2]
- [x] Emotion → expression wiring (6-value enum) + six Hiyori (Adik) expressions [D2/D4]
- [x] Deploy: Vercel (frontend) + Render (backend) live, auto-deploy from `main` [D4, half]
- [ ] **D3 — Web Push** [spec §6.3] — backend send-side exists (`push.py`, VAPID/pywebpush, no-op without keys); **no service worker, no client subscribe flow.** Closed-tab push not demoable.
- [ ] D4 — integration QA across full demo thread + Python seed/reset script for a clean demo dataset
- [ ] D5 — demo script + video + Devpost + README (team-owned)

---

## What's left to be demoable by 30 June

The still-open, demo-critical items, pulled together:

- [ ] **Lane C AI layer** — replace all stubs with the real Chutes client, schema sets, judge, and persona tone (C1–C4). Nothing AI is real yet.
- [ ] **B5 workspace-turn endpoint** (agent crew) — the REST seam the chat UI calls; WS handler exists but the route does not.
- [ ] **Workspace chat / AI-workflow view rework** [A3] — wire the chat UI off mocks onto B5 + Lane C; drive the reactive Live2D face from real `{say, emotion}`.
- [ ] **D3 Web Push** — service worker + client subscribe flow (backend send-side ready).
- [ ] **D4 integration QA + seed/reset script** — full demo thread tested with determinism levers; clean pre-staged demo data.
- [ ] **D5 demo video + Devpost + README** (team-owned).
