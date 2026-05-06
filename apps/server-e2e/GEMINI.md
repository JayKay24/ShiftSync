# ShiftSync Server E2E - Integration Testing Context

This project contains integration and end-to-end API tests for the ShiftSync backend using **Jest** and **Axios**.

## 🚀 Key Commands

- `npx nx e2e server-e2e`: Run all server-side integration tests.

## 🏗 Test Architecture

- **Tooling**: [Jest](https://jestjs.io/) with [Axios](https://axios-http.com/) for HTTP requests.
- **Setup**: `src/support/global-setup.ts` handles the initial seeding of the database.
- **Database Management**: `src/support/test-helpers.ts` includes `clearDynamicData()`, which performs a surgical cleanup of dynamic tables (shifts, assignments, swaps, etc.) between tests to ensure isolation without a full re-seed.
- **Base URL**: Defaults to `http://localhost:3001`.

## 🧪 Coverage & Requirements Verification

The test suite is organized by business requirement:

### 1. Scheduling & Constraints (`scheduling.spec.ts`)
- **Double-Booking**: Ensures overlapping shifts for the same user are blocked.
- **10-Hour Rest**: Validates the minimum gap requirement between consecutive shifts.

### 2. Labor Law Compliance (`compliance.spec.ts`)
- **12-Hour Block**: Hard block for daily hours exceeding 12.
- **7th Day Override**: Ensures a documented manager reason is required for 7th consecutive day assignments.

### 3. Cutoff & Privacy (`cutoff-constraints.spec.ts`)
- **Past Assignments**: Blocks managers from assigning staff to shifts that have already started.
- **48h Cutoff**: Enforces the schedule lock for managers while allowing Admin bypass.

### 4. Shift Swapping (`swap.spec.ts` & `edge-cases.spec.ts`)
- **Full Workflow**: Request -> Peer Acceptance -> Manager Approval.
- **Auto-Cancellation**: Pending swaps are cancelled if a manager modifies critical shift fields (e.g., start time).
- **Limits**: Max 3 pending requests per staff member.

### 5. Analytics & Fairness (`analytics.spec.ts`)
- Validates the calculation of the **Fairness Index** based on premium shift distribution.

### 6. Manager Access Control (`manager-access.spec.ts`)
- Verifies that managers only see locations and staff members they are authorized to manage.

## 💡 Best Practices
- **Isolation**: Always call `clearDynamicData()` in `beforeEach` or `beforeAll` when tests create their own data.
- **Relative Dates**: Use the date helpers in `test-helpers.ts` (e.g., `getFutureDate`, `getNextWednesday`) to avoid conflicts with fixed seed data or the 48h cutoff.
- **Error Handling**: Use the `safePost`/`safePut` helpers to get descriptive error messages when an API call fails unexpectedly.
