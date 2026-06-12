---
name: hackathon-mock-data-generator
description: >-
  Generate realistic mock datasets and seed scripts aligned with the demo flow, or warn if mocking is forbidden by rules.
---

# hackathon-mock-data-generator

## Goal

Generate clean, logical, and visually appealing seed data or mock API responses matching the exact stages of the demo flow, ensuring the application looks populated and professional during judging. If hackathon rules forbid mock data, provide alternatives.

---

## Trigger Conditions

Use this skill when:

- The tech stack is configured, and the database schema or API response models are defined.
- The `mvp_demo_flow` is locked, and you need data that aligns perfectly with the demo narrative.
- The UI contains charts, tables, or feed components that look empty or generic.
- Invoked during Phase 5 (Build), before implementing frontend-backend integration or right after database bootstrapping.

---

## Inputs

| Input             | Type     | Required | Description                                                                                    |
| ----------------- | -------- | -------- | ---------------------------------------------------------------------------------------------- |
| `data_schema`     | string   | Yes      | Table schema, JSON schema, or TypeScript interfaces                                            |
| `mvp_demo_flow`   | object[] | Yes      | Demo steps from `hackathon-scope-cutter`                                                       |
| `mocking_allowed` | boolean  | Yes      | Whether hackathon rules permit mock data (derived from `hackathon-event-parser` or rules page) |
| `data_format`     | string   | No       | Output format (e.g., 'SQL', 'JSON', 'CSV', default: 'JSON')                                    |

---

## Outputs

| Output                 | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `policy_warning`       | Warning message if mock data is forbidden, advising how to proceed legally         |
| `mock_data`            | Structured dataset files or objects containing realistic demo data                 |
| `seed_instructions`    | Step-by-step instructions on how to load this data into the local/staging database |
| `demo_alignment_notes` | Details on how this data matches steps in the `mvp_demo_flow`                      |

---

## Rules

1. **Rule Check First:** If `mocking_allowed` is `false`, the output `policy_warning` must be set to `CRITICAL WARNING: Mock data is prohibited by the hackathon rules. Do not use generated mock datasets.` In this case, `mock_data` must ONLY contain minimal starter schemas or instructions on connecting to a real sandboxed dataset.
2. If `mocking_allowed` is `true`, generate realistic, logical data. Avoid placeholders like "Test User 1", "Lorem Ipsum", or generic timestamps.
3. Ensure relationships are coherent (e.g., matching IDs between `users` and `transactions`).
4. Timestamps should be relative to the demo day (e.g., "3 days ago", "1 hour ago") to look fresh on-screen.
5. Provide the exact code or database script to inject the data (e.g., PostgreSQL `INSERT` statements, or a node/python seed script).

---

## Output Format

```yaml
policy_warning: '<null | string explaining the warning or legal constraints>'

mock_data:
  - file_name: '<file name (e.g. seed.sql or mock.json)>'
    content: |
      <raw database script or JSON array>

seed_instructions:
  - step: <number>
    action: '<how to inject/seed this dataset>'

demo_alignment_notes:
  - demo_step: <number>
    matching_data_record: '<which record in the mock data triggers this step>'
    visual_impact: '<what the judges see on screen>'
```

---

## Example (Mocking Allowed)

**Input:**

```yaml
data_schema: |
  CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR, avatar_url VARCHAR);
  CREATE TABLE stress_logs (id SERIAL PRIMARY KEY, user_id INT, intensity INT, notes TEXT, logged_at TIMESTAMP);
mvp_demo_flow:
  - step: 2
    action: 'User opens dashboard'
    outcome: "A chart displays stress levels peaking last Tuesday, with a note: 'Work stress before big presentation'"
mocking_allowed: true
data_format: 'SQL'
```

**Output:**

```yaml
policy_warning: null

mock_data:
  - file_name: 'seed_demo_data.sql'
    content: |
      -- Clean tables
      TRUNCATE users, stress_logs CASCADE;

      -- Seed Demo User
      INSERT INTO users (id, name, avatar_url) VALUES 
      (1, 'Alex Miller', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');

      -- Seed Stress Logs relative to demo day (assumed May 22, 2026)
      -- Last Tuesday (May 19, 2026) shows high intensity
      INSERT INTO stress_logs (user_id, intensity, notes, logged_at) VALUES 
      (1, 4, 'Felt relaxed over the weekend', '2026-05-17 14:00:00'),
      (1, 3, 'Mild stress starting the work week', '2026-05-18 09:30:00'),
      (1, 9, 'Work stress before big presentation - high heart rate', '2026-05-19 16:45:00'),
      (1, 5, 'Post-presentation relief', '2026-05-20 11:00:00'),
      (1, 6, 'Normal project tracking', '2026-05-21 15:30:00');

seed_instructions:
  - step: 1
    action: "Run 'psql -h localhost -U postgres -d anchor_db -f seed_demo_data.sql' in your terminal."
  - step: 2
    action: "Verify the records exist by visiting Supabase dashboard or running 'SELECT COUNT(*) FROM stress_logs;'"

demo_alignment_notes:
  - demo_step: 2
    matching_data_record: "logged_at: '2026-05-19 16:45:00', intensity: 9"
    visual_impact: "The line chart will render a sharp spike to 9/10 on Tuesday, immediately drawing the judges' eyes to the stress trigger event, validating the app's analytical dashboard."
```

---

## Example (Mocking Prohibited)

**Input:**

```yaml
data_schema: 'Any dataset'
mvp_demo_flow:
  - step: 1
    action: 'Perform real-time diagnostic query'
    outcome: 'Real clinical trials are returned'
mocking_allowed: false
data_format: 'JSON'
```

**Output:**

```yaml
policy_warning: '⚠️ CRITICAL WARNING: Mock data is strictly prohibited by the rules of this hackathon. Do not load generated mock datasets. Using fake data will result in disqualification.'

mock_data:
  - file_name: 'instruction.md'
    content: |
      # Live API Integration Required
      This hackathon enforces live data. To run this demo safely:
      1. Use the sandbox API key provided by the sponsor.
      2. Call the real endpoint using a pre-determined, real query parameter (e.g., NCTID 'NCT04386252') that is verified to return valid, rich real-world results.
      3. Do not hardcode the response. If the network fails, use the official offline cache fallback.

seed_instructions:
  - step: 1
    action: 'Verify the official clinical trial API key is set in .env: CLINICAL_TRIALS_API_KEY'
  - step: 2
    action: 'Run the integration tests (T-01) to verify response time is under 1.5 seconds.'

demo_alignment_notes:
  - demo_step: 1
    matching_data_record: 'Real-world dataset response for NCT04386252'
    visual_impact: 'Judges see a live, verified API fetch of clinical data, proving technical validity without violating rules.'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-winning-patterns.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
