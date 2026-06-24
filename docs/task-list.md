# Kawan — Team Task List

Lane responsibilities and task breakdown for the 4-person team, derived from `kawan-spec.md` §12.1 (lanes), §12.2 (phase gates) and §12.3 (MVP cut).

| Meta            |                                                                                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version         | 0.2                                                                                                                                                                                                                                                                               |
| Date            | 2026-06-12                                                                                                                                                                                                                                                                        |
| Source of truth | [`kawan-spec.md`](./kawan-spec.md) — this doc summarizes, the spec decides                                                                                                                                                                                                        |
| Companion docs  | [`prd.md`](./prd.md) (what & why) · [`trd.md`](./trd.md) (how)                                                                                                                                                                                                                    |
| Tracking        | **This file is the canonical assignment of responsibility.** No GitHub Issues currently mirror these tasks (the earlier mirror was deleted); teammates may opt into Issues individually — `lane:A`–`lane:D` labels and the 5 milestones still exist on the repo for that purpose. |

## 1. Calendar & day mapping

`D1` = 11 Jun 2026 → `D20` = 30 Jun 2026 (submission 23:59 MYT). Two hard external dates:

- **22 Jun (D12)** — team Pro subscription expires → all LLM-heavy prompt tuning must be finished (Phase 3 gate).
- **30 Jun (D20)** — Devpost submission deadline.

## 2. Lane ownership

| Lane  | Title                    | Owner | Scope (one line)                                                                               | Est. days |
| ----- | ------------------------ | ----- | ---------------------------------------------------------------------------------------------- | --------- |
| **A** | Character & frontend     | _TBD_ | Live2D stage, all GUIs, timeline, polish                                                       | 14        |
| **B** | Backend core             | _TBD_ | FastAPI/Postgres (Supabase; SQLite tests), SIWC auth+billing, scheduler/WS/push, state machine | 12        |
| **C** | AI layer                 | _TBD_ | Chutes client, prompt/schema sets, evidence adapters + judge, tone                             | 14        |
| **D** | Voice, integration, demo | _TBD_ | Piper/Whisper, WebSpeech, Web Push, integration QA, demo/video/Devpost                         | 14        |

~6 days/person slack against the 20-day window is intentional (hackathon reality buffer). The two genuinely novel integrations — **SIWC** (lane B) and the **evidence judge** (lane C) — are week-1 items by design.

## 3. Phase gates (from spec §12.2)

| Phase | Days   | Gate — pass/fail criteria                                                                                                                                           |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | D1–2   | All four de-risk spikes green (see §4 below). **Miss → cut order (spec §12.3) begins immediately.**                                                                 |
| 2     | D3–7   | Compose → Context → Plan wired end-to-end (text); commitments persist; `check now` runs GitHub adapter on this repo. "Demo thread exists (ugly)."                   |
| 3     | D8–12  | Full loop: scheduler + WS + escalation, screenshot adapter, final verify, miss path + stake email, win-back, voice in workspace. **LLM tuning done before 22 Jun.** |
| 4     | D13–16 | Depth: habit loop, proposal-apply, audit view, Web Push, tone passes, TEE badge, variant-persona QA. **Feature freeze D17.**                                        |
| 5     | D17–20 | Daily demo dry-runs; video recorded by D19; Devpost + README + buffer D20.                                                                                          |

## 4. Phase 1 — de-risk spikes (D1–2, all-hands) — ✅ GATE PASSED 12–13 Jun

All four executed before lane assignment; full results in spec §13 (D1–2 block). Key carry-forwards per lane below.

| ID  | Spike                   | Lane | Status                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | SIWC round-trip         | B    | ✅ **PASS** — PKCE + refresh OK; OAuth token: `llm.` 200 / **`lm.` 403** (use `llm.` only); `/users/me` works with `chutes:invoke` — no `billing:read`. App `cid_…` registered; secret in team `.env`. Billing attribution confirmed in dashboard logs. **Follow-up (B, before demo):** re-run harness with a personal account to prove user-vs-team billing _separation_ (consent used the shared team account). |
| S2  | Vision-judge call       | C    | ✅ **PASS** — strict `json_schema` verdict via failover pair; judge correctly returned `unclear` on a static screenshot → judge prompts need commitment context (calibration input for C2/C3).                                                                                                                                                                                                                    |
| S3  | Live2D + lip-sync       | A    | ✅ **PASS** — Haru + PixiJS 6.5.10 + pixi-live2d-display 0.4.0, hand-rolled AnalyserNode lip-sync (no patch pkg). **Model + engine locked.** Spike page: `kawan/frontend/spike-live2d.html`; A1 gotchas in spec §13.                                                                                                                                                                                              |
| S4  | Pro-tier model coverage | C    | ✅ **PASS** — all 4 pipeline models 200 under Pro. ⚠️ All but gemma are reasoning models: budget `max_tokens` for thinking tokens in every schema call.                                                                                                                                                                                                                                                           |

### Open questions carried from spec §14 (each ≤1 day)

| Q   | Question (short)                                          | Owner | Due                                  | Status                                             |
| --- | --------------------------------------------------------- | ----- | ------------------------------------ | -------------------------------------------------- |
| Q1  | SIWC token works against `llm.` (vs `lm.`)?               | B     | D1                                   | ✅ Resolved by S1 — `llm.` only                    |
| Q2  | Pro tier covers all judge models?                         | C     | D1                                   | ✅ Resolved by S4                                  |
| Q3  | Hero persona voice/register (BM/English/Manglish mix?)    | Team  | **D2–3** (taste decision)            | Open — feeds C4                                    |
| Q4  | `chutes:invoke` enough for `/users/me` balance?           | B     | D1                                   | ✅ Resolved by S1 — yes; `billing:read` privileged |
| Q5  | _(Optional courtesy)_ LiveroiD creator permission inquiry | A     | Anytime (Haru-R/Hiyori are fallback) | Open                                               |

## 5. Lane task breakdown

Acceptance = the gate it must satisfy. `Deps` reference task IDs. Day estimates from spec §12.1.

### Lane A — Character & frontend (14d)

| ID  | Task                         | Est. | Phase | Deps   | Acceptance                                                                                                                                                                                                   |
| --- | ---------------------------- | ---- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Live2D stage + lip-sync      | 3d   | 2     | S3     | Stage component with expression hooks; lip-sync driven by TTS audio in-app.                                                                                                                                  |
| A2  | Compose + Plan/Settings GUIs | 3d   | 2     | B1     | Sentence-builder (<30 s to compose); hard fields GUI-set, AI-read-only (trd §5). Includes the **first-run persona picker** (3 presets) — the picker itself is MVP, built week 1–2 (spec §12.2 phase-4 note). |
| A3  | Workspace chat UI            | 3d   | 3     | A1, C2 | Goal-scoped chat (voice/text), slot-fill display, in-character reactions, proposal card overlay with `[Apply]`/`[Dismiss]` (spec §5.2).                                                                      |
| A4  | Timeline / momentum view     | 2d   | 4     | B3     | Check-in timeline + momentum dots + celebration/identity beats + habit-loop close (one-question debrief, seeded next commitment / `Repeat this`, spec §5.6); shows scheduler activity without waiting on it. |
| A5  | Frontend polish pass         | 3d   | 4     | A1–A4  | Responsive PWA, TEE attestation badge, audit-log "who changed what" view (spec §8.2), persona picker refinement. Freeze D17.                                                                                 |

### Lane B — Backend core (12d)

| ID  | Task                           | Est. | Phase | Deps | Acceptance                                                                                                                                                                                                                      |
| --- | ------------------------------ | ---- | ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | FastAPI + DB skeleton          | 2d   | 2     | —    | Single-process app, async SQLAlchemy 2; persistence = Supabase Postgres (asyncpg, Supavisor session pooler) for dev+prod, SQLite for tests/local fallback (trd §7.7, TR-78); commitment CRUD persists.                          |
| B2  | SIWC end-to-end auth + billing | 3d   | 2     | S1   | OAuth2 PKCE, HttpOnly session, user token → inference billed to user; balance display via `/users/me`; labeled guest-mode `cpk_` fallback exists but is never demoed (spec §9.1, §12.4). Week-1 item.                           |
| B3  | Scheduler + WS + push delivery | 4d   | 3     | B1   | APScheduler jobs (cadence/deadline/win-back) rebuilt from DB at boot; delivery ladder WS → Web Push → timeline; `check now` independent of cron.                                                                                |
| B4  | State machine + audit log      | 3d   | 3     | B1   | Per-commitment lifecycle, miss path + stake email (SMTP/Resend, spec A5), win-back, proposal-apply endpoint (user session only), `success_patterns` write on outcome, audit log with AI-actor-unrepresentable CHECK constraint. |

### Lane C — AI layer (14d)

| ID  | Task                                      | Est. | Phase | Deps   | Acceptance                                                                                                                                                                                                            |
| --- | ----------------------------------------- | ---- | ----- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Chutes client + structured-output harness | 2d   | 2     | S1     | json_schema strict harness + inline failover routing between model pairs.                                                                                                                                             |
| C2  | Four prompt/schema sets                   | 5d   | 2–3   | C1     | Intake Q&A, plan proposal, evidence judging, workspace chat — incl. scope-boundary refusal enum. **Tuned before 22 Jun.**                                                                                             |
| C3  | Evidence adapters + judge                 | 4d   | 3     | C1, S2 | Pluggable interface; GitHub adapter (trivial-commit filter `stats.total < 3`); screenshot → TEE vision; three-valued verdict, `unclear` never punishes.                                                               |
| C4  | Persona tone tuning                       | 3d   | 4     | C2     | Skeptical-but-fair register across touchpoints; variant-persona QA (3 presets). Implements the register chosen for Q3 (team taste decision due **D2–3**, not here); hero passes ideally land pre-22 Jun (spec §11.2). |

### Lane D — Voice, integration, demo (14d)

| ID  | Task                          | Est. | Phase | Deps      | Acceptance                                                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------- | ---- | ----- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Piper + Whisper Docker stack  | 3d   | 2     | —         | wyoming-piper TTS + wyoming-faster-whisper STT in Docker, wired to backend.                                                                                                                                                                                                                                                   |
| D2  | WebSpeech fallback path       | 1d   | 2     | —         | Web Speech API as demo-default voice path (no Docker dependency on stage).                                                                                                                                                                                                                                                    |
| D3  | Web Push                      | 2d   | 3     | B3        | Service-worker push for closed-tab check-ins; falls back to timeline.                                                                                                                                                                                                                                                         |
| D4  | Integration QA + deploy       | 4d   | 4     | all lanes | Full demo thread tested incl. determinism levers (`?demo_deadline=+5m`, pre-staged 2nd account, pre-seeded momentum history on the demo account — spec §6.4). Owns the **Vercel + Render deploy** (auto-deploy from `main`, trd §7.7/TR-79) and the Python **seed/reset script** for a clean pre-staged demo dataset (TR-78). |
| D5  | Demo script + video + Devpost | 4d   | 5     | D4        | 5-min script (spec §12.5) with **daily dry-runs D17–20**, incl. deliberately triggering the scope-boundary refusal (spec §12.4); recorded backup footage; video by D19; Devpost + README by D20.                                                                                                                              |

## 6. Cross-lane dependency map

```
S1 ──► B2 ──► (billing visible in UI)
S1 ──► C1 ──► C2 ──► C4
S2 ──────────► C3 ◄── C1
S3 ──► A1 ──► A3, A5
B1 ──► A2, B3, B4
B3 ──► A4, D3
all ──► D4 ──► D5
```

Integration choke points (watch weekly): **B3↔A4/D3** (delivery ladder), **C3↔B4** (verdict → state machine), **A1↔D1/D2** (audio → lip-sync).

## 7. MVP cut order (if a gate slips — spec §12.3)

- **MUST (demo thread, cut bottom-up only if forced):** SIWC sign-in **with balance display** → persona pick (3 presets, hero fully tuned) → Compose → Context chat (text; voice if stable) → Plan+Settings → Start → `check now` GitHub verify with in-character reaction → screenshot TEE judge → deadline verify (demo clock `?demo_deadline=+5m`) → celebration + identity + momentum → staged miss (pre-staged 2nd account) → stake email + win-back. Live2D + lip-synced TTS throughout; **real scheduler exists** (shown via timeline, not waited on).
- **SHOULD (post-freeze, in priority order):** ① share card · ② trust meter · ③ public-URL adapter · ④ variant-persona tone QA · ⑤ server-Whisper · ⑥ closed-tab push · ⑦ guard classifier · ⑧ Kokoro TTS · expression variety · mobile polish · calibration suggestions.
- **OUT (roadmap):** monetary stakes · more adapters · GitHub OAuth/private repos · multi-commitment · auto-recurring · crew/leaderboards · native mobile · true barge-in · retention features.

## 8. Working agreements

- **Conventional commits** enforced by commitlint (pre-commit hooks install via `bun install`).
- **Attribute adapted OSS** in README + commit messages from day 1 (judges review git history).
- **No SDK/engine migration after S3 locks** the Live2D stack.
- **Demo determinism:** every demo beat fires from a deterministic trigger; nothing waits on a cron.
- **Feature freeze D17** — after that, only SHOULD-list items and polish.
- **Live2D assets `[REVISED — PO-approved, spec §4.4 / TR-12]`:** runtime model files are **committed via Git LFS in the private repo** (served same-origin under `/models/...`); `kawan/scripts/download_models.sh` is the local-bootstrap convenience; Live2D copyright notice + #LiveroiD credit lines stay in README.
- **Shared Chutes account discipline:** quotas are per account with 4-h rolling-window smoothing — batch bulk eval loops off-hours; never architect features around subscription quotas (spec §3.2).
