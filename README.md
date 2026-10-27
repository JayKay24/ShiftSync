# ShiftSync — Multi-Location Staff Scheduling Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nx](https://img.shields.io/badge/Monorepo-Nx-143157?style=flat&logo=nx&logoColor=white)](https://nx.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Frontend-Vite_SPA-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev)
[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle_ORM-C5F74F?style=flat&logoColor=black)](https://orm.drizzle.team)
[![Vitest](https://img.shields.io/badge/Testing-Vitest-6E9F18?style=flat&logo=vitest&logoColor=white)](https://vitest.dev)
[![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)](https://playwright.dev)
[![Continuous Integration](https://github.com/JayKay24/ShiftSync/actions/workflows/ci.yml/badge.svg)](https://github.com/JayKay24/ShiftSync/actions/workflows/ci.yml)

ShiftSync is a web-based scheduling and workforce management platform built for **Coastal Eats**, a multi-location restaurant group operating across different time zones. It balances managerial oversight with staff flexibility, labor law compliance, and real-time schedule transparency.

---

## 🌟 Overview

ShiftSync addresses the core operational challenges of multi-location hospitality staffing:

- **Coverage Assurance**: Eliminates uncovered shifts with location- and skill-certified staff suggestion engines.
- **Overtime & Labor Compliance**: Real-time enforcement of weekly (40h), daily (8h/12h), and 10-hour rest limits.
- **Fairness & Equity**: Tracks distribution of "premium shifts" (Friday & Saturday evenings) via a normalized Fairness Index (0–100).
- **Multi-Location Oversight**: Centralized corporate visibility for Admins alongside strict location-based access control (LBAC) for store managers.
- **Real-Time Collaboration**: Peer-to-peer shift swaps, shift drops, and manager approval workflows synchronized via WebSockets.

---

## 🏗 System Architecture

The monorepo is managed with **Nx**, separating concerns into a **React (Vite)** frontend SPA, a **NestJS** backend, and a unified **`@shiftsync/data-access`** shared library.

```mermaid
flowchart TD
  subgraph Clients ["Client Tier"]
    ManagerUI["Manager Dashboard (React 19 SPA)"]
    StaffUI["Staff Portal (React 19 SPA)"]
  end

  subgraph FrontendApp ["Frontend Application (apps/client)"]
    AxiosClient["Centralized Axios API Client"]
    SocketClient["WebSocket Client (Socket.io)"]
    AuthContext["Auth & Role Context"]
    UIComponents["Tailwind CSS + Lucide React"]
  end

  subgraph SharedLib ["Shared Data Access (libs/shared/data-access)"]
    Schemas["Drizzle Schemas & Relations"]
    DTOs["Request / Response DTOs (class-validator)"]
    Repos["Domain Repositories (Drizzle ORM)"]
  end

  subgraph BackendApp ["Backend Application (apps/server)"]
    APIControllers["REST Controllers (/api)"]
    ComplianceSvc["ComplianceService (10h Rest, 12h Cap, 7th Day)"]
    ShiftsSvc["ShiftsService (Shift Lifecycle & Swaps)"]
    AuthSvc["AuthModule (JWT & RBAC Guards)"]
    AuditSvc["AuditModule (Immutable Audit Log)"]
    SocketGateway["NotificationGateway (Socket.io WebSockets)"]
    DrizzleModule["DrizzleModule (@nestjs/drizzle)"]
  end

  subgraph Persistence ["Persistence Tier"]
    PostgreSQL[("PostgreSQL 16 Database")]
  end

  subgraph CI ["Continuous Integration (GitHub Actions)"]
    InstallJob["Install & Cache Dependencies"]
    Commitlint["Conventional Commits"]
    LintTypecheck["ESLint & TypeScript Typecheck"]
    BuildJob["Production Application Builds"]
    UnitTests["Vitest Unit Test Suite"]
    IntegrationTests["Server E2E & Compliance (PostgreSQL Service)"]
    ClientE2ETests["Client UI E2E (Playwright + PostgreSQL Service)"]
  end

  subgraph ReleasePipeline ["Automated Release (GitHub Actions)"]
    ReleaseJob["Nx Release (Changelog, SemVer Bump & GitHub Release)"]
  end

  %% Client interactions
  ManagerUI --> AxiosClient
  StaffUI --> AxiosClient
  ManagerUI --> SocketClient
  StaffUI --> SocketClient

  %% Frontend -> Shared Library
  AxiosClient -.-> DTOs

  %% Frontend -> Backend Communication
  AxiosClient -->|"HTTP / REST API (port 3001)"| APIControllers
  SocketClient <-->|"Bidirectional Events (WebSockets)"| SocketGateway

  %% Backend Internal Wiring
  APIControllers --> ShiftsSvc
  APIControllers --> AuthSvc
  ShiftsSvc --> ComplianceSvc
  ShiftsSvc --> AuditSvc
  ShiftsSvc --> Repos
  AuthSvc --> Repos
  Repos -.-> Schemas
  Repos -.-> DTOs
  DrizzleModule -.-> Schemas

  %% Backend -> Database
  DrizzleModule -->|"Connection Pool"| PostgreSQL
  Repos -->|"SQL Queries / Transactions"| PostgreSQL

  %% CI to Release Workflow
  CI -->|"On successful main merge"| ReleaseJob
```

---

## 📚 Documentation & Project Wiki

Comprehensive functional specifications, labor compliance rules, architecture records, and project history are maintained in the **[ShiftSync GitHub Wiki](https://github.com/JayKay24/ShiftSync/wiki)** (and version-controlled locally under [`docs/wiki/`](docs/wiki/)):

| Documentation Guide                                                                                           | Topic & Scope                                                                                                     | Local File                                                                                 |
| :------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **[Product Requirements](https://github.com/JayKay24/ShiftSync/wiki/Product-Requirements)**                   | Multi-location RBAC/LBAC, shift lifecycle, 48h locks, swap workflows, and real-time features                      | [`docs/wiki/Product-Requirements.md`](docs/wiki/Product-Requirements.md)                   |
| **[Domain Rules & Compliance](https://github.com/JayKay24/ShiftSync/wiki/Domain-Rules-and-Compliance)**       | 10h rest gap, 8h/12h daily limits, 35h/40h overtime, 7th-day overrides, Fairness Index & 6 verification scenarios | [`docs/wiki/Domain-Rules-and-Compliance.md`](docs/wiki/Domain-Rules-and-Compliance.md)     |
| **[Product Design Decisions](https://github.com/JayKay24/ShiftSync/wiki/Product-Design-Decisions)**           | Edge case resolutions: de-certification, desired hours vs. availability, short shifts, and timezone boundaries    | [`docs/wiki/Product-Design-Decisions.md`](docs/wiki/Product-Design-Decisions.md)           |
| **[Requirements Traceability](https://github.com/JayKay24/ShiftSync/wiki/Requirements-Traceability)**         | End-to-end matrix mapping requirements to code, tests, and product roadmap                                        | [`docs/wiki/Requirements-Traceability.md`](docs/wiki/Requirements-Traceability.md)         |
| **[Architecture Overview](https://github.com/JayKay24/ShiftSync/wiki/Architecture-Overview)**                 | Nx monorepo, NestJS backend, Drizzle repositories, 3-tier React SPA, and WebSockets                               | [`docs/wiki/Architecture-Overview.md`](docs/wiki/Architecture-Overview.md)                 |
| **[Architecture Decision Records](https://github.com/JayKay24/ShiftSync/wiki/Architecture-Decision-Records)** | 12 ADRs capturing key technical decisions (ADR-001 through ADR-012)                                               | [`docs/wiki/Architecture-Decision-Records.md`](docs/wiki/Architecture-Decision-Records.md) |
| **[Testing & Quality Gates](https://github.com/JayKay24/ShiftSync/wiki/Testing-and-Quality-Gates)**           | Vitest unit/integration testing, Playwright UI E2E, surgical isolation, and CI/CD automation                      | [`docs/wiki/Testing-and-Quality-Gates.md`](docs/wiki/Testing-and-Quality-Gates.md)         |
| **[Project History](https://github.com/JayKay24/ShiftSync/wiki/Project-History)**                             | Chronological engineering timeline across 7 development phases and 100+ pull requests                             | [`docs/wiki/Project-History.md`](docs/wiki/Project-History.md)                             |

---

## 🛠 Tech Stack

- **Monorepo Architecture**: [Nx](https://nx.dev)
- **Frontend**: React 19 SPA with [Vite](https://vite.dev) & [React Router v7](https://reactrouter.com) (TypeScript, Tailwind CSS, Lucide React)
- **Backend**: NestJS 11 (TypeScript, Socket.io WebSockets, Passport JWT)
- **Database & ORM**: PostgreSQL 16 with [Drizzle ORM](https://orm.drizzle.team/) & [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
- **Testing**: Vitest (Unit & Integration), Playwright (Client UI E2E)
- **Continuous Integration**: GitHub Actions with dedicated dependency caching and PostgreSQL service containers

---

## 📋 Prerequisites

Before setting up the project locally, ensure you have:

- **Node.js**: `v24.x` recommended (`v20.x` minimum)
- **npm**: `v10.x` or `v11.x` (monorepo includes [`.npmrc`](.npmrc) with `legacy-peer-deps=true` for dependency stability)
- **Docker & Docker Compose**: For running PostgreSQL and full-stack container environments
- **Git**: Configured for Conventional Commits

---

## ⚙️ Environment Configuration

ShiftSync uses environment variables for database connections, authentication secrets, and service URLs.

1. Create a local `.env` file by copying the template:

   ```sh
   cp .env.example .env
   ```

2. Review and adjust variables as needed:

| Variable            | Description                                               | Default Value                                                                 | Scope             |
| :------------------ | :-------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------- |
| `DATABASE_URL`      | PostgreSQL connection string                              | `postgresql://shiftsync:password123@localhost:5432/shiftsync?sslmode=disable` | Backend & Drizzle |
| `JWT_SECRET`        | Secret key used for signing JWT tokens                    | `supersecretjwtkeyforlocaldevelopment1234567890`                              | Backend           |
| `PORT`              | HTTP server port for backend API                          | `3001`                                                                        | Backend           |
| `NODE_ENV`          | Runtime environment (`development`, `test`, `production`) | `development`                                                                 | Backend           |
| `VITE_API_URL`      | Backend API URL consumed by client                        | `http://localhost:3001/api`                                                   | Frontend          |
| `POSTGRES_USER`     | PostgreSQL superuser for Docker container                 | `shiftsync`                                                                   | Docker Compose    |
| `POSTGRES_PASSWORD` | PostgreSQL password for Docker container                  | `password123`                                                                 | Docker Compose    |
| `POSTGRES_DB`       | Database name for Docker container                        | `shiftsync`                                                                   | Docker Compose    |
| `POSTGRES_PORT`     | Host port for PostgreSQL                                  | `5432`                                                                        | Docker Compose    |

---

## 🚀 Local Development Setup (Step-by-Step)

Follow these steps to run the application locally from source:

### 1. Install Dependencies

```sh
npm install
```

### 2. Start PostgreSQL Database

You can spin up an ephemeral PostgreSQL instance with Docker Compose:

```sh
# Start database container in background
docker compose up -d db
```

_(Or use an existing PostgreSQL instance and update `DATABASE_URL` in `.env`)_

### 3. Synchronize Schema & Migrations

```sh
# Push Drizzle schema directly to the database
npm run db:push
```

### 4. Seed Development Data

```sh
# Seed users, locations, shifts, and test scenarios
npm run db:seed
```

_To force a clean reset and full re-seed at any time, run: `npm run db:seed -- --full`._

### 5. Launch Development Servers

Open two terminal windows (or use Nx parallel serve):

```sh
# Terminal 1: Start NestJS Backend (http://localhost:3001)
npx nx serve server

# Terminal 2: Start React Frontend (http://localhost:3000)
npx nx serve client
```

### 6. Access Applications

- **Frontend Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:3001/api](http://localhost:3001/api)
- **Drizzle Studio (GUI)**: `npm run db:studio` (available at [https://local.drizzle.studio](https://local.drizzle.studio))

---

## 🐳 Docker Stack Deployment

To build and run the entire stack (Frontend, Backend, and Database) inside isolated containers:

```sh
# Build images and start all containers
docker compose up --build
```

To run in detached mode:

```sh
docker compose up -d --build
```

To stop and remove containers:

```sh
docker compose down
```

---

## 🧪 Testing & Quality Assurance

ShiftSync utilizes a comprehensive test suite covering unit, integration, and UI levels.

### Monorepo Quality Gates

```sh
# Verify TypeScript types across all projects
npm run typecheck

# Run ESLint across monorepo
npx nx run-many -t lint

# Run all unit tests
npx nx run-many -t test

# Build all applications for production
npx nx run-many -t build
```

### Server Integration Tests (`apps/server-e2e`)

Validates database transactions, labor compliance rules, and API endpoints against PostgreSQL:

```sh
npx nx e2e server-e2e
```

_Key test areas: 10h rest enforcement, 12h daily caps, 7th consecutive day overrides, 48h locks, swap workflows, and Fairness Index calculations._

### Client E2E Tests (`apps/client-e2e`)

Simulates real browser workflows and UI permissions using Playwright:

```sh
# Run headless tests in Chromium
npx nx e2e client-e2e

# Run tests in Playwright interactive UI mode
npx nx e2e client-e2e --ui
```

### Continuous Integration (CI)

Every commit and pull request targeting `develop` or `main` triggers our GitHub Actions pipeline:

1. **`install`**: Downloads dependencies with `npm ci --legacy-peer-deps` and caches `node_modules`.
2. **`commitlint`**: Enforces Conventional Commits format on PRs.
3. **`lint-and-typecheck`**: Runs monorepo ESLint and TypeScript checks.
4. **`build`**: Compiles production client and server bundles.
5. **`test-unit`**: Executes Vitest unit test suites across all projects with Nx computation caching.
6. **`test-integration`**: Launches an ephemeral PostgreSQL 16 container, runs migrations, seeds data, and executes `server-e2e`.
7. **`client-e2e`**: Runs Playwright end-to-end browser tests against isolated PostgreSQL and backend services.

_For in-depth CI pipeline architecture and `nx affected` gating rules, see [Testing & Quality Gates](docs/wiki/Testing-and-Quality-Gates.md)._

### Release & Versioning Automation

ShiftSync uses [Nx Release](https://nx.dev/features/manage-releases) to automate semantic versioning, changelog generation, and GitHub Releases:

- **Conventional Commit Driven**: Automatically calculates version bumps (`feat` $\rightarrow$ minor, `fix` $\rightarrow$ patch, breaking change $\rightarrow$ major).
- **Post-CI Trigger**: Once the `Continuous Integration` workflow completes successfully on `main`, the `Release` workflow (`.github/workflows/release.yml`) executes.
- **Artifacts**: Generates `CHANGELOG.md`, tags the repository (`vX.Y.Z`), creates categorized GitHub Releases, and commits `chore(release): vX.Y.Z` to `main`.
- **Dry Run Verification**: Developers can preview pending version increments and changelog updates locally:
  ```sh
  npx nx release --dry-run
  ```

_For detailed ADR documentation on the release pipeline, see [ADR-012](docs/wiki/Architecture-Decision-Records.md#adr-012-cicd-automation-with-nx-affected-gating--semantic-release)._

---

## 👥 Test Personas & Accounts

The database seed provides pre-configured accounts with various roles and location assignments (all accounts use password: `password123`):

| Role        | Email                           | Location Scope         | Timezone              | Notes / Constraints                        |
| :---------- | :------------------------------ | :--------------------- | :-------------------- | :----------------------------------------- |
| **Admin**   | `admin@coastaleats.com`         | Global (All Locations) | `America/New_York`    | Full oversight; bypasses 48h schedule lock |
| **Manager** | `bob.manager@coastaleats.com`   | Downtown & Uptown (NY) | `America/New_York`    | Manages NY restaurants                     |
| **Manager** | `diana.manager@coastaleats.com` | Beach Grill (LA)       | `America/Los_Angeles` | Manages LA branch                          |
| **Staff**   | `charlie.staff@coastaleats.com` | Downtown & Uptown (NY) | `America/New_York`    | Bartender / Server; unavailable Mondays    |
| **Staff**   | `dave.staff@coastaleats.com`    | Downtown & Uptown (NY) | `America/Chicago`     | Server; unavailable Tuesdays               |
| **Staff**   | `eva.staff@coastaleats.com`     | Uptown (NY)            | `America/Denver`      | Line Cook; unavailable Wednesdays          |
| **Staff**   | `frank.staff@coastaleats.com`   | Downtown & Uptown (NY) | `America/Los_Angeles` | Host; open availability                    |
| **Staff**   | `grace.staff@coastaleats.com`   | Beach Grill (LA)       | `America/Los_Angeles` | Bartender / Server                         |
| **Staff**   | `heidi.staff@coastaleats.com`   | Beach Grill (LA)       | `America/Los_Angeles` | Server                                     |
| **Staff**   | `ivan.staff@coastaleats.com`    | Beach Grill (LA)       | `America/Los_Angeles` | Host; available for shift swaps            |
| **Staff**   | `judy.staff@coastaleats.com`    | Beach Grill (LA)       | `America/Los_Angeles` | Line Cook; available for shift swaps       |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
