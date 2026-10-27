---
name: bdd-browser
allowed-tools: Bash, Read, Grep, Glob, Write, Agent
argument-hint: [feature-name | @tag]
description: 'Interactively walk through ShiftSync BDD scenarios using the Antigravity browser agent. Reads declarative .feature files, logs in as the scenario persona, and visually executes every step against the live application.'
---

## What this skill does

`bdd-browser` links your Gherkin `.feature` specifications to real browser execution.
When you want to see a feature in action, verify UI layouts, or watch an AI agent drive acceptance scenarios through the browser, this skill reads the target `.feature` file, identifies the personas and business rules, and walks through the steps interactively.

---

## 1. Preflight Checklist

Before starting browser walkthroughs, ensure:

1. **Dev Servers Running**:
   - Backend API: `http://localhost:3001/api` (via `npx nx run server:serve`)
   - Frontend Client: `http://localhost:3000` (via `npx nx run client:dev`)
2. **Database Seeded**:
   - Apply the full seed baseline: `npm run db:seed -- --full`
3. **Target Feature or Tag**:
   - Check `apps/client-e2e/src/features/` for available files:
     - `authentication.feature` (`@auth`)
     - `dashboards.feature` (`@dashboard`)
     - `staff-directory.feature` (`@staff`, `@lbac`)
     - `shift-scheduling.feature` (`@scheduling`)
     - `schedule-cutoff.feature` (`@cutoff`)
     - `labor-compliance.feature` (`@compliance`)
     - `shift-swaps.feature` (`@swaps`)
     - `notifications.feature` (`@notifications`)
     - `fairness-analytics.feature` (`@analytics`)
     - `audit-trail.feature` (`@audit`)
     - `profile-settings.feature` (`@settings`)

---

## 2. Test Personas & Credentials

All test users share password `password123`:

- **Alice Admin**: `admin@coastaleats.com` (Corporate Admin, global access, schedule lock bypass)
- **Bob Manager**: `bob.manager@coastaleats.com` (NY Manager, Downtown & Uptown locations)
- **Diana Manager**: `diana.manager@coastaleats.com` (LA Manager, The Beach Grill)
- **Charlie Staff**: `charlie.staff@coastaleats.com` (Staff Server/Bartender, NY)
- **Dave Staff**: `dave.staff@coastaleats.com` (Staff Line Cook, NY)

---

## 3. Step-by-Step Execution Workflow

1. **Read the Feature File**:
   - Open `apps/client-e2e/src/features/<target>.feature`.
   - Read the user story, `Rule:` statements, and scenario `Given / When / Then` steps.

2. **Launch the Browser**:
   - Use `/browser` to open `http://localhost:3000`.
   - If the scenario specifies `Given "<Persona>" is logged in`, sign in through the login page with that persona's credentials.

3. **Walk Through Scenario Steps**:
   - For `When` actions: click buttons, fill fields, and trigger modals exactly as described in the scenario.
   - For `Then` outcomes: visually inspect the page and confirm banners, table rows, and badges appear as expected.

4. **Summarize Verification Findings**:
   - Report the status of each scenario:
     - `✓ Scenario: <Title>` (All acceptance criteria visually confirmed)
     - `✗ Scenario: <Title>` (Discrepancy or issue observed, with explanation)
