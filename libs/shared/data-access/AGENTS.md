# Shared Data Access Context (`@shiftsync/data-access`)

This library serves as the single source of truth for the project's data layer, encompassing database schemas, entity types, repositories, and API contracts.

## 🏛 Repository Pattern & Drizzle Usage

All SQL logic is colocated within `src/lib/repositories/` to ensure a clean separation between business logic and data persistence.

- **Injection**: Repositories are initialized with an instance of `NodePgDatabase<typeof schema>`, allowing them to leverage both standard and relational APIs.
- **Relational Query API (`db.query`)**: Used for complex fetches involving joins and nested relations. This API utilizes the `with` property for type-safe "eager loading" (e.g., fetching a shift with its assignments and user profiles).
- **Standard Query API (`db.select`, `db.insert`, etc.)**: Employed for simple CRUD operations and performance-critical queries. It uses a SQL-like builder syntax with helper functions like `eq`, `and`, `gte`, and `lte`.
- **Custom SQL Fragments**: The `sql` template literal is used for advanced filtering or fragments that fall outside the standard builders (e.g., using `sql.join` for dynamic `IN` clauses).

### Example: Relational vs. Standard API
```typescript
// Relational API for complex joins
const shift = await this.db.query.shifts.findFirst({
  where: eq(shifts.id, id),
  with: { assignments: { with: { user: true } } },
});

// Standard API for targeted updates
await this.db.update(shifts).set(updates).where(eq(shifts.id, shiftId));
```

## 🧬 Entity Definitions & Strict Typing

Database tables are defined in `src/lib/entities/` using Drizzle ORM's `pgTable`.

- **Type Inference**: We use Drizzle's `InferSelectModel` and `InferInsertModel` to generate TypeScript types (e.g., `User`, `NewUser`) directly from the table schemas, ensuring that our application logic is always in sync with the database structure.
- **Relations**: Complex relationships (one-to-many, many-to-many) are defined using the `relations` API, which enables type-safe "eager loading" through the repository layer.

## 🔗 Schema Aggregation

The `src/lib/schema.ts` file acts as the central hub for the entire database schema.

- **Unified Schema**: It exports a single `schema` object containing all entities and their relationships.
- **Backend Initialization**: This object is passed to the Drizzle provider in the backend to initialize the database connection with full awareness of the application's data model.

## 📝 API Contracts (`api-interfaces.ts`)

API request and response structures are strictly defined in `src/lib/api-interfaces.ts`.

- **Request DTOs**: Use `class-validator` decorators to enforce runtime validation (e.g., `CreateShiftRequest`).
- **Response Interfaces**: Define the exact shape of data returned to the client (e.g., `ShiftResponse`), often extending base entity types to include related data.
- **Full-Stack Safety**: These contracts are consumed by both the NestJS controllers (for validation) and the Next.js client (for typed Axios calls), eliminating "contract drift."
