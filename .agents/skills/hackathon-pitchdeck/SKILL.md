---
name: hackathon-pitchdeck
description: >-
  Construct a complete hackathon pitch deck narrative with slide content, speaker notes, and judging alignment.
---

# hackathon-pitchdeck

## Goal

Construct a complete hackathon pitch deck narrative with slide-by-slide content, speaker notes, and a persuasive storyline aligned to judging criteria.

---

## Trigger Conditions

Use this skill when:

- The demo flow is implemented and the wow factor is confirmed
- Judging evaluation axes from `hackathon-track-analyzer` are available
- A pitch deck must be constructed before the presentation phase
- The pitch duration is known (determines slide count and time allocation)
- Invoked during Phase 6; run in parallel with `hackathon-demo-video` after implementation is frozen

---

## Inputs

| Input                    | Type     | Required | Description                                                |
| ------------------------ | -------- | -------- | ---------------------------------------------------------- |
| `project_title`          | string   | Yes      | Name of the project                                        |
| `tagline`                | string   | Yes      | One-sentence project description                           |
| `problem_statement`      | string   | Yes      | The problem being solved                                   |
| `solution_summary`       | string   | Yes      | How the project solves the problem                         |
| `mvp_demo_flow`          | object[] | Yes      | Demo steps from `hackathon-scope-cutter`                   |
| `target_user`            | string   | Yes      | Primary user segment                                       |
| `wow_factor`             | string   | Yes      | The single most impressive aspect                          |
| `evaluation_axes`        | object[] | Yes      | Judging criteria from `hackathon-track-analyzer`           |
| `team_members`           | string[] | Yes      | Team member names and roles                                |
| `pitch_duration_minutes` | integer  | No       | Available pitch time (default: 3)                          |
| `slide_format`           | string   | No       | Output format ('markdown' or 'react', default: 'markdown') |

---

## Outputs

| Output                   | Description                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `slides`                 | Ordered slide definitions with title, content, speaker notes, and interactive layout specs         |
| `opening_hook`           | First 15-second attention-grabbing statement                                                       |
| `closing_call_to_action` | Final memorable statement for judges                                                               |
| `judging_alignment`      | How each slide addresses a judging axis                                                            |
| `react_slides_code`      | Raw JSX code implementing the slide deck using interactive containers if `slide_format` is 'react' |

---

## Rules

1. Map every slide to at least one `evaluation_axis`.
2. Open with the problem/hook, not the team or technology, following `../hackathon-shared-resources/knowledge/hackathon-pitchdeck-winning-pattern.md`.
3. Lead with the `wow_factor` within the first 60 seconds.
4. Structure the deck around the 7-Slide Winning Framework (Hook, Solution, Demo, Tech Stack, Value/Impact, Market/Viability, Roadmap/Team).
5. Slide 3 (Demo) must focus on navigating the MVP and contain a backup walkthrough specification.
6. Slide 4 (Tech Stack) must include a text-based architecture workflow or a MermaidJS diagram code block.
7. If `slide_format` is `react`, output full, clean JSX code for `react_slides_code` simulating the slide navigation container and interactive state changes following `../hackathon-shared-resources/knowledge/hackathon-pitchdeck-design-with-react.md` (Genspark style).

---

## Output Format

```yaml
opening_hook: '<string>'

slides:
  - number: <number>
    title: '<slide title>'
    type: '<hook|problem|solution|demo|technology|team|vision|cta>'
    bullets:
      - '<bullet>'
    speaker_notes: '<what to say>'
    judging_axes_addressed:
      - '<axis name>'
    interactive_element: '<description of interactive widget (e.g. click tabs, mock input)>'

closing_call_to_action: '<string>'

judging_alignment:
  - axis: '<axis name>'
    addressed_in_slides:
      - <slide number>

react_slides_code: |
  <JSX file content if slide_format is react, else null>
```

---

## Example

**Input:**

```yaml
project_title: 'AnchorAI'
tagline: 'An AI companion that remembers your emotional journey.'
problem_statement: 'College students wait 6 weeks for counseling while anxiety compounds daily.'
solution_summary: 'AnchorAI uses GPT-4 with persistent memory to provide empathetic, context-aware check-ins.'
wow_factor: 'The AI recalls your emotional context from 3 days ago and adapts its tone in real time'
pitch_duration_minutes: 3
team_members: ['Alex (backend)', 'Sam (frontend)', 'Jordan (design)']
slide_format: 'markdown'
```

**Output:**

```yaml
opening_hook: 'What if you waited 6 weeks for help, and your anxiety got worse every day?'

slides:
  - number: 1
    title: 'The 6-Week Wait'
    type: 'problem'
    bullets:
      - '40% of students report anxiety as top concern'
      - 'Average campus counseling wait: 6 weeks'
      - "Most give up before they're seen"
    speaker_notes: 'Open with the stat, then pause. Let it land.'
    judging_axes_addressed: ['Impact']
    interactive_element: 'Static stat panel with pulse animation'

  - number: 2
    title: 'Meet AnchorAI'
    type: 'solution'
    bullets:
      - 'Always available — no waitlist'
      - 'Remembers your emotional history'
      - 'Adapts tone to your current state'
    speaker_notes: "One sentence, then say 'let me show you.'"
    judging_axes_addressed: ['Innovation', 'Impact']
    interactive_element: 'Feature toggle tabs (Always-On, Context-Aware, Secure)'

  - number: 3
    title: 'Live Demo'
    type: 'demo'
    bullets: []
    speaker_notes: 'Show the memory recall moment. Slow down. Let silence work.'
    judging_axes_addressed: ['Technical Execution', 'Innovation']
    interactive_element: 'Embedded simulated chat messenger with interactive input box'

  - number: 4
    title: 'The Architecture'
    type: 'technology'
    bullets:
      - 'Next.js on Vercel'
      - 'FastAPI on Render'
      - 'Supabase (Postgres & Vector)'
      - 'Llama-3 via Groq API'
    speaker_notes: 'Explain how our stack enables sub-100ms latency for seamless conversations.'
    judging_axes_addressed: ['Technical Execution']
    interactive_element: 'Hoverable architecture block diagram showing request flows'

  - number: 5
    title: "What's Next"
    type: 'vision'
    bullets:
      - 'Partnership with student counseling centers'
      - 'Crisis escalation to human counselors'
      - '1M students underserved — this is the start'
    speaker_notes: 'End with the question: what if no student ever had to wait alone again?'
    judging_axes_addressed: ['Impact']
    interactive_element: 'Future timeline chart widget'

closing_call_to_action: 'No student should have to manage anxiety alone while waiting for help that may never come.'

judging_alignment:
  - axis: 'Innovation'
    addressed_in_slides: [2, 3]
  - axis: 'Impact'
    addressed_in_slides: [1, 2, 5]
  - axis: 'Technical Execution'
    addressed_in_slides: [3, 4]

react_slides_code: null
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-pitch-strategy.md`
- `../hackathon-shared-resources/knowledge/hackathon-demo-psychology.md`
- `../hackathon-shared-resources/knowledge/hackathon-judging-criteria.md`
- `../hackathon-shared-resources/knowledge/hackathon-winning-patterns.md`
- `../hackathon-shared-resources/knowledge/hackathon-pitchdeck-winning-pattern.md`
- `../hackathon-shared-resources/knowledge/hackathon-pitchdeck-design-with-react.md`

### Templates

- `../hackathon-shared-resources/templates/pitchdeck-outline.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
