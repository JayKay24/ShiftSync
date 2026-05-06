# Server Context

The backend is a **NestJS** application using **Drizzle ORM** for database interactions.

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
