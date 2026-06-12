---
name: hackathon-deployment-prep
description: >-
  Generate a deployment readiness checklist, demo environment plan, and fallback strategy to ensure the project can be safely demonstrated during judging.
---

# hackathon-deployment-prep

## Goal

Ensure the project is reliably deployed and demo-ready before judging begins, by generating a deployment checklist, validating the demo environment, loading test data, and defining a fallback plan for every critical failure scenario.

---

## Trigger Conditions

Use this skill when:

- Implementation is complete and the demo path runs end-to-end
- The project is being deployed to a cloud platform (Vercel, Render, Railway, etc.) for the first time
- The team needs to validate the demo environment before judging
- A rehearsal has revealed instability in the demo path
- Invoked during Phase 8 (Delivery), after `hackathon-test-generator` and before `hackathon-submission-prep`; re-invoke after any deployment change

---

## Inputs

| Input                      | Type     | Required | Description                                              |
| -------------------------- | -------- | -------- | -------------------------------------------------------- |
| `project_title`            | string   | Yes      | Name of the project                                      |
| `mvp_demo_flow`            | object[] | Yes      | Demo steps from `hackathon-scope-cutter`                 |
| `tech_stack`               | string[] | Yes      | Technologies in use                                      |
| `deployment_targets`       | object[] | Yes      | Frontend and backend platform details                    |
| `demo_blockers`            | object[] | No       | Known failure scenarios from `hackathon-test-generator`  |
| `demo_environment`         | string   | No       | Where the demo runs (e.g., browser, mobile, CLI, Vercel) |
| `judging_format`           | string   | No       | `live_demo`, `video_only`, or `both` (default: `both`)   |
| `deadline_hours_remaining` | number   | No       | Hours until submission deadline                          |

---

## Outputs

| Output                  | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `deployment_checklist`  | Ordered list of deployment validation steps with pass/fail criteria  |
| `demo_environment_plan` | Complete environment setup required for a stable demo                |
| `demo_data_setup`       | Test data and state required to run the demo flow from a clean start |
| `fallback_plan`         | Tiered fallback strategy for each critical failure scenario          |
| `go_no_go_criteria`     | Conditions that must all be true before the team presents            |
| `recommended_skills`    | Suggested next skills to invoke                                      |

---

## Rules

1. `deployment_checklist` must be executable in order from a fresh machine or cloud shell.
2. Every item in `mvp_demo_flow` must have a corresponding `demo_data_setup` entry.
3. Every item in `demo_blockers` must have a corresponding `fallback_plan` entry.
4. `go_no_go_criteria` must be binary pass/fail — no partial states.
5. If `judging_format` includes `live_demo`, a screen recording fallback is mandatory.
6. Flag any deployment step that requires >15 minutes as `[TIME-RISK]`.
7. `demo_environment_plan` must specify exact browser, zoom level, window layout, and test account state.

---

## Output Format

```yaml
deployment_checklist:
  - id: 'DC-<number>'
    step: '<what to do>'
    platform: '<Vercel|Render|Railway|local|all>'
    pass_condition: '<what success looks like>'
    time_risk: <true|false>
    estimated_minutes: <number>

demo_environment_plan:
  browser: '<browser name and version>'
  zoom_level: '<percentage>'
  window_layout: '<description of screen layout>'
  demo_account: '<account/user state>'
  pre_loaded_data: '<what must exist before demo starts>'
  notifications: 'disabled'
  additional_notes:
    - '<note>'

demo_data_setup:
  - demo_flow_step: <number>
    required_state: '<what must be true in the system>'
    setup_command: '<command or action to create this state>'

fallback_plan:
  - scenario: '<failure scenario>'
    trigger: '<when to invoke this fallback>'
    action: '<what to do>'
    asset_required: '<pre-recorded video|static slide|mock data|none>'

go_no_go_criteria:
  - criterion: '<condition>'
    status: '<PASS|FAIL|NOT_CHECKED>'

recommended_skills:
  - '<skill-name>'
```

---

## Example

**Input:**

```yaml
project_title: 'AnchorAI'
mvp_demo_flow:
  - step: 1
    action: "User types 'I'm feeling overwhelmed today'"
    outcome: 'AI responds empathetically'
  - step: 2
    action: 'User describes recurring work stress'
    outcome: "AI references last week's conversation from memory"
  - step: 3
    action: 'User expresses hopelessness'
    outcome: 'Crisis resource card appears'
tech_stack: ['Next.js', 'FastAPI', 'Supabase', 'Groq']
deployment_targets:
  - role: 'frontend'
    platform: 'Vercel'
    url: 'https://anchorai.vercel.app'
  - role: 'backend'
    platform: 'Render'
    url: 'https://anchorai-api.onrender.com'
demo_blockers:
  - scenario: 'Groq API rate limit hit during demo'
    mitigation: 'Pre-recorded screen capture'
  - scenario: 'Render cold start delays response by 30s'
    mitigation: 'Warm-up ping at start'
judging_format: 'both'
deadline_hours_remaining: 3
```

**Output:**

```yaml
deployment_checklist:
  - id: 'DC-01'
    step: 'Verify Render backend is deployed and /health endpoint returns HTTP 200'
    platform: 'Render'
    pass_condition: 'curl https://anchorai-api.onrender.com/health returns {"status": "ok"}'
    time_risk: false
    estimated_minutes: 2
  - id: 'DC-02'
    step: 'Verify Vercel frontend is deployed and loads without console errors'
    platform: 'Vercel'
    pass_condition: 'https://anchorai.vercel.app loads; browser console has zero errors'
    time_risk: false
    estimated_minutes: 3
  - id: 'DC-03'
    step: 'Warm up Render instance by sending 3 chat requests and verifying sub-3s response time'
    platform: 'Render'
    pass_condition: 'All 3 responses received in under 3 seconds'
    time_risk: false
    estimated_minutes: 5
  - id: 'DC-04'
    step: "Load demo session history into Supabase for user_id='demo' containing 'exam stress' phrase"
    platform: 'all'
    pass_condition: "GET /memory?user_id=demo returns non-empty summary containing 'exam stress'"
    time_risk: false
    estimated_minutes: 5
  - id: 'DC-05'
    step: 'Run full demo flow end-to-end 3 times from a clean session state'
    platform: 'all'
    pass_condition: 'All 3 runs complete without error; wow moment (memory recall) triggers consistently'
    time_risk: true
    estimated_minutes: 20

demo_environment_plan:
  browser: 'Chrome (latest stable)'
  zoom_level: '125%'
  window_layout: 'Full-screen browser, chat interface centred, no other tabs visible'
  demo_account: "user_id='demo'; 1 prior session loaded in Supabase with 'exam stress' content"
  pre_loaded_data: "Supabase 'sessions' table contains row for user_id='demo' with summary field populated"
  notifications: 'disabled'
  additional_notes:
    - 'Disable OS notifications in System Settings before demo'
    - 'Close all other applications; only browser open'
    - 'Have pre-recorded fallback video open in a minimized tab'

demo_data_setup:
  - demo_flow_step: 1
    required_state: "Empty chat interface; user_id='demo' session loaded in Supabase"
    setup_command: "python scripts/seed_demo.py --user demo --summary 'User was anxious about exam stress last week'"
  - demo_flow_step: 2
    required_state: 'Prior session summary accessible via /memory endpoint'
    setup_command: "curl https://anchorai-api.onrender.com/memory?user_id=demo — verify response contains 'exam stress'"
  - demo_flow_step: 3
    required_state: 'Crisis keyword detection active (no config change needed)'
    setup_command: 'No setup required; crisis card is triggered by keyword matching in chat router'

fallback_plan:
  - scenario: 'Groq API rate limit hit during demo'
    trigger: 'Chat response takes >5 seconds or returns error'
    action: 'Switch to pre-recorded screen capture tab; narrate over the video'
    asset_required: 'pre-recorded video'
  - scenario: 'Render cold start delays response by 30s'
    trigger: 'First chat request takes >10 seconds'
    action: "Say 'Let me load the warm session' — switch to pre-warmed local fallback or cached response"
    asset_required: 'mock data'
  - scenario: 'Supabase unavailable; memory not retrieved'
    trigger: 'AI response does not reference prior session context'
    action: "Acknowledge gracefully: 'Memory is loading from the database' — continue with mocked recall line"
    asset_required: 'none'

go_no_go_criteria:
  - criterion: 'Backend /health returns HTTP 200'
    status: 'NOT_CHECKED'
  - criterion: 'Frontend loads without console errors'
    status: 'NOT_CHECKED'
  - criterion: 'Demo session data loaded in Supabase'
    status: 'NOT_CHECKED'
  - criterion: 'Memory recall (wow moment) triggers in 3 of 3 test runs'
    status: 'NOT_CHECKED'
  - criterion: 'Crisis card appears on hopelessness message'
    status: 'NOT_CHECKED'
  - criterion: 'Pre-recorded fallback video is accessible in minimised tab'
    status: 'NOT_CHECKED'
  - criterion: 'Groq API key active and rate limit verified'
    status: 'NOT_CHECKED'

recommended_skills:
  - 'hackathon-submission-prep'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-demo-patterns.md`
- `../hackathon-shared-resources/knowledge/hackathon-common-failures.md`
- `../hackathon-shared-resources/knowledge/hackathon-submission-guidelines.md`
- `../hackathon-shared-resources/knowledge/hackathon-demo-psychology.md`

### Templates

- `../hackathon-shared-resources/templates/demo-script-template.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
- `../hackathon-shared-resources/playbooks/24h-hackathon-playbook.md`
- `../hackathon-shared-resources/playbooks/36h-hackathon-playbook.md`
- `../hackathon-shared-resources/playbooks/48h-hackathon-playbook.md`
