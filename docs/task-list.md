# Kawan — Team Task List

Lane responsibilities and task breakdown for the 4-person team, derived from `kawan-spec.md` §12.1 (lanes), §12.2 (phase gates) and §12.3 (MVP cut).

| Meta            |                                                                                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version         | 0.3                                                                                                                                                                                                                                                                               |
| Date            | 2026-06-26                                                                                                                                                                                                                                                                        |
| Source of truth | [`kawan-spec.md`](./kawan-spec.md) — this doc summarizes, the spec decides                                                                                                                                                                                                        |
| Companion docs  | [`prd.md`](./prd.md) (what & why) · [`trd.md`](./trd.md) (how)                                                                                                                                                                                                                    |
| Tracking        | **This file is the canonical assignment of responsibility.** No GitHub Issues currently mirror these tasks (the earlier mirror was deleted); teammates may opt into Issues individually — `lane:A`–`lane:D` labels and the 5 milestones still exist on the repo for that purpose. |

> **v0.3 change (26 Jun):** Lane C (AI workflow) and Lane B (supporting backend) are **fleshed out** with concrete checkbox sub-tasks (§5.4.1–§5.4.2), and the **AI-reactive Live2D view + chat-interface redesign** is formally scoped with **proposed ownership** (§5.5) so it is **not all on the Lane A owner (PO)**. The Lane A/B/C/D table IDs (A1–A5, B1–B4, C1–C4, D1–D5) are unchanged; v0.3 expands them, it does not renumber. New cross-lane edges are in §6. Open questions and spec discrepancies that need a PO call are in §9.

## 1. Calendar & day mapping

`D1` = 11 Jun 2026 → `D20` = 30 Jun 2026 (submission 23:59 MYT). Two hard external dates:

- **22 Jun (D12)** — team Pro subscription expires → all LLM-heavy prompt tuning must be finished (Phase 3 gate).
- **30 Jun (D20)** — Devpost submission deadline.

> **Calendar reality (26 Jun):** D12 (the Pro-expiry tuning gate) has passed; remaining LLM tuning runs on PAYG (a heavy dev-day is <$1, spec §3.2). Lane C is still **unbuilt**; the dates above are the original plan, kept for the record. Lane C now runs on the post-D12 PAYG footing · batch bulk eval loops, don't architect around quota.

## 2. Lane ownership

| Lane  | Title                    | Owner | Scope (one line)                                                                               | Est. days |
| ----- | ------------------------ | ----- | ---------------------------------------------------------------------------------------------- | --------- |
| **A** | Character & frontend     | _PO_  | Live2D stage, all GUIs, timeline, polish                                                       | 14        |
| **B** | Backend core             | _TBD_ | FastAPI/Postgres (Supabase; SQLite tests), SIWC auth+billing, scheduler/WS/push, state machine | 12        |
| **C** | AI layer                 | _TBD_ | Chutes client, prompt/schema sets, evidence adapters + judge, tone                             | 14        |
| **D** | Voice, integration, demo | _PO_  | Piper/Whisper, WebSpeech, Web Push, integration QA, demo/video/Devpost                         | 14        |

~6 days/person slack against the 20-day window is intentional (hackathon reality buffer). The two genuinely novel integrations — **SIWC** (lane B) and the **evidence judge** (lane C) — are week-1 items by design.

> **Ownership note (26 Jun):** Lane D went MIA and is **now PO-owned**. The PO also owns Lane A. To keep the **AI workflow + L2D/chat redesign** off the PO's single pair of hands, §5.4 hands the **AI behaviour** to Lane C, the **supporting backend** to Lane B, and §5.5 hands the **view/chat wiring** to the **agent frontend team** (the PM-orchestrated PL→PG→QA crew that shipped A1–A5 and the v2/v3/v4 redesign). The PO keeps only the taste/sign-off slices that genuinely need a human (voice, persona register, demo).

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
| Q3  | Hero persona voice/register (BM/English/Manglish mix?)    | Team  | **D2–3** (taste decision)            | Open — feeds C4 (still a PO/team taste call, §9)   |
| Q4  | `chutes:invoke` enough for `/users/me` balance?           | B     | D1                                   | ✅ Resolved by S1 — yes; `billing:read` privileged |
| Q5  | _(Optional courtesy)_ LiveroiD creator permission inquiry | A     | Anytime (Haru-R/Hiyori are fallback) | Open                                               |

## 5. Lane task breakdown

Acceptance = the gate it must satisfy. `Deps` reference task IDs. Day estimates from spec §12.1.

### Lane A — Character & frontend (14d)

| ID  | Task                         | Est. | Phase | Deps   | Acceptance                                                                                                                                                                                                   |
| --- | ---------------------------- | ---- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Live2D stage + lip-sync      | 3d   | 2     | S3     | Stage component with expression hooks; lip-sync driven by TTS audio in-app.                                                                                                                                  |
| A2  | Compose + Plan/Settings GUIs | 3d   | 2     | B1     | Sentence-builder (<30 s to compose); hard fields GUI-set, AI-read-only (trd §5). Includes the **first-run persona picker** (3 presets) — the picker itself is MVP, built week 1–2 (spec §12.2 phase-4 note). |
| A3  | Workspace chat UI            | 3d   | 3     | A1, C2 | Goal-scoped chat (voice/text), slot-fill display, in-character reactions, proposal card overlay with `[Apply]`/`[Dismiss]` (spec §5.2). **See §5.5 for the v0.3 re-scope + ownership split.**                |
| A4  | Timeline / momentum view     | 2d   | 4     | B3     | Check-in timeline + momentum dots + celebration/identity beats + habit-loop close (one-question debrief, seeded next commitment / `Repeat this`, spec §5.6); shows scheduler activity without waiting on it. |
| A5  | Frontend polish pass         | 3d   | 4     | A1–A4  | Responsive PWA, TEE attestation badge, audit-log "who changed what" view (spec §8.2), persona picker refinement. Freeze D17.                                                                                 |

> **Lane A status (26 Jun):** A1, A2, A4, A5, SIWC frontend, and the v2/v3/v4 redesign are **done and merged**. **A3 (workspace chat) is the one Lane A item still open**, and it is exactly the piece the PO does not want to own end-to-end. §5.5 splits A3 into a **view/chat-wiring** half (agent frontend team) and an **AI-behaviour** half (Lane C, via C2 plus a new Lane B endpoint, B5).

### Lane B — Backend core (12d)

| ID  | Task                                                      | Est. | Phase | Deps             | Acceptance                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------- | ---- | ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | FastAPI + DB skeleton                                     | 2d   | 2     | —                | Single-process app, async SQLAlchemy 2; persistence = Supabase Postgres (asyncpg, Supavisor session pooler) for dev+prod, SQLite for tests/local fallback (trd §7.7, TR-78); commitment CRUD persists.                                                                                                                                                                                                                                                      |
| B2  | SIWC end-to-end auth + billing                            | 3d   | 2     | S1               | OAuth2 PKCE, HttpOnly session, user token → inference billed to user; balance display via `/users/me`; labeled guest-mode `cpk_` fallback exists but is never demoed (spec §9.1, §12.4). Week-1 item.                                                                                                                                                                                                                                                       |
| B3  | Scheduler + WS + push delivery                            | 4d   | 3     | B1               | APScheduler jobs (cadence/deadline/win-back) rebuilt from DB at boot; delivery ladder WS → Web Push → timeline; `check now` independent of cron.                                                                                                                                                                                                                                                                                                            |
| B4  | State machine + audit log                                 | 3d   | 3     | B1               | Per-commitment lifecycle, miss path + stake email (SMTP/Resend, spec A5), win-back, proposal-apply endpoint (user session only), `success_patterns` write on outcome, audit log with AI-actor-unrepresentable CHECK constraint.                                                                                                                                                                                                                             |
| B5  | **Workspace turn endpoint + AI-reply seam** _(NEW, v0.3)_ | 1.5d | 3     | B4, contracts.py | The one **missing** Lane-C-consuming seam: a `POST /commitments/{id}/workspace/turn` route that calls `LLM.workspace_turn(...)`, returns `{say, emotion, response_type, proposal?}`, persists any `proposal` as a row (user-applies only), records contact (ADR-0002), and pushes the reply over WS. Detail in §5.4.2. Acceptance: the frontend send-to-AI seam (§5.5-b) has a real endpoint to call; iron rule holds (no hard-field write from the reply). |

> **Lane B status (26 Jun):** B1–B4 are **done and merged**, plus several PO-authorised cross-lane endpoints (`PATCH /api/me`, `POST .../debrief`, `DELETE .../{id}`, `DELETE /api/me/data`, `GET /api/me/history`). The intake (`POST .../context/turn`) and plan (`POST .../plan`) endpoints **already exist and already call the stub `LLM`** (`app/routes/commitments.py`); the check-in pipeline already calls `LLM.checkin_line(...)` and emits `{say, emotion}` over WS (`app/pipeline.py`). **The genuine Lane B gap is B5**: there is **no workspace-turn endpoint** even though the `LLMClient.workspace_turn(...)` port and stub exist. See §5.4.2.

### Lane C — AI layer (14d)

| ID  | Task                                      | Est. | Phase | Deps   | Acceptance                                                                                                                                                                                                               |
| --- | ----------------------------------------- | ---- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Chutes client + structured-output harness | 2d   | 2     | S1     | json*schema strict harness + inline failover routing between model pairs. \*\*Plus SIWC-billed Bearer via Lane B's `TokenProvider` port (per-user token vs guest `cpk*`).\*\* Detail in §5.4.1.                          |
| C2  | Four prompt/schema sets                   | 5d   | 2–3   | C1     | Intake Q&A, plan proposal, evidence judging, workspace chat — incl. scope-boundary refusal enum. **Tuned before 22 Jun.** **Plus per-persona layered system prompts + emotion tagging on each reply.** Detail in §5.4.1. |
| C3  | Evidence adapters + judge                 | 4d   | 3     | C1, S2 | Pluggable interface; GitHub adapter (trivial-commit filter `stats.total < 3`); screenshot → TEE vision; three-valued verdict, `unclear` never punishes. **The §9.3 vision call lives in the adapter, see §9-D1.**        |
| C4  | Persona tone tuning                       | 3d   | 4     | C2     | Skeptical-but-fair register across touchpoints; variant-persona QA (3 presets). Implements the register chosen for Q3 (team taste decision due **D2–3**, not here); hero passes ideally land pre-22 Jun (spec §11.2).    |

> **Lane C status (26 Jun):** **NOT built**. All four §9.2 calls + the §9.3 judge currently run as **deterministic stubs** (`app/stubs.py`), wired in **one file** (`app/wiring.py`). Lane C's whole job is to **replace those stubs behind the identical `app/contracts.py` signatures**: no new orchestration, no scheduler/state/WS changes (Lane B already owns those, ADR-0001). §5.4.1 is the checkbox breakdown of C1–C4.

### Lane D — Voice, integration, demo (14d)

| ID  | Task                          | Est. | Phase | Deps      | Acceptance                                                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------- | ---- | ----- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Piper + Whisper Docker stack  | 3d   | 2     | —         | wyoming-piper TTS + wyoming-faster-whisper STT in Docker, wired to backend.                                                                                                                                                                                                                                                   |
| D2  | WebSpeech fallback path       | 1d   | 2     | —         | Web Speech API as demo-default voice path (no Docker dependency on stage). **Feeds A1's `speak()` lip-sync seam (the §5.5-a reactive view).**                                                                                                                                                                                 |
| D3  | Web Push                      | 2d   | 3     | B3        | Service-worker push for closed-tab check-ins; falls back to timeline.                                                                                                                                                                                                                                                         |
| D4  | Integration QA + deploy       | 4d   | 4     | all lanes | Full demo thread tested incl. determinism levers (`?demo_deadline=+5m`, pre-staged 2nd account, pre-seeded momentum history on the demo account — spec §6.4). Owns the **Vercel + Render deploy** (auto-deploy from `main`, trd §7.7/TR-79) and the Python **seed/reset script** for a clean pre-staged demo dataset (TR-78). |
| D5  | Demo script + video + Devpost | 4d   | 5     | D4        | 5-min script (spec §12.5) with **daily dry-runs D17–20**, incl. deliberately triggering the scope-boundary refusal (spec §12.4); recorded backup footage; video by D19; Devpost + README by D20.                                                                                                                              |

> **Lane D status (26 Jun):** PO-owned, **deferred** until the frontend looks demo-ready; the **deploy half of D4 is done and verified in prod**. The voice path (D1/D2) feeds the §5.5-a reactive Live2D view through the already-locked `Live2DStage.speak()` seam · voice and the reactive-face wiring are the same beat and are tracked there.

---

### 5.4 AI workflow — Lane C + supporting Lane B (checkbox detail) _(NEW, v0.3)_

This is the flesh on C1–C4 and the new B5. **Every item maps to a spec section.** The boundary is fixed by ADR-0001: **Lane B owns the consuming ports + the orchestration; Lane C provides implementations behind the identical `app/contracts.py` signatures**, swapped in `app/wiring.py`. Nothing here re-architects the scheduler, state machine, WS hub, or `check now` · those are Lane B and already built.

#### 5.4.1 Lane C — the AI behaviour (replace the stubs)

**C1 · Chutes client + structured-output harness + SIWC-billed Bearer** (spec §3.1, §7.6-D2, §9.1, §9.4; TR-29..33)

- [ ] OpenAI-compatible client against `base_url="https://llm.chutes.ai/v1"`; **never** `X-API-Key`, **never** the data-opt-in proxy host (TR-29, TR-33).
- [ ] **SIWC-billed Bearer:** take the per-user token from Lane B's `TokenProvider` port (`app/contracts.py:TokenProvider`, already implemented by `app/auth.py:AuthTokenProvider`, wired as `TOKENS` in `wiring.py`); on `401` call `refresh()` once then retry, else surface re-auth (TR-29, TR-54). Guest sessions fall back to the team `cpk_` key, visibly labeled, never demoed (spec §9.1, TR-53). **Signed-in path bills the user's own balance · this is the special-track core (TR-52).**
- [ ] Inline failover model routing (`model: "A,B"`), strict `json_schema` `response_format`, **Pydantic re-validation of every response + one retry** (TR-30, TR-32). Model ids carry org prefixes; `GLM-5.1-TEE` never routed vision work (TR-31).
- [ ] **Budget `max_tokens` for thinking tokens** on every schema call · all but gemma are reasoning models (spike S4; empty `content` otherwise).
- verify: a real schema-valid completion returns for each §9.2 set against a live SIWC token, billed to that user (dashboard); failover + one-retry exercised; guest `cpk_` path labeled.

**C2 · the four §9.2 schema sets + per-persona layered prompts + emotion tagging** (spec §9.2, §11.1; TR-34..38, TR-72..73). These back the four `LLMClient` methods (`intake_turn`, `plan`, `checkin_line`, `workspace_turn`).

- [ ] **Set A · intake turn** (spec §9.2-A, TR-35): `{say (≤1 question), slots:{why,obstacles,time_constraints,skill}, intake_complete, emotion}`. System prompt carries current slot state + remaining-question budget; **never** `intake_complete` until every slot is non-null or skipped; **never** asks about action/deliverable/deadline (settled in GUI). Demo cap 3 questions. Backs `intake_turn`; the **only** DB write its output reaches is the `soft_context` UPSERT (already enforced in `routes/commitments.py:context_turn`, spec §8.2).
- [ ] **Set B · plan proposal** (spec §9.2-B, TR-37 PII rule): `{roadmap:[{order,title,est_minutes,note}], front_load_reason, suggested_evidence:{type,reason}, suggested_cadence, suggested_stake:{enabled,reason}, say}`. **Soft slots / pre-fills only, never hard fields.** Schema carries only a suggested _type_ and an enabled _flag_; **repo URLs, contact names, emails never enter any prompt or response** (TR-27, INV-6). Backs `plan`.
- [ ] **Set C · check-in line** (spec §9.2-C, TR-38): in = the status snapshot Lane B already assembles (`app/pipeline.py` builds `{had_new_evidence, evidence_summary, hours_left, escalation, skip_days_left}`) → out `{say, emotion, escalate}`. Tone contract: relational, specific to the evidence, never shaming, never "you must"; escalation 2 = blunt about the gap, warm about the person. Backs `checkin_line` (the **per-commitment check-in engine** is already wired · Lane C supplies the real line, not new orchestration).
- [ ] **Set D · workspace turn** (spec §9.2-D, §2.2-H2, TR-36): `{response_type: coaching|refusal|proposal, say, proposal:{field,proposed_value,reason}, emotion(+proud)}`. **Scope-boundary rule verbatim in the system prompt:** discuss process, sequence, scope, time; **never** the content of the deliverable (no code, prose, designs, answers, subject-matter explanations); if asked → `response_type='refusal'` + redirect in character. `proposal.field ∈ {deadline,deliverable,cadence,evidence_type,stake}`. Backs `workspace_turn` (consumed by the new B5 endpoint, §5.4.2). Parallel guard-classifier is a post-freeze SHOULD (#7), not here.
- [ ] **Per-persona layered system prompt** (spec §11.1, TR-73): base contract (all of the above) **+ a thin persona tone fragment** (`personas.json:tone`) **+ the persona's Chutes model id** (hero→gemma, Adik→Qwen3.6, Cik Maid→DeepSeek-V3.2). **Only tone + model id + voice + look vary; schemas, scope boundary, permissions, state machine, verdict rules, escalation are INVARIANT across all three** (the de-scope lever under crunch is variant tone-QA depth, never the picker, TR-72).
- [ ] **Emotion tagging on every conversational reply, constrained to the fixed 6-value enum** `neutral|curious|pleased|skeptical|concerned|proud` (TR-34). This is the **only** coupling between a Lane C reply and the L2D expression layer: the frontend `Emotion` type (`types/api.ts`) and `modelRegistry.expressionMap` already map exactly these 6 → per-model expressions (null = graceful no-op). **Adding a 7th value silently breaks the face** (§9-D5).
- verify: each set returns strict-valid JSON under failover; the refusal fires on a content request; `emotion` is always one of the 6; swapping persona changes only tone/model, never the schema or the boundary; tuned (hero deep, variants functional) ideally pre-22-Jun, now PAYG.

**C3 · evidence adapters + judge** (spec §9.3, §10; TR-39..47). Replace `StubGitHubAdapter` / `StubScreenshotAdapter` behind the `EvidenceAdapter` Protocol.

- [ ] **GitHub adapter (trust `high`):** `GET /repos/{o}/{r}/commits?since={iso}&sha={branch}`, no auth, public repos (spike (a) verified); trivial-commit filter via per-SHA `GET .../commits/{sha}`, **ignore `stats.total < 3`**, rule visible in UI; deterministic pre-checks (new? non-trivial? in window?) → one **text** LLM call relating commits to the deliverable → verdict + in-character commentary (TR-43..45). Author-email warning at setup; squash = 1 commit; 6 h stat delay absorbed by grace.
- [ ] **Screenshot adapter (trust `medium`):** judged via the **§9.3 TEE vision call** (strict json*schema verdict), file **deleted after verdict** (the upload route in `routes/commitments.py` already consumes-then-discards the bytes, TR-46). \*\*NB the vision call is invoked \_inside* `EvidenceAdapter.judge(commitment, bundle, llm)`** · see the contract gap in §9-D1 (the `llm` handed to the adapter is the `LLMClient`, which has **no\*\* vision method yet · Lane C resolves this).
- [ ] **Three-valued verdict, fair by design** (spec §9.3, §2.2-H1; TR-39, TR-40): `{verdict: pass|fail|unclear, confidence, observations[], reasoning, follow_up_request|null}`, all required. `pass` requires observations that _specifically_ connect to the deliverable; plausible-but-unprovable → **`unclear` (never `fail`) + `follow_up_request`**; `fail` reserved for contradiction or absence at final verify. **`unclear` NEVER punishes** (the contract `Verdict` dataclass already encodes this shape; Lane B's `pipeline.py` already persists `Evidence` rows + emits verdict payloads · Lane C supplies the real ruling, not the wiring).
- [ ] Judge prompts carry **commitment context** to avoid over-skepticism (spike S2 calibration note).
- verify: a real public repo returns a named non-trivial commit; a real screenshot returns a context-grounded three-valued verdict via the failover pair; `unclear` triggers a follow-up and changes no state; trivial commits filtered with the rule shown.

**C4 · persona tone tuning** (spec §11.2; TR-72): skeptical-but-fair register across every touchpoint; **variant-persona QA ×3** (hero deep, Adik/Cik Maid functional); implements the Q3 register (a **team/PO taste decision**, §9). Hero passes ideally pre-22-Jun, now PAYG. **PO sign-off on register is a human checkpoint, not a passing test (§8).**

#### 5.4.2 Lane B — the supporting backend (the gaps Lane C + the chat UI need)

**B5 · Workspace turn endpoint + AI-reply seam** (spec §5.2 pull, §9.2-D; TR-25, TR-37). **The one genuinely missing seam.**

- [ ] Add `POST /commitments/{id}/workspace/turn` (body `{say}`) in `app/routes/commitments.py` (mirrors the existing `context/turn` pattern): load `soft_context`, call `LLM.workspace_turn(commitment, soft, body.say)`, return `{say, emotion, response_type, proposal?}`; `current_user`-scoped via the existing `_owned` dep.
- [ ] **`response_type='proposal'` persists a `Proposal` row only** (status `open`); the reply itself **never writes a hard field** · the existing `proposals/{pid}/apply` route is the user's tap, audit `actor='user'` (TR-25, TR-37, INV-5). A confused model can at worst propose.
- [ ] `record_contact(db, c)` on the turn (ADR-0002 · workspace chat is a Contact signal that resets the Lapse clock).
- [ ] Push the reply over the WS hub so the stage can react (the hub + `deliver()` ladder already exist; reuse, don't rebuild).
- [ ] Pydantic-validate at the boundary; `pytest` coverage (happy path, refusal shape, proposal-creates-a-row, no `AuditLog actor='ai'`, conftest stays SQLite-forced).
- verify: the frontend send-to-AI seam (§5.5-b) calls one real endpoint and gets `{say, emotion, response_type, proposal?}`; a proposal turn creates exactly one `open` proposal row and mutates no hard field; a refusal turn returns `response_type='refusal'`.

**B6 · Conversation persistence DECISION (flag, do not silently build)** (spec §4.5, ADR-0002; TR-05). See §9-D2.

- [ ] **Decision needed at Gate 1:** the workspace chat currently has **no message history** anywhere, and the spec **deliberately** has no chat/messages table (memory is structured + small · `soft_context`, `checkins`, outcomes · not a transcript, TR-05/§4.5). Either **(a)** keep workspace turns **ephemeral** (turn in → reply out, the stage shows the live exchange, no persisted thread · matches the spec) or **(b)** add a `messages` table (a **real schema deviation** needing spec §8.1 + trd §5 ratification per TR-71). **Do not add a table without the PO's call** · recommend (a) for the MVP demo. No checkbox until decided.

**B-existing · already done, listed so Lane C/the chat UI know the seam is live** (no new work unless the real adapters need it):

- Intake `POST .../context/turn` → `LLM.intake_turn` → `soft_context` UPSERT only (✅ exists).
- Plan `POST .../plan` → `LLM.plan` → `plans` row, pre-fills only (✅ exists).
- Check-in pipeline → `LLM.checkin_line` → `Checkin` row + `{say, emotion}` over WS (✅ exists, `app/pipeline.py`).
- Screenshot upload → `adapter.judge` → `Evidence` row + verdict payload, file discarded (✅ exists). **AI verdict is already wired into the timeline + verification records** · the residual Lane B work here is only what the _real_ vision adapter needs (e.g. handing the judge the actual image bytes/path the upload route currently discards · coordinate with C3, §9-D1).

---

### 5.5 AI-reactive Live2D view + chat-interface redesign — scope + PROPOSED OWNERSHIP _(NEW, v0.3)_

This is the work the PO flagged as too much to own alone. It is **three clusters**, deliberately split so the **view/UI is the agent frontend team's**, the **AI behaviour is Lane C's**, and the PO keeps only taste/sign-off. It is the v0.3 re-scope of **A3** (and folds in the voice beat from D2). **All three can be built and demoed against the existing stub/placeholder text now, and consume real Lane C text with zero view change once Lane C lands** (exactly as the voice plan already notes).

| Cluster                                  | What it is                                                                                                                                                                                                                   | Proposed owner                                                                                         | Depends on                                              | Key existing seam                                                                                                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) AI-reactive Live2D view**          | The face/voice react to `{say, emotion}`: speak the reply (lip-sync), drive the expression from the 6-emotion tag, trigger celebration/idle motions on events                                                                | **Agent frontend team** (built A1, owns the stage). PO does **voice + persona-register sign-off only** | C2 emotion tags (placeholder now) · D1/D2 voice         | `Live2DStage.speak(ArrayBuffer\|AudioBuffer)` (locked, TR-08) · `modelRegistry.expressionMap` (6→expression) · WS `emotion?` field already on checkin/verdict payloads                                        |
| **(b) Workspace chat/conversation UI**   | Real conversational turns in the VN stage + messages mode: send box → AI reply, slot-fill display during intake, in-character reactions, **proposal card overlay (O1) `[Apply]`/`[Dismiss]`**, refusal rendered in character | **Agent frontend team** (built A2/A4 + the redesign)                                                   | **B5** (workspace-turn endpoint) · C2 set D (behaviour) | `WorkspaceLayout`/`StageMode`/`MessagesMode` render `ConversationTurn.text` from `getMockConversation()` (mock) · `useWorkspaceSocket` consumes `{say, emotion}` · send box exists, **send-to-AI is unwired** |
| **(c) The AI behaviour driving (a)+(b)** | The workspace-turn prompt/schema (set D), the emotion tagging, the scope-boundary refusal, the persona tone                                                                                                                  | **Lane C** (C2 set D + emotion tagging + C4)                                                           | C1                                                      | `LLMClient.workspace_turn` port + stub (real impl is Lane C)                                                                                                                                                  |

**Why this split takes it off the PO:**

- The **reactive-view wiring (a)** is pure frontend against seams that **already exist and are locked** (`speak()`, `expressionMap`, the WS `emotion` field). The agent frontend team has shipped every frontend pass so far (A1–A5, v2/v3/v4); this is the same kind of work, not new PO load. The PO's only irreducible slice is **listening to the voices and approving the persona register** (subjective, human-only · OQ-D2a, Q3).
- The **chat UI (b)** is frontend too; its single blocker is **B5** (a ~1.5d Lane B endpoint) and **C2 set D** (Lane C behaviour). Today it renders `getMockConversation()`; the agent team swaps the source for `POST .../workspace/turn` · **the render does not change, the data source does** (the exact pattern the voice plan already uses for `pipeline.py` lines).
- The **behaviour (c)** is wholly Lane C. The PO writes none of it.

**The Lane C dependency, made explicit:** (a) reacts to whatever `{say, emotion}` arrives · stub now, real later. (b) needs **B5 + C2 set D** to send-and-receive a real turn; until then the send box stays wired to the stub (commented as the Lane C seam, never faking a reply · same rule the voice plan applies to voice INPUT). (c) is the Lane C deliverable both consume. **Sequencing:** build (a) + the (b) shell against stubs now → land B5 + C2 set D → flip (b)'s data source. No view rewrite at any step.

**What the PO still genuinely owns here** (cannot be offloaded): voice taste / per-persona voice sign-off (OQ-D2a), the Q3 hero register, the LiveroiD scale/anchor + portrait taste (GPU-bound), and the demo (D5, already human-owned). **What is now offloaded:** all of (a)'s wiring + (b)'s chat UI (agent frontend team) and all of (c) (Lane C) + B5 (Lane B).

## 6. Cross-lane dependency map

```
S1 ──► B2 ──► (billing visible in UI)
S1 ──► C1 ──► C2 ──► C4
       C1 ──► TokenProvider(B2) ──► (SIWC-billed Bearer)   [v0.3]
S2 ──────────► C3 ◄── C1
S3 ──► A1 ──► A3, A5
B1 ──► A2, B3, B4
B3 ──► A4, D3
B4 ──► B5 ──► §5.5-b (chat UI)                              [v0.3]
C2(set D) ──► B5 ──► §5.5-b ; C2(emotion) ──► §5.5-a       [v0.3]
D1/D2 ──► §5.5-a (reactive view voice)                      [v0.3]
all ──► D4 ──► D5
```

Integration choke points (watch weekly): **B3↔A4/D3** (delivery ladder), **C3↔B4** (verdict → state machine), **A1↔D1/D2** (audio → lip-sync), and **[v0.3] B5↔§5.5-b↔C2-set-D** (workspace turn: endpoint ↔ chat UI ↔ behaviour) and **C2-emotion↔§5.5-a** (the 6-emotion tag is the only view coupling · keep the enum fixed at 6, §9-D5).

## 7. MVP cut order (if a gate slips — spec §12.3)

- **MUST (demo thread, cut bottom-up only if forced):** SIWC sign-in **with balance display** → persona pick (3 presets, hero fully tuned) → Compose → Context chat (text; voice if stable) → Plan+Settings → Start → `check now` GitHub verify with in-character reaction → screenshot TEE judge → deadline verify (demo clock `?demo_deadline=+5m`) → celebration + identity + momentum → staged miss (pre-staged 2nd account) → stake email + win-back. Live2D + lip-synced TTS throughout; **real scheduler exists** (shown via timeline, not waited on).
- **SHOULD (post-freeze, in priority order):** ① share card · ② trust meter · ③ public-URL adapter · ④ variant-persona tone QA · ⑤ server-Whisper · ⑥ closed-tab push · ⑦ guard classifier · ⑧ Kokoro TTS · expression variety · mobile polish · calibration suggestions.
- **OUT (roadmap):** monetary stakes · more adapters · GitHub OAuth/private repos · multi-commitment · auto-recurring · crew/leaderboards · native mobile · true barge-in · retention features.

> **v0.3 MVP-cut note:** the **workspace chat (§5.5-b)** is on the MUST thread only as the "Context chat" + the boundary-refusal demo beat (spec §12.5 t=1:10, t=judge-Q&A). The richer pull-surface coaching/proposal chat is valuable but **cut bottom-up** if forced · the demo thread needs the refusal and the slot-fill, not a long conversation. The **reactive view (§5.5-a)** is MUST (Live2D + lip-sync run throughout the thread). Keep them separable so a slip drops chat depth, never the face.

## 8. Working agreements

- **Conventional commits** enforced by commitlint (pre-commit hooks install via `bun install`).
- **Attribute adapted OSS** in README + commit messages from day 1 (judges review git history).
- **No SDK/engine migration after S3 locks** the Live2D stack.
- **No agent framework** (iron rule, TR-05) · the AI layer is hand-rolled (client + 4 schema calls + 2 tools + judge); Lane C adds **no** LangGraph/Letta/ADK/etc.
- **Demo determinism:** every demo beat fires from a deterministic trigger; nothing waits on a cron.
- **Feature freeze D17** · after that, only SHOULD-list items and polish.
- **Live2D assets `[REVISED — PO-approved, spec §4.4 / TR-12]`:** runtime model files are **committed via Git LFS in the private repo** (served same-origin under `/models/...`); `kawan/scripts/download_models.sh` is the local-bootstrap convenience; Live2D copyright notice + #LiveroiD credit lines stay in README.
- **Shared Chutes account discipline:** quotas are per account with 4-h rolling-window smoothing · batch bulk eval loops off-hours; never architect features around subscription quotas (spec §3.2). **Post-D12 this is PAYG (<$1/heavy dev-day) · same discipline.**
- **Human-only sign-offs (cannot be a passing test):** persona voice + register (Q3, OQ-D2a), the demo (D5). These stay with the PO/team even though §5.4–§5.5 offload the build.

## 9. Open questions + spec discrepancies for the PO (Gate 1)

Flagged, **not** silently resolved (spec is source of truth · where v0.3 scope would touch the spec, it asks rather than invents):

- **D1 · Vision verdict (schema E) has no port on `LLMClient`.** `app/contracts.py:LLMClient` exposes only the **four** conversational calls (intake, plan, check-in, workspace). The §9.3 vision judge is invoked **inside** `EvidenceAdapter.judge(commitment, bundle, llm)`, but the `llm` handed in is the `LLMClient`, which has **no** vision/judge method. **Lane C must pick:** (a) add a 5th port method (e.g. `judge_evidence(...)`) to `contracts.py`, or (b) have the screenshot adapter call the Chutes vision endpoint **directly** via the client. This is a **contract gap, not a spec conflict** · the spec's "4 prompt/schema sets" (§9.2) + the separate verdict (§9.3) is consistent; the _code contract_ just didn't surface the 5th call. **Recommend (a)** for symmetry + testability. _Needs a Lane C/B call; affects C1/C3 + `contracts.py`._
- **D2 · Conversation persistence is not sanctioned by the spec.** TR-05 + §4.5 + ADR-0002 **deliberately** keep memory structured + small (no chat/messages table). The chat UI (§5.5-b) may want history; the spec gives none. **Decision (B6):** keep workspace turns **ephemeral** (recommended, matches spec) **or** add a `messages` table (a real schema deviation → spec §8.1 + trd §5 ratification per TR-71). **Do not build a table without the PO's call.**
- **D3 · Prompt premise correction (for the record).** The original ask described the intake send-to-AI as "currently-unbuilt." In fact the **intake (`context/turn`) and plan (`plan`) endpoints already exist and call the stub `LLM`**; the **only** missing send-to-AI seam is the **workspace turn** (now B5). v0.3 scopes to that reality. _No action · just so the PO knows the gap is narrower than stated._
- **D4 · Per-persona "layered system prompts" must not vary the invariants** (TR-73). The layered prompt = base contract **+ tone fragment + model id** only. Schemas, scope boundary, permissions, state machine, verdict rules, escalation stay identical across all three personas. _Flagged so Lane C does not drift persona behaviour into the product invariants; no open decision, a guardrail._
- **D5 · The emotion enum is fixed at 6 and is the only Lane-C↔view coupling** (TR-34): `neutral|curious|pleased|skeptical|concerned|proud`. The frontend `Emotion` type + `modelRegistry.expressionMap` map exactly these. **Lane C must constrain every reply's `emotion` to this set** · a 7th value silently no-ops the face. _Guardrail; no open decision._
- **D6 · Lane B/C ownership is still `_TBD_` in §2.** §5.4 assigns the AI-workflow build to Lanes C and B, but those lanes have **no named human owner** (only Lane A/D = PO). With Lane C unbuilt and the team reduced, **does the agent crew (PL→PG→PM→QA) execute Lane C + B5 too** (as it has executed Lane A/B work to date, per the PO standing directive), or is a human picking up Lane C? _This is the load-bearing ownership question behind the whole v0.3 expansion · needs the PO's call._

## 10. Working agreements appendix — what changed in v0.3

v0.3 is **additive**: it expanded C1–C4 (§5.4.1) and Lane B (§5.4.2, new B5/B6), added §5.5 (the L2D-view + chat ownership split), updated §6 (new edges), and added §9 (open questions/discrepancies). It **did not** renumber A1–A5, B1–B4, C1–C4, D1–D5, change any spec decision, or build anything tagged `[ROADMAP]`. Where a v0.3 addition would touch the spec (a `messages` table, a 5th `LLMClient` port), it is **flagged in §9 for the PO**, not assumed.
