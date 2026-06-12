# 24-Hour Hackathon Playbook

**Duration:** 24 hours
**Philosophy:** Ruthless scope cuts. One wow moment. Demo-first.

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
| Strategy & Scoping    | 2h    | 8%  |
| Core Implementation   | 9h    | 38% |
| Demo Wiring & Polish  | 4h    | 17% |
| Integration & Testing | 2h    | 8%  |
| Pitch & Presentation  | 4h    | 17% |
| Buffer (debug, misc)  | 3h    | 12% |

---

## Phases

### Phase 1: Strategy & Scoping (H+0 → H+2)

**Goal:** Lock the idea and scope before writing a single line of code.

| Hour   | Activity                               | Skills to Load                                       | Milestone                 |
| ------ | -------------------------------------- | ---------------------------------------------------- | ------------------------- |
| H+0:00 | Read track + sponsor briefs thoroughly | `hackathon-track-analyzer`                           | Track analysis complete   |
| H+0:30 | Map problem space                      | `hackathon-problem-space`                            | Problem statement defined |
| H+1:00 | Generate and score ideas               | `hackathon-idea-generator`, `hackathon-idea-scoring` | Top idea selected         |
| H+1:30 | Cut scope to MVP + create task plan    | `hackathon-scope-cutter`, `hackathon-task-planner`   | Task list ready           |
| H+2:00 | Identify wow moment                    | `hackathon-wow-detector`                             | Demo flow locked          |

**✅ Milestone: Scope is locked. No new features after H+2.**

---

### Phase 2: Core Implementation (H+2 → H+11)

**Goal:** Build the demo path and the wow feature. Nothing else.

| Hour    | Activity                                   | Skills to Load               | Notes                    |
| ------- | ------------------------------------------ | ---------------------------- | ------------------------ |
| H+2:00  | Set up project scaffold                    | `hackathon-code-implementer` | Repo, env, base routes   |
| H+3:00  | Implement core mechanism                   | `hackathon-code-implementer` | The hard technical part  |
| H+6:00  | **Checkpoint:** Is core mechanism working? | —                            | If NO: cut scope further |
| H+7:00  | Implement wow feature                      | `hackathon-code-implementer` | Must be live, not mocked |
| H+9:00  | Wire demo flow end-to-end                  | —                            | All steps runnable       |
| H+11:00 | Basic UI pass on demo path only            | —                            | No off-path screens      |

**✅ Milestone: Demo runs end-to-end at H+11.**

---

### Phase 3: Demo Wiring & Polish (H+11 → H+15)

**Goal:** Make the demo impressive and reliable.

| Hour    | Activity                                  | Skills to Load             | Notes                             |
| ------- | ----------------------------------------- | -------------------------- | --------------------------------- |
| H+11:00 | Seed demo data                            | —                          | Pre-load all test scenarios       |
| H+12:00 | UI polish on demo screens                 | —                          | Look finished, not scaffolded     |
| H+13:00 | Run demo 5 times; identify failure points | `hackathon-test-generator` | Fix blockers only                 |
| H+14:00 | Record demo video                         | `hackathon-demo-video`     | Upload immediately                |
| H+15:00 | Final demo freeze                         | —                          | No more code changes to demo path |

**✅ Milestone: Demo recorded and uploaded at H+15.**

---

### Phase 4: Integration & Testing (H+15 → H+17)

**Goal:** Ensure the demo will not crash during judging.

| Hour    | Activity                             | Skills to Load             | Notes                  |
| ------- | ------------------------------------ | -------------------------- | ---------------------- |
| H+15:00 | Run all manual checks from test plan | `hackathon-test-generator` | Focus on demo blockers |
| H+16:00 | Fix demo-blocking bugs only          | —                          | Do not refactor        |
| H+17:00 | Final end-to-end demo run            | —                          | Must be clean          |

**✅ Milestone: Demo is stable and reliable.**

---

### Phase 5: Pitch & Presentation (H+17 → H+21)

**Goal:** Build a compelling pitch and complete the submission.

| Hour    | Activity                         | Skills to Load              | Notes                  |
| ------- | -------------------------------- | --------------------------- | ---------------------- |
| H+17:00 | Build pitch deck                 | `hackathon-pitchdeck`       | 6–8 slides max         |
| H+18:30 | Simulate judge Q&A               | `hackathon-judge-simulator` | Prepare 5 hard answers |
| H+19:30 | Write submission description     | `hackathon-submission-prep` | All fields complete    |
| H+20:00 | Submit to platform               | —                           | At least 1 hour early  |
| H+20:30 | Rehearse pitch 3×; time each run | —                           | Must hit time limit    |
| H+21:00 | Sleep if possible                | —                           | Mandatory              |

**✅ Milestone: Submitted and pitch rehearsed.**

---

### Phase 6: Buffer (H+21 → H+24)

**Goal:** Final polish, emergency fixes, rest.

| Hour    | Activity                                   |
| ------- | ------------------------------------------ |
| H+21–22 | Final submission review; confirm artifacts |
| H+22–23 | Practice pitch once more                   |
| H+23–24 | Rest or final emergency fixes only         |

---

## Critical Rules for 24h Events

1. **Lock scope at H+2.** No exceptions.
2. **Demo path is frozen at H+15.** No new code on demo screens after this.
3. **Submit at H+20 minimum.** Never submit in the final 30 minutes.
4. **No auth, no admin panels, no settings.** They are never in scope.
5. **If the core mechanism isn't working at H+6, cut to a simpler mechanism.**

---

## Emergency Cut Protocol

If behind schedule at any checkpoint, cut in this order:

1. Remove secondary features from demo
2. Replace live API calls with mocked responses
3. Replace dynamic data with hardcoded demo data
4. Simplify UI to a single-page flow
5. Replace live demo with recorded video
