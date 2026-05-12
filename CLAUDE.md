# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup (installs deps, creates .env template, builds)
npm run setup

# Development (frontend on :5173, backend on :3001)
npm run dev

# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run a single backend test file
cd backend && npx vitest run src/__tests__/services/conversation.service.test.ts

# Run a single frontend test file
cd frontend && NODE_ENV=development npx vitest run src/__tests__/components/Dashboard.test.tsx

# Lint
npm run lint

# Production build + start
npm run build && npm start
```

Schema changes: edit `backend/database/schema.sql`, delete `backend/data/10q.db`, restart.

## Architecture

Monorepo with `backend/` (Express + TypeScript + SQLite) and `frontend/` (React + Vite + Tailwind). In dev, Vite proxies `/api/*` to port 3001. In production, the backend serves `frontend/dist` at root.

### Request flow

`routes.ts` → `services/` (domain logic) → `stores/` (persistence) → SQLite

Route handlers are thin: auth/validation/response shaping only. Domain policy lives in services. The `ConversationStore` interface in `backend/src/stores/conversation.store.ts` is the persistence boundary — the SQLite implementation can be swapped without touching services.

### Core question progression

Creating a conversation triggers Q1 generation immediately. Each user response triggers: highlights generation → next question generation (or summary generation if Q10). All three LLM calls pass the full message history. The OpenAI service wraps calls in a circuit breaker (opossum). Q1 may use a `staticQuestion` defined in `config/commands.json` rather than calling the LLM.

Message types stored in the DB: `question`, `response`, `summary`, `highlight`. Highlights are regenerated after every response and stored as the latest `highlight` message; the summary receives the latest highlights content as additional context.

### Configuration

`config/commands.json` — the 10-question plan (name, prompt, optional `staticQuestion` per step).  
`config/system-prompts.json` — system prompts for question generation, summarization, and highlights.  
Both are loaded at startup from `backend/src/config/`.

Validation constants (max title/response length) are duplicated in `backend/src/config/validation.ts` and `frontend/src/config/validation.ts` — keep them in sync.

### Auth and permissions

Google OAuth via Passport. Sessions stored in SQLite (`better-sqlite3-session-store`). `requireAuth` middleware gates all `/api/*` routes except `/ping` and `/deep-ping`. Per-user permissions (e.g. `regenerate_summary_question`) are checked via `requirePermission` middleware. Admin users manage the Google account allowlist.

### Frontend

All API calls go through `frontend/src/hooks/useApi.ts` (plain async functions, not a React hook). `fetchApi()` handles JSON headers, error parsing, and 204 responses. Frontend types use ISO strings for dates; backend types use `Date` objects — map at the store layer.

## Key principles (from AGENTS.md)

- **Smallest change** that solves the problem. Don't fix unrelated things; call them out instead.
- **Policy in services, mechanism at edges.** Services must not import DB drivers or reference SQL.
- **Abstract at module boundaries; stay concrete within modules.** Avoid generalization that increases conceptual surface area.
- **Fail fast** on missing config. No implicit defaults for required values.
- **UX is minimal and distraction-free.** Visual changes need functional justification. Avoid default framework aesthetics.
- Ask before changes that affect user-visible behavior, modify data models, introduce dependencies, or expand scope.
