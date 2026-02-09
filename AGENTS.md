# Agent Guidance

This repo favors a modular design with clear boundaries. Preserve layer separation:
- **Policy / business logic** lives in services.
- **IO / persistence / framework glue** lives at the edges (stores, API wiring, config loading).
- **Implementation-specific details stay behind stable interfaces**, so underlying mechanisms can change without impacting the core logic that depends on them.

Simplicity here means **few distinct concepts, clear relationships, low conceptual surface area**.
Operationally: **abstract at module boundaries; stay concrete and explicit within a module**.


## Workflow (Default Operating Mode)

- Make the **smallest change** that solves the problem.
- Do not refactor unrelated code. If you notice issues, **call them out but don’t fix** unless asked.
- Prefer adapting existing patterns over introducing new ones.
- Keep diffs reviewable: avoid “drive-by” renames, formatting, or reorganizations.

Ask before changes that:
- Affect user-visible behavior in a non-trivial way
- Touch data models / migrations / persistence semantics
- Introduce new dependencies or new architectural layers
- Expand scope beyond the requested fix/feature


## Architecture Boundaries

**Boundaries are intentional. Do not leak concepts across them.**

- **Services**: domain policy, orchestration, validation, limits, and business rules.
  - Should not know about SQLite, SQL strings, or data store specifics.
  - Prefer small, focused, testable functions with explicit inputs/outputs.
  - Prefer composition over inheritance.

- **Stores**: persistence details and query shaping.
  - Store interfaces define stable operations; database implementations can change freely.
  - Keep DB concerns local (transactions, indexing decisions, query performance).

- **API layer**: request/response mapping, auth/limits middleware, input validation, status codes.
  - Avoid putting domain policy here—route handlers should stay thin.

- **Config**: explicit configuration loading and validation.
  - Fail fast on missing/invalid config; avoid implicit defaults that hide problems.

Heuristic: introduce an abstraction **only** if it reduces the concepts a caller must understand
(e.g., hides volatility, enforces a boundary, or makes testing easier). Avoid “frameworky” generalization.


## Project Tenets (Trade-off Overrides)

1. **Optimize for operational calm.**
   Prefer predictable, low-maintenance designs that are hard to misuse, overspend, or break accidentally.

2. **Focus on the conversation.**
   Prioritize depth, focus, and thoughtful responses over engagement mechanics, growth loops, or sharing.

3. **Shape before scale.**
   Choose the simplest architecture that preserves the intended experience. Resist infrastructure that increases complexity.


## Principles

### Simplicity & Structure
- Favor **simple** systems (few concepts, clear relationships) over “easy” shortcuts that create hidden coupling.
- Abstract **at module boundaries**; stay concrete and explicit inside a module.
- Prefer simple, composable designs. Separate **policy** (core logic) from **mechanism** (IO/DB/frameworks).
- Avoid clever “universal” machinery. Prefer domain-shaped pieces that interact naturally.
- Prefer composition over inheritance. Favor focused, testable functions/methods.

### Explicitness & Correctness
- Favor explicit logic, limits, and error handling over implicit behavior.
  Clarity beats cleverness; “obvious” is better than “cute.”
- Prefer clear, actionable errors. Fail fast when required assumptions or configuration are unmet.
- Resolve warnings and errors promptly. If truly benign, document why and use an explicit ignore.

### Quality & Change Management
- Tests are expected unless the change is purely mechanical.
  Aim for well-defined behavior (including edge cases), not maximal coverage.
- After large changes or error-heavy debugging, pause and check the overall shape:
  remove kludges, align structure to domain use-cases, simplify before shipping.

### Operability, Security, Privacy
- Build for observability: keep health endpoints (e.g., /ping, /deep-ping) and make diagnosis straightforward.
- Be mindful of data models and query patterns; avoid unnecessary complexity and performance regressions.
- Security is critical: follow OWASP Top Ten, defense-in-depth, and protect 3rd-party API usage.
- Favor privacy by default: avoid exposing conversation content beyond the user; prefer aggregated/summary metrics if needed.
- Prefer popular, well-supported libraries when selecting dependencies.

### UI / UX
- UX should be minimal and distraction-free: help users focus and think deeply.
- Prioritize user agency and contextual clarity in interactions
- Visual changes are allowed only if they reinforce focus or personality—never polish-for-polish.
- Prefer familiar UI/UX patterns over novelty when it reduces cognitive burden.
  Personality is good; functionality and clarity win.
- Avoid “too slick / corporate” aesthetics and avoid framework-default look-and-feel; aim for a calm, human tone.
