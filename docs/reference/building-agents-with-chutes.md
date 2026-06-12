# Keynote Summary: Building Agents with Chutes

**Source Video:** [Building Agents with Chutes](https://youtu.be/Rxu6P-WwFps?si=ysmotKP6CxX9Ar53)
**Speaker:** Vince, Team Member at Chutes
**Context:** Chutes Hackathon 2026

---

## 1. Core Philosophy: Chatbots vs. Agents

The speaker distinguishes between traditional interaction methods and actual modern-day agentic structures.

| Component        | Traditional Chatbot                                       | Modern AI Agent                                                                           |
| :--------------- | :-------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| **Analogy**      | The Brain alone (e.g., ChatGPT)                           | The Body + Brain combined                                                                 |
| **Interaction**  | One-shot conversations (Question & Response)              | Repeatable, automated system workflows                                                    |
| **Capabilities** | Text generation, code output requiring human copy-pasting | Orchestrates its own memory, uses built-in tools, executes solutions, and reports results |

---

## 2. Frameworks & Architecture

An agent is a **system**, not just a foundational model. It uses runtimes and orchestration layers to provide a physical "body" to an LLM's "brain."

- **Primary Runtimes/Orchestration Layers:**
  - **OpenClaw:** Described as the "fast path" with native out-of-the-box onboarding for Chutes.
  - **Hermes Agent:** Described as the "power path" and the speaker's preference. Features an advanced memory system and self-learning/self-evolving skills (e.g., capable of conducting "surgery on itself" to update local configs or swap out underlying models in real time).
- **The Brains (LLMs):** Runtimes can utilize a variety of open-source models depending on task requirements (e.g., Gemma 4 for quick tasks, DeepSeek-R1/Thinking models for reasoning, Qwen for large-scale coding environments).

---

## 3. The Chutes Value Proposition

Chutes acts as an open-source inference provider that sits underneath the agentic runtime layer.

- **Catalog Access:** Allows agents to hot-swap or coordinate across multiple open-source models simultaneously for different operational purposes under a single system.
- **Privacy & Trust Infrastructure:**
  - Powered by Trusted Execution Environments (TEEs).
  - Feature absolute zero data storage and zero prompt logging.
  - Employs end-to-end encryption to prevent upstream platform providers from spying on proprietary corporate strategy or training future models on user data.

---

## 4. Designing a Productivity Agent (The Canvas)

To build a functional business or productivity agent, the speaker outlines an operational workflow loop based on isolating specific workflow friction points:

```
[Identify Pain Point] -> [Frontload High Context] -> [Equip Specific Tools] -> [Define Output & Human-in-the-Loop]
```

### The 8-Point Design Frame

1. **Target Audience / Persona:** Define clearly who the agent serves (e.g., a 2-5 person student hackathon team).
2. **Pain Identification:** Locate the specific "squishy problems" (e.g., deadline slippage, context switching, option paralysis).
3. **Trigger Event:** Determine exactly what prompts the agent to initiate a task sequence (e.g., dropping a raw voice note or text brief).
4. **Context Layer:** Frontload precise real-world details. For internal teams, this includes team member names, GitHub repositories, social accounts, and past domain specialties.
5. **Tool Access / Skills:** Equip the body with actionable mechanics (e.g., documentation parsers, web browsers for testing, interactive Kanban dashboard managers).
6. **Actionable Output:** Focus on generating operational tools rather than text walls (e.g., explicit MVP scopes, task breakdowns assigned to specific individuals, risk mitigation matrix lists).
7. **Human-in-the-Loop (Approval):** Embed strict gatekeeping checkpoints where human team members must physically sign off before execution or sharing occurs.
8. **Data Sensitivity:** Map out how critical or proprietary data is segmented and protected via secure inference nodes.

---

## 5. Case Study: "Vain" (The Chutes Marketing Agent)

Chutes implemented its own virtual, agentic marketing employee built on top of a Hermes agent core.

- **Operational Integrations:** Granted read-only permission to the internal corporate Notion database as its single source of truth.
- **Brand Vibe Customization:** Integrated Google’s Design MD system directly into Vain to self-enforce strict brand guidelines, color assets, and a consistent humanized writing voice (e.g., forbidding automated styling traits like markdown em-dashes).
- **Automated Competitor Analysis Pipeline:** Developed a highly autonomous, multi-step pipeline sequence:
  1. Independently crawls web to research competitor platforms.
  2. Runs a structured delta-comparison against Chutes.
  3. Composes a fully cited research brief.
  4. Generates accompanying visual assets.
  5. Stages the completed content directly into the internal blog CMS as a draft.
  6. Dispatches a live web preview link directly to team members.
- **Team Scaling:** Vain was eventually deployed into the Chutes company Discord, moving from a single-user companion to a cross-functional corporate team member.
