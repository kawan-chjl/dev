---
name: hackathon-post-mortem
description: >-
  Clean up cloud assets, scrub API keys from Git history, and build a professional README for post-hackathon handovers.
---

# hackathon-post-mortem

## Goal

Securely clean up all temporary hackathon assets to avoid accidental credit card charges, scrub exposed API keys from the Git history, and generate a polished, public-ready README to turn the prototype into a strong portfolio piece or hand it over to sponsors.

---

## Trigger Conditions

Use this skill when:

- The hackathon is over and winners have been announced.
- You need to shut down paid cloud resources (Vercel, Render, Railway, AWS).
- You accidentally committed API keys or passwords and need to purge them before publicizing the repository.
- You want to turn your prototype into an open-source project or portfolio piece.
- Invoked in the Post-Hackathon Phase, after `hackathon-submission-prep`.

---

## Inputs

| Input               | Type     | Required | Description                                                   |
| ------------------- | -------- | -------- | ------------------------------------------------------------- |
| `project_title`     | string   | Yes      | Name of the project                                           |
| `deployed_services` | object[] | Yes      | List of hosting services, databases, or third-party APIs used |
| `exposed_secrets`   | string[] | No       | API keys or passwords that might have been committed          |
| `repository_url`    | string   | No       | GitHub repository URL                                         |

---

## Outputs

| Output                      | Description                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `cleanup_checklist`         | Actions to take on cloud hosting providers to stop billing                      |
| `secret_scrubbing_commands` | Terminal commands to purge secrets from the Git history completely              |
| `portfolio_readme_outline`  | Structured outline of a README optimized for recruiters and open-source readers |
| `next_steps`                | Guidelines for handing over to sponsors or preparing for startup accelerators   |

---

## Rules

1. **Safety First:** Never suggest `rm -rf .git` as a way to clean history. Recommend standard purging tools like `git-filter-repo` or `BFG Repo-Cleaner`.
2. All secret scrubbing commands must include warnings about backup preservation.
3. The cleanup checklist must prioritize databases and AI endpoints which incur high automated charges.
4. The generated README outline must not contain hackathon-specific jargon; it should frame the project as a standalone product.

---

## Output Format

```yaml
cleanup_checklist:
  - service: '<service name>'
    action: '<what to delete, pause, or downgrade>'
    priority: '<critical|high|medium>'
    reason: '<why it charges you>'

secret_scrubbing_commands:
  prerequisites:
    - '<tool to install>'
  commands:
    - command: '<command>'
      explanation: '<explanation>'
      safety_warning: '<warning>'

portfolio_readme_outline:
  title: '<title>'
  tagline: '<tagline>'
  sections:
    - heading: '<heading>'
      content_description: '<what to write>'
  badge_suggestions:
    - '<badge markdown>'

next_steps:
  - '<action step>'
```

---

## Example

**Input:**

```yaml
project_title: 'AnchorAI'
deployed_services:
  - name: 'Vercel'
    tier: 'Free Hobby'
  - name: 'Supabase'
    tier: 'Pro ($25/mo trial)'
  - name: 'Railway'
    tier: 'Developer Plan ($5 credit)'
  - name: 'OpenAI API'
    tier: 'Pay-as-you-go'
exposed_secrets: ['OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
repository_url: 'https://github.com/user/anchor-ai'
```

**Output:**

```yaml
cleanup_checklist:
  - service: 'Supabase'
    action: 'Pause the project or downgrade to the Free Tier before the trial ends.'
    priority: 'critical'
    reason: 'Pro tier automatically charges $25/month after the trial period expires.'
  - service: 'Railway'
    action: 'Delete the project container if it is not in use.'
    priority: 'high'
    reason: 'Once the $5 free developer credit runs out, Railway suspends services or charges active cards.'
  - service: 'OpenAI API'
    action: 'Go to OpenAI API dashboard -> Settings -> Limits, and ensure a hard monthly spending limit is set (e.g. $5).'
    priority: 'high'
    reason: 'Exposed keys can be scraped by bots and abused, resulting in massive bills.'
  - service: 'Vercel'
    action: 'No action required.'
    priority: 'medium'
    reason: 'Hobby tier is free forever unless usage limits are exceeded.'

secret_scrubbing_commands:
  prerequisites:
    - 'Install git-filter-repo: pip install git-filter-repo'
  commands:
    - command: 'git clone https://github.com/user/anchor-ai.git anchor-ai-backup'
      explanation: 'Create a backup clone of your repository before performing history surgery.'
      safety_warning: 'Do not skip this step. If filter-repo fails, your history might be corrupted.'
    - command: "git-filter-repo --replace-text <(echo 'OPENAI_API_KEY===>[SCRUBBED_KEY]')"
      explanation: 'Rewrite history, replacing all instances of your actual API key with [SCRUBBED_KEY].'
      safety_warning: 'This changes git commit hashes, which requires a force-push to GitHub.'
    - command: 'git push origin main --force'
      explanation: 'Force-push the cleaned history back to your repository.'
      safety_warning: 'This overrides the remote repository history. Coordinate with teammates before running.'

portfolio_readme_outline:
  title: 'AnchorAI - Persistent Mental Health AI Companion'
  tagline: 'Always-available, context-aware emotional support designed to bridge the 6-week gap in student counseling.'
  sections:
    - heading: 'Overview'
      content_description: 'Explain the core value proposition, the target audience, and the problem solved.'
    - heading: 'Key Features'
      content_description: 'List the 3 main capabilities with links to working modules (e.g., Session Memory, Crisis Escalation).'
    - heading: 'Architecture & Tech Stack'
      content_description: 'Provide a simple text-based data flow diagram (Next.js -> FastAPI -> Supabase/Groq).'
    - heading: 'Local Setup'
      content_description: 'Step-by-step instructions: clone repo, copy .env.example, run docker-compose or local setup commands.'
    - heading: 'License'
      content_description: 'Standard MIT License text.'
  badge_suggestions:
    - '[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)'
    - '[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black)](https://nextjs.org/)'

next_steps:
  - 'Revoke the exposed OpenAI API key immediately in the OpenAI portal and generate a new one if you plan to keep developing.'
  - 'If sponsors expressed interest, compile a PDF pitch deck and write a 1-page summary highlighting technical feasibility and how you integrated their tool.'
  - 'Post your working demo link and a 20-second screen capture GIF on LinkedIn or Twitter to build your personal developer brand.'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-submission-guidelines.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
