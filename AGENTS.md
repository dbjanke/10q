# Agent Guidance

This repo favors a modular design with clear boundaries. Example: SQLite-specific code is isolated in the store layer ([backend/src/stores/sqlite/conversation.store.ts](backend/src/stores/sqlite/conversation.store.ts)) behind the interface in [backend/src/stores/conversation.store.ts](backend/src/stores/conversation.store.ts), keeping business logic in services.

## Principles
- Prefer simple, composable designs (Hickey’s “Simple Made Easy”). Separate policy (core logic) from implementation details (IO, DB, 3rd‑party APIs).
- After large changes or error-heavy debugging, pause to review the overall shape of the solution. Look for hacks/kludges, mismatches between structure and domain use cases, and opportunities to simplify or refactor before shipping.
- Resolve warnings and errors promptly; don’t let them accumulate. If a warning is truly benign, document the reasoning and use an explicit ignore directive.
- Always consider automated tests when adding/changing functionality; add or adjust tests to match behavior changes.
- Build for observability: keep health endpoints like /ping and /deep-ping, and make it easy to diagnose errors and system status over time.
- Be mindful of data models and query patterns; keep storage efficient and avoid unnecessary complexity or performance regressions.
- Security is critical: follow OWASP Top Ten, apply defense‑in‑depth, and protect 3rd‑party API usage.
- Favor privacy by default: avoid exposing conversation contents beyond the user; prefer aggregated/summary metrics if needed.
- Prefer popular, well‑supported libraries when selecting dependencies.
- Architecture style: clean/onion separation is preferred, but be pragmatic and follow common conventions for the stack.
