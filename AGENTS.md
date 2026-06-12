# AGENTS.md — Kawan

Instructions for AI coding agents (Codex, Cursor, etc.). This repo's primary agent tooling is Claude Code, so the canonical agent instructions live in **`CLAUDE.md` at the repo root — read that file first and follow it**. This file only adds translation notes for non-Claude tools; it deliberately duplicates nothing.

## Reading CLAUDE.md from a non-Claude tool

- **RTK section**: applies only if `rtk` is installed (it states this itself). If missing, run commands directly.
- **Context7 MCP references**: Claude Code-specific. The underlying rule still binds you — verify version-correct docs for the pinned libraries (PixiJS v6 + pixi-live2d-display, React 18, FastAPI, SQLAlchemy 2 async, APScheduler 3.x) via your own tool's docs lookup or the web, never from memory.
- **`.claude/` directory**: Claude Code plugin/skill wiring. The tool-agnostic skill sources live in `.agents/skills/` (managed via `skills-lock.json`); point your tool there if it supports skills, otherwise treat them as readable reference.

## Non-negotiables (mechanically enforced, tool-independent)

- Conventional Commits — the husky `commit-msg` hook (commitlint) rejects non-conforming messages.
- Formatting/linting — auto-applied to staged files on commit: Biome for JS/TS/JSON/CSS (`biome.json` at root), Prettier for Markdown only. Run `bun install` at the repo root once after clone to activate the hooks. Manual run: `bun run format` / `bun run lint`.
- Source of truth: `docs/kawan-spec.md` decides; `docs/prd.md`, `docs/trd.md`, `docs/task-list.md` are derived views. On conflict, the spec wins — flag, don't silently pick.
