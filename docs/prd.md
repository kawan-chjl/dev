# Kawan — Product Requirements Document

One-line purpose: define WHAT the team (and coding agents) must build for the Chutes Hack 2026 submission, distilled from the implementation spec.

| Field           | Value                                                              |
| --------------- | ------------------------------------------------------------------ |
| Version         | 0.2                                                                |
| Date            | 2026-06-12                                                         |
| Source of truth | `docs/kawan-spec.md` (all `§` references point there)              |
| Audience        | 4-person hackathon team + coding agents implementing from this doc |
| Submission      | Devpost, 30 Jun 2026 23:59 MYT — public repo + 5-min demo video    |

Language: **MUST** = on the demo thread (spec §12.3); if forced, MUSTs are cut from the bottom of the demo thread upward — never silently dropped. **SHOULD** = post-freeze nice-to-have, in stated priority order. **OUT** = roadmap; do not build, may appear on a roadmap slide.

---

## 1. Overview & Problem Statement

**Kawan** ("friend" in Malay) is a voiced, animated Live2D accountability companion. It helps a user **plan exactly one commitment**, then **verifies completion with fetched evidence** (GitHub commits, vision-judged screenshots) — never self-report. It never does the user's work.

Target user: solo knowledge-workers, students, and indie builders who set their own goals, procrastinate, and lack external accountability (spec §0.2).

| #   | Problem (spec §0.2)                                  | Kawan's answer                                                 |
| --- | ---------------------------------------------------- | -------------------------------------------------------------- |
| P1  | No verified accountability — self-report is gameable | Fetched evidence + skeptical AI judge                          |
| P2  | Vague goals can't be acted on or verified            | Sentence constructor + bounded context intake                  |
| P3  | No cost to slacking                                  | Escalating check-ins + opt-in social stakes                    |
| P4  | A slip ends usage (streak guilt)                     | Skip-days, grace, re-scope, win-back — **no streaks anywhere** |
| P5  | Knowing the goal ≠ knowing the path                  | Personalized roadmap referencing the user's stated obstacles   |
| P6  | One-off wins don't compound                          | Identity reinforcement, momentum view, seeded next commitment  |

**Anti-goals** (spec §2.2 — ways to fail outright): (a) cute character + self-report check-ins = a Tamagotchi; (b) workspace drifts into a general chatbot = "wrapper" verdict, fatal; (c) >7 of 20 days on animation/voice before the accountability core stands.

---

## 2. Goals & Success Metrics

**The hackathon rubric IS the success metric.** Judging: Use of Chutes 25 · Technical execution 25 · Innovation 20 · Impact 20 · Presentation 10. Tie-break: Tech, then Chutes. "A working MVP beats a polished idea that doesn't run." (spec §0.1, §3.4)

| Goal                        | Measure                                                                                                                                                                                                   | Target (spec §12.6)       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| G1 Win Use of Chutes        | 5 judge-visible touchpoints: TEE models + attestation badge · structured outputs as control plane · multimodal evidence judging · inline model failover · SIWC user-funded billing (+ per-persona models) | 22–24 / 25                |
| G2 Technical execution      | Full demo thread works end-to-end, deterministic, daily dry-runs from D17                                                                                                                                 | 19–22 / 25                |
| G3 Win SIWC special track   | SIWC is load-bearing: the user's OAuth token IS the inference Bearer, billed to their balance                                                                                                             | Track prize               |
| G4 Deterministic 5-min demo | Every beat in §12.5 fires from a manual trigger (`Check now`, demo clock, staged account) — nothing waits on a cron                                                                                       | Flawless recording by D19 |
| G5 Honest scope             | Plan + verify; never produce deliverable content. Refusal demoable on demand                                                                                                                              | Survives judge Q&A        |

**Product objectives** (spec §0.3) — each maps to a problem and has a demo-visible proof:

| #   | Objective                                                                                        | Solves | Demo proof                                                                      |
| --- | ------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------- |
| O1  | Capture a concrete, verifiable commitment in <60 s (sentence constructor + bounded context chat) | P2, P5 | Compose→Start in under a minute; the plan references the user's stated obstacle |
| O2  | Verify progress from **fetched evidence**, never self-report (GitHub + vision-judged screenshot) | P1     | `Check now` names a real commit; screenshot verdict shows the judge's reasoning |
| O3  | Make slacking cost something: proactive escalating check-ins + opt-in social stakes              | P3     | Escalation tone shift on silence; stake email lands on a verified miss          |
| O4  | Make recovery cheap: skip-days, re-scoping, win-back — **no streaks anywhere**                   | P4     | Miss → immediate smaller rebuild offer; lapse → one warm nudge                  |
| O5  | Compound wins into a habit: identity reinforcement, momentum, calibration, one-tap repeat        | P6     | Verified win → seeded next commitment + trust-meter rise                        |

Stretch play for Use-of-Chutes 25/25 (post-freeze only, spec §12.6): deploy one custom chute (e.g. Piper TTS via the Chutes Python SDK) — adds GPU cost + cold-start risk; never on the demo thread.

**Hard constraints:** progressive git history from day 1 (ZIP dumps disqualify, §3.4) · all inference on Chutes · team Pro subscription expires 22 Jun → all LLM-heavy tuning front-loaded (§3.2, §12.2).

---

## 3. Users & Personas

| Who                                                                    | Needs                                                                                                         | Notes                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Aiman** (primary, spec §6) — indie builder, chronic deadline-slipper | Make one promise stick; be checked by something that can't be lied to; not be shamed off the app after a miss | The usage simulation (§6.1–6.3) is the canonical behavioral reference for every flow |
| Students / knowledge-workers                                           | Same loop with non-code evidence (screenshot, later URL probe)                                                | Screenshot adapter is the universal path (§10.4)                                     |
| Stake contact (e.g. Aiman's brother)                                   | Receives a templated email only on a _verified_ miss                                                          | Never interacts with the app; email never enters an LLM prompt                       |
| Hackathon judges                                                       | See Chutes depth, scope discipline, working demo                                                              | Audit-log view + refusal are Q&A answers made visible                                |

Note: "persona" elsewhere in this doc means the _AI companion preset_ (§11), not a user segment.

---

## 4. Product Principles (Invariants)

These hold across every feature, persona, and state. Violating one is a product bug, not a style choice.

| ID    | Invariant                                          | Detail                                                                                                                                                                                                                                                                                                   |
| ----- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-1 | **Iron-law scope boundary**                        | Kawan discusses process, sequence, scope, and time — **never the content of the deliverable** (no code, prose, designs, answers, subject-matter explanations). Encoded as the `refusal` response type (spec §2.2-H2, §9.2-D). Holds even when idle between goals (§5.5) — no general-chatbot mode, ever. |
| INV-2 | **Evidence, not self-report**                      | Every verdict comes from fetched/judged evidence. Praise, identity talk, and rewards bind to _verified completions only_ — never stated intentions (§2.1, §11.4).                                                                                                                                        |
| INV-3 | **Forgiving recovery — no streaks anywhere**       | No streak counters, no chains, no red marks. Misses render as neutral gaps. Skip-days, 6-h grace window, re-scoping, one warm win-back nudge (§2.1, §5.4). Corollary: gamify the relationship and verified wins — **never raw activity counts** (counts resurrect streak psychology, §11 intro).         |
| INV-4 | **One commitment at a time**                       | Named as a feature: "Kawan holds one promise at a time — that's what a promise is" (§2.2-H5).                                                                                                                                                                                                            |
| INV-5 | **Permissions by structure, not prompt obedience** | The agent layer has **no write path** to `commitments` hard fields. LLM output can write only the 4 `soft_context` slots or create `proposals` rows; applying a proposal requires the user's session tap; `audit_log.actor` CHECK constraint makes an AI actor unrepresentable (§8.2).                   |
| INV-6 | **PII never enters prompts**                       | Stake contact names/emails and repo URLs are GUI-only; LLM schemas carry only suggested _types_ and _flags_ (§9.2-B).                                                                                                                                                                                    |
| INV-7 | **Three-valued verdicts, fair by design**          | `pass / fail / unclear`; `unclear` never punishes — it asks for better evidence in character (§9.3).                                                                                                                                                                                                     |
| INV-8 | **Tone contract**                                  | Relational, specific to the evidence, never shaming, never "you must". Escalation 2 = blunt about the gap, warm about the person (§9.2-C).                                                                                                                                                               |
| INV-9 | **One code path for check-ins**                    | `Check now` runs the identical cadence pipeline on demand — the demo determinism lever (§5.2, §7.3).                                                                                                                                                                                                     |

---

## 5. Functional Requirements

### 5.1 Onboarding & SIWC (spec §3.3, §5.1, §9.4)

| ID    | Requirement                                                                                                                                                         | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-01 | Sign in with Chutes via OIDC + PKCE (S256); tokens stored encrypted server-side, never reach the browser; HttpOnly session (§9.4)                                   | MUST     |
| FR-02 | All Chutes inference calls use the signed-in user's OAuth access token as Bearer against `llm.chutes.ai/v1`; 401 → one transparent refresh → retry → re-auth prompt | MUST     |
| FR-03 | Display the user's Chutes username + balance ("your own compute" moment) via `/users/me` (§3.3)                                                                     | MUST     |
| FR-04 | Guest mode on the team `cpk_` key, visibly labeled, as a fallback only — SIWC remains the demoed default (§9.1)                                                     | MUST     |
| FR-05 | Landing view (V1): one-line value prop, SIWC button, guest entry, first-run persona picker (§5.5)                                                                   | MUST     |

### 5.2 Companion Persona (spec §11)

| ID    | Requirement                                                                                                                                                                                                                                                                     | Priority                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| FR-06 | First-run persona pick: 3 presets on one screen; switchable anytime in Settings (V6), effective next interaction (§11.2)                                                                                                                                                        | MUST                                        |
| FR-07 | A persona is a **stateless preset**: tone prompt fragment + Live2D model + Piper voice + Chutes model id (`personas.json` + `users.persona`). Schemas, permissions, state machine, scope boundary are invariant across personas (§11.1)                                         | MUST                                        |
| FR-08 | Hero persona "Kawan" (skeptical concierge, Haru-Receptionist model, gemma-4-31B-turbo-TEE) gets deep tone QA; the two variants (Adik/Hiyori/Qwen3.6, Cik Maid/LiveroiD/DeepSeek-V3.2) ship functional (§11.3). De-scope lever under crunch = variant QA depth, never the picker | MUST (hero) / SHOULD (#4 variant QA depth)  |
| FR-09 | Persistent Live2D character stage on every view: idle motions, emotion-tag→expression mapping, lip-sync (AnalyserNode → mouth param), TTS via wyoming-piper, sentence-chunked (§4.3, §7.4)                                                                                      | MUST                                        |
| FR-10 | Voice input: Web Speech API default; self-hosted Faster-Whisper as URL-flagged mode (§7.2)                                                                                                                                                                                      | MUST (WebSpeech) / SHOULD (#5 Whisper mode) |
| FR-11 | Live2D model assets are NOT committed to the repo: `kawan/scripts/download_models.sh` + `.gitignore` + license credits in README (§4.4)                                                                                                                                               | MUST                                        |

### 5.3 Compose (spec §5.1 step 1)

| ID    | Requirement                                                                                                                                                                                                            | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-12 | Sentence constructor GUI: `I will [action ▾] [deliverable ✎] by [deadline 📅]` — chips for action, free text + suggestions for deliverable, date-time picker. Creates `commitment(draft)`. Zero AI calls; target <30 s | MUST     |
| FR-13 | Compose validation: reject past deadlines; <1 h away gets a confirm ("ambitious. I respect it.") (§6.3)                                                                                                                | MUST     |

### 5.4 Context Q&A (spec §5.1 step 2, §9.2-A)

| ID    | Requirement                                                                                                                                                                           | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-14 | Chat-based intake (voice/text) fills exactly 4 slots `{why, obstacles, time_constraints, skill}` via structured-output schema A; slots visibly fill on screen                         | MUST     |
| FR-15 | Bounds: ≤6 questions (demo flag caps at 3), one question per turn, per-slot skip, auto-advance on `intake_complete`. Never asks about action/deliverable/deadline — those are settled | MUST     |
| FR-16 | LLM output writes ONLY `soft_context` — the single AI-writable table (INV-5, §8.2)                                                                                                    | MUST     |

### 5.5 Plan + Settings (spec §5.1 step 3, §9.2-B)

| ID    | Requirement                                                                                                                                                                                   | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-17 | One structured LLM call generates the roadmap (3–6 steps, **advice only** — no schedule, no per-step state, §7.3) with rationale tied to the user's stated obstacle                           | MUST     |
| FR-18 | AI pre-fills the settings panels; **only GUI controls set values** — verification adapter picker (with trust labels), cadence preset, skip-days, stake toggle + contact. Nothing auto-applies | MUST     |
| FR-19 | `Test connection` button dry-runs the adapter fetch at setup ("✓ repo found · 2 commits this week"); invalid/private repo fails inline at setup, never at deadline (§6.3)                     | MUST     |
| FR-20 | `Start` activates the commitment and registers exactly 3 jobs: cadence (cron), deadline (one-shot), win-back (re-armed) — rebuilt from DB on server boot (§7.3)                               | MUST     |

### 5.6 Evidence Checking Loop (spec §5.2 push, §9.3, §10)

| ID    | Requirement                                                                                                                                                                                                                                                                                                                                                                         | Priority    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FR-21 | Cadence pipeline per tick: fetch evidence → status snapshot → structured check-in line (schema C) → deliver (WS → Web Push → timeline) → character speaks on next open                                                                                                                                                                                                              | MUST        |
| FR-22 | `Check now` button runs the same pipeline on demand — one code path (INV-9)                                                                                                                                                                                                                                                                                                         | MUST        |
| FR-23 | Escalation 0→1→2 rises only on consecutive no-new-evidence ticks; any evidence resets it and earns a specific celebration; tone per INV-8                                                                                                                                                                                                                                           | MUST        |
| FR-24 | GitHub adapter (high trust): no-auth public-repo commits since last check, default branch unless configured; trivia filter `stats.total < 3` via per-SHA detail on the ≤5 newest commits (rule visible in UI); author-email setup warning; squash merge counts as 1 non-trivial commit; deterministic pre-checks then one text LLM call relating commits to the deliverable (§10.2) | MUST        |
| FR-25 | Screenshot adapter (medium trust — UI framing: "Kawan judges what it can see"): drag-drop/paste, PNG/JPG/WebP ≤8 MB, client downscale ≤1568 px, optional user note ("claimed progress") passed to the judge; judged by TEE vision model with strict JSON schema (verdict/confidence/observations/reasoning/follow_up_request); **file deleted after verdict** (§9.3, §10.3)         | MUST        |
| FR-26 | Verdicts are three-valued per INV-7: `pass` requires observations specifically connecting to the deliverable; `unclear` → `follow_up_request` asks for the disambiguating shot, no punishment; `fail` only for contradiction or absence at final verify                                                                                                                             | MUST        |
| FR-27 | Verdict card overlay (O2): verdict + judge observations + reasoning + 🔒 TEE attestation link (`/chutes/{id}/evidence`)                                                                                                                                                                                                                                                             | MUST        |
| FR-28 | All adapters implement the single `EvidenceAdapter` protocol (`type`, `trust`, `fetch()`, `judge()`); new adapter = one file + one enum value (§10.1)                                                                                                                                                                                                                               | MUST        |
| FR-29 | Model routing with inline failover (model ids MUST carry org prefixes, §3.1): conversational/intake/check-in/win-back/plan = `google/gemma-4-31B-turbo-TEE,Qwen/Qwen3.6-27B-TEE`; vision judging = `moonshotai/Kimi-K2.6-TEE,Qwen/Qwen3.5-397B-A17B-TEE`; structured outputs `strict: true` + Pydantic re-validation + one retry (§9.1, §7.6-D2)                                    | MUST        |
| FR-30 | Public-URL probe adapter (fetch URL → snapshot → judge) — "works for anyone with a link" (§10.4)                                                                                                                                                                                                                                                                                    | SHOULD (#3) |

### 5.7 Workspace Chat (spec §5.2 pull, §9.2-D)

| ID    | Requirement                                                                                                                                                                                                                                    | Priority    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FR-31 | Goal-scoped chat drawer over Home (V4), voice/text; every turn grounded in commitment context; returns `response_type ∈ {coaching, refusal, proposal}`                                                                                         | MUST        |
| FR-32 | `refusal` enforces INV-1 in character, redirecting to the user's next concrete move — demoable on demand (rehearsed for judge Q&A)                                                                                                             | MUST        |
| FR-33 | `proposal` renders a card (O1) with `[Apply]/[Dismiss]`; only the user's tap mutates hard fields, audit-logged `actor='user'` (INV-5)                                                                                                          | MUST        |
| FR-34 | Idle state (no active commitment): Home swaps the commitment header for a compose CTA + momentum summary; Kawan idles and greets; chat disabled except a single "ready to commit?" prompt — the scope boundary holds even between goals (§5.5) | MUST        |
| FR-35 | Parallel 2-line guard-classifier call to harden the scope boundary (§9.2-D)                                                                                                                                                                    | SHOULD (#7) |

### 5.8 Deadline, Miss, Recovery & Win-back (spec §5.3, §5.4, §5.6)

| ID    | Requirement                                                                                                                                                                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-36 | State machine exactly per §5.3: `status ∈ {draft, active, lapsed, verifying, grace, completed, missed}`; `on_track/slipping` are derived flags, not states. Status transitions come from scheduler/verifier only                                     | MUST     |
| FR-37 | Final verify at deadline runs server-side without user presence; fetched evidence can complete a commitment while the user sleeps (§6.2)                                                                                                             | MUST     |
| FR-38 | Grace window = 6 h on FAIL/UNCLEAR at deadline; entering grace spends a skip-day (none left → no grace) (§5.3)                                                                                                                                       | MUST     |
| FR-39 | Demo clock flag (`?demo_deadline=+5m`) makes the deadline reckoning deterministic on stage (§12.3)                                                                                                                                                   | MUST     |
| FR-40 | Miss path: honest, warm reckoning ("here's what I saw") + immediate smaller pre-composed rebuild offer (one tap → pre-filled V2). Miss recovery is MVP, not nice-to-have (§2.2-H3)                                                                   | MUST     |
| FR-41 | Stake (opt-in): on verified miss, templated email to the contact (SMTP/Resend), copy shown to the user; bounce → honest log ("that one's on the house"); abandoning an active staked commitment requires a confirm and counts as a miss (§5.4, §6.3) | MUST     |
| FR-42 | Lapse: 2 consecutive silent check-ins → `lapsed`; ONE disappointed-but-warm win-back nudge with a tiny way back; a second lapse stays quiet (§5.4)                                                                                                   | MUST     |
| FR-43 | Skip-day silences one missed window without escalation (default total: 1) (§5.4, A2)                                                                                                                                                                 | MUST     |
| FR-54 | Slipping: as tone escalates, the workspace proactively offers a re-scope `proposal` (smaller deliverable / new deadline) — applied only by the user per INV-5 (§5.4)                                                                                 | MUST     |

### 5.9 Habit Loop & Momentum (spec §5.4, §5.6, §11.4)

| ID    | Requirement                                                                                                                                                                                                                                           | Priority                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| FR-44 | Completion: celebration motion + voice + confetti, specific to the evidence; identity line bound to verified history only (INV-2)                                                                                                                     | MUST                    |
| FR-45 | One-question debrief ("what made this one work?") → stored in `success_patterns.features`                                                                                                                                                             | MUST                    |
| FR-46 | Seeded next commitment: V2 reopens pre-filled from calibration + one-tap `Repeat this`. The loop must close (§5.6)                                                                                                                                    | MUST                    |
| FR-47 | Momentum view (V5): dots calendar of verified wins (misses = neutral gaps, never red — INV-3), identity titles (Starter/Finisher/Shipper/Serial Shipper at 1/3/5/10), history                                                                         | MUST                    |
| FR-48 | Win-receipt share card: client-rendered PNG ("VERIFIED ✓ by Kawan"), user-triggered only, never auto-posted (§11.4)                                                                                                                                   | SHOULD (#1 — demo gold) |
| FR-49 | Trust meter — Kawan starts skeptical; each verified win visibly raises trust (meter on V5 + softer default tone + unlocked expressions/voice lines); dips gently on misses; never resets to zero. Gamifies the relationship, not the activity (§11.4) | SHOULD (#2)             |
| FR-50 | Idle >5 days → one Monday-morning "fresh start" nudge, then silence (§5.6)                                                                                                                                                                            | MUST                    |

### 5.10 Notifications & Delivery (spec §5.2, §7.3)

| ID    | Requirement                                                                                                                      | Priority                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| FR-51 | Delivery cascade: WS if connected → Web Push (VAPID) → in-app timeline on next open. Push payloads carry headline only (privacy) | MUST (WS + timeline) / SHOULD (#6 closed-tab push) |
| FR-52 | Notification permission denied → check-ins land in timeline; email fallback only for win-back/stake (§6.3)                       | MUST                                               |
| FR-53 | Audit-log view: "who changed what" with actor — "nothing, not even Kawan, can move your goalposts" shown, not asserted (§8.2)    | MUST                                               |

Remaining post-freeze SHOULDs after #7, lowest priority (spec §12.3): ⑧ Kokoro TTS upgrade · expression variety · mobile polish · calibration suggestions.

### 5.11 Non-Functional Requirements (product-level)

| ID     | Requirement                                                                                                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | **Demo determinism**: every demo beat fires from a manual trigger; `Check now`, demo clock, pre-staged second account (§12.5). No demo path depends on cron timing, closed-tab push, or live OAuth consent (pre-authorized account + recorded backup) |
| NFR-02 | **Privacy story is real**: TEE-only models (`confidential_compute` flag, not the name suffix); attestation linkable from UI; screenshots deleted post-verdict; tokens encrypted at rest; never use the data-opt-in proxy (§3.1, §9.3)                 |
| NFR-03 | **Voice latency**: mouth-to-ear <1 s with WebSpeech + streaming; ≤2.5 s on the full self-hosted path (§7.4)                                                                                                                                           |
| NFR-04 | **Resilience**: inline model failover on every LLM call; scheduler jobs rebuilt from DB at boot; `Check now` independent of cron; single FastAPI process, SQLite, no external brokers (§7.2, §12.4)                                                   |
| NFR-05 | **Compose→Start in under a minute** (O1 demo proof; with the demo intake cap of 3 questions)                                                                                                                                                          |
| NFR-06 | **Cost**: demo path bills the SIWC user's balance; dev usage front-loaded before Pro expiry 22 Jun; PAYG dev cost <$1/day after (§3.2)                                                                                                                |
| NFR-07 | **Repo hygiene**: progressive commits from day 1; adapted OSS visibly attributed in README + commits; Live2D assets gitignored with download script (§3.4, §4.4)                                                                                      |
| NFR-08 | **Desktop-first responsive PWA** on Chrome; no native app (A1)                                                                                                                                                                                        |

---

## 6. User Flows

### 6.1 State machine (spec §5.3)

```
draft --Start--> active --2 silent check-ins--> lapsed --user returns--> active
active|lapsed --deadline--> verifying
verifying --PASS--> completed --> habit loop, seed next
verifying --FAIL/UNCLEAR + grace available--> grace --PASS in 6h--> completed
                                              grace --expires--> missed
verifying --FAIL, no grace--> missed --> stake fires (if opted) + rebuild offer
```

Escalation (0/1/2) and on_track/slipping are derived, not states. Canonical week-in-the-life walkthrough incl. alternate paths (miss, lapse, boundary probe, unclear evidence, goalpost move, asleep-at-deadline): spec §6.

**Views** (spec §5.5) — single-page app; the **character stage is persistent on every view**; the context panel swaps:

| #   | View                   | Contents                                                                                                                                                                                                           |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | Landing / Sign-in      | One-line value prop · SIWC button · guest entry · first-run persona picker (FR-05)                                                                                                                                 |
| V2  | Onboarding wizard      | 3 steps in one stepper: Compose chips → Context chat → Plan review + Verification (3a) + Terms (3b); re-entered pre-filled for repeat/rebuild (FR-40, FR-46)                                                       |
| V3  | Home ("Commitment HQ") | Commitment sentence + countdown · status strip (escalation, skip-days, evidence type, 🔒 TEE badge) · roadmap card (advice) · timeline feed · `[Check now]` · `[Upload evidence]` — daily use; the demo lives here |
| V4  | Workspace chat         | V3 with the chat drawer open (voice/text) — a panel of Home, not a separate page (FR-31)                                                                                                                           |
| V5  | Momentum               | Dots calendar · titles · trust meter · history (FR-47)                                                                                                                                                             |
| V6  | Settings / account     | Persona switcher · Chutes balance · push toggle · stake contact book · logout                                                                                                                                      |
| O1  | Proposal card overlay  | AI-proposed hard-field change + `[Apply]/[Dismiss]` (FR-33)                                                                                                                                                        |
| O2  | Verdict card overlay   | Verdict + observations + reasoning + 🔒 attestation link (FR-27)                                                                                                                                                   |

### 6.2 Demo flow (the protected 5 minutes, spec §12.5)

| t    | Beat                                                                            | Backing FRs             |
| ---- | ------------------------------------------------------------------------------- | ----------------------- |
| 0:00 | Hook: "This is Kawan. It doesn't believe you."                                  | —                       |
| 0:25 | SIWC sign-in + 10-s persona pick; balance visible                               | FR-01..06               |
| 0:50 | Compose the real commitment                                                     | FR-12                   |
| 1:10 | Context chat, voice, 3 questions, slots fill on-screen                          | FR-14, FR-15            |
| 1:50 | Plan + Settings: roadmap, GitHub on the team's repo, stake ON                   | FR-17..20               |
| 2:20 | `Check now` fetches live commits, names one, reacts in character                | FR-21..24               |
| 2:50 | Screenshot → TEE vision verdict + reasoning + 🔒 badge                          | FR-25..27               |
| 3:20 | Demo-clock deadline → PASS → celebration, identity, momentum dot                | FR-37, FR-39, FR-44..47 |
| 3:50 | Dark path (pre-staged 2nd account): miss → stake email on 2nd screen → win-back | FR-40..42               |
| 4:30 | Close: 4 Chutes touchpoints + roadmap line                                      | G1                      |

---

## 7. Out of Scope (spec §12.3 ROADMAP — do not build)

- Monetary stakes (social/email stakes only)
- Additional evidence adapters beyond GitHub + screenshot (+ optional URL probe): no in-app camera capture (the §10.4 `[DECISION]` supersedes its Tier-0 listing), no Google Docs, Notion, Strava, YouTube, RSS, Todoist, etc. Never promise the dead ones: Google Fit, Goodreads, Instagram/TikTok, HealthKit (§10.4)
- GitHub OAuth / private repos
- Multi-commitment, auto-recurring commitments
- Crew / co-commitments / any leaderboard (§11.5 — leaderboards structurally fight the product)
- Native mobile, true echo-cancelled barge-in, retention features, agent frameworks (§4.5, §7.6-D2), production hosting

---

## 8. Open Questions & Product Risks

### 8.1 Open questions (spec §14 — each ≤1 day, resolve D1–D3)

| #   | Question                                                                                                   | Resolution                        |
| --- | ---------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Q1  | SIWC token authenticates against `llm.chutes.ai` exactly (vs `lm.`)?                                       | D1 spike, 1 h                     |
| Q2  | Pro tier covers all TEE models incl. Kimi-K2.6 (Base provably excludes some)?                              | D1 test call + subscription_usage |
| Q3  | Hero voice register (BM/English/Manglish mix?)                                                             | Team taste, D2–3                  |
| Q4  | Does `chutes:invoke` scope cover `/users/me` balance, or add `billing:read`?                               | D1 check                          |
| Q5  | (Optional courtesy) LiveroiD creator permission — risk already accepted; Haru-R/Hiyori are zero-risk swaps | Anytime                           |

Acted-on assumptions A1–A8 (desktop PWA, skip-days=1, grace=6 h, trivia<3, intake≤6 Q, screenshot≤8 MB, SMTP/Resend, SQLite, mascot trio incl. accepted LiveroiD terms risk, Docker voice on one machine): spec §14.

### 8.2 Top product risks (spec §2.2, §12.4)

| Risk                                                                      | Mitigation (where encoded)                                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Scope creep past the 5-min demo thread — the one thing that sinks it (§1) | Every decision subordinate to §12.5; MUST/SHOULD/OUT in this doc; D17 freeze                 |
| False rejection of honest evidence enrages users (H1)                     | INV-7 three-valued verdicts; demo shows clean paths only; pre-tested images, low temperature |
| Scope-boundary probe in judge Q&A (H2)                                    | Mechanical rule in prompt + refusal enum (FR-32); rehearse triggering it                     |
| First miss = peak churn (H3)                                              | Miss-recovery is MUST (FR-40) and the demo's emotional beat                                  |
| Demo-day flake: OAuth, vision nondeterminism, latency (H6)                | NFR-01: pre-authorized account, `Check now`, failover pairs, recorded backup                 |
| Check-in habituation by week 4–8 (H4)                                     | Out of 20-day scope; stated honestly in the video as the retention thesis                    |
| Live2D engine migration mid-build broke a 10k★ project's lip-sync (§4.3)  | Lock model + engine on D1; never migrate                                                     |

---

_Build order, team lanes, and verification gates: spec §12.1–12.2. Data model & API surface: spec §7.5, §8.1._
