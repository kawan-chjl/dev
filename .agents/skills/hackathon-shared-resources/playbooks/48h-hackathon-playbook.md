# 48-Hour Hackathon Playbook

**Duration:** 48 hours
**Philosophy:** The extra time is for depth, iteration, and pitch excellence — not for feature creep. Teams that use 48 hours wisely are dangerous competitors.

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

| Phase                          | Hours | %   |
| ------------------------------ | ----- | --- |
| Strategy & Scoping             | 4h    | 8%  |
| Core Implementation — Sprint 1 | 12h   | 25% |
| Iteration — Sprint 2           | 8h    | 17% |
| Demo & Presentation Polish     | 8h    | 17% |
| Testing & Validation           | 4h    | 8%  |
| Pitch & Submission             | 8h    | 17% |
| Buffer                         | 4h    | 8%  |

---

## Phases

### Phase 1: Strategy & Scoping (H+0 → H+4)

**Goal:** Deep problem understanding and confident, well-documented decisions.

| Hour   | Activity                                             | Skills to Load                                   | Milestone                    |
| ------ | ---------------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| H+0:00 | Read all track materials, sponsor briefs, and rubric | `hackathon-track-analyzer`                       | Full constraint map complete |
| H+0:45 | Problem space exploration; interview simulation      | `hackathon-problem-space`                        | 2 user segments defined      |
| H+1:30 | Generate 6–8 candidate ideas                         | `hackathon-idea-generator`                       | Idea list complete           |
| H+2:15 | Score and rank ideas; discuss as team                | `hackathon-idea-scoring`                         | Top 1 idea selected          |
| H+2:45 | Cut scope to MVP; write PRD                          | `hackathon-scope-cutter`, `hackathon-doc-writer` | PRD drafted                  |
| H+3:15 | Write task plan with parallel tracks                 | `hackathon-task-planner`                         | Task list ready              |
| H+3:45 | Identify wow moment; finalize demo flow              | `hackathon-wow-detector`                         | Demo flow locked             |
| H+4:00 | Write key ADRs for architecture decisions            | `hackathon-doc-writer`                           | Core ADRs written            |

**✅ Milestone: Scope locked, PRD and ADRs documented, task plan ready.**

---

### Phase 2: Core Implementation — Sprint 1 (H+4 → H+16)

**Goal:** Core mechanism, wow feature, and full demo flow working.

| Hour    | Activity                                   | Skills to Load               | Notes                      |
| ------- | ------------------------------------------ | ---------------------------- | -------------------------- |
| H+4:00  | Project setup: repo, scaffold, CI/CD basic | `hackathon-code-implementer` | Skip auth                  |
| H+5:00  | Data model and core API layer              | `hackathon-code-implementer` | Real DB, mock integrations |
| H+7:00  | Core mechanism implementation              | `hackathon-code-implementer` | The technical hard part    |
| H+9:00  | **Sprint 1 Checkpoint:** Core working?     | —                            | If NO: scope down          |
| H+10:00 | Wow feature implementation                 | `hackathon-code-implementer` | Must be real               |
| H+12:00 | Frontend: demo-path screens                | —                            | Functional, not polished   |
| H+14:00 | Integration: connect all layers            | —                            | Full stack wired           |
| H+15:00 | Demo flow E2E test                         | —                            | Run once cleanly           |
| H+16:00 | Seed demo data; prep test scenarios        | —                            | All demo inputs ready      |

**✅ Milestone: Full demo flow running at H+16.**

---

### Phase 3: Iteration — Sprint 2 (H+16 → H+24)

**Goal:** Improve depth, add one meaningful secondary feature, and handle edge cases in the demo path.

| Hour    | Activity                                           | Notes                                             |
| ------- | -------------------------------------------------- | ------------------------------------------------- |
| H+16:00 | Team review: what's weak in the demo?              | Honest audit                                      |
| H+17:00 | Improve core mechanism (quality pass)              | Make it faster, more impressive, or more reliable |
| H+19:00 | Replace top-priority mocks with real integrations  | Only those visible in the demo                    |
| H+21:00 | Add secondary feature #1 (if core is stable)       | Must appear in demo flow                          |
| H+23:00 | **Sprint 2 Checkpoint:** Is everything demo-ready? | If NO: revert secondary feature                   |
| H+24:00 | Sleep — mandatory                                  | Minimum 4 hours                                   |

**✅ Milestone: Improved, deeper demo at H+24. Team rested.**

---

### Phase 4: Demo & Presentation Polish (H+24 → H+32)

**Goal:** Professional-quality demo UX and visual presentation across all judge-facing surfaces.

| Hour    | Activity                                     | Skills to Load              | Notes                        |
| ------- | -------------------------------------------- | --------------------------- | ---------------------------- |
| H+24:00 | UI polish: all demo-path screens             | —                           | Look like a real product     |
| H+26:00 | UX review with a fresh set of eyes           | —                           | Optimize for first-time user |
| H+27:00 | Record demo video (draft version)            | `hackathon-demo-video`      | Review for wow moment timing |
| H+28:00 | Iterate: fix pacing, re-record weak segments | `hackathon-demo-video`      | Perfect the wow moment       |
| H+29:00 | Build pitch deck                             | `hackathon-pitchdeck`       | 8–10 slides                  |
| H+30:00 | **Demo freeze** — no more product changes    | —                           | Hard cutoff                  |
| H+31:00 | Record final demo video                      | `hackathon-demo-video`      | Upload as primary artifact   |
| H+32:00 | Write submission description                 | `hackathon-submission-prep` | All sections complete        |

**✅ Milestone: Demo frozen, video uploaded, pitch deck complete at H+32.**

---

### Phase 5: Testing & Validation (H+32 → H+36)

**Goal:** Eliminate any risk of demo failure during judging.

| Hour    | Activity                                              | Skills to Load              | Notes                               |
| ------- | ----------------------------------------------------- | --------------------------- | ----------------------------------- |
| H+32:00 | Generate full test checklist                          | `hackathon-test-generator`  | Focus on demo blockers              |
| H+33:00 | Run manual checks 3×; different team member each time | —                           | Identify human-error failure points |
| H+34:00 | Fix demo-blocking bugs only                           | —                           | No new features                     |
| H+35:00 | Validate submission: all links, video, repo, README   | `hackathon-submission-prep` | Checklist complete                  |
| H+36:00 | Submit to platform                                    | —                           | 12 hours before deadline            |

**✅ Milestone: Submitted at H+36 with all artifacts verified.**

---

### Phase 6: Pitch & Presentation (H+36 → H+44)

**Goal:** Rehearsed, confident pitch with pre-hardened Q&A responses.

| Hour    | Activity                                           | Skills to Load              | Notes                            |
| ------- | -------------------------------------------------- | --------------------------- | -------------------------------- |
| H+36:00 | Run judge simulation                               | `hackathon-judge-simulator` | Generate 8–10 hard questions     |
| H+37:00 | Draft answers to all judge questions               | —                           | Write down, don't just discuss   |
| H+38:00 | Rehearse pitch: full team, timed                   | —                           | First run: note rough spots      |
| H+39:00 | Refine slides and speaker notes                    | —                           | Fix clarity issues only          |
| H+40:00 | Rehearse pitch 2×                                  | —                           | Must hit time limit ±5 seconds   |
| H+41:00 | Full mock judging session                          | `hackathon-judge-simulator` | Simulate entire judging exchange |
| H+42:00 | Final pitch refinements                            | —                           | Minor language polish only       |
| H+43:00 | Rest                                               | —                           | Mandatory                        |
| H+44:00 | Confirmation: all links, accounts, and setup ready | —                           | Judging environment tested       |

**✅ Milestone: Pitch rehearsed 5+ times. All Q&A prepared.**

---

### Phase 7: Buffer (H+44 → H+48)

| Hour    | Activity                                              |
| ------- | ----------------------------------------------------- |
| H+44–45 | Final submission confirmation; screenshot for records |
| H+45–46 | Rest or light review of pitch notes                   |
| H+46–47 | Final pitch walkthrough (mental only)                 |
| H+47–48 | Show time                                             |

---

## Critical Rules for 48h Events

1. **Scope locked at H+4.** Additional time goes to depth and quality, not more features.
2. **Sleep at H+24 and again at H+43.** Two sleep windows are non-negotiable for a 48h event.
3. **Demo frozen at H+30.** Ten full hours of polish and pitch before deadline.
4. **Submit at H+36.** Twelve hours of buffer.
5. **Rehearse 5 or more times.** The 48h format allows for genuine pitch excellence. Use it.
6. **Sprint 2 (H+16–24) is for depth, not features.** Improve what exists before adding new things.

---

## Competitive Advantages in 48h Events

| Advantage                       | How to Capture It                       |
| ------------------------------- | --------------------------------------- |
| Deeper technical implementation | Use Sprint 2 to remove mocks            |
| Better UI/UX polish             | 48h allows a real design pass           |
| More confident pitch            | 5+ rehearsals vs. 2 in a 24h event      |
| Better Q&A preparation          | Full judge simulation session           |
| Richer submission               | Complete all optional submission fields |
| Sleep advantage                 | Rested teams outperform exhausted ones  |

---

## Emergency Cut Protocol

If behind schedule at Phase 3 checkpoint (H+23):

1. Revert secondary feature immediately
2. Freeze code at current state
3. Reallocate Sprint 2 remainder to demo polish
4. Move directly to Phase 4 ahead of schedule

If behind at Phase 5 (H+36):

1. Submit current state; stop fixing
2. Use remaining buffer for pitch rehearsal only
3. Frame "what's next" in pitch to cover missing features as roadmap items
