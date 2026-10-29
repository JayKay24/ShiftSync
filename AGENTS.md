# ShiftSync - Technical Context & Guidelines

ShiftSync is a multi-location staff scheduling platform for **Coastal Eats**. It is built as a monorepo using **Nx**, featuring a **NestJS** backend, a **React (Vite)** frontend SPA, and a shared data access library.

---

## 🏗 Architecture Overview

- **Monorepo Management**: [Nx](https://nx.dev)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Real-Time**: WebSockets (Socket.io) for instant notifications and schedule update broadcasts.
- **Time Handling**: UTC storage with location-aware local timezone display via `Intl.DateTimeFormat`.
- **Quality Gates**: GitHub Actions continuous integration workflow running Commitlint, ESLint, TypeScript checks, builds, unit tests, and PostgreSQL integration suites.

---

## 📦 Shared Data Access Layer (`@shiftsync/data-access`)

The `@shiftsync/data-access` library is the backbone of the project, providing a single source of truth for database schemas, entity types, API contracts, and repositories.

### 🏛 Repository Pattern & Drizzle Usage

All SQL persistence logic is encapsulated within `src/lib/repositories/` to ensure a clean separation between business logic and database interactions.

- **Injection**: Repositories are initialized with an instance of `NodePgDatabase<typeof schema>`, allowing them to leverage both relational and standard query builders.
- **Relational Query API (`db.query`)**: Employed for complex queries involving joins and nested relations. Utilizes the `with` property for type-safe eager loading (e.g., fetching a shift along with its assignments and user profiles).
- **Standard Query API (`db.select`, `db.insert`, `db.update`, `db.delete`)**: Employed for simple CRUD operations and performance-critical mutations using helper operators like `eq`, `and`, `gte`, and `lte`.
- **Custom SQL Fragments**: The `sql` template literal is used for advanced filtering or dynamic SQL expressions (e.g., using `sql.join` for dynamic `IN` clauses).

#### Example: Relational vs. Standard Query API

```typescript
// Relational API for complex joins and eager loading
const shift = await this.db.query.shifts.findFirst({
  where: eq(shifts.id, id),
  with: { assignments: { with: { user: true } } },
});

// Standard API for targeted updates
await this.db.update(shifts).set(updates).where(eq(shifts.id, shiftId));
```

### 🧬 Entity Definitions & Strict Typing

Database tables are declared in `src/lib/entities/` using Drizzle ORM's `pgTable`.

- **Type Inference**: Drizzle's `InferSelectModel` and `InferInsertModel` utilities generate TypeScript types (e.g., `User`, `NewUser`, `Shift`, `NewShift`) directly from table definitions.
- **Relations**: Relationships (one-to-many, many-to-many) are defined using the Drizzle `relations` API, powering the repository layer's eager loading.

### 🔗 Schema Aggregation

The `src/lib/schema.ts` file serves as the centralized hub for the database schema:

- **Unified Schema**: Re-exports all tables and relation definitions into a single `schema` object.
- **Backend Initialization**: Passed to the backend Drizzle provider to initialize the database connection with complete awareness of all models.

### 📝 API Contracts & DTO Validation (`api-interfaces.ts`)

API request and response structures are defined in `src/lib/api-interfaces.ts`:

- **Request DTOs**: Use `class-validator` decorators to enforce runtime validation (e.g., `CreateShiftRequest`, `SwapRequestDto`).
- **Response Interfaces**: Define the exact contract of data returned to the client (e.g., `ShiftResponse`), extending base entity types with relation data.
- **End-to-End Type Safety**: Shared across NestJS controllers (for validation via `ValidationPipe`) and the Next.js client (for typed Axios calls), eliminating contract drift.

---

## 🖥️ Backend Application (`apps/server`)

The backend is a **NestJS** application utilizing **Drizzle ORM** for persistence and **Socket.io** for real-time events.

### Database Connection (`@nestjs/drizzle`)

The server connects to PostgreSQL via a global `DatabaseModule` (`src/app/database.module.ts`) configured with the official `@nestjs/drizzle` package:

- **Drizzle Integration**: Uses `DrizzleModule.forRootAsync` with connection string provided by `DATABASE_URL` via `ConfigService` and the shared schema from `@shiftsync/data-access`.
- **Drizzle Provider**: The official `getDrizzleToken()` (and backwards-compatible `DRIZZLE` token) injects `NodePgDatabase<typeof schema>`.
- **Global Availability**: `DatabaseModule` is decorated with `@Global()`, making database injection available application-wide.

```typescript
import { Inject } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@shiftsync/data-access';

// In a factory provider or service:
inject: [getDrizzleToken()];
// In constructor injection:
// constructor(@InjectDrizzle() private db: NodePgDatabase<typeof schema>) {}
```

### Repository Injection

Repositories from `@shiftsync/data-access` are registered and exported globally via `RepositoriesModule`. Services inject these repositories directly:

```typescript
import { Injectable } from '@nestjs/common';
import { ShiftRepository, UserRepository, NewShift } from '@shiftsync/data-access';

@Injectable()
export class ShiftsService {
  constructor(
    private shiftRepo: ShiftRepository,
    private userRepo: UserRepository,
  ) {}

  async createShift(newShift: NewShift) {
    // Business logic and compliance verification
    return this.shiftRepo.createShift(newShift);
  }
}
```

### Database Migrations

ShiftSync uses **Drizzle Kit** to manage schema migrations with configuration in root `drizzle.config.ts` and SQL migrations in `apps/server/src/migrations`:

- **Generating Migrations**: `npm run db:generate` compares entity definitions in `@shiftsync/data-access` with current migration files to produce new SQL migrations.
- **Applying Changes**:
  - Development/Testing: `npm run db:push` synchronizes the database schema directly without generating migration files.
  - Production/Staging: Migrations are applied using generated SQL files.
- **Schema Exploration**: `npm run db:studio` starts Drizzle Studio GUI for database inspection.

### Seeding & Test Data

The project features a comprehensive seed script in `apps/server/src/db/seed.ts`:

- **Command**: `npm run db:seed`
- **Behavioral Modes**:
  - **Full Seed (`--full`)**: Clears existing dynamic tables and populates base entities (Users, Locations) and complex scenarios (Shifts, Swaps, Overtime, Consecutivity).
  - **Base Seed**: When `NODE_ENV=test`, defaults to seeding base entities for fast, stable E2E testing.
- **Pagination Demo Data**: The full seed also creates 30 staff (15 per region), 85 shifts, 28 swap requests (13 awaiting manager approval), 50 notifications (25 each for Charlie and Bob), and 40 audit logs (14 on one shift) so every list view exceeds the client's default page size of 10 and shows the "Load More" flow.
- **Default Test Accounts** (Password: `password123`):
  - **Admin**: `admin@coastaleats.com` (Global visibility, 48h schedule lock bypass)
  - **Manager (NY)**: `bob.manager@coastaleats.com` (Manages Downtown & Uptown)
  - **Manager (LA)**: `diana.manager@coastaleats.com` (Manages Beach Grill)
  - **Staff (Charlie)**: `charlie.staff@coastaleats.com` (NY certified, unavailable Mondays)

### Core Backend Modules

- **ShiftsModule**: Handles shift lifecycle, assignments, and compliance validation via `ComplianceService`.
- **AuthModule**: Manages JWT authentication, password hashing (`bcryptjs`), and role-based guards.
- **NotificationModule**: Manages real-time event broadcasting and WebSocket gateways.
- **AuditModule**: Immutably records schedule modifications with actor, timestamp, and before/after state diffs.
- **ComplianceService**: Enforces labor law constraints including 10-hour rest gaps, 12-hour daily caps, and 7th consecutive day manager overrides.

---

## 🌐 Frontend Application (`apps/client`)

The frontend is a **React 19** Single Page Application (SPA) powered by **Vite**, **React Router v7**, **Tailwind CSS** for styling, and **Lucide React** for icons. It follows the **3-tier unidirectional feature-based architecture** modeled on _React Application Architecture for Production, 2nd Edition_ (Chapter 2).

### Directory Architecture

```text
apps/client/src/
├── app/
│   ├── app.tsx                                  # Root router configuration
│   ├── global.css                               # Global Tailwind styles
│   └── routes/                                  # Route views & app shell layout (DashboardLayout)
├── components/
│   └── ui/                                      # Pure, domain-agnostic UI primitives (Button, Card, etc.)
├── config/
│   └── env.ts                                   # Centralized, Zod-validated environment configuration
├── features/                                    # 8 domain-scoped modules matching backend domains
│   ├── {auth,shifts,swaps,staff,analytics,audit,notifications,profile}/
│   │   ├── api/                                 # Feature-specific API clients (shiftsApi, swapsApi, etc.)
│   │   ├── components/                          # Feature-specific modals and widgets
│   │   ├── hooks/                               # Feature-specific custom hooks
│   │   └── context/                             # Feature-specific React contexts (when applicable)
├── lib/
│   ├── api.ts                                   # Shared Axios client, Bearer interceptors, pagination defaults
│   └── utils.ts                                 # Tailwind cn() helper
└── main.tsx
```

### Architectural Boundary Enforcement (`eslint-import-rules.mjs`)

Architectural boundaries are strictly enforced via ESLint:

- **Shared Utilities & UI**: `src/components/**`, `src/config/**`, and `src/lib/**` cannot import from `src/features/**` or `src/app/**`.
- **Features**: `src/features/**` cannot import from `src/app/**`.
- **Cross-Feature DAG**: Forbidden cross-feature dependencies are blocked with descriptive errors (e.g. `auth` has 0 dependencies; `shifts` can only import `auth` and `audit`; `swaps` can only import `auth` and `notifications`).
- **Naming & Structure**: Enforced by `import/no-restricted-paths`, `import/no-cycle`, `import/order`, and `check-file/filename-naming-convention` (`KEBAB_CASE`).

### Environment Configuration (`src/config/env.ts`)

Client environment variables are never accessed raw via `import.meta.env` in domain code:

- **Zod Validation**: `src/config/env.ts` parses and validates variables at startup via `envSchema` (`z.string().url()`), failing fast with formatted errors if required variables are missing or malformed.
- **Prefix Removal**: Maps Vite's `VITE_API_URL` to clean domain properties (`API_URL`, `SOCKET_URL`).
- **Monorepo Root Resolution**: `apps/client/vite.config.mts` sets `envDir` pointing to the workspace root (`../../`) so Vite and Vitest reliably discover `.env`.

### API Consumption

The shared Axios instance lives in `src/lib/api.ts` configured with `env.API_URL` and Bearer token interceptors. Feature-specific API endpoints are encapsulated in their respective feature `api/` modules:

```typescript
import { api } from '@/lib/api';
import { ShiftResponse } from '@shiftsync/data-access';
import { shiftsApi } from '@/features/shifts/api/shifts-api';
```

### Styling & Utility Helper (`cn`)

Dynamic styling uses the standard `cn` helper in `src/lib/utils.ts` combining `clsx` and `tailwind-merge`:

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "px-4 py-2 rounded",
  isActive ? "bg-blue-500 text-white" : "bg-gray-200",
  className
)} />
```

### Routing & Authentication

- **Role-Based Redirects**: The landing page (`/` in `src/app/routes/landing.tsx`) automatically routes users to `/dashboard/manager` or `/dashboard/staff` based on their role stored in `AuthContext`.
- **Axios Interceptors**: Injects Bearer tokens on outgoing requests and handles automatic logout and redirection upon receiving 401 Unauthorized responses.
- **Notification Context**: Maintains a real-time unread notification badge counter synced across tabs via WebSockets.

---

## 🧪 Testing Strategy

ShiftSync employs a multi-layered testing strategy verifying business logic, compliance constraints, and end-to-end workflows.

### 1. Unit Tests

Unit tests are implemented with **Vitest** across the entire monorepo:

- `npx nx run-many -t test`: Runs all unit test suites.
- `apps/client`: Tests UI components, routing guards, and helper utilities with Vitest.
- `apps/server`: Tests service business logic, compliance calculation, and repository integration with Vitest and `unplugin-swc`.
- `libs/shared/data-access`: Tests DTO validation decorators and schema mapping with Vitest.

### 2. Backend Integration & E2E Tests (`apps/server-e2e`)

The server integration suite uses **Vitest** and **Axios** to validate database constraints, labor law rules, and API endpoints against an active PostgreSQL instance:

- **Command**: `npx nx e2e server-e2e`
- **Setup & Isolation**: `src/support/global-setup.ts` seeds the test database. Between individual tests, `clearDynamicData()` surgically purges transactional tables (shifts, assignments, swap requests) to maintain isolation without expensive full reseeding.
- **Coverage Suites**:
  - `scheduling.spec.ts`: Validates double-booking prevention and 10-hour rest period enforcement.
  - `compliance.spec.ts`: Tests 12-hour daily hard blocks and 7th consecutive day override documentation.
  - `cutoff-constraints.spec.ts`: Tests 48-hour schedule lock enforcement for managers and Admin bypass.
  - `swap.spec.ts` & `edge-cases.spec.ts`: Verifies complete shift swap lifecycle (request -> accept -> approve), auto-cancellation on shift edits, and 3-request caps.
  - `analytics.spec.ts`: Verifies calculation of the Fairness Index for premium shift distribution.
  - `manager-access.spec.ts`: Enforces location-based access control (LBAC).
- **Best Practices**:
  - Always call `clearDynamicData()` in `beforeEach` when tests create dynamic records.
  - Use relative date helpers (`getFutureDate`, `getNextWednesday`) to prevent hardcoded date expiration.
  - Use `safePost` and `safePut` helpers for descriptive error logging on API failures.

### 3. Frontend UI Behavior-Driven Development (BDD) (`apps/client-e2e`)

User-facing acceptance tests are written in declarative Gherkin `.feature` specifications and compiled into native Playwright tests using **`playwright-bdd`**:

- **Commands**:
  - `npm run bdd:test` (or `npx nx e2e client-e2e`): Compiles features via `bddgen` and runs Playwright tests.
  - `npm run bdd:ui`: Opens Playwright interactive UI mode for time-travel debugging.
  - `npm run bdd:export`: Lists all registered step definition patterns for easy step reuse.
  - `npm run bdd:docs`: Generates Markdown living documentation (`docs/wiki/BDD-Living-Documentation.md`).
  - `npm run bdd:docs:check`: Validates living documentation is synchronized with `.feature` files in CI.
- **Setup & Fixtures**:
  - `globalSetup` initializes the full seed baseline (`npm run db:seed -- --full`).
  - `apps/client-e2e/src/support/bdd-fixtures.ts`: Provides `test.extend` with `ScenarioStateManager` and fast `localStorage` session injection.
  - `apps/client-e2e/src/support/personas.ts`: Maps Coastal Eats personas (`Alice`, `Bob`, `Diana`, `Charlie`, `Dave`, etc.) to seeded credentials and roles.
  - `apps/client-e2e/src/support/api-fixtures.ts`: Sets up isolated preconditions and handles automatic post-scenario cleanup.
- **Living Documentation**:
  - Automatically outputs interactive Cucumber HTML reports to `dist/bdd-report/index.html`.
  - Compiles living specifications into `docs/wiki/BDD-Living-Documentation.md` which auto-syncs to the GitHub Wiki.
- **Interactive AI Browser Walkthroughs**:
  - Use `/browser` with the `.agents/skills/bdd-browser` skill to interactively step through any `.feature` file or `@tag` in the browser.

### 4. Component Testing & Living Documentation (Storybook)

Component-level documentation, visual state cataloging, and automated headless Chromium interaction and WCAG AA accessibility tests are powered by **Storybook 10** (`@storybook/react-vite`), **`@storybook/addon-vitest`**, and **`msw-storybook-addon`**:

- **Commands**:
  - `npm run storybook` (or `npx nx storybook client`): Starts Storybook dev server on port 6006.
  - `npm run storybook:build` (or `npx nx run client:build-storybook`): Compiles static documentation into `dist/storybook/client`.
  - `npm run storybook:test` (or `npx nx run client:test-storybook`): Runs all 16 component stories in headless Chromium via Playwright, executing MSW network mocks, `play()` assertions, and strict `axe-core` accessibility checks (`a11y.test: 'error'`).
- **Isolation Strategy**:
  - `withAppProviders` decorator provides `MemoryRouter`, simulated `AuthContext`, and socket-free `NotificationContext`.
  - MSW v3 handlers intercept API requests in the browser service worker (`apps/client/.storybook/public/mockServiceWorker.js`).

---

## 🌿 Development Workflow

All contributions, bug fixes, and feature implementations must strictly follow this branching and pull request workflow:

1. **Branch Off `develop`**: Never commit or push directly to `develop` or `main`. Always implement changes inside a new, descriptive branch created from the latest `develop` branch (e.g., `feat/<feature-name>`, `fix/<issue-name>`, `docs/<topic>`).
2. **Implement & Validate**: Make your changes and verify that all local quality gates pass:
   - TypeScript checks: `npm run typecheck`
   - Linting: `npx nx run-many -t lint`
   - Unit & integration tests: `npx nx run-many -t test`
3. **Conventional Commits**: Commit changes following the Conventional Commits specification enforced by Commitlint (e.g., `feat(...)`, `fix(...)`, `docs(...)`).
   - **Body Line Length**: Every line in the commit message body must not exceed **100 characters** (`body-max-line-length`). Wrap list bullets and explanations accordingly.
4. **Push & Create PR**: Push the branch to upstream (`origin`) and open a Pull Request targeting the `develop` branch for review and CI validation.
5. **Automated Release Pipeline**:
   - Merges from `develop` into `main` trigger the `Continuous Integration` suite. Upon successful completion, the `Release` workflow (`.github/workflows/release.yml`) automatically executes.
   - `nx release` parses conventional commits since the previous release, computes the appropriate semantic version increment (`feat` $\rightarrow$ minor, `fix` $\rightarrow$ patch, `BREAKING CHANGE` or `!` $\rightarrow$ major), updates the root `package.json`, generates `CHANGELOG.md`, creates a git tag (`vX.Y.Z`), and publishes a GitHub Release.
   - The release bot (`github-actions[bot]`) commits the bump (`chore(release): vX.Y.Z`) and pushes to `main`.
6. **Main-to-Develop Back-Merge**:
   - Following an automated release on `main`, `main` contains a new release commit and updated `CHANGELOG.md` that is not yet on `develop`.
   - Always back-merge `main` into `develop` (`git checkout develop && git pull origin develop && git merge origin/main && git push origin develop`) to ensure `develop` remains in sync with the latest released version and changelog.

---

## 📖 Code Documentation & JSDoc Standards

To ensure code clarity, readability, and maintainability across the ShiftSync monorepo, all TypeScript code must follow strict JSDoc documentation standards:

1. **JSDoc Annotation Scope**:
   - **Shared Data Layer (`@shiftsync/data-access`)**: All repositories, pagination helpers, DTO request/response interfaces, and entity relations must be annotated with intent, parameters, return types, and constraints.
   - **Backend Application (`apps/server`)**: All injectable services, gateways, guards, and business logic methods (e.g., `ComplianceService`, `ShiftsService`, `SwapService`, `AnalyticsService`) must document business intent, compliance rules, thrown exceptions, and parameters.
   - **Frontend Application (`apps/client`)**: All centralized API modules (`api.ts`), custom hooks (`useShifts`, `useSwaps`, `useAnalytics`, etc.), contexts (`AuthProvider`, `NotificationProvider`), and helper utilities (`cn`) must be documented with parameter descriptions and return shapes.

2. **Explicit Tagging Convention**:
   - Use explicit JSDoc tags: `@param {type} name - description`, `@returns {type} description`, `@template T`, and `@throws {ExceptionType} condition`.
   - Document business rules explicitly within docstrings (e.g. 48-hour schedule lock, 10-hour mandatory rest gaps, 12-hour daily caps, 7th consecutive day override documentation, 3 pending swap caps, Fairness Index scoring).

3. **Preserving Procedural Comments**:
   - Retain procedural step comments (`// 1. Check shift existence...`, `// 2. Check full capacity...`) inside function/method bodies.
   - Do not replace or delete internal implementation notes when adding method-level JSDoc blocks.

---

## 🚀 Key Commands

### Setup & Database

```sh
# Install workspace dependencies
npm install

# Push Drizzle schema to database
npm run db:push

# Generate SQL migration files
npm run db:generate

# Seed database with development data
npm run db:seed

# Force full database clear and re-seed
npm run db:seed -- --full

# Open Drizzle Studio database explorer
npm run db:studio
```

### Development

```sh
# Start NestJS backend (port 3001)
npx nx serve server

# Start Next.js frontend (port 3000)
npx nx serve client
```

### Quality Assurance & Testing

```sh
# Run TypeScript type-checking across monorepo
npm run typecheck

# Run ESLint across all projects
npx nx run-many -t lint

# Run all unit tests
npx nx run-many -t test

# Run backend integration tests
npx nx e2e server-e2e

# Run frontend Playwright BDD acceptance suite
npm run bdd:test

# Run BDD tests with Playwright interactive UI
npm run bdd:ui

# List all registered BDD step definition patterns
npm run bdd:export

# Generate and check BDD living documentation
npm run bdd:docs
npm run bdd:docs:check

# Start Storybook component explorer (port 6006)
npm run storybook

# Build static Storybook documentation
npm run storybook:build

# Run automated Storybook Chromium component & a11y tests
npm run storybook:test

# Build all applications for production
npx nx run-many -t build
```

### Versioning & Releases

```sh
# Preview release version bump, changelog updates, and git tags without modifying files
npx nx release --dry-run

# Run full release locally (when authorized)
npx nx release
```

---

## 🛠 Business Rules & Requirements

### 1. User Roles & Access (LBAC/RBAC)

- **Admin**: Corporate oversight across all locations; bypasses 48-hour schedule locks and location filters.
- **Manager**: Scoped to one or more assigned locations; can only see, schedule, and approve swaps for staff certified at their locations.
- **Staff**: Assigned to one or more locations; possesses specific certified skills (e.g., "Bartender", "Server") and defines availability windows.

### 2. Scheduling & Constraints

- **Double-Booking**: Hard block preventing overlapping shifts for the same person, even across different locations.
- **10-Hour Rest**: Mandatory minimum rest period between the end of one shift and the start of the next for any staff member.
- **Certifications & Skills**: Staff can only be assigned to locations where they are certified and shifts requiring skills they possess.
- **Availability**: Assignments must fall within a staff member's recurring or one-off availability windows.
- **48-Hour Schedule Lock**: Managers cannot edit or unpublish shifts within 48 hours of shift start time (Admins are exempt).

### 3. Labor Law & Overtime

- **Weekly Thresholds**: Standard tracking at 40 hours; proactive advisory warning at 35 hours.
- **Daily Limits**: Advisory warning at 8 hours; hard block preventing scheduling beyond 12 hours.
- **Consecutive Days**: Warning at 6 consecutive working days; 7th consecutive day requires a manager override with a mandatory documented reason.
- **Overnight Shifts**: Shifts crossing midnight (e.g., 11:00 PM – 3:00 AM) are calculated as a single continuous shift for rest and daily hour limits.

### 4. Shift Swapping & Fairness

- **Swap Workflow**: Staff A requests -> Staff B accepts -> Manager approves. The original assignment remains active until final manager approval.
- **Drop Requests**: Automatically expire 24 hours before shift start if not picked up by a qualified peer.
- **Request Limits**: Maximum of 3 pending swap/drop requests per staff member at any time.
- **Fairness Index**: Tracks equitable distribution of "Premium Shifts" (Friday and Saturday evening shifts) across staff members, normalized from 0 to 100.
- **Automation / Regret Logic**: Pending swap requests are automatically cancelled if a manager modifies critical shift details (start time, end time, location, or skill).

### 5. Transparency & Auditability

- **Immutable Audit Trail**: Every schedule change records timestamp, actor, entity ID, action, and before/after JSON diffs.
- **Real-Time Synchronisation**: WebSocket events update schedule boards, swap approvals, and active on-duty dashboards across connected clients without page reloads.

---

## 📚 Core Operational Verification Scenarios

The following scenarios serve as reference baselines for system verification:

- **Sunday Night Chaos**: Rapid coverage finding for last-minute call-outs using skill and certification filters.
- **The Overtime Trap**: Detecting and blocking assignments that push staff beyond daily limits (12h) or into excessive overtime.
- **Timezone Tangle**: Managing availability for staff working across different timezone locations (e.g., Eastern vs. Pacific) with timezone-aware `Intl.DateTimeFormat`.
- **Simultaneous Assignment**: Handling race conditions when two managers attempt to assign the same staff member concurrently.
- **Fairness Complaint**: Validating claims of inequitable premium shift distribution using the Fairness Index calculation.
- **Regret Swap**: Ensuring that if a manager updates a shift while a swap is pending, the request is cleanly cancelled and restored.

For complete product specifications, labor law rules, architecture records (ADRs), and requirements traceability, see the project wiki in [`docs/wiki/`](file:///Users/jamesnjuguna/Downloads/books/personal_projects/shiftsync/docs/wiki/).

---

## 🧭 Agent Skills & Execution Policy

> [!IMPORTANT]
> **No Default Skill Invocations**:
>
> - Do NOT load or execute any skill by default.
> - Never invoke a skill simply because it exists in the repository or configuration.
> - Only invoke a skill when a user request explicitly matches the designated trigger command or explicit scenario.

### Installed Skills & Trigger Mapping

The following skills are installed via `jsmastery-pro/skills` in `.agents/skills/`:

| Skill           | Explicit Trigger                                            | Purpose & When to Invoke                                                                                                                                              |
| :-------------- | :---------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`architect`** | `/architect`                                                | Run when choosing between architecture/stack approaches, designing a feature or page, or deciding foundational specs. Writes build specs to `docs/specs/`.            |
| **`audit`**     | `/audit`                                                    | Run on greenfield projects, undocumented codebases, or designated sub-areas (`/audit <path>`) to bootstrap context files (`AGENTS.md`).                               |
| **`check`**     | `/check verify` or `/check review`                          | Run after `/develop` to verify implementation against specs (`/check verify`) or perform code review before merging PRs (`/check review`). Writes to `docs/reviews/`. |
| **`debug`**     | `/debug`                                                    | Run to diagnose and fix a bug's root cause through a reproduce-localize-hypothesize-fix-verify loop.                                                                  |
| **`develop`**   | `/develop`                                                  | Run to implement a feature, component, API, or service slice from an approved specification or design.                                                                |
| **`document`**  | `/document [pr \| changelog \| release-note \| postmortem]` | Run to draft human-facing documentation from real git commits and diffs.                                                                                              |
| **`scope`**     | `/scope`                                                    | Run to decompose product ideas into living scope documents in `docs/scope/`.                                                                                          |
| **`sync`**      | `/sync`                                                     | Run around merge/completion to surgically reconcile `AGENTS.md` and scope statuses with current repository reality.                                                   |
| **`test`**      | `/test`                                                     | Run to generate or complete automated test suites targeting recently built or modified code slices.                                                                   |

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
