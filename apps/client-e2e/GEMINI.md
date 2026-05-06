# ShiftSync Client E2E - Testing Context

This project contains end-to-end UI tests for the ShiftSync client application using **Playwright**.

## 🚀 Key Commands

- `npx nx e2e client-e2e`: Run all Playwright tests.
- `npx nx e2e client-e2e --ui`: Run tests in Playwright's UI mode for debugging.

## 🏗 Test Architecture

- **Tooling**: [Playwright](https://playwright.dev/)
- **Setup**: `src/support/global-setup.ts` seeds the database using `npm run db:seed` before tests start.
- **Base URL**: Defaults to `http://localhost:3000`.
- **Authentication**: Helper functions in `src/support/test-helpers.ts` handle login for various roles (Admin, Manager, Staff).

## 🧪 Coverage & Scenarios

The tests in `src/shiftsync.spec.ts` cover critical business requirements:

### 1. Access Control & Privacy
- Managers can only see staff certified for their assigned locations.
- Managers cannot see staff from other locations.

### 2. Labor Law & Hard Blocks
- **Past Shifts**: Warning banners appear for past shifts, and staff suggestions are hidden.
- **48h Lock**: Managers see a warning banner for shifts within 48 hours of starting, indicating restricted editability.

### 3. Manager vs Admin Privileges
- Admins bypass the 48h schedule lock warning and can edit shifts at any time.

### 4. Audit & Transparency
- **Shift History**: Admins can view the audit trail for specific shifts, verifying "Created" logs and authorship.
- **Global Audit**: Corporate oversight via a global audit trail view for Admins.

### 5. Analytics
- Verification of the **Fairness Index** and **Premium Shift Distribution** visualizations for managers.

### 6. Shift Workflows
- **Swapping**: Staff members can initiate swap requests with peers.
- **Notifications**: Real-time sync of notification badges when marking items as read.

## 💡 Tips for Testing
- Use `data-testid` attributes for resilient selectors.
- Tests rely on a seeded state; ensure `db:seed` is up to date if schema changes occur.
