# ShiftSync — Multi-Location Staff Scheduling Platform

ShiftSync is a web-based scheduling platform designed for **Coastal Eats**, a fictional restaurant group operating across multiple locations and time zones. It solves the complexities of real-world workforce management by balancing manager control with staff flexibility and labor law compliance.

## 🌟 Overview

The platform addresses critical pain points in hospitality management:
- **Coverage Gaps:** Preventing shifts from going unfilled.
- **Overtime Control:** Real-time tracking to prevent spiraling labor costs.
- **Fairness:** Equitable distribution of "premium" shifts (e.g., weekend nights).
- **Visibility:** A centralized view for corporate oversight across all locations.

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
- Node.js (v18+)
- Docker (for database)

### Installation
```sh
npm install
```

### Development
```sh
# Start the backend server
npx nx serve server

# Start the frontend client
npx nx serve client
```

### Server Testing
```sh
# Run E2E tests
npx nx run server-e2e:e2e
```

---
*Built as a Full-Stack Developer Assessment for Priority Soft.*
