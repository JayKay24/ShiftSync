# Architecture Decision Records (ADRs)

This document serves as the centralized catalog of foundational Architecture Decision Records (ADRs) for ShiftSync. Each record documents the context, alternatives considered, decision outcome, consequences, and pull request references.

---

## 📑 ADR Index

| ADR         | Title                                                                                                                                |   Status   |    Date     | Primary Reference                                                                                                 |
| :---------- | :----------------------------------------------------------------------------------------------------------------------------------- | :--------: | :---------: | :---------------------------------------------------------------------------------------------------------------- |
| **ADR-001** | [Nx Monorepo & Shared Data Access Library](#adr-001-nx-monorepo--shared-data-access-library)                                         | `Accepted` | Initial MVP | Monorepo Setup                                                                                                    |
| **ADR-002** | [PostgreSQL + Drizzle ORM with `@nestjs/drizzle`](#adr-002-postgresql--drizzle-orm-with-official-nestjsdrizzle-di)                   | `Accepted` |  Post-MVP   | PR [#74](https://github.com/JayKay24/ShiftSync/pull/74)                                                           |
| **ADR-003** | [Client Migration from Next.js to React 19 + Vite SPA](#adr-003-client-migration-from-nextjs-to-react-19--vite--react-router-v7-spa) | `Accepted` |  Refactor   | PR [#79](https://github.com/JayKay24/ShiftSync/pull/79)                                                           |
| **ADR-004** | [3-Tier Feature-Based Client Architecture & ESLint Boundaries](#adr-004-3-tier-feature-based-client-architecture--eslint-boundaries) | `Accepted` |  Refactor   | PR [#96](https://github.com/JayKay24/ShiftSync/pull/96)                                                           |
| **ADR-005** | [Centralized Zod Environment Configuration](#adr-005-centralized-zod-environment-configuration)                                      | `Accepted` |  Refactor   | PR [#98](https://github.com/JayKay24/ShiftSync/pull/98)                                                           |
| **ADR-006** | [Universal Cursor-Based Pagination](#adr-006-universal-cursor-based-pagination-across-all-collections)                               | `Accepted` | Enhancement | PR [#77](https://github.com/JayKay24/ShiftSync/pull/77), [#78](https://github.com/JayKay24/ShiftSync/pull/78)     |
| **ADR-007** | [Real-Time WebSockets with Socket.io Room Scoping](#adr-007-real-time-websockets-with-socketio-room-scoping)                         | `Accepted` |    Core     | `NotificationGateway`                                                                                             |
| **ADR-008** | [Compliance Engine & 7th Consecutive Day Override Auditing](#adr-008-labor-law-compliance-engine--override-auditing)                 | `Accepted` |    Core     | `ComplianceService`                                                                                               |
| **ADR-009** | [Shift Swap Lifecycle & Auto-Cancellation on Shift Mutation](#adr-009-shift-swap-lifecycle--auto-cancellation-on-shift-mutation)     | `Accepted` |    Core     | `SwapService`                                                                                                     |
| **ADR-010** | [UTC Database Storage & Location-Aware Timezone Evaluation](#adr-010-utc-persistence--location-aware-timezone-rendering)             | `Accepted` |    Core     | `Intl.DateTimeFormat`                                                                                             |
| **ADR-011** | [Unified Vitest Testing Stack across Backend & Monorepo](#adr-011-unified-vitest-testing-stack-across-backend--monorepo)             | `Accepted` | Enhancement | PR [#101](https://github.com/JayKay24/ShiftSync/pull/101), [#102](https://github.com/JayKay24/ShiftSync/pull/102) |
| **ADR-012** | [CI/CD Automation with `nx affected` Gating & Semantic Release](#adr-012-cicd-automation-with-nx-affected-gating--semantic-release)  | `Accepted` |   DevOps    | PR [#73](https://github.com/JayKay24/ShiftSync/pull/73), [#89](https://github.com/JayKay24/ShiftSync/pull/89)     |

---

## ADR-001: Nx Monorepo & Shared Data Access Library

### Status

`Accepted`

### Context

ShiftSync requires full-stack type safety across backend APIs, frontend client views, database entities, and integration tests. In multi-repo setups, data contracts, schemas, and DTOs frequently drift, causing runtime bugs.

### Decision

Adopt an **Nx monorepo** with a centralized, shared library: `@shiftsync/data-access` (`libs/shared/data-access`). This library houses:

1. All Drizzle ORM entity definitions and relation graphs.
2. Domain repositories encapsulating SQL transactions.
3. API request/response DTOs decorated with `class-validator`.
4. Shared pagination and helper utilities.

### Alternatives Considered

- _Separate Git Repositories_: Rejected due to high overhead for synchronized contract changes and versioning friction.
- _Turborepo / npm Workspaces_: Nx was selected for its mature computation caching, project graph analysis, and first-class NestJS/Vite/Playwright plugins.

### Consequences

- **Positive**: 100% end-to-end type safety; contract drift eliminated; atomic full-stack pull requests.
- **Negative**: Monorepo tooling requires developer familiarity with Nx CLI commands.

---

## ADR-002: PostgreSQL + Drizzle ORM with Official `@nestjs/drizzle` DI

### Status

`Accepted` (PR [#74](https://github.com/JayKay24/ShiftSync/pull/74))

### Context

The backend initially used custom factory providers to inject Drizzle ORM instances. As the application grew, standardizing database lifecycle management, connection pooling, and dependency injection across NestJS modules became critical.

### Decision

Migrate database connectivity to the official `@nestjs/drizzle` package with a global `DatabaseModule` (`apps/server/src/app/database.module.ts`), exposing database injection via `getDrizzleToken()` and exporting repositories through a global `RepositoriesModule`.

### Alternatives Considered

- _TypeORM / Prisma_: Rejected due to heavyweight query overhead, complex code generation, and poor TypeScript inference compared to Drizzle's zero-cost type inference and SQL-like transparency.

### Consequences

- **Positive**: Clean NestJS dependency injection; robust connection lifecycle; type-safe relational (`db.query`) and standard (`db.select`) query APIs.
- **Negative**: Repository classes must accept typed `NodePgDatabase<typeof schema>` instances.

---

## ADR-003: Client Migration from Next.js to React 19 + Vite + React Router v7 SPA

### Status

`Accepted` (PR [#79](https://github.com/JayKay24/ShiftSync/pull/79))

### Context

ShiftSync was initially scaffolded with Next.js. However, ShiftSync is an authenticated, real-time internal application where server-side rendering (SSR) provided no SEO benefits while introducing SSR hydration issues, WebSockets lifecycle conflicts, and slower local HMR turnaround.

### Decision

Migrate the frontend application to a pure **React 19 SPA** powered by **Vite** and **React Router v7** (`apps/client`).

### Alternatives Considered

- _Retain Next.js (App Router)_: Slower dev server startup and unnecessary complexity managing persistent WebSocket connections across SSR page transitions.

### Consequences

- **Positive**: Instant HMR and builds with Vite; clean client-side WebSocket lifecycle; simplified Docker Nginx static file containerization.
- **Negative**: Required migrating page routes to React Router v7 routes.

---

## ADR-004: 3-Tier Feature-Based Client Architecture & ESLint Boundaries

### Status

`Accepted` (PR [#96](https://github.com/JayKay24/ShiftSync/pull/96))

### Context

As the client expanded, a flat file structure led to tangled imports and cross-domain coupling. We needed clear architectural boundaries aligned with industry best practices (_React Application Architecture for Production, 2nd Edition_).

### Decision

Refactor `apps/client` into a strict 3-tier feature-based architecture:

1. `app/`: Application routing and app shell.
2. `features/`: 8 domain-scoped modules (`auth`, `shifts`, `swaps`, `staff`, `analytics`, `audit`, `notifications`, `profile`).
3. `components/`, `lib/`, `config/`: Shared, domain-agnostic UI and helpers.
   Enforce boundaries via custom ESLint rules in `eslint-import-rules.mjs`.

### Alternatives Considered

- _Feature-by-type (controllers/views/models)_: Leads to cross-cutting spaghetti imports in large apps.

### Consequences

- **Positive**: Modular, scalable domain boundaries; zero circular dependencies; ESLint fails fast if boundaries are violated.
- **Negative**: Developers must organize code within domain feature directories.

---

## ADR-005: Centralized Zod Environment Configuration

### Status

`Accepted` (PR [#98](https://github.com/JayKay24/ShiftSync/pull/98))

### Context

Accessing environment variables directly via `import.meta.env.VITE_*` scattered across client code caused missing variable runtime bugs and leaked Vite-specific prefixes into business logic.

### Decision

Introduce `apps/client/src/config/env.ts` using **Zod** (`z.string().url()`) to parse and validate client environment variables at startup, removing the `VITE_` prefix and exposing clean domain constants (`API_URL`, `SOCKET_URL`).

### Alternatives Considered

- _Unvalidated process.env_: Risky, fails late at runtime when an HTTP request fails.

### Consequences

- **Positive**: Immediate startup validation failure if environment is misconfigured; clean, framework-agnostic variable names.

---

## ADR-006: Universal Cursor-Based Pagination Across All Collections

### Status

`Accepted` (PR [#77](https://github.com/JayKay24/ShiftSync/pull/77), [#78](https://github.com/JayKay24/ShiftSync/pull/78))

### Context

Traditional offset/limit pagination (`OFFSET 50 LIMIT 10`) performs poorly on large tables ($O(N)$ row scanning) and causes skipped or duplicate records when shifts are added or deleted while a manager browses.

### Decision

Standardize all list collections (Shifts, Swaps, Staff, Audit Logs, Notifications) on **Cursor-Based Pagination** using Base64-encoded `createdAt` + `id` pointers in `@shiftsync/data-access` (`paginateWithCursor`).

### Alternatives Considered

- _Offset/Limit Pagination_: Poor scalability on dynamic schedule boards.

### Consequences

- **Positive**: $O(1)$ database query performance using indexed cursor comparisons (`WHERE (created_at, id) < (cursor_date, cursor_id)`); rock-solid stability during real-time schedule mutations.
- **Negative**: Random page jumping is not supported (natural fit for "Load More" and infinite feeds).

---

## ADR-007: Real-Time WebSockets with Socket.io Room Scoping

### Status

`Accepted`

### Context

Shift updates, emergency cancellations, and swap approvals must appear immediately on active manager and staff screens without requiring manual page refreshes.

### Decision

Implement **Socket.io** WebSockets with room-based scoping (`apps/server/src/app/notifications/notification.gateway.ts`). Clients authenticate and join specific rooms (`user:<id>`, `location:<id>`).

### Alternatives Considered

- _HTTP Polling_: Excessive network overhead and delayed notifications.
- _Server-Sent Events (SSE)_: Unidirectional; WebSockets provide unified bidirectional capabilities.

### Consequences

- **Positive**: Sub-second schedule and notification delivery; client reconnection resilience; scoped data broadcasting.

---

## ADR-008: Labor Law Compliance Engine & Override Auditing

### Status

`Accepted`

### Context

Labor laws impose strict constraints on rest periods, daily limits, and consecutive workdays. These rules must be applied consistently across shift creation, assignments, and swaps.

### Decision

Encapsulate all labor law checks within `ComplianceService`. Enforce **Hard Blocks** on 10-hour rest violations, double-booking, and 12-hour daily caps. Require an explicit `overrideReason` for 7th consecutive day assignments, which is immutably recorded in `audit_logs`.

### Alternatives Considered

- _Database Triggers_: Difficult to maintain, test, and emit structured user-facing warning messages.

### Consequences

- **Positive**: Centralized, testable compliance algorithms; audit compliance.

---

## ADR-009: Shift Swap Lifecycle & Auto-Cancellation on Shift Mutation

### Status

`Accepted`

### Context

Peer-to-peer shift swaps require multi-step consent (Request $\rightarrow$ Accept $\rightarrow$ Manager Approve). If a manager edits a shift while a swap is pending, workers could be assigned to hours they never agreed to.

### Decision

Implement a formalized swap state machine in `SwapService`. Enforce a **Regret / Auto-Cancel Rule**: modifying shift start, end, location, or skill automatically cancels all pending swap/drop requests for that shift and notifies participants. Limit staff to **3 active pending requests**.

### Alternatives Considered

- _Allowing swaps to proceed after shift edit_: Creates severe labor disputes when employees inherit shifted hours.

### Consequences

- **Positive**: Complete fairness and predictability for floor staff.

---

## ADR-010: UTC Persistence & Location-Aware Timezone Rendering

### Status

`Accepted`

### Context

Coastal Eats operates across New York and California. Scheduling errors occur if availability or overnight hours are evaluated in the server's local timezone.

### Decision

Store all timestamps strictly in **UTC** in PostgreSQL (`timestamptz`). Store the canonical IANA timezone in `locations.timezone`. Perform all day-boundary calculations, overnight math, and client rendering in the location's local timezone using standard `Intl.DateTimeFormat`.

### Alternatives Considered

- _Storing local timestamps without timezone_: Causes catastrophic errors during Daylight Saving transitions.

### Consequences

- **Positive**: Flawless cross-timezone scheduling and accurate premium shift detection.

---

## ADR-011: Unified Vitest Testing Stack across Backend & Monorepo

### Status

`Accepted` (PR [#101](https://github.com/JayKay24/ShiftSync/pull/101), [#102](https://github.com/JayKay24/ShiftSync/pull/102))

### Context

The frontend used Vitest, while the backend and integration suites ran on Jest with `ts-jest`. Maintaining two different test runners increased configuration complexity, memory overhead, and CI runtimes.

### Decision

Migrate `apps/server`, `libs/shared/data-access`, and `apps/server-e2e` from Jest to **Vitest** with `unplugin-swc` for ultra-fast TypeScript compilation and native ESM support. Retain **Playwright** for browser UI E2E testing.

### Alternatives Considered

- _Retain Jest on Backend_: Slower execution and split runner maintenance.

### Consequences

- **Positive**: 100% unified test tooling, instant test startup, reduced CI dependencies.

---

## ADR-012: CI/CD Automation with `nx affected` Gating & Semantic Release

### Status

`Accepted` (PR [#73](https://github.com/JayKay24/ShiftSync/pull/73), [#89](https://github.com/JayKay24/ShiftSync/pull/89))

### Context

Running full test suites and Playwright browser tests on every commit regardless of what changed causes CI bottlenecks and slows developer feedback. Manual releases lead to untagged commits and incomplete changelogs.

### Decision

1. Implement GitHub Actions CI (`.github/workflows/ci.yml`) leveraging **`nx affected`** to conditionally run E2E suites (`server-e2e`, `client-e2e`) only when relevant code paths change.
2. Automate release management using **`nx release`** (`.github/workflows/release.yml`), computing Semantic Versioning increments from Conventional Commits, updating `CHANGELOG.md`, and tagging releases.

### Alternatives Considered

- _Unconditional E2E runs_: Wasted CI runner minutes and slow PR turnaround.

### Consequences

- **Positive**: Fast CI pipelines; automated, predictable semantic releases; complete changelog transparency.
