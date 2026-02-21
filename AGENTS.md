## Agent Guidance

This repo favors modular design with strict boundaries. Preserve layer separation:

* **Policy / business logic** lives in services.
* **IO / persistence / framework glue** lives at the edges (stores, API wiring, config loading).
* **Implementation details stay behind stable interfaces.** Core logic must not depend on underlying mechanisms.

Simplicity means **few concepts, clear relationships, low conceptual surface area**.
Operational rule: **abstract at module boundaries; stay concrete and explicit within modules.**

---

## Workflow (Default Operating Mode)

* Make the **smallest change** that solves the problem.
* Do not refactor unrelated code. If issues are noticed, **call them out but do not fix** unless asked.
* Prefer existing patterns over introducing new ones.
* Keep diffs reviewable. Avoid drive-by renames, formatting, or reorganization.

Ask before changes that:

* Affect user-visible behavior in a non-trivial way
* Modify data models, migrations, or persistence semantics
* Introduce new dependencies or architectural layers
* Expand scope beyond the requested fix/feature

---

## Architecture Boundaries

**Boundaries are intentional. Do not leak concepts across them.**

* **Services**: domain policy, orchestration, validation, limits, business rules.

  * Must not import database drivers or reference SQL/storage details.
  * Keep functions small, explicit, and testable.
  * Prefer composition over inheritance.

* **Stores**: persistence and query shaping only.

  * Store interfaces define stable operations; implementations may change freely.
  * Keep transactions, indexing, and performance concerns local.

* **API layer**: request/response mapping, auth/limits middleware, validation, status codes.

  * Keep route handlers thin. Do not embed domain policy.

* **Config**: explicit configuration loading and validation.

  * Fail fast on missing or invalid configuration.
  * Do not hide behavior behind implicit defaults.

Introduce abstractions only when they reduce what a caller must understand.
Avoid generalization that increases conceptual surface area.

---

## Project Tenets (Trade-off Overrides)

1. **Optimize for operational calm.**
   Prefer designs that are predictable, hard to misuse, and low-maintenance.

2. **Focus on the conversation.**
   Prioritize depth and clarity over engagement mechanics or growth loops.

3. **Shape before scale.**
   Choose the simplest architecture that preserves intent. Resist premature infrastructure.

---

## Principles

### Simplicity & Structure

* Favor systems with few concepts and clear relationships.
* Abstract at boundaries; remain explicit within modules.
* Separate **policy** (core logic) from **mechanism** (IO/DB/frameworks).
* Avoid universal or framework-shaped machinery unless the domain demands it.
* Prefer composition and focused, testable units.

### Constants & Configuration

* Do not mix values with logic. Separate **data** from **behavior**.
* No inline user-facing strings in UI code. Centralize copy in a dedicated strings/i18n module.
* Behavior constants (limits, retries, timeouts, thresholds, flags) belong in config.
* No magic numbers. Name them at module scope at minimum.

Clarity of meaning outweighs convenience of inlining.

### Explicitness & Correctness

* Prefer explicit logic, limits, and error handling over implicit behavior.
* Fail fast when assumptions or required configuration are unmet.
* Prefer clear, actionable errors.
* Resolve warnings promptly. If suppression is necessary, document why.

### Quality & Change Management

* Tests are expected unless the change is purely mechanical.
* Validate defined behavior, including edge cases; avoid superficial coverage.
* After large changes or heavy debugging, reassess structure:
  remove kludges, realign to domain use-cases, simplify before shipping.

### Operability, Security, Privacy

* Maintain health endpoints (e.g., `/ping`, `/deep-ping`) and straightforward diagnostics.
* Be deliberate with data models and queries; avoid unnecessary complexity or regressions.
* Follow OWASP Top Ten and defense-in-depth principles.
* Default to privacy. Avoid exposing conversation content; prefer aggregated metrics.
* Prefer well-supported, widely adopted dependencies.

### UI / UX

* UX must be minimal and distraction-free.
* Reinforce focus and user agency.
* Visual changes require functional justification.
* Prefer familiar patterns when they reduce cognitive load.
* Avoid default framework aesthetics; aim for a calm, human tone.
