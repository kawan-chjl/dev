---
name: hackathon-demo-script
description: >-
  Generate a clear 60–90 second demo narrative with step-by-step flow, spoken lines, and highlighted wow moments for hackathon presentations.
---

# hackathon-demo-script

## Goal

Generate a rehearsable 60–90 second demo narrative for a hackathon presentation, including step-by-step demo flow, spoken lines per step, and explicit staging of the primary wow moment for maximum judge impact.

---

## Trigger Conditions

Use this skill when:

- The MVP demo flow is implemented and stable
- A live presentation demo script is needed (distinct from a recorded video script)
- The presenter needs spoken lines and transition cues for a live demo
- The team must rehearse a consistent narrative before judging
- Invoked during Phase 6 (Demo Preparation), in parallel with `hackathon-pitchdeck`; complements `hackathon-demo-video` for live presentation use

---

## Inputs

| Input                   | Type     | Required | Description                                                     |
| ----------------------- | -------- | -------- | --------------------------------------------------------------- |
| `project_title`         | string   | Yes      | Name of the project                                             |
| `tagline`               | string   | Yes      | One-sentence project description                                |
| `problem_statement`     | string   | Yes      | The problem being solved                                        |
| `mvp_demo_flow`         | object[] | Yes      | Demo steps from `hackathon-scope-cutter`                        |
| `primary_wow_moment`    | string   | Yes      | The single most impressive moment from `hackathon-wow-detector` |
| `target_user`           | string   | Yes      | Primary user segment                                            |
| `evaluation_axes`       | object[] | Yes      | Judging criteria from `hackathon-track-analyzer`                |
| `demo_duration_seconds` | integer  | No       | Target demo length in seconds (default: 75)                     |
| `presenter_count`       | integer  | No       | Number of presenters (default: 1); used to split narration      |

---

## Outputs

| Output                | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `demo_narrative`      | Full prose narrative of the demo from opening to close                                |
| `demo_flow`           | Step-by-step demo with spoken lines, screen actions, timing, and slide-level duration |
| `wow_moment_staging`  | Exact staging instructions for the primary wow moment                                 |
| `transition_cues`     | Verbal cues to move between demo steps smoothly                                       |
| `rehearsal_checklist` | Items to verify before the live presentation                                          |
| `recommended_skills`  | Suggested next skills to invoke                                                       |

---

## Rules

1. Total `demo_flow` timing must be within `demo_duration_seconds` ± 10 seconds.
2. Open with the problem or a user story — never with "Hi, we're team X and we built..."
3. `primary_wow_moment` must appear before 60% of `demo_duration_seconds`.
4. Every step in `mvp_demo_flow` must map to at least one `demo_flow` step.
5. Spoken lines per step must be 15 words or fewer — short enough to say confidently while operating the UI.
6. Each step in `demo_flow` must include `estimated_duration_seconds` to help the pitcher manage their speed.
7. `wow_moment_staging` must include: pause instruction, what to say, what the audience sees.
8. `rehearsal_checklist` must include: demo account state, test data loaded, browser/app state, notifications disabled.

---

## Output Format

```yaml
demo_narrative: |
  <Full prose narrative — 3–5 sentences summarising the complete demo arc>

demo_flow:
  - step: <number>
    timestamp_start_seconds: <number>
    timestamp_end_seconds: <number>
    estimated_duration_seconds: <number>
    screen_action: '<what to do on screen>'
    spoken_lines: '<what to say>'
    presenter: '<presenter 1|presenter 2|all>'
    is_wow_moment: <true|false>

wow_moment_staging:
  step: <number>
  setup: '<what to say or do immediately before>'
  action: '<the exact on-screen action>'
  pause_seconds: <number>
  what_audience_sees: '<description>'
  spoken_reveal: '<what to say after the pause>'

transition_cues:
  - from_step: <number>
    to_step: <number>
    spoken_cue: '<bridging phrase>'

rehearsal_checklist:
  - '<item>'

recommended_skills:
  - '<skill-name>'
```

---

## Example

**Input:**

```yaml
project_title: 'AnchorAI'
tagline: 'An AI companion that remembers your emotional journey.'
problem_statement: 'College students wait 6 weeks for counseling while anxiety compounds daily.'
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
primary_wow_moment: 'AI recalls emotional context from 3 days ago and adapts tone in real time'
target_user: 'College students with anxiety'
evaluation_axes:
  - axis: 'Innovation'
    weight: 'high'
  - axis: 'Impact'
    weight: 'high'
demo_duration_seconds: 75
presenter_count: 1
```

**Output:**

```yaml
demo_narrative: |
  AnchorAI solves a simple problem: 40% of college students live with anxiety, but the average campus counseling wait is 6 weeks. AnchorAI provides always-available, context-aware emotional support — and unlike every other AI tool, it actually remembers you. Watch a student check in after a hard week, and see how AnchorAI picks up exactly where they left off.

demo_flow:
  - step: 1
    timestamp_start_seconds: 0
    timestamp_end_seconds: 12
    estimated_duration_seconds: 12
    screen_action: "Open AnchorAI chat interface; type 'I'm feeling overwhelmed today'"
    spoken_lines: "Meet Alex. It's exam week. Alex opens AnchorAI and checks in."
    presenter: 'presenter 1'
    is_wow_moment: false

  - step: 2
    timestamp_start_seconds: 12
    timestamp_end_seconds: 42
    estimated_duration_seconds: 30
    screen_action: "Type 'I keep worrying about the same things as last week'"
    spoken_lines: 'Alex mentions the same stress from last week. Watch what AnchorAI does.'
    presenter: 'presenter 1'
    is_wow_moment: true

  - step: 3
    timestamp_start_seconds: 42
    timestamp_end_seconds: 65
    estimated_duration_seconds: 23
    screen_action: "Type 'I feel completely hopeless'; observe crisis card appear"
    spoken_lines: 'When Alex signals distress, AnchorAI responds with care — and resources.'
    presenter: 'presenter 1'
    is_wow_moment: false

  - step: 4
    timestamp_start_seconds: 65
    timestamp_end_seconds: 75
    estimated_duration_seconds: 10
    screen_action: 'Hold on the full screen'
    spoken_lines: 'No waitlist. No starting over. AnchorAI — always there.'
    presenter: 'presenter 1'
    is_wow_moment: false

wow_moment_staging:
  step: 2
  setup: "Pause after typing the message. Don't speak for 2 seconds while the response loads."
  action: "Scroll slowly to highlight the sentence where AnchorAI references 'last week's exam stress you mentioned'"
  pause_seconds: 3
  what_audience_sees: 'AI response contains a specific reference to prior session content — without being prompted'
  spoken_reveal: "AnchorAI remembered. Without being told. That's the difference."

transition_cues:
  - from_step: 1
    to_step: 2
    spoken_cue: "Alex has been here before. Let's see if AnchorAI remembers."
  - from_step: 2
    to_step: 3
    spoken_cue: 'But what happens when things get harder?'
  - from_step: 3
    to_step: 4
    spoken_cue: "That's AnchorAI. Built for the moments between appointments."

rehearsal_checklist:
  - 'Browser notifications disabled (OS and Chrome)'
  - "Demo account pre-loaded with 1 prior Supabase session containing 'exam stress' phrase"
  - 'Chat interface loaded and visible at correct zoom level (125%)'
  - 'Groq API key verified active with a test request'
  - 'Run full demo flow twice before judging; verify wow moment appears consistently'
  - 'Fallback screen recording ready in case of API failure'

recommended_skills:
  - 'hackathon-pitchdeck'
  - 'hackathon-judge-simulator'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-demo-psychology.md`
- `../hackathon-shared-resources/knowledge/hackathon-demo-patterns.md`
- `../hackathon-shared-resources/knowledge/hackathon-pitch-strategy.md`
- `../hackathon-shared-resources/knowledge/hackathon-winning-patterns.md`

### Templates

- `../hackathon-shared-resources/templates/demo-script-template.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
