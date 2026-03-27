# ShiftSync — Multi-Location Staff Scheduling Platform

ShiftSync is a web-based scheduling platform designed for **Coastal Eats**, a fictional restaurant group operating across multiple locations and time zones. It solves the complexities of real-world workforce management by balancing manager control with staff flexibility and labor law compliance.

## 🌟 Overview

The platform addresses critical pain points in hospitality management:
- **Coverage Gaps:** Preventing shifts from going unfilled.
- **Overtime Control:** Real-time tracking to prevent spiraling labor costs.
- **Fairness:** Equitable distribution of "premium" shifts (e.g., weekend nights).
- **Visibility:** A centralized view for corporate oversight across all locations.

## 🤔 Implementation Assumptions

Based on the requirements for Coastal Eats, the following technical and domain assumptions were made during development:

- **Single Organization:** The platform is scoped to a single organization (Coastal Eats). Multi-tenancy is handled via `locationId` rather than a top-level `organizationId`.
- **Shift Skills:** A single shift requires exactly **one primary skill** (e.g., "Bartender"). Shifts needing multiple distinct skills are modeled as separate parallel shift records.
- **Group Assignments:** A single shift record can accommodate multiple staff members (`headcountNeeded` > 1) to prevent duplicating identical shift definitions.
- **Compliance Timezones:** The "10-hour rest period" and "maximum consecutive days" compliance calculations are evaluated against the specific **location's local timezone**, not UTC or the user's browser timezone.
- **Unified Swap/Drop Model:** A shift "drop" (putting a shift up for grabs) is modeled as a `swapRequest` with a `null` target user. 
- **Manager Approvals:** Any user with a `Manager` role (or `Admin`) can approve shift swaps and overrides; approval is not strictly restricted to the original creator of the shift.
- **Auditability:** Compliance overrides (like the 6th/7th consecutive workday) are recorded in a dedicated `complianceOverrides` table to maintain a strict audit trail, rather than an inline flag on the shift.

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
- **Real-Time Updates:** Instant notifications for all parties involved in a swap.

### ⚖️ Compliance & Analytics
- **Labor Law Alerts:** Automated warnings for weekly (40h) and daily (8h/12h) limits.
- **Consecutive Day Tracking:** Tracks 6th and 7th consecutive workdays with mandatory manager overrides.
- **Fairness Score:** Analytical reports on shift distribution and "desirable" shift equity.

### ⚡ Real-Time & Audit
- **Live Dashboards:** "On-duty now" view showing active staff across all locations.
- **Instant Notifications:** Real-time alerts for schedule changes via WebSockets.
- **Full Audit Trail:** Comprehensive logs of every schedule modification for accountability.

## 🛠 Tech Stack

- **Monorepo Management:** [Nx](https://nx.dev)
- **Frontend:** Next.js (TypeScript, Tailwind CSS, Lucide React)
- **Backend:** NestJS (TypeScript, WebSockets/Socket.io)
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Testing:** Jest (Integration)

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
   Create a `.env` file in the root directory (or ensure these variables are set in your shell):
   ```env
   POSTGRES_PASSWORD=your_secure_password
   ```

2. **Launch the Stack:**
   ```sh
   docker-compose up --build
   ```

3. **Access the Applications:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:3001/api](http://localhost:3001/api)
   - **Database:** `localhost:5432`

4. **Seed the Database:**
   Once the database is running, seed it with test data (locations, users, shifts):
   ```sh
   # Ensure DATABASE_URL is set in your .env or shell
   DATABASE_URL=postgresql://postgres:your_secure_password@localhost:5432/shiftsync?sslmode=disable npm run db:seed
   ```

## 🧪 Seeding & Test Accounts

The project includes a comprehensive seeding script to populate the database with realistic data for testing compliance rules, shift swaps, and multi-location scenarios.

### Running the Seed
```sh
npm run db:seed
```
*Note: This will clear existing data and recreate the core entities.*

### Available Test Accounts
All accounts use the password: `password123`

| Role | Email | Name |
| :--- | :--- | :--- |
| **Admin** | `admin@coastaleats.com` | Alice Admin |
| **Manager** | `bob.manager@coastaleats.com` | Bob Manager |
| **Staff** | `charlie.staff@coastaleats.com` | Charlie Staff |
| **Staff** | `dave.staff@coastaleats.com` | Dave Staff |
| **Staff** | `eva.staff@coastaleats.com` | Eva Staff |
| **Staff** | `frank.staff@coastaleats.com` | Frank Staff |

## 🛠 Local Development (Manual)
```sh
# Generate & Push Schema
npm run db:push

# Seed Data
npm run db:seed

# Start Server
npx nx serve server
```

### 3. Frontend
```sh
npx nx serve client
```


### Server Testing
```sh
# Run E2E tests
npx nx run server-e2e:e2e
```
