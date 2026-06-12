---
name: hackathon-team-recruiter
description: >-
  Analyze team skillset gaps and generate professional recruitment posts to attract teammates.
---

# hackathon-team-recruiter

## Goal

Identify the technical or domain gaps in an incomplete hackathon team, recommend the ideal profile for new members, and write a high-impact recruitment message to post on social channels (Discord, Slack, Telegram).

---

## Trigger Conditions

Use this skill when:

- You are entering a hackathon alone or with an incomplete team.
- You need to recruit members with complementary skills to meet track requirements.
- The hackathon has a maximum team size limit, and you want to fill remaining spots strategically.
- Invoked during Phase 0 (Pre-Hackathon Preparation) or at the start of Phase 1.

---

## Inputs

| Input                 | Type     | Required | Description                                                       |
| --------------------- | -------- | -------- | ----------------------------------------------------------------- |
| `current_members`     | object[] | Yes      | List of current team members, their skills, and roles             |
| `max_team_size`       | integer  | Yes      | Maximum allowed team size for the hackathon                       |
| `recruitment_target`  | string   | No       | Specific number or range (e.g., '1', '1-2') of members to recruit |
| `target_track`        | object   | Yes      | Track description, goals, and required tech stacks                |
| `recruitment_channel` | string   | No       | Where the message will be posted (default: 'Discord')             |

---

## Outputs

| Output                 | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `gap_analysis`         | Detailed analysis of technical and non-technical gaps based on the target track    |
| `target_profiles`      | Ideal candidate profiles describing required skills and key responsibilities       |
| `recruitment_posts`    | Tailored post drafts for Discord/Slack and Telegram/Twitter                        |
| `suggested_next_steps` | Tips on where to post and how to filter candidates during the team formation phase |

---

## Rules

1. If `recruitment_target` is not provided, calculate it as: `max_team_size` - `current_members.length`.
2. Prioritize filling critical development roles (e.g., a team with 3 backend devs needs a Frontend/UI owner).
3. The recruitment posts must be concise, use high-energy hackathon-style formatting, and specify the project's direction and existing stack.
4. Always list the "Existing Stack/Skills" so candidates know what tools are already covered.
5. Include a call-to-action (CTA) telling candidates how to reach out (e.g., DM or Discord tag).

---

## Output Format

```yaml
gap_analysis:
  critical_missing_skills:
    - '<skill>'
  secondary_missing_skills:
    - '<skill>'
  potential_bottlenecks:
    - '<bottleneck>'

target_profiles:
  - profile_name: '<string>'
    required_skills:
      - '<skill>'
    responsibilities:
      - '<responsibility>'
    importance: '<high|medium>'

recruitment_posts:
  short_format: |
    <Concise post for Telegram, Twitter, or quick Discord channels — max 150 words>
  long_format: |
    <Detailed post for Slack, Discord team-finder, or email — includes project concept, stack, and who you need>

suggested_next_steps:
  - '<action step>'
```

---

## Example

**Input:**

```yaml
current_members:
  - name: 'Alex'
    skills: ['Python', 'FastAPI', 'Machine Learning', 'PyTorch']
  - name: 'Sam'
    skills: ['PostgreSQL', 'Database Design', 'System Architecture']
max_team_size: 4
recruitment_target: '1-2'
target_track:
  name: 'AI-Powered Patient Care'
  description: 'Build a web-based portal connecting doctors and patients using real-time generative AI.'
  required_tech: ['React or Next.js', 'FastAPI', 'OpenAI API']
recruitment_channel: 'Discord team-finder'
```

**Output:**

```yaml
gap_analysis:
  critical_missing_skills:
    - 'React / Next.js'
    - 'UI/UX Design / Tailwind CSS'
  secondary_missing_skills:
    - 'Pitching / Public Speaking'
    - 'Frontend deployment (Vercel)'
  potential_bottlenecks:
    - 'The team has excellent AI and backend skills but cannot visualize the solution; without a frontend, the demo will fail.'

target_profiles:
  - profile_name: 'Frontend Developer & UI/UX Owner'
    required_skills:
      - 'React or Next.js'
      - 'Tailwind CSS / shadcn/ui'
      - 'Figma (basic mocking)'
    responsibilities:
      - 'Design and implement the web dashboard interface'
      - 'Integrate backend APIs into frontend pages'
      - 'Configure Vercel for fast frontend deployments'
    importance: 'high'

recruitment_posts:
  short_format: |
    🚀 **AI Patient Care Team Looking for a Frontend/UI Wizard!** 🚀
    We have AI (PyTorch/FastAPI) and DB (PostgreSQL) covered. We need 1 React/Next.js dev to build a stunning UI and hook up APIs. 
    **Target Track:** AI-Powered Patient Care (Web portal for doctor-patient AI interactions).
    **Our stack:** Python, FastAPI, Postgres.
    **You bring:** React/Next.js, Tailwind, and a passion for clean UI.
    DM me to chat! Let's build something awesome together! 💻✨
  long_format: |
    🔥 **Team Recruitment: AI-Powered Patient Care Track** 🔥

    Hey everyone! We are a group of 2 developers (AI/ML Specialist & Database Engineer) gearing up for the Hackathon. We have a solid backend and ML architecture sketched out, but we need frontend horsepower to bring it to life.

    **What we are building:**
    A web-based portal that connects doctors and patients, using real-time LLM agents to summarize consultations and suggest follow-up plans.

    **Our current team:**
    - Alex: Python, FastAPI, PyTorch (AI/ML logic)
    - Sam: PostgreSQL, Database Design, System Architecture

    **Who we are looking for (1-2 members):**
    - **Frontend Developer:** Proficient in React or Next.js, Tailwind CSS. You will own the UI and integrate FastAPI endpoints. Bonus points if you have Figma experience!
    - **Pitcher / PM (Optional):** If you love storytelling, slide design, and can help structure the demo narrative, we want you!

    **Why join us?**
    We have the core technical backend already prepared. With your frontend skills, we can easily ship a highly polished, working MVP.

    👉 **How to join:** Reply to this thread or send a DM to Alex! Let's win this track! 🚀

suggested_next_steps:
  - 'Post the short format in the main #team-formation Discord channel.'
  - 'Pin the long format in the hackathon Slack workspace under #recruitment.'
  - 'When candidates reach out, ask to see a quick portfolio link or GitHub profile showing working React apps.'
  - 'Run a 5-minute call with candidates to ensure timezone alignment and communication chemistry.'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-winning-patterns.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
