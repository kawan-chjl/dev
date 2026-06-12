# 36-Hour Hackathon Playbook

**Duration:** 36 hours
**Philosophy:** One extra cycle for depth. Use it for the wow feature and the pitch — not for scope expansion.

**Workflow reference:** [`hackathon-workflow.md`](hackathon-workflow.md)

**Key knowledge files:**

- [`hackathon-mvp-strategy.md`](../knowledge/hackathon-mvp-strategy.md) — scope cutting principles
- [`hackathon-common-failures.md`](../knowledge/hackathon-common-failures.md) — failure patterns to avoid
- [`hackathon-demo-psychology.md`](../knowledge/hackathon-demo-psychology.md) — how judges evaluate
- [`hackathon-tools.md`](../knowledge/hackathon-tools.md) — rapid development tools
- [`hackathon-reference-architecture.md`](../knowledge/hackathon-reference-architecture.md) — recommended stack architecture
- [`hackathon-pitchdeck-winning-pattern.md`](../knowledge/hackathon-pitchdeck-winning-pattern.md) — pitchdeck structure and rule of three
- [`hackathon-pitchdeck-design-with-react.md`](../knowledge/hackathon-pitchdeck-design-with-react.md) — React presentation deck design guide

---

## Time Budget Summary

| Phase                 | Hours | %   |
| --------------------- | ----- | --- |
| Strategy & Scoping    | 3h    | 8%  |
| Core Implementation   | 13h   | 36% |
| Demo Wiring & Polish  | 6h    | 17% |
| Integration & Testing | 4h    | 11% |
| Pitch & Presentation  | 6h    | 17% |
| Buffer (debug, misc)  | 4h    | 11% |

---

## Phases

### Phase 1: Strategy & Scoping (H+0 → H+3)

**Goal:** Thorough track analysis and confident idea selection before any implementation.

| Hour   | Activity                                        | Skills to Load                                     | Milestone                       |
| ------ | ----------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| H+0:00 | Read track, sponsor briefs, and judging rubric  | `hackathon-track-analyzer`                         | Constraints and criteria mapped |
| H+0:45 | Map problem space; identify top 2 user segments | `hackathon-problem-space`                          | Problem statement written       |
| H+1:30 | Generate 5 candidate ideas                      | `hackathon-idea-generator`                         | Idea list complete              |
| H+2:00 | Score and rank ideas; select top 1              | `hackathon-idea-scoring`                           | Idea locked                     |
| H+2:30 | Cut scope to MVP; build task plan               | `hackathon-scope-cutter`, `hackathon-task-planner` | Task list ready                 |
| H+3:00 | Identify wow moment; document demo flow         | `hackathon-wow-detector`                           | Demo flow locked                |

**✅ Milestone: Scope locked at H+3. Key docs drafted.**

---

### Phase 2: Core Implementation — Sprint 1 (H+3 → H+12)

**Goal:** Core mechanism working and wow feature live.

| Hour    | Activity                                    | Skills to Load               | Notes                         |
| ------- | ------------------------------------------- | ---------------------------- | ----------------------------- |
| H+3:00  | Project scaffold, repo, environment         | `hackathon-code-implementer` | CI optional; skip auth        |
| H+4:00  | Implement data model and core API           | `hackathon-code-implementer` | Mock external calls first     |
| H+6:00  | Implement core mechanism                    | `hackathon-code-implementer` | The thing that makes it work  |
| H+8:00  | **Checkpoint:** Core mechanism working?     | —                            | If NO: simplify and continue  |
| H+9:00  | Implement wow feature                       | `hackathon-code-implementer` | Must be real, not faked       |
| H+11:00 | Basic frontend scaffolding for demo screens | —                            | Functional, not beautiful yet |
| H+12:00 | Connect frontend to backend                 | —                            | Wired end-to-end              |

**✅ Milestone: Core mechanism + wow feature working at H+12.**

---

### Phase 3: Core Implementation — Sprint 2 (H+12 → H+16)

**Goal:** Demo flow complete and secondary features wired.

| Hour    | Activity                                                      | Notes                       |
| ------- | ------------------------------------------------------------- | --------------------------- |
| H+12:00 | Wire full demo flow end-to-end                                | Every step runnable         |
| H+13:00 | Replace hardcoded mocks with real integrations where feasible | Prioritize demo-path calls  |
| H+14:00 | Add one secondary feature (if time allows)                    | Only if demo path is stable |
| H+15:00 | Load seed data for demo                                       | All test scenarios prepared |
| H+16:00 | Run demo flow 3× end-to-end                                   | Identify and fix blockers   |

**✅ Milestone: Full demo flow running reliably at H+16.**

---

### Phase 4: Demo Wiring & Polish (H+16 → H+22)

**Goal:** Demo-quality UX on every screen judges will see.

| Hour    | Activity                                        | Skills to Load         | Notes                         |
| ------- | ----------------------------------------------- | ---------------------- | ----------------------------- |
| H+16:00 | UI polish pass on all demo-path screens         | —                      | Look finished                 |
| H+18:00 | UX review: can a non-team-member use it in 30s? | —                      | Remove friction               |
| H+19:00 | Record demo video (first version)               | `hackathon-demo-video` | Upload as backup              |
| H+20:00 | Final UI refinements based on video review      | —                      | Only demo-path screens        |
| H+21:00 | Demo freeze: no more code changes               | —                      | Hard stop                     |
| H+22:00 | Record final demo video                         | `hackathon-demo-video` | Upload and link in submission |

**✅ Milestone: Demo video uploaded and demo frozen at H+22.**

---

### Phase 5: Integration & Testing (H+22 → H+26)

**Goal:** Confidence that the demo will not fail during judging.

| Hour    | Activity                                   | Skills to Load              | Notes                           |
| ------- | ------------------------------------------ | --------------------------- | ------------------------------- |
| H+22:00 | Generate test checklist; run manual checks | `hackathon-test-generator`  | Focus on demo blockers          |
| H+23:00 | Run demo 5× from a clean state             | —                           | Different team member each time |
| H+24:00 | Fix any demo-blocking bugs                 | —                           | No new features                 |
| H+25:00 | Validate all submission artifacts          | `hackathon-submission-prep` | Repo, README, video, URL        |
| H+26:00 | Submit to platform                         | —                           | 10 hours before deadline        |

**✅ Milestone: Submitted and demo stable at H+26.**

---

### Phase 6: Pitch & Presentation (H+26 → H+32)

**Goal:** Polished pitch with judge-hardened Q&A preparation.

| Hour    | Activity                          | Skills to Load              | Notes                                |
| ------- | --------------------------------- | --------------------------- | ------------------------------------ |
| H+26:00 | Build pitch deck                  | `hackathon-pitchdeck`       | 7–9 slides                           |
| H+28:00 | Write full submission description | `hackathon-submission-prep` | All sections complete                |
| H+29:00 | Run judge simulation              | `hackathon-judge-simulator` | Get 5 hard questions with answers    |
| H+30:00 | Rehearse pitch 3×; time each run  | —                           | Must match time limit ±10s           |
| H+31:00 | Refine based on rehearsal         | —                           | Slide edits only; no product changes |
| H+32:00 | Final rehearsal; rest             | —                           | Mandatory sleep before judging       |

**✅ Milestone: Pitch rehearsed 4+ times. Submission complete.**

---

### Phase 7: Buffer (H+32 → H+36)

| Hour    | Activity                          |
| ------- | --------------------------------- |
| H+32–33 | Confirm all submission links work |
| H+33–35 | Rest                              |
| H+35–36 | Final mental walkthrough of pitch |

---

## Critical Rules for 36h Events

1. **Scope locked at H+3.** The 12 extra hours vs. a 24h event go to depth, not breadth.
2. **Demo frozen at H+21.** Polish yes; new features no.
3. **Submit at H+26 minimum.** Ten hours before the deadline.
4. **Rehearse the pitch at least 4 times.** The extra time makes this possible — use it.
5. **Sleep.** At minimum 4 hours. Fatigued pitches lose to rested pitches.

---

## Emergency Cut Protocol

If behind schedule at Phase 3 checkpoint (H+16):

1. Drop secondary features entirely
2. Mock any non-demo-path integration
3. Reduce demo flow to 3 steps maximum
4. Reallocate freed time to polish and pitch

If behind at Phase 5 checkpoint (H+26):

1. Accept current bug state; stop fixing
2. Record a polished video walkthrough as the primary demo artifact
3. Focus 100% on pitch quality
