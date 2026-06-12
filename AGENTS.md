# AGENTS.md — Kawan

Instructions for AI coding agents (Codex, Cursor, etc.) working in this repo. Claude Code users: CLAUDE.md carries these same conventions plus Claude-specific tooling notes.

## What this is

Kawan — a voiced, Live2D-animated accountability companion with a skeptical personality, built for Chutes Hack 2026 (submission 30 Jun 2026). Monorepo: `frontend/` (React 18 + Vite + TS) and `backend/` (FastAPI + SQLite + APScheduler).

## Source of truth

`docs/kawan-spec.md` decides. Derived views: `docs/prd.md` (product requirements, FR-xx), `docs/trd.md` (technical requirements, TR-xx), `docs/task-list.md` (lane assignments, canonical). On conflict, the spec wins — flag the discrepancy instead of silently picking one.

Chutes platform reference: `docs/reference/chutes-llms.md` (snapshot; live https://chutes.ai/llms.txt is authoritative).

## Iron rules (from the spec — do not violate)

- Kawan plans and verifies; it **never does the user's work** and never gives subject-matter help.
- Evidence over self-report; verdicts are three-valued (pass/fail/unclear) and `unclear` never punishes.
- AI writes only soft-context slots; hard fields (deadline, deliverable, stakes) are GUI-set and AI-read-only.
- No agent frameworks; no Live2D engine/SDK migration after the day-2 lock.

## Commit messages — Conventional Commits (mechanically enforced)

`type(scope): subject` — types: feat, fix, docs, chore, refactor, test, perf, build, ci, style, revert. Scope = lane or area (`feat(frontend):`, `fix(ai):`). Lower case, imperative, no trailing period. The husky `commit-msg` hook runs commitlint and rejects anything else. Judges review this git history — meaningful messages only.

## Pinned libraries — verify docs, don't trust memory

PixiJS **v6** + pixi-live2d-display (upstream is v8+ — high drift risk), React **18**, FastAPI, SQLAlchemy 2 async, APScheduler **3.x** (not 4). Check current version-correct docs (your tool's docs lookup or the web) before writing against these APIs.

## Dev commands

```bash
bun install                      # root: installs git hooks (husky) — run this first after clone
cd frontend && bun install && bun dev          # :5173, proxies /api and /ws to :8000
cd backend && uv sync && uv run uvicorn app.main:app --reload   # :8000
bunx prettier --check .          # formatting (also auto-runs on commit)
cd backend && uv run pytest      # backend tests
```

## Skills

Reusable agent skills live in `.agents/skills/` (tool-agnostic layout, managed via `skills-lock.json`). `.claude/skills/` is symlinks into it; wire your own tool's skill discovery to `.agents/skills/` if supported.
