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

## Team lanes

- **A — Character & frontend**
- **B — Backend core**
- **C — AI layer**
- **D — Voice, integration, demo**

Task tracking lives in [Issues](../../issues) (labels `lane:A`–`lane:D`) with five phase-gate [milestones](../../milestones) running D1–D20 → submission 30 Jun 23:59 MYT.

## Attribution

This project builds on open-source work (Live2D runtime via `pixi-live2d-display`, Piper TTS, faster-whisper, and others). Third-party code and assets are attributed here and in commit messages as they are integrated.
