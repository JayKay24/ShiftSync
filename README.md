# ShiftSync — Multi-Location Staff Scheduling Platform

**🌐 Live Demo:** [https://shiftsync-web.azurewebsites.net](https://shiftsync-web.azurewebsites.net)

ShiftSync is a web-based scheduling platform designed for **Coastal Eats**, a fictional restaurant group operating across multiple locations and time zones. It solves the complexities of real-world workforce management by balancing manager control with staff flexibility and labor law compliance.

## 🌟 Overview

The platform addresses critical pain points in hospitality management:
- **Coverage Gaps:** Preventing shifts from going unfilled.
- **Overtime Control:** Real-time tracking to prevent spiraling labor costs.
- **Fairness:** Equitable distribution of "premium" shifts (e.g., weekend nights).
- **Visibility:** A centralized view for corporate oversight across all locations.

## 🤔 Implementation Assumptions

Based on the requirements for Coastal Eats, the following technical and domain assumptions were made during development:

- **Single Organization:** The platform is scoped to a single organization (Coastal Eats). Multi-tenancy is handled via `locationId`.
- **Manager Data Isolation:** Managers are strictly restricted to seeing staff, schedules, and analytics for locations they are assigned to manage. Corporate Admins maintain global visibility.
- **Shift Skills:** A single shift requires exactly **one primary skill** (e.g., "Bartender"). Shifts needing multiple distinct skills are modeled as separate parallel shift records.
- **Group Assignments:** A single shift record can accommodate multiple staff members (`headcountNeeded` > 1) to prevent duplicating identical shift definitions.
- **Compliance Timezones:** All compliance calculations (10-hour rest, availability) are evaluated against the specific **location's local timezone**, ensuring accuracy for staff working across state lines.
- **48-Hour Schedule Lock:** To ensure operational stability, the system prevents Managers from editing or unpublishing shifts within 48 hours of their start time. Admins can bypass this lock for emergency adjustments.
- **Unified Swap/Drop Model:** A shift "drop" (putting a shift up for grabs) is modeled as a `swapRequest` with a `null` target user. 
- **Peer Rejection & Withdrawal:** Staff members can decline incoming swap requests, and requesters can withdraw pending requests, automatically reverting shift assignments to their original state.
- **Regret Swap Logic:** If a manager modifies a shift's critical details (time, location, or skill), the system automatically cancels any associated pending swap or drop requests.
- **Marketplace Guardrails:** Staff members are limited to **three active pending requests** (swaps or drops) to prevent schedule churn.
- **Shared Type Safety:** The platform uses a unified `@shiftsync/data-access` library containing `class-validator` decorated DTOs, serving as the single source of truth for both API contracts and database schema.

## DB Schema
![DB Schema](./docs/ShiftSync_db_schema.drawio.png)

## 🚀 Key Features

### 📅 Intelligent Scheduling
- **Constraint Enforcement:** Prevents double-booking, ensures 10-hour rest periods, and validates staff skills/certifications.
- **Multi-Location Support:** Handles staff certified at different branches across various time zones.
- **Conflict Resolution:** Provides automated suggestions for alternative staff when constraints are violated.

### 🔄 Shift Swapping & Coverage
- **Peer-to-Peer Swaps:** Staff can request swaps or offer shifts for "grabs."
- **Manager Approval Workflow:** Maintains schedule integrity through a multi-step approval process.
- **Real-Time Updates:** Instant notifications for all parties involved in a swap via WebSockets.

### ⚖️ Compliance & Analytics
- **Labor Law Alerts:** Automated warnings for weekly (40h) and daily (8h/12h) limits.
- **Consecutive Day Tracking:** Tracks 6th and 7th consecutive workdays with mandatory manager overrides.
- **Fairness Score:** Analytical reports on shift distribution and "desirable" shift equity.

### ⚡ Real-Time & Audit
- **Live Dashboards:** "On-duty now" view showing active staff across all locations.
- **Shared Notification State:** A unified unread counter that stays synced across all browser tabs in real-time.
- **Full Audit Trail:** Comprehensive logs of every schedule modification for accountability.

## 🛠 Tech Stack

- **Monorepo Management:** [Nx](https://nx.dev)
- **Frontend:** Next.js (TypeScript, Tailwind CSS, Lucide React)
- **Backend:** NestJS (TypeScript, WebSockets/Socket.io)
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Testing:** Jest (Server), Playwright (Client)

## 📖 Getting Started

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose

### Installation
```sh
npm install
```

## 🐳 Docker Deployment 

The easiest way to run the entire stack (Frontend, Backend, and Database) is using Docker Compose.

1. **Configure Environment:**
   Create a `.env` file in the root directory:
   ```env
   POSTGRES_PASSWORD=your_secure_password
   DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/shiftsync?sslmode=disable
   JWT_SECRET=your_secret_key
   ```

2. **Launch the Stack:**
   ```sh
   docker-compose up --build
   ```

3. **Access the Applications:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:3001/api](http://localhost:3001/api)

## 🧪 Testing

### Server Integration Tests
Verifies complex business logic, labor law compliance, and database state.
```sh
npx nx e2e server-e2e
```

### Client E2E Tests (Playwright)
Simulates end-to-end user journeys (Manager assignment, Staff swapping, Real-time notifications).
```sh
npx nx e2e client-e2e
```
*Note: The client suite uses a single worker and handles automated database seeding via a global setup.*

## 🧪 Seeding & Test Accounts

### Running the Seed
```sh
npm run db:seed
```

### Available Test Accounts (Password: `password123`)

| Role | Email | Scope / Details |
| :--- | :--- | :--- |
| **Admin** | `admin@coastaleats.com` | Global visibility & 48h lock bypass |
| **Manager** | `bob.manager@coastaleats.com` | Manages Downtown & Uptown (NY) |
| **Manager** | `diana.manager@coastaleats.com` | Manages Beach Grill (LA) |
| **Staff** | `charlie.staff@coastaleats.com` | NY certified (Unavailable Mondays) |
| **Staff** | `dave.staff@coastaleats.com` | NY certified (Unavailable Tuesdays) |
| **Staff** | `eva.staff@coastaleats.com` | Uptown certified (Unavailable Wednesdays) |
| **Staff** | `frank.staff@coastaleats.com` | NY & Uptown certified (24/7 available) |
| **Staff** | `grace.staff@coastaleats.com` | Beach Grill certified |
| **Staff** | `heidi.staff@coastaleats.com` | Beach Grill certified |

## 🛠 Local Development (Manual)
```sh
# Generate & Push Schema
npm run db:push

# Seed Data
npm run db:seed

# Start Backend
npx nx serve server

# Start Frontend
npx nx serve client
```
