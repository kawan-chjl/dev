---
name: hackathon-git-master
description: >-
  Manage rapid collaborative Git workflows, solve merge conflicts, and prevent codebase disasters under pressure.
---

# hackathon-git-master

## Goal

Enforce a high-speed, conflict-free collaborative coding workflow suitable for 24–48 hour hackathons. Provide standard shell commands to set up the repository, handle branches without PR bureaucracy, and resolve merge conflicts instantly when they threaten the demo path.

---

## Trigger Conditions

Use this skill when:

- Multiple developers are about to begin writing code concurrently (Phase 5).
- A merge conflict occurs that block development or deployment.
- You need a lightweight repository structure to avoid git overhead.
- Invoked at the start of Phase 5 (Build) right after `hackathon-repo-bootstrap`, or when a conflict occurs during implementation.

---

## Inputs

| Input              | Type     | Required | Description                                              |
| ------------------ | -------- | -------- | -------------------------------------------------------- |
| `team_size`        | integer  | Yes      | Number of developers pushing code                        |
| `tech_stack`       | string[] | Yes      | Technologies in use (helps determine .gitignore rules)   |
| `current_branch`   | string   | No       | The branch name where the issue occurs (default: 'main') |
| `git_conflict_log` | string   | No       | Raw terminal output of the git merge conflict            |

---

## Outputs

| Output                | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `git_workflow`        | Step-by-step collaborative flow guidelines tailored for the team size              |
| `git_commands`        | Terminal commands for setup, branch management, syncing, and pushing               |
| `conflict_resolution` | Clear commands to solve the specific `git_conflict_log` or general merge conflicts |
| `disaster_prevention` | Safety rules to ensure the deployable demo path is never broken                    |

---

## Rules

1. **Keep it simple:** Eliminate Pull Request (PR) reviews unless the team size $\ge 5$. Recommend direct commits to `main` or short-lived feature branches merged immediately.
2. Provide copy-pasteable git commands with clear descriptions.
3. Every git command must contain comments/explanations.
4. If a merge conflict occurs, favor the owner of the specific file or use a "merge-ours" / "merge-theirs" strategy to unblock the build.
5. Never recommend force-pushing (`git push --force`) to shared branches; recommend `git push --force-with-lease` or `git revert`.

---

## Output Format

```yaml
git_workflow:
  branching_model: '<trunk-based|short-feature-branches>'
  sync_frequency_hours: <number>
  rules:
    - '<rule>'

git_commands:
  setup:
    - command: '<command>'
      explanation: '<explanation>'
  daily_sync:
    - command: '<command>'
      explanation: '<explanation>'

conflict_resolution:
  diagnostic_command: '<command>'
  resolution_steps:
    - step: <number>
      command: '<command>'
      explanation: '<explanation>'

disaster_prevention:
  - rule: '<rule>'
    action_on_failure: '<what to do>'
```

---

## Example

**Input:**

```yaml
team_size: 3
tech_stack: ['Next.js', 'FastAPI', 'Supabase']
current_branch: 'main'
git_conflict_log: |
  CONFLICT (content): Merge conflict in frontend/pages/index.js
  Automatic merge failed; fix conflicts and then commit the result.
```

**Output:**

```yaml
git_workflow:
  branching_model: 'Short-lived Feature Branches (Merge immediately)'
  sync_frequency_hours: 1
  rules:
    - 'Never keep a feature branch open for more than 2 hours without merging.'
    - 'Deploy deployments automatically using Vercel preview URLs to test branches before merging.'
    - 'Communicate verbally *before* modifying shared configuration files (e.g. package.json, main.py).'

git_commands:
  setup:
    - command: 'git checkout -b feature/auth'
      explanation: 'Create and switch to a new local branch for your task'
    - command: 'git pull origin main'
      explanation: 'Pull latest changes from main before starting work'
  daily_sync:
    - command: 'git add .'
      explanation: 'Stage all local changes'
    - command: "git commit -m 'feat: add auth page structure'"
      explanation: 'Commit changes locally with a short message'
    - command: 'git checkout main && git pull origin main && git checkout - && git rebase main'
      explanation: 'Quickly rebase your local branch on top of latest main changes to keep history clean'

conflict_resolution:
  diagnostic_command: 'git status'
  resolution_steps:
    - step: 1
      command: 'git checkout --ours frontend/pages/index.js'
      explanation: 'If you want to keep the changes on your branch (ours) and discard main changes'
    - step: 2
      command: 'git checkout --theirs frontend/pages/index.js'
      explanation: 'Alternatively, use this command to keep the changes from main (theirs) and discard yours'
    - step: 3
      command: 'Open frontend/pages/index.js and manually resolve if you need a mix of both (look for <<<<<<<, =======, >>>>>>> markers)'
      explanation: 'Manual merge is safest for index.js layout changes'
    - step: 4
      command: "git add frontend/pages/index.js && git commit -m 'chore: resolve merge conflict in index.js'"
      explanation: 'Mark the conflict resolved and complete the merge/rebase commit'

disaster_prevention:
  - rule: 'Never commit broken code to main.'
    action_on_failure: 'If main is broken, revert the last commit immediately: git revert HEAD. Do not try to debug on main.'
  - rule: 'Always run npm run build locally before merging to main.'
    action_on_failure: 'If the build fails, fix it on your feature branch first.'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-winning-patterns.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
