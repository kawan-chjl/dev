---
name: hackathon-sponsor-integrator
description: >-
  Parse sponsor documentation and generate minimal, working boilerplate code for quick technology integration.
---

# hackathon-sponsor-integrator

## Goal

Accelerate integration of sponsor APIs, SDKs, or protocols by parsing raw documentation, extracting key credentials/configurations, and generating minimal "Hello World" boilerplate code. This helps teams secure sponsor prizes without losing dev hours to setup bugs.

---

## Trigger Conditions

Use this skill when:

- You want to target a specific sponsor track or bonus prize.
- The sponsor's technology is unfamiliar, and documentation is dense or confusing.
- You need a minimal, verified code pattern to test API connection and credentials.
- Invoked during Phase 5 (Build), specifically right after project scaffolding or when starting tasks marked with `[SPONSOR-INTEGRATION]`.

---

## Inputs

| Input               | Type     | Required | Description                                                |
| ------------------- | -------- | -------- | ---------------------------------------------------------- |
| `sponsor_name`      | string   | Yes      | Name of the sponsor / provider                             |
| `technology_name`   | string   | Yes      | The API, SDK, chain, or tool being integrated              |
| `raw_documentation` | string   | Yes      | Raw docs snippet, API reference, or SDK setup instructions |
| `tech_stack`        | string[] | Yes      | Technologies in use by the team (determines code language) |
| `use_case`          | string   | No       | What the team wants to achieve with this tool              |

---

## Outputs

| Output             | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| `quickstart_steps` | Ordered, time-boxed steps to set up credentials and libraries              |
| `bootstrap_code`   | Minimal working code snippet showing initialization and basic API call     |
| `required_secrets` | List of environment variables and where to obtain them                     |
| `troubleshooting`  | Top 3 common errors for this technology and how to resolve them            |
| `wow_potential`    | Suggestions on how to frame this integration to impress the sponsor judges |

---

## Rules

1. Avoid advanced features or wrappers; the generated `bootstrap_code` must be the absolute simplest path to verify connection.
2. Align `bootstrap_code` strictly to the team's language/framework in `tech_stack` (e.g., if JS/React, generate TypeScript; if Python/FastAPI, generate Python).
3. Explicitly state the library install command (e.g., `npm install` or `pip install`).
4. Include mock inputs and expected console outputs in comments within the code.
5. Highlight default ports, base URLs, or sandbox endpoints if they differ from production.

---

## Output Format

```yaml
quickstart_steps:
  - step: <number>
    title: '<title>'
    action: '<what to do>'
    time_estimate_minutes: <number>

required_secrets:
  - env_var: '<variable name>'
    description: '<what it is>'
    source: '<where/how to get it>'

bootstrap_code:
  language: '<language>'
  install_command: '<command>'
  file_name: '<file name>'
  code: |
    <code>

troubleshooting:
  - error_description: '<error message or symptom>'
    cause: '<why it happens>'
    solution: '<how to fix>'

wow_potential:
  - idea: '<how to use/frame the tech>'
    benefit: '<why sponsor judges will love it>'
```

---

## Example

**Input:**

```yaml
sponsor_name: 'Cartesi'
technology_name: 'Cartesi Rollups SDK'
raw_documentation: |
  To build a Cartesi DApp, install the Cartesi CLI: npm install -g @cartesi/cli.
  Initialize a project: cartesi create my-app --template python.
  The DApp runs inside a Docker sandbox. Build it with: cartesi build.
  Start the local dev environment: cartesi run.
  To send an advance state transition request from the frontend, use the Cartesi Rollups GraphQL API.
  GraphQL endpoint in development runs at http://localhost:8080/graphql.
  Query: mutation { addInput(input: {payload: "0x..."}) { index } }
tech_stack: ['Python', 'React', 'Docker']
use_case: 'Send a calculation request to the Python backend running in Cartesi VM'
```

**Output:**

```yaml
quickstart_steps:
  - step: 1
    title: 'CLI Installation'
    action: 'Install the Cartesi global command-line tool using npm: npm install -g @cartesi/cli'
    time_estimate_minutes: 5
  - step: 2
    title: 'Initialize VM App'
    action: 'Run: cartesi create patient-portal-vm --template python. This builds the Python VM wrapper.'
    time_estimate_minutes: 5
  - step: 3
    title: 'Start Dev Sandbox'
    action: 'Ensure Docker is running. In your VM project folder, run: cartesi build, then cartesi run to spin up local nodes.'
    time_estimate_minutes: 10
  - step: 4
    title: 'Verify Connection'
    action: 'Run the bootstrap code from the host machine to send a test payload.'
    time_estimate_minutes: 5

required_secrets:
  - env_var: 'CARTESI_NODE_URL'
    description: 'The GraphQL endpoint of the local Cartesi Node'
    source: 'Defaults to http://localhost:8080/graphql during local testing'

bootstrap_code:
  language: 'javascript'
  install_command: 'npm install graphql-request'
  file_name: 'cartesi-sender.js'
  code: |
    // Minimal sender to push input into the Cartesi VM
    const { GraphQLClient, gql } = require('graphql-request');

    const endpoint = process.env.CARTESI_NODE_URL || 'http://localhost:8080/graphql';
    const client = new GraphQLClient(endpoint);

    // Convert plain string to Hex representation as Cartesi expects Hex payloads
    function stringToHex(str) {
      return '0x' + Buffer.from(str, 'utf8').toString('hex');
    }

    async function sendInput(payloadText) {
      const hexPayload = stringToHex(payloadText);
      
      const mutation = gql`
        mutation AddInput($input: AddInputInput!) {
          addInput(input: $input) {
            index
          }
        }
      `;

      const variables = {
        input: {
          dapp: '0xab7528bb862fb57e8a2bcd567a2e929a0be56a5e', // default local address
          payload: hexPayload
        }
      };

      try {
        console.log(`Sending payload: "${payloadText}" (${hexPayload})...`);
        const data = await client.request(mutation, variables);
        console.log('Success! Input Index:', data.addInput.index);
      } catch (error) {
        console.error('Failed to send input:', error.message);
      }
    }

    // Test run
    sendInput('Hello Cartesi VM');

troubleshooting:
  - error_description: 'Failed to connect to http://localhost:8080/graphql'
    cause: "Cartesi local node is not running or Docker container crashed during 'cartesi run'"
    solution: "Check Docker dashboard. Run 'docker ps' to see if nodes are active. Restart with 'cartesi build && cartesi run'."
  - error_description: 'DApp rejection in logs'
    cause: "The VM backend logic threw an exception because it didn't decode the hex format properly"
    solution: 'Verify DApp receiver code is converting the hex payload back into plain text before processing.'

wow_potential:
  - idea: 'Highlight verifiable calculation'
    benefit: 'Sponsor judges will love that your Python processing runs fully deterministically inside the Cartesi VM, making it auditable and secure.'
```

---

## Context Files

### Knowledge Base

- `../hackathon-shared-resources/knowledge/hackathon-tools.md`

### Playbooks

- `../hackathon-shared-resources/playbooks/hackathon-workflow.md`
