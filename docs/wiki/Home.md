# Welcome to the ShiftSync Wiki

Welcome to the official documentation and engineering wiki for **ShiftSync**, the multi-location staff scheduling and workforce management platform purpose-built for **Coastal Eats**.

Coastal Eats operates a collection of high-volume casual and fine-dining restaurants across multiple locations and time zones (Eastern Time and Pacific Time). Managing dynamic restaurant staffing across locations presents unique operational challenges: unpredictable guest volume, last-minute call-outs, strict labor law compliance, complex overtime thresholds, and fairness disputes over desirable shifts.

ShiftSync bridges the operational gap between store managers and floor staff. It pairs proactive labor law guardrails with real-time peer-to-peer shift swaps, transparent fairness scoring, and centralized corporate oversight.

---

## 🧭 Wiki Navigation

Explore the ShiftSync knowledge base by section:

### 📋 Product & Domain

- **[Product Requirements](Product-Requirements)**: Complete functional and non-functional requirements for Coastal Eats, including multi-location RBAC/LBAC, shift lifecycle, swap workflows, fairness scoring, and real-time collaboration.
- **[Domain Rules & Compliance](Domain-Rules-and-Compliance)**: Deep dive into labor law algorithms, the 10-hour rest gap, 8h/12h daily caps, 35h/40h weekly overtime rules, 7th consecutive day overrides, overnight shift handling, and the 6 core operational verification scenarios.
- **[Product Design Decisions](Product-Design-Decisions)**: Engineering resolutions for ambiguous hospitality scenarios, such as location de-certification, desired hours vs. availability windows, short-shift consecutive day counting, post-approval shift modifications, and timezone border management.
- **[Requirements Traceability Matrix](Requirements-Traceability)**: End-to-end matrix mapping every requirement to its implementation status (`Implemented`, `Partial`, `Planned`), backend services, frontend features, and automated test suites.

### 🏛 Engineering & Architecture

- **[Architecture Overview](Architecture-Overview)**: System design, Nx monorepo topology, shared `@shiftsync/data-access` library, NestJS 11 backend modules, React 19 SPA 3-tier feature architecture, and WebSocket event pipelines.
- **[Testing & Quality Gates](Testing-and-Quality-Gates)**: The 3-tier testing strategy (Vitest unit tests, PostgreSQL-backed `server-e2e` integration suites, Playwright UI journeys), surgical test isolation, ESLint boundary rules, and CI/CD automation.

### 📜 Decisions & History

- **[Architecture Decision Records (ADRs)](Architecture-Decision-Records)**: Catalog of 12 foundational Architecture Decision Records (ADR-001 through ADR-012) documenting context, decisions, alternatives, and consequences.
- **[Project History & Milestones](Project-History)**: Chronological narrative of the project's engineering journey across 7 phases and 100+ pull requests.

---

## 🚀 Quick Reference Links

| Resource                      | Description                            | Location                                                                     |
| :---------------------------- | :------------------------------------- | :--------------------------------------------------------------------------- |
| **Source Repository**         | Main monorepo codebase                 | [`JayKay24/ShiftSync`](https://github.com/JayKay24/ShiftSync)                |
| **Local Setup & Quick Start** | Installation, Docker, and dev commands | [Repository README](https://github.com/JayKay24/ShiftSync#readme)            |
| **Issue Tracker**             | Active tasks, bugs, and backlog        | [GitHub Issues](https://github.com/JayKay24/ShiftSync/issues)                |
| **Release Changelog**         | Automated semantic version history     | [CHANGELOG.md](https://github.com/JayKay24/ShiftSync/blob/main/CHANGELOG.md) |
| **Drizzle Studio**            | Local database GUI inspector           | Run `npm run db:studio`                                                      |
