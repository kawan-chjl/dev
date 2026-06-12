---
name: hackathon-role-allocator
description: >-
  Allocate optimal roles to team members based on their skills and track requirements.
---

# hackathon-role-allocator

## Goal

Optimize team execution speed and prototype quality by allocating clear, specialized roles to team members based on their skills, preferences, and the specific technical constraints of the selected hackathon track.

---

## Trigger Conditions

Use this skill when:

- The team has formed, and the members' skillsets are known.
- The target hackathon track and its technical requirements are identified (e.g., from `hackathon-track-analyzer`).
- You need to assign clear ownership of frontend, backend, design, and presentation before coding begins.
- Invoked during Phase 4 (Project Planning), before tasks are scheduled in `hackathon-task-planner`.

---

## Inputs

| Input                      | Type     | Required | Description                                             |
| -------------------------- | -------- | -------- | ------------------------------------------------------- |
| `team_members`             | object[] | Yes      | List of team members with name, skills, and preferences |
| `track_requirements`       | object   | Yes      | Required technologies, constraints, and judging axes    |
| `hackathon_duration_hours` | integer  | Yes      | Total hours of the hackathon                            |

---

## Outputs

| Output                  | Description                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `role_allocations`      | Assigned role, primary ownership, and alignment rationale for each member               |
| `coverage_assessment`   | Evaluation of skill coverage across key areas (Frontend, Backend, AI/ML, Design, Pitch) |
| `identified_gaps`       | Critical development bottlenecks due to missing team expertise                          |
| `coordination_strategy` | Collaboration model (e.g., pair programming, async integration checkpoints)             |

---

## Rules

1. Assign exactly one primary role to each team member, even if they have multi-disciplinary skills.
2. Ensure every critical track requirement (e.g., "must use Supabase", "requires video demo") has a designated owner.
3. Every team must have a designated **Pitch Owner** who is responsible for the deck and script, even if they also write code.
4. Flag any critical skillset required by the track that is completely missing from the team as a `gap`.
5. For teams of size $\le 3$, combine roles logically (e.g., Frontend + Designer, Backend + AI Integrator).

---

## Output Format

```yaml
role_allocations:
  - member_name: '<string>'
    assigned_role: '<string>'
    responsibilities:
      - '<responsibility>'
    rationale: '<why this assignment matches their skills and preferences>'
    time_split_percent:
      engineering: <number>
      presentation: <number>
      planning: <number>

coverage_assessment:
  frontend: '<strong|adequate|weak|none>'
  backend: '<strong|adequate|weak|none>'
  design: '<strong|adequate|weak|none>'
  presentation: '<strong|adequate|weak|none>'
  specialized_tech: '<strong|adequate|weak|none>'

identified_gaps:
  - gap: '<missing skill>'
    severity: '<critical|moderate>'
    mitigation: '<how the team will bypass this (e.g., use no-code, templates)>'

coordination_strategy:
  integration_checkpoints:
    - '<time/milestone to sync integrations>'
  collaboration_model: '<description of how the team communicates and merges code>'
```

---

## Example

**Input:**

```yaml
team_members:
  - name: 'Alice'
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker']
    preferences: ['backend development', 'data modeling']
  - name: 'Bob'
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Figma']
    preferences: ['UI design', 'frontend development']
  - name: 'Charlie'
    skills: ['Python', 'OpenAI API', 'Public Speaking', 'Product management']
    preferences: ['AI integration', 'presentation', 'writing copy']
track_requirements:
  required_technologies: ['React', 'Any LLM API', 'Supabase']
  judging_criteria: ['Technical complexity', 'UI/UX design', 'Pitch delivery']
hackathon_duration_hours: 36
```

**Output:**

```yaml
role_allocations:
  - member_name: 'Alice'
    assigned_role: 'Backend & Database Lead'
    responsibilities:
      - 'Set up Supabase database schemas and Row Level Security'
      - 'Develop FastAPI endpoints for data operations'
      - 'Integrate database logic with the frontend API'
    rationale: 'Alice has strong Python and database skills, aligning perfectly with backend development.'
    time_split_percent:
      engineering: 80
      presentation: 10
      planning: 10

  - member_name: 'Bob'
    assigned_role: 'Frontend & UI/UX Owner'
    responsibilities:
      - 'Design UI mockups in Figma during the first 2 hours'
      - 'Implement the React frontend and style with Tailwind'
      - 'Connect frontend components to FastAPI and Supabase endpoints'
    rationale: 'Bob has React, Tailwind, and Figma skills, making him ideal for both designing and coding the UI.'
    time_split_percent:
      engineering: 80
      presentation: 10
      planning: 10

  - member_name: 'Charlie'
    assigned_role: 'AI Integrator & Presentation Lead'
    responsibilities:
      - 'Implement LLM API integration and prompting logic in FastAPI'
      - 'Own the pitch deck outline and demo script'
      - 'Rehearse and deliver the final live presentation'
    rationale: 'Charlie combines Python/AI skills with public speaking and product management, allowing him to lead both AI integration and the final pitch.'
    time_split_percent:
      engineering: 40
      presentation: 50
      planning: 10

coverage_assessment:
  frontend: 'strong'
  backend: 'strong'
  design: 'adequate'
  presentation: 'strong'
  specialized_tech: 'strong'

identified_gaps:
  - gap: 'Advanced UX animations'
    severity: 'moderate'
    mitigation: 'Bob will use pre-built Tailwind libraries (e.g., shadcn/ui or Framer Motion templates) instead of writing custom animations.'

coordination_strategy:
  integration_checkpoints:
    - 'Hour 12: Connect backend endpoints to database'
    - 'Hour 24: First full integration of frontend and backend'
    - 'Hour 30: Code freeze and final testing of the demo flow'
  collaboration_model: 'Charlie and Alice will pair-program on the backend/AI routing. Bob will push frontend updates to GitHub; Vercel auto-deploys will be used for continuous validation.'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-winning-patterns.md`
- `../hackathon-shared-resources/knowledge/hackathon-tools.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
