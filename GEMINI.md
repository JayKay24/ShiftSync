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

Detailed context for specific applications is available in their respective directories:

- **Client**: [apps/client/GEMINI.md](apps/client/GEMINI.md)
- **Server**: [apps/server/GEMINI.md](apps/server/GEMINI.md)

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

### 1. Scheduling Constraints
- **Double-Booking**: No overlapping shifts for the same person.
- **10-Hour Rest**: Minimum gap between shifts.
- **48-Hour Lock**: Managers cannot edit shifts close to the start time.

### 2. Labor Law & Overtime
- **Thresholds**: Overtime warning at 35h, tracking at 40h weekly.
- **Limits**: Hard block at 12h daily.
- **Overrides**: 7th consecutive day requires documented manager reason.

### 3. Shift Swapping
- **Drop Requests**: Expire 24h before shift starts.
- **Limits**: Max 3 pending requests per staff member.
- **Automation**: Pending swaps are cancelled if shift details are modified by a manager.
