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

## Environment variables

New environment variables must be added to `.env.example` (with a comment explaining the tradeoff) and documented in the relevant file under `docs/`.

Constants sourced from `process.env` at module load time (e.g. in `config/article.ts`) are fixed when the module is first imported. Tests that need to override them must mock the entire config module: `vi.mock('../../config/article.js', () => ({ ..., DELAY_MS: 0 }))` — setting `process.env` after import has no effect.

## Testing notes

Run test files from `backend/` or `frontend/` — running `npx vitest run` from the repo root uses the wrong environment config and produces spurious failures.

In frontend tests, `vi.spyOn(window, 'confirm')` throws in jsdom because `confirm` is undefined; use `vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))` instead.

`@testing-library/jest-dom` matcher methods (e.g. `toBeInTheDocument`) show TypeScript errors in the IDE — these are false positives; the matchers register at runtime via the vitest setup file.

`frontend/tsconfig.json` sets `"types": []` to prevent backend devDependencies (e.g. `@types/supertest`) from leaking into the frontend build via the shared root `node_modules`. Do not remove this; all frontend types are resolved through explicit imports.

In `ConversationView.test.tsx`, `ResponseInput` and `LoadingIndicator` are replaced by mocks that define their own `data-testid` attributes (`submit-btn`, `loading-indicator`). These testids don't exist in the real components. When adding new props to these components, update the mocks to forward them or the props won't be visible in tests.

## Architecture

Monorepo with `backend/` (Express + TypeScript + SQLite) and `frontend/` (React + Vite + Tailwind). In dev, Vite proxies `/api/*` to port 3001. In production, the backend serves `frontend/dist` at root.

### Request flow

`routes.ts` → `services/` (domain logic) → `stores/` (persistence) → SQLite

Route handlers are thin: auth/validation/response shaping only. Domain policy lives in services. The `ConversationStore` interface in `backend/src/stores/conversation.store.ts` is the persistence boundary — the SQLite implementation can be swapped without touching services.

### Core question progression

Creating a conversation triggers Q1 generation immediately. Each user response triggers: insights generation → next question generation (or summary generation if Q10). All three LLM calls pass the full message history. The OpenAI service wraps calls in a circuit breaker (opossum). Q1 may use a `staticQuestion` defined in `config/commands.json` rather than calling the LLM — `staticQuestion` always takes precedence, even when article context is present.

Multiple question options are generated per step and all persisted to the DB immediately. `openaiService.generateQuestion` always returns `string[]`. Steps with a `staticQuestion` return a single-element array without calling the LLM. When the user submits a response, all stored options for that step are deleted and only the selected question is re-saved, so the conversation history contains exactly one question per step.

The frontend derives carousel options directly from `conversation.messages` — it filters for unanswered question messages and reads the options from the DB rather than from API response payloads.

Message types stored in the DB: `question`, `response`, `summary`, `insight`, `conversation_context`. Multiple `question` rows can share a `questionNumber` while options are pending selection. Insights are regenerated after every response and stored as the latest `insight` message; the summary receives the latest insights content as additional context. Adding a new message type requires: updating the CHECK constraint in `backend/database/schema.sql`, the `Message.type` union in both `backend/src/types.ts` and `frontend/src/types.ts`, and the type parameters in the store interface, store implementation, and service.

### Configuration

`config/commands.json` — the 10-question plan (name, prompt, optional `staticQuestion` per step).  
`config/system-prompts.json` — system prompts for question generation, summarization, and insights. These are hand-tuned and validated through real use. Do not rewrite or refactor them without explicit instruction — changes that look like improvements often degrade output quality in subtle ways.  
Both are loaded at startup from `backend/src/config/`.

Validation constants (max title/response length) are duplicated in `backend/src/config/validation.ts` and `frontend/src/config/validation.ts` — keep them in sync. A test asserts these files are byte-for-byte identical; backend-only constants must go in a separate file, not in `validation.ts`.

### Auth and permissions

Google OAuth via Passport. Sessions stored in SQLite (`better-sqlite3-session-store`). `requireAuth` middleware gates all `/api/*` routes except `/ping` and `/deep-ping`. Per-user permissions (e.g. `regenerate_summary_question`) are checked via `requirePermission` middleware. Admin users manage the Google account allowlist.

### OpenAI message roles

In `openai.service.ts`, only the actual system prompt entry (e.g. `systemPrompts.questionPrompt`) uses `role: 'system'`. All other contextual messages — command blocks, key insights, conversation context — use `role: 'assistant'`. This matches the OpenAI convention that only one system message should anchor the request.

### Frontend

All API calls go through `frontend/src/hooks/useApi.ts` (plain async functions, not a React hook). `fetchApi()` handles JSON headers, error parsing, and 204 responses. Frontend types use ISO strings for dates; backend types use `Date` objects — map at the store layer.

## Design decisions

Consult `AGENTS.md` when making architectural decisions, choosing between implementation approaches, or deciding how a feature should behave. It contains project tenets and principles that should shape the design — not just the code style.

## Key principles (from AGENTS.md)

- **Smallest change** that solves the problem. Don't fix unrelated things; call them out instead.
- **Policy in services, mechanism at edges.** Services must not import DB drivers or reference SQL.
- **Abstract at module boundaries; stay concrete within modules.** Avoid generalization that increases conceptual surface area.
- **Fail fast** on missing config. No implicit defaults for required values.
- **UX is minimal and distraction-free.** Visual changes need functional justification. Avoid default framework aesthetics.
- Ask before changes that affect user-visible behavior, modify data models, introduce dependencies, or expand scope.
