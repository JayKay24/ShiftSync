# Server Context

The backend is a **NestJS** application using **Drizzle ORM** for database interactions.

## Database Connection

The server connects to PostgreSQL via a global `DatabaseModule` (found in `src/app/database.module.ts`).

- **Connection Pool**: Uses the `pg` library's `Pool` with a connection string provided by `DATABASE_URL` in the `.env` file.
- **Drizzle Provider**: The `DRIZZLE` injection token provides an instance of `NodePgDatabase<typeof schema>`, initialized with the shared schema from `@shiftsync/data-access`.
- **Global Availability**: Since `DatabaseModule` is marked as `@Global()`, the `DRIZZLE` token can be injected into any service or module without manual importing.

```typescript
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@shiftsync/data-access';

// In a service or repository provider
constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}
```

## Repository & Data Access Usage

The server relies on the shared `@shiftsync/data-access` library for its database layer. Repositories are injected via a global `RepositoriesModule`.

### Repository Injection Example
In `src/app/shifts/shifts.service.ts`, the service injects repositories and uses shared entities/types for business logic:

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
    // Business logic like premium shift detection
    return this.shiftRepo.createShift(newShift);
  }
}
```

## Database Migrations

ShiftSync uses **Drizzle Kit** to manage schema migrations. The configuration is located in the root `drizzle.config.ts`, and migrations are stored in `apps/server/src/migrations`.

- **Generating Migrations**: Use `npm run db:generate` to compare the entity definitions in `@shiftsync/data-access` with the current migration files and generate a new SQL migration.
- **Applying Changes**: 
  - For local development, `npm run db:push` can be used to synchronize the database schema directly without creating migration files (use with caution).
  - In production or staging, migrations should be applied using the generated SQL files.
- **Visualizing Data**: `npm run db:studio` launches Drizzle Studio, a GUI for exploring and modifying the database.

## Seeding & Test Data

The project includes a robust seeding system located in `apps/server/src/db/seed.ts`. It is used to populate the database with consistent data for development and E2E testing.

- **Command**: `npm run db:seed`
- **Behavioral Modes**:
  - **Full Seed**: Clears all existing data and re-populates both base entities (Users, Locations) and complex scenarios (Shifts, Swaps). This is the default behavior in non-test environments.
  - **Base Seed**: In `test` environments (`NODE_ENV=test`), it defaults to seeding only base entities to ensure speed and stability for E2E suites.
  - **Force Full**: Passing the `--full` flag (e.g., `npm run db:seed -- --full`) forces a full clear and re-seed regardless of the environment.

### Default Credentials
After a successful seed, the following users are available for testing (Password: `password123`):
- **Admin**: `admin@coastaleats.com`
- **Manager (NY)**: `bob.manager@coastaleats.com`
- **Staff (Charlie)**: `charlie.staff@coastaleats.com`

## Core Modules
- **ShiftsModule**: Handles shift lifecycle, assignments, and compliance checks via `ComplianceService`.
- **AuthModule**: Manages JWT authentication and roles-based access control (RBAC).
- **NotificationModule**: Handles real-time events via WebSockets.
- **AuditModule**: Centrally logs all state changes for shifts and assignments.

## Compliance Logic
Labor law compliance is enforced in `src/app/shifts/compliance.service.ts`, which validates constraints like the 10-hour rest rule and the 7th consecutive day override requirement.
