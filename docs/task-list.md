# Kawan — Team Task List

Lane responsibilities and task breakdown for the 4-person team, derived from `kawan-spec.md` §12.1 (lanes), §12.2 (phase gates) and §12.3 (MVP cut).

| Meta            |                                                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version         | 0.1                                                                                                                                                                              |
| Date            | 2026-06-12                                                                                                                                                                       |
| Source of truth | [`kawan-spec.md`](./kawan-spec.md) — this doc summarizes, the spec decides                                                                                                       |
| Companion docs  | [`prd.md`](./prd.md) (what & why) · [`trd.md`](./trd.md) (how)                                                                                                                   |
| Tracking        | GitHub Issues mirror these tasks (labels `lane:A`–`lane:D`, 5 milestones). Using Issues is per-teammate preference; **this file is the canonical assignment of responsibility.** |

## 1. Calendar & day mapping

`D1` = 11 Jun 2026 → `D20` = 30 Jun 2026 (submission 23:59 MYT). Two hard external dates:

- **22 Jun (D12)** — team Pro subscription expires → all LLM-heavy prompt tuning must be finished (Phase 3 gate).
- **30 Jun (D20)** — Devpost submission deadline.

## 2. Lane ownership

| Lane  | Title                    | Owner | Scope (one line)                                                       | Est. days |
| ----- | ------------------------ | ----- | ---------------------------------------------------------------------- | --------- |
| **A** | Character & frontend     | _TBD_ | Live2D stage, all GUIs, timeline, polish                               | 14        |
| **B** | Backend core             | _TBD_ | FastAPI/SQLite, SIWC auth+billing, scheduler/WS/push, state machine    | 12        |
| **C** | AI layer                 | _TBD_ | Chutes client, prompt/schema sets, evidence adapters + judge, tone     | 14        |
| **D** | Voice, integration, demo | _TBD_ | Piper/Whisper, WebSpeech, Web Push, integration QA, demo/video/Devpost | 14        |

~6 days/person slack against the 20-day window is intentional (hackathon reality buffer). The two genuinely novel integrations — **SIWC** (lane B) and the **evidence judge** (lane C) — are week-1 items by design.

## 3. Phase gates (from spec §12.2)

| Phase | Days   | Gate — pass/fail criteria                                                                                                                                           |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | D1–2   | All four de-risk spikes green (see §4 below). **Miss → cut order (spec §12.3) begins immediately.**                                                                 |
| 2     | D3–7   | Compose → Context → Plan wired end-to-end (text); commitments persist; `check now` runs GitHub adapter on this repo. "Demo thread exists (ugly)."                   |
| 3     | D8–12  | Full loop: scheduler + WS + escalation, screenshot adapter, final verify, miss path + stake email, win-back, voice in workspace. **LLM tuning done before 22 Jun.** |
| 4     | D13–16 | Depth: habit loop, proposal-apply, audit view, Web Push, tone passes, TEE badge, variant-persona QA. **Feature freeze D17.**                                        |
| 5     | D17–20 | Daily demo dry-runs; video recorded by D19; Devpost + README + buffer D20.                                                                                          |

## 4. Phase 1 — de-risk spikes (D1–2, all-hands)

| ID  | Spike                   | Lane | Done when                                                                                                                                 |
| --- | ----------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | SIWC round-trip         | B    | Login → user token → one gemma completion **verified billed to that user** in the dashboard. Spike both hosts (`llm.` vs `lm.chutes.ai`). |
| S2  | Vision-judge call       | C    | One TEE vision call on a real screenshot returns a structured verdict.                                                                    |
| S3  | Live2D + lip-sync       | A    | Chosen model renders and lip-syncs from a Piper WAV. Model + engine **locked** after this.                                                |
| S4  | Pro-tier model coverage | C    | Test call per judge model confirms Pro tier covers them (spec §3.2 Q2); else PAYG fallback noted.                                         |

## 5. Lane task breakdown

Acceptance = the gate it must satisfy. `Deps` reference task IDs. Day estimates from spec §12.1.

### Lane A — Character & frontend (14d)

| ID  | Task                         | Est. | Phase | Deps   | Acceptance                                                                                                      |
| --- | ---------------------------- | ---- | ----- | ------ | --------------------------------------------------------------------------------------------------------------- |
| A1  | Live2D stage + lip-sync      | 3d   | 2     | S3     | Stage component with expression hooks; lip-sync driven by TTS audio in-app.                                     |
| A2  | Compose + Plan/Settings GUIs | 3d   | 2     | B1     | Sentence-builder (<30 s to compose); hard fields GUI-set, AI-read-only (trd §5).                                |
| A3  | Workspace chat UI            | 3d   | 3     | A1, C2 | Goal-scoped chat (voice/text), slot-fill display, in-character reactions.                                       |
| A4  | Timeline / momentum view     | 2d   | 4     | B3     | Check-in timeline + momentum dots + celebration/identity beats; shows scheduler activity without waiting on it. |
| A5  | Frontend polish pass         | 3d   | 4     | A1–A4  | Responsive PWA, TEE attestation badge, persona picker refinement. Freeze D17.                                   |

### Lane B — Backend core (12d)

| ID  | Task                           | Est. | Phase | Deps | Acceptance                                                                                                                                       |
| --- | ------------------------------ | ---- | ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | FastAPI + SQLite skeleton      | 2d   | 2     | —    | Single-process app, async SQLAlchemy, commitment CRUD persists.                                                                                  |
| B2  | SIWC end-to-end auth + billing | 3d   | 2     | S1   | OAuth2 PKCE, HttpOnly session, user token → inference billed to user. Week-1 item.                                                               |
| B3  | Scheduler + WS + push delivery | 4d   | 3     | B1   | APScheduler jobs (cadence/deadline/win-back) rebuilt from DB at boot; delivery ladder WS → Web Push → timeline; `check now` independent of cron. |
| B4  | State machine + audit log      | 3d   | 3     | B1   | Per-commitment lifecycle, miss path + stake email, audit log with AI-actor-unrepresentable CHECK constraint.                                     |

### Lane C — AI layer (14d)

| ID  | Task                                      | Est. | Phase | Deps   | Acceptance                                                                                                                                              |
| --- | ----------------------------------------- | ---- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Chutes client + structured-output harness | 2d   | 2     | S1     | json_schema strict harness + inline failover routing between model pairs.                                                                               |
| C2  | Four prompt/schema sets                   | 5d   | 2–3   | C1     | Intake Q&A, plan proposal, evidence judging, workspace chat — incl. scope-boundary refusal enum. **Tuned before 22 Jun.**                               |
| C3  | Evidence adapters + judge                 | 4d   | 3     | C1, S2 | Pluggable interface; GitHub adapter (trivial-commit filter `stats.total < 3`); screenshot → TEE vision; three-valued verdict, `unclear` never punishes. |
| C4  | Persona tone tuning                       | 3d   | 4     | C2     | Skeptical-but-fair register across touchpoints; variant-persona QA (3 presets). Resolves spec Q3.                                                       |

### Lane D — Voice, integration, demo (14d)

| ID  | Task                          | Est. | Phase | Deps      | Acceptance                                                                                       |
| --- | ----------------------------- | ---- | ----- | --------- | ------------------------------------------------------------------------------------------------ |
| D1  | Piper + Whisper Docker stack  | 3d   | 2     | —         | wyoming-piper TTS + wyoming-faster-whisper STT in Docker, wired to backend.                      |
| D2  | WebSpeech fallback path       | 1d   | 2     | —         | Web Speech API as demo-default voice path (no Docker dependency on stage).                       |
| D3  | Web Push                      | 2d   | 3     | B3        | Service-worker push for closed-tab check-ins; falls back to timeline.                            |
| D4  | Integration QA                | 4d   | 4     | all lanes | Full demo thread tested incl. determinism levers (`?demo_deadline=+5m`, pre-staged 2nd account). |
| D5  | Demo script + video + Devpost | 4d   | 5     | D4        | 5-min script rehearsed (spec §12.5); video by D19; Devpost + README by D20.                      |

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

- **MUST (demo thread, cut bottom-up only if forced):** SIWC sign-in → persona pick → Compose → Context chat → Plan+Settings → `check now` GitHub verify → screenshot TEE judge → deadline verify (demo clock) → celebration/momentum → staged miss → stake email + win-back. Live2D + lip-synced TTS throughout.
- **SHOULD (post-freeze, in order):** share card · trust meter · public-URL adapter · variant-persona tone QA · server-Whisper · closed-tab push · guard classifier · Kokoro TTS.
- **OUT (roadmap):** monetary stakes · more adapters · GitHub OAuth/private repos · multi-commitment · auto-recurring · crew/leaderboards · native mobile · true barge-in · retention features.

## 8. Working agreements

- **Conventional commits** enforced by commitlint (pre-commit hooks install via `bun install`).
- **Attribute adapted OSS** in README + commit messages from day 1 (judges review git history).
- **No SDK/engine migration after S3 locks** the Live2D stack.
- **Demo determinism:** every demo beat fires from a deterministic trigger; nothing waits on a cron.
- **Feature freeze D17** — after that, only SHOULD-list items and polish.
