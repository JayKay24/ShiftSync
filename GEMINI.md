# ShiftSync - Technical Context & Guidelines

ShiftSync is a multi-location staff scheduling platform for **Coastal Eats**. It is built as a monorepo using **Nx**, featuring a **NestJS** backend, a **Next.js** frontend, and a shared data access library.

## 📦 Shared Library Consumption (`@shiftsync/data-access`)

The `@shiftsync/data-access` library is the backbone of the project, providing a single source of truth for database schemas, entity types, and API interfaces.

### Cross-Cutting Benefits

- **Type Safety**: Both the client (Axios calls) and the server (Services/Repositories) import types and interfaces from this library, preventing runtime errors due to mismatched contracts.
- **Unified Repository Pattern**: All database interactions are encapsulated in repositories within this library. The server injects these repositories to keep business logic clean.
- **DTO Validation**: Shared request/response classes use `class-validator` decorators, enabling consistent validation logic on both the server (via `ValidationPipe`) and potentially the client.

## 🏗 Architecture Overview

- **Monorepo Management**: [Nx](https://nx.dev)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Real-Time**: WebSockets (Socket.io) for instant notifications and conflict detection.
- **Time Handling**: UTC storage with location-aware local timezone display.

## 📋 Modular Contexts

Detailed context for specific applications and libraries is available in their respective directories:

- **Client**: [apps/client/GEMINI.md](apps/client/GEMINI.md)
@./apps/client/GEMINI.md
- **Server**: [apps/server/GEMINI.md](apps/server/GEMINI.md)
@./apps/server/GEMINI.md
- **Shared Data Access**: [libs/shared/data-access/GEMINI.md](libs/shared/data-access/GEMINI.md)
@./libs/shared/data-access/GEMINI.md

## 🧪 Testing Strategy

ShiftSync employs a multi-layered testing strategy focused on verifying complex business rules and ensuring system integrity.

### End-to-End (E2E) & Integration Testing

The project is heavily reliant on automated E2E tests to validate labor law compliance, scheduling constraints, and cross-application workflows.

- **Client E2E (`apps/client-e2e`)**: UI-driven tests using **Playwright**. Validates user journeys, visibility rules, and real-time UI updates.
  - [Detailed Client E2E Context](apps/client-e2e/GEMINI.md)
  @./apps/client-e2e/GEMINI.md
- **Server E2E (`apps/server-e2e`)**: API-driven integration tests using **Jest** and **Axios**. Focuses on database constraints, business logic enforcement (e.g., 10h rest), and complex workflows like shift swapping.
  - [Detailed Server E2E Context](apps/server-e2e/GEMINI.md)
  @./apps/server-e2e/GEMINI.md

### Key Test Categories

- **Compliance**: Verification of "Hard Blocks" (12h daily limit) and "Overrides" (7th day consecutive).
- **Scheduling**: Enforcement of no double-booking and minimum rest periods.
- **Privacy**: Role-based and location-based access control (RBAC/LBAC).
- **Auditability**: Verification of the immutable audit trail for all critical actions.

## 🚀 Key Commands

### Setup & Database

- `npm install`: Install project dependencies.
- `npm run db:push`: Synchronize the database schema with Drizzle.
- `npm run db:seed`: Seed the database with initial test data.

### Development

- `npx nx serve server`: Start the NestJS backend.
- `npx nx serve client`: Start the Next.js frontend.

### Testing

- `npx nx e2e server-e2e`: Run backend integration tests.
- `npx nx e2e client-e2e`: Run frontend Playwright tests.

## 🛠 Business Rules & Requirements

### 1. User Roles & Access (LBAC/RBAC)
- **Admin**: Corporate oversight across all locations; bypasses 48h schedule locks and view-only restrictions.
- **Manager**: Assigned to one or more locations; can only see/manage staff and schedules within their scope.
- **Staff**: Assigned to one or more locations; possesses specific skills (e.g., "bartender", "server") and maintains their own availability windows.

### 2. Scheduling & Constraints
- **Double-Booking**: Hard block on overlapping shifts for the same person, even across different locations.
- **10-Hour Rest**: Minimum gap required between the end of one shift and the start of another for the same person.
- **Certifications & Skills**: Staff can only be assigned to locations where they are certified and shifts requiring skills they possess.
- **Availability**: System enforces assignments only within a staff member's recurring or one-off availability windows.
- **48-Hour Lock**: Managers cannot edit or unpublish shifts within 48 hours of the start time (Admins are exempt).

### 3. Labor Law & Overtime
- **Weekly Thresholds**: Tracking at 40h; proactive warning issued at 35h.
- **Daily Limits**: Warning at 8h; hard block at 12h.
- **Consecutive Days**: Warning at 6 consecutive days; 7th consecutive day requires a manager override with a documented reason.
- **Overnight Shifts**: Shifts crossing midnight (e.g., 11 PM – 3 AM) are treated as a single continuous shift for all calculations.

### 4. Shift Swapping & Fairness
- **Swap Workflow**: Staff A requests -> Staff B accepts -> Manager approves. Original assignment remains until final approval.
- **Drop Requests**: Expire automatically 24 hours before the shift starts if not picked up by another qualified staff member.
- **Limits**: Maximum of 3 pending swap/drop requests per staff member at any time.
- **Fairness Index**: Tracks equitable distribution of "Premium Shifts" (defined as Friday and Saturday evening shifts).
- **Automation**: Pending swaps are automatically cancelled if a manager modifies critical shift details (e.g., start time).

### 5. Transparency & Auditability
- **Audit Trail**: Every schedule change is logged with the timestamp, the actor, and the "Before/After" state of the entity.
- **Real-Time Updates**: Dashboard and notifications use WebSockets to reflect schedule changes, swap resolutions, and "On-Duty Now" status without page refreshes.

## 📚 Project Reference (Legacy Assessment Context)

The following scenarios and ambiguities were part of the original project assessment and serve as a baseline for system verification and architectural decisions.

### Evaluation Scenarios
- **Sunday Night Chaos**: Rapid coverage finding for last-minute call-outs.
- **The Overtime Trap**: Detecting and preventing assignments that push staff into excessive overtime (e.g., 52 hours).
- **Timezone Tangle**: Managing availability for staff certified in different time zones (e.g., Pacific vs. Eastern).
- **Simultaneous Assignment**: Handling race conditions when two managers attempt to assign the same staff member concurrently.
- **Fairness Complaint**: Verifying claims of inequitable "good" shift distribution using the Fairness Index.
- **Regret Swap**: Managing the implications when a staff member changes their mind about a pending swap.

### Resolved Ambiguities
- **De-certification**: How the system handles historical assignment data when a staff member loses certification for a location.
- **Desired Hours**: The interaction between a staff member's "desired weekly hours" and their hard availability windows.
- **Consecutive Day Logic**: Confirmation that any shift (regardless of length) counts toward consecutive day tracking.
- **Post-Swap Edits**: System behavior if a shift is modified after a swap is approved but before it occurs.
- **Timezone Boundaries**: Handling locations that may span state lines or timezone boundaries.

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
