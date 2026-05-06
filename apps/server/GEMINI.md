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

## Core Modules
- **ShiftsModule**: Handles shift lifecycle, assignments, and compliance checks via `ComplianceService`.
- **AuthModule**: Manages JWT authentication and roles-based access control (RBAC).
- **NotificationModule**: Handles real-time events via WebSockets.
- **AuditModule**: Centrally logs all state changes for shifts and assignments.

## Compliance Logic
Labor law compliance is enforced in `src/app/shifts/compliance.service.ts`, which validates constraints like the 10-hour rest rule and the 7th consecutive day override requirement.
