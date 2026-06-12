# Kawan

> "This is Kawan. It doesn't believe you."

Kawan (Malay: _friend_) is a voiced, Live2D-animated accountability companion with a skeptical personality. You state **one commitment**, Kawan asks clarifying questions, proposes a plan — then verifies completion with **fetched evidence** (GitHub commits, vision-judged screenshots), never self-report.

Built for **Chutes Hack 2026** on the [Chutes](https://chutes.ai) platform: TEE-only inference, structured outputs as the control plane, multimodal evidence judging, and Sign-in-with-Chutes so inference bills to _your_ compute.

## Scope (the iron law)

Kawan helps you plan and holds you accountable. It **never does the work** and never gives subject-matter help.

## Layout

| Path        | What                                                | Lane |
| ----------- | --------------------------------------------------- | ---- |
| `frontend/` | React 18 + Vite + TypeScript, Live2D stage, PWA     | A    |
| `backend/`  | FastAPI + SQLite + APScheduler, SIWC auth, AI layer | B/C  |

## Quickstart

```bash
bun install                 # root: husky hooks + formatting tooling

# frontend (http://localhost:5173, proxies /api and /ws to :8000)
cd frontend && bun install && bun dev

# backend (http://localhost:8000, needs uv: https://docs.astral.sh/uv/)
cd backend && cp .env.example .env && uv sync && uv run uvicorn app.main:app --reload
```

Health check: `curl http://localhost:8000/api/health` → `{"status":"ok"}`.

## Team lanes

- **A — Character & frontend**
- **B — Backend core**
- **C — AI layer**
- **D — Voice, integration, demo**

Lane responsibilities and the task breakdown live in [`docs/task-list.md`](./docs/task-list.md) (canonical), running D1–D20 → submission 30 Jun 23:59 MYT. GitHub Issues are optional per teammate; lane labels and phase-gate milestones exist on the repo if you want them.

## Attribution

This project builds on open-source work (Live2D runtime via `pixi-live2d-display`, Piper TTS, faster-whisper, and others). Third-party code and assets are attributed here and in commit messages as they are integrated.
