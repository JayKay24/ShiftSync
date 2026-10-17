# ShiftSync — Multi-Location Staff Scheduling Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Nx](https://img.shields.io/badge/Monorepo-Nx-143157?style=flat&logo=nx&logoColor=white)](https://nx.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle_ORM-C5F74F?style=flat&logoColor=black)](https://orm.drizzle.team)
[![Jest](https://img.shields.io/badge/Testing-Jest-C21325?style=flat&logo=jest&logoColor=white)](https://jestjs.io)
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

The monorepo is managed with **Nx**, separating concerns into a **Next.js** frontend, a **NestJS** backend, and a unified **`@shiftsync/data-access`** shared library.

```mermaid
flowchart TD
  subgraph Clients ["Client Tier"]
    ManagerUI["Manager Dashboard (Next.js 16)"]
    StaffUI["Staff Portal (Next.js 16)"]
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
    UnitTests["Jest Unit Test Suite"]
    IntegrationTests["Server E2E & Compliance (PostgreSQL Service)"]
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
```

---

## 🤔 Implementation Assumptions

Based on the operational requirements for Coastal Eats, the platform adheres to these domain rules:

- **Single Organization**: Scoped to Coastal Eats. Multi-tenancy across branches is isolated using `locationId`.
- **Location-Based Access Control (LBAC)**: Managers can only view, schedule, and approve swaps for staff certified at their assigned locations. Corporate Admins have unrestricted global visibility.
- **Qualified Peer Swaps**: Staff can browse eligible peers across the organization for cross-location coverage, but the system restricts swap requests strictly to staff certified for that shift's location and skill.
- **Single Skill per Shift**: Each shift requires exactly one primary skill (e.g., "Bartender", "Server"). Multi-skill needs are scheduled as parallel shifts.
- **Group Headcount**: A single shift record supports `headcountNeeded > 1`, eliminating duplicate shift entries.
- **Timezone Robustness**: Calculations (rest gaps, availability, midnight-crossing shifts) use `Intl.DateTimeFormat` with explicit location timezones (e.g., `America/New_York`, `America/Los_Angeles`).
- **48-Hour Schedule Lock**: Managers cannot edit or unpublish shifts within 48 hours of shift start. Admins can bypass this lock for emergencies.
- **Unified Swap & Drop Model**: A shift "drop" (putting a shift up for grabs) is modeled as a swap request with a null target user.
- **Regret Swap Logic**: If a manager updates critical shift details (time, location, skill), all pending swap and drop requests for that shift are automatically cancelled.
- **Marketplace Guardrail**: Staff members are limited to **three active pending requests** (swaps or drops) to prevent schedule churn.
- **Immutable Audit Trail**: All creations, assignments, and modifications are recorded with timestamp, actor, and before/after state diffs.

---

## 🛠 Tech Stack

- **Monorepo Architecture**: [Nx](https://nx.dev)
- **Frontend**: Next.js 16 (React 19, TypeScript, Tailwind CSS, Lucide React)
- **Backend**: NestJS 11 (TypeScript, Socket.io WebSockets, Passport JWT)
- **Database & ORM**: PostgreSQL 16 with [Drizzle ORM](https://orm.drizzle.team/) & [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
- **Testing**: Jest (Unit & Server Integration), Playwright (Client UI E2E)
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

| Variable              | Description                                               | Default Value                                                                 | Scope             |
| :-------------------- | :-------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------- |
| `DATABASE_URL`        | PostgreSQL connection string                              | `postgresql://shiftsync:password123@localhost:5432/shiftsync?sslmode=disable` | Backend & Drizzle |
| `JWT_SECRET`          | Secret key used for signing JWT tokens                    | `supersecretjwtkeyforlocaldevelopment1234567890`                              | Backend           |
| `PORT`                | HTTP server port for backend API                          | `3001`                                                                        | Backend           |
| `NODE_ENV`            | Runtime environment (`development`, `test`, `production`) | `development`                                                                 | Backend           |
| `NEXT_PUBLIC_API_URL` | Backend API URL consumed by client                        | `http://localhost:3001/api`                                                   | Frontend          |
| `POSTGRES_USER`       | PostgreSQL superuser for Docker container                 | `shiftsync`                                                                   | Docker Compose    |
| `POSTGRES_PASSWORD`   | PostgreSQL password for Docker container                  | `password123`                                                                 | Docker Compose    |
| `POSTGRES_DB`         | Database name for Docker container                        | `shiftsync`                                                                   | Docker Compose    |
| `POSTGRES_PORT`       | Host port for PostgreSQL                                  | `5432`                                                                        | Docker Compose    |

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

# Terminal 2: Start Next.js Frontend (http://localhost:3000)
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
5. **`test-unit`**: Executes Jest unit tests with Nx computation caching.
6. **`test-integration`**: Launches an ephemeral PostgreSQL 16 container, runs migrations, seeds data, and executes `server-e2e`.

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
