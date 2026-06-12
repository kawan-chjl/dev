# Hackathon Workflow Orchestration

Defines the recommended skill execution order for a complete hackathon project lifecycle. Use this as the master orchestration guide when running the devkit end-to-end.

---

## Workflow Diagram

```
[URL] → Event Parsing → Team Setup & Recruiting → Track Understanding → Idea Development → Scope Definition → Risk Analysis → Project Planning
                                                                                                                               ↓
                                   Post-Mortem ← Submission ← Deployment Prep ← Evaluation ← Demo Preparation ← Build
```

---

## Phase → Skill Mapping Reference

| Phase                      | Skills                                                                                                                                                                                  | Mode                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **0. Event Parsing**       | `hackathon-event-parser`                                                                                                                                                                | Once; autonomous entry point                             |
| **0.5. Team Setup**        | `hackathon-team-recruiter` OR `hackathon-role-allocator`                                                                                                                                | Based on team status; run before track selection         |
| **1. Track Understanding** | `hackathon-track-analyzer`                                                                                                                                                              | Once; feeds all downstream phases                        |
| **2. Idea Development**    | `hackathon-problem-space` → `hackathon-idea-generator` → `hackathon-idea-scoring`                                                                                                       | Sequential                                               |
| **3. Scope Definition**    | `hackathon-scope-cutter` → `hackathon-wow-detector`                                                                                                                                     | Sequential                                               |
| **4. Project Planning**    | `hackathon-risk-analyzer` + `hackathon-doc-writer` + `hackathon-task-planner`                                                                                                           | Risk first, then parallel                                |
| **5. Build**               | `hackathon-repo-bootstrap` → `hackathon-git-master` → `hackathon-sponsor-integrator` → `hackathon-mock-data-generator` → `hackathon-code-implementer` (×N) → `hackathon-test-generator` | Sequential; `hackathon-milestone-monitor` at checkpoints |
| **6. Demo Preparation**    | `hackathon-demo-script` + `hackathon-demo-video` + `hackathon-pitchdeck`                                                                                                                | Parallel after code freeze                               |
| **7. Evaluation**          | `judge-simulator`                                                                                                                                                                       | Once; re-invoke after pitch edits                        |
| **8. Deployment Prep**     | `hackathon-deployment-prep`                                                                                                                                                             | Once; after demo is validated                            |
| **9. Submission**          | `hackathon-submission-prep`                                                                                                                                                             | Once; 1h before deadline minimum                         |
| **10. Post-Mortem**        | `hackathon-post-mortem`                                                                                                                                                                 | Once; run after event ends to secure assets              |

---

## Phase Overview

| Phase                  | Skills                                                                                                                                                                             | Gate Condition                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 0. Event Parsing       | `hackathon-event-parser`                                                                                                                                                           | Event metadata, tracks, and criteria extracted from URL                                  |
| 0.5. Team Setup        | `hackathon-team-recruiter` or `hackathon-role-allocator`                                                                                                                           | Roles allocated and/or missing teammates recruited                                       |
| 1. Track Understanding | `hackathon-track-analyzer`                                                                                                                                                         | Constraints and evaluation axes confirmed                                                |
| 2. Idea Development    | `hackathon-problem-space` → `hackathon-idea-generator` → `hackathon-idea-scoring`                                                                                                  | Top idea selected and committed                                                          |
| 3. Scope Definition    | `hackathon-scope-cutter` → `hackathon-wow-detector`                                                                                                                                | MVP and demo flow locked                                                                 |
| 4. Project Planning    | `hackathon-risk-analyzer` → `hackathon-doc-writer` + `hackathon-task-planner`                                                                                                      | All critical risks mitigated; task list with estimates ready                             |
| 5. Build               | `hackathon-repo-bootstrap` → `hackathon-git-master` → `hackathon-sponsor-integrator` → `hackathon-mock-data-generator` → `hackathon-code-implementer` → `hackathon-test-generator` | Demo runs end-to-end; `hackathon-milestone-monitor` confirms progress at each checkpoint |
| 6. Demo Preparation    | `hackathon-demo-script` + `hackathon-demo-video` + `hackathon-pitchdeck`                                                                                                           | Script rehearsed; video uploaded; slides ready                                           |
| 7. Evaluation          | `hackathon-judge-simulator`                                                                                                                                                        | Q&A prepared, pitch refined                                                              |
| 8. Deployment Prep     | `hackathon-deployment-prep`                                                                                                                                                        | All go/no-go criteria pass; fallback plan confirmed                                      |
| 9. Submission          | `hackathon-submission-prep`                                                                                                                                                        | All artifacts submitted                                                                  |
| 10. Post-Mortem        | `hackathon-post-mortem`                                                                                                                                                            | Cloud instances paused, secrets scrubbed, public README built                            |

---

## Phase 0: Event Parsing _(Autonomous Pipeline Entry Point)_

**Objective:** Extract all hackathon event data from a URL so downstream skills receive structured input.

**Skills:**

- [`hackathon-event-parser`](../../hackathon-event-parser/SKILL.md) — Fetch and parse event page.

---

## Phase 0.5: Team Setup

**Objective:** Set up roles for current teammates or recruit missing technical expertise before commit milestones.

**Skills:**

- [`hackathon-team-recruiter`](../../hackathon-team-recruiter/SKILL.md) — Run if the team is incomplete or needs specific sponsor technology skills. Writes social recruitment messages.
- [`hackathon-role-allocator`](../../hackathon-role-allocator/SKILL.md) — Run once the team is formed. Allocates ownership of frontend, backend, design, AI, and pitch based on skill profiles.

---

## Phase 1: Track Understanding

**Objective:** Extract the judging environment before generating any ideas.

**Skills:**

- [`hackathon-track-analyzer`](../../hackathon-track-analyzer/SKILL.md) — Parse track description, sponsor briefs, and rubrics.

---

## Phase 2: Idea Development

**Objective:** Systematically generate and select the best project idea.

**Skills (run in sequence):**

1. [`hackathon-problem-space`](../../hackathon-problem-space/SKILL.md) — Map target users and pain points.
2. [`hackathon-idea-generator`](../../hackathon-idea-generator/SKILL.md) — Produce candidate ideas.
3. [`hackathon-idea-scoring`](../../hackathon-idea-scoring/SKILL.md) — Score and rank ideas.

---

## Phase 3: Scope Definition

**Objective:** Reduce the idea to a shippable MVP and identify the wow moment.

**Skills (run in sequence):**

1. [`hackathon-scope-cutter`](../../hackathon-scope-cutter/SKILL.md) — Cut features; define demo flow and time budget.
2. [`hackathon-wow-detector`](../../hackathon-wow-detector/SKILL.md) — Identify and amplify the primary wow moment.

---

## Phase 4: Project Planning

**Objective:** Identify and mitigate risks, document decisions, and sequence work into executable tasks.

**Skills:**

1. [`hackathon-risk-analyzer`](../../hackathon-risk-analyzer/SKILL.md) — Identify technical and demo risks.
2. [`hackathon-doc-writer`](../../hackathon-doc-writer/SKILL.md) — Generate PRD and key ADRs.
3. [`hackathon-task-planner`](../../hackathon-task-planner/SKILL.md) — Decompose MVP into tasks.

---

## Phase 5: Build

**Objective:** Scaffold the project, enforce git structure, integrate sponsor APIs, load seed data, code features, and monitor progress.

**Skills:**

1. [`hackathon-repo-bootstrap`](../../hackathon-repo-bootstrap/SKILL.md) — Scaffold project files and environment templates.
2. [`hackathon-git-master`](../../hackathon-git-master/SKILL.md) — Set up rapid collaboration workflow (trunk-based development) and diagnose merge conflicts.
3. [`hackathon-sponsor-integrator`](../../hackathon-sponsor-integrator/SKILL.md) — Integrate sponsor SDKs/APIs quickly using minimal boilerplate examples.
4. [`hackathon-mock-data-generator`](../../hackathon-mock-data-generator/SKILL.md) — Generate realistic seed/mock data aligned to the demo flow (warns if mock data is forbidden by rules).
5. [`hackathon-code-implementer`](../../hackathon-code-implementer/SKILL.md) — Drive implementation of individual tasks.
6. [`hackathon-milestone-monitor`](../../hackathon-milestone-monitor/SKILL.md) — Monitor progress at 25/50/75/90% checkpoints.
7. [`hackathon-test-generator`](../../hackathon-test-generator/SKILL.md) — Generate demo-protecting test cases.

---

## Phase 6: Demo Preparation

**Objective:** Produce the live demo script, demo video, and pitch deck (React-based or traditional).

**Skills:**

- [`hackathon-demo-script`](../../hackathon-demo-script/SKILL.md) — Generate narrative with timing indicators (`estimated_duration_seconds`).
- [`hackathon-demo-video`](../../hackathon-demo-video/SKILL.md) — Script and time a recorded video.
- [`hackathon-pitchdeck`](../../hackathon-pitchdeck/SKILL.md) — Construct slide layouts and content. Generates interactive React slide components when requested.

---

## Phase 7: Evaluation

**Objective:** Simulate judging and harden the pitch against adversarial questions.

**Skills:**

- [`hackathon-judge-simulator`](../../hackathon-judge-simulator/SKILL.md) — Generate Q&A responses and score predictions.

---

## Phase 8: Deployment Prep

**Objective:** Validate deployment targets, check go/no-go status, and finalize fallback plans.

**Skills:**

- [`hackathon-deployment-prep`](../../hackathon-deployment-prep/SKILL.md) — Run deployment validations.

---

## Phase 9: Submission

**Objective:** Compile and validate all final submission artifacts.

**Skills:**

- [`hackathon-submission-prep`](../../hackathon-submission-prep/SKILL.md) — Build submission page description and verify checklist.

---

## Phase 10: Post-Mortem

**Objective:** Safeguard developer credentials, clean up paid instances, and build a public portfolio.

**Skills:**

- [`hackathon-post-mortem`](../../hackathon-post-mortem/SKILL.md) — Pause databases, scrub exposed API keys from history, and draft a public-facing README.

---

## Skill Dependency Map

```
hackathon-event-parser  [Phase 0 — optional autonomous entry]
    └── hackathon-team-recruiter / hackathon-role-allocator [Phase 0.5 — NEW]
            └── hackathon-track-analyzer  [Phase 1]
                    ├── hackathon-problem-space
                    │       └── hackathon-idea-generator
                    │               └── hackathon-idea-scoring
                    │                       └── hackathon-scope-cutter
                    │                               ├── hackathon-wow-detector
                    │                               ├── hackathon-risk-analyzer
                    │                               ├── hackathon-doc-writer
                    │                               ├── hackathon-task-planner
                    │                               │       └── hackathon-repo-bootstrap
                    │                               │               └── hackathon-git-master [NEW]
                    │                               │                       ├── hackathon-sponsor-integrator [NEW]
                    │                               │                       └── hackathon-mock-data-generator [NEW]
                    │                               │                               └── hackathon-code-implementer (×N)
                    │                               │                                       ├── hackathon-milestone-monitor (×N)
                    │                               │                                       └── hackathon-test-generator
                    │                               ├── hackathon-demo-script (with timing)
                    │                               ├── hackathon-demo-video
                    │                               └── hackathon-pitchdeck (with React slides option)
                    │                                       └── hackathon-judge-simulator
                    │                                               └── hackathon-deployment-prep
                    │                                                       └── hackathon-submission-prep
                    │                                                               └── hackathon-post-mortem [NEW]
```
