# Behavior-Driven Development (BDD) Living Documentation

## 1. Executive Summary

This document serves as the **executable, living specification** for Coastal Eats' ShiftSync platform.
All scenarios listed below are written in **business-readable Gherkin** syntax and directly compiled into automated Playwright browser tests executed in continuous integration.

Non-technical stakeholders, product owners, and engineers share these specifications as the single source of truth for application behavior.

---

## 2. Test Suite Metrics

| Metric                              | Total Count      |
| :---------------------------------- | :--------------- |
| **Total Features**                  | **11**           |
| **Business Rules**                  | **24**           |
| **Automated Scenarios**             | **29**           |
| **Smoke Suite Coverage (`@smoke`)** | **14 scenarios** |

### Tag Index

- `@smoke`: 14 scenario(s)
- `@auth`: 6 scenario(s)
- `@staff`: 5 scenario(s)
- `@compliance`: 4 scenario(s)
- `@cutoff`: 3 scenario(s)
- `@scheduling`: 3 scenario(s)
- `@swaps`: 3 scenario(s)
- `@lbac`: 3 scenario(s)
- `@audit`: 2 scenario(s)
- `@dashboard`: 2 scenario(s)
- `@notifications`: 2 scenario(s)
- `@analytics`: 1 scenario(s)
- `@settings`: 1 scenario(s)

---

## 3. Canonical Test Personas

Scenarios leverage concrete Coastal Eats personas matching seeded restaurant personnel:

| Persona           | Role                        | Location(s)            | Primary Purpose in BDD Suites                                      |
| :---------------- | :-------------------------- | :--------------------- | :----------------------------------------------------------------- |
| **Alice Admin**   | Corporate Admin             | Global (All Locations) | System oversight, emergency schedule overrides, global audit trail |
| **Bob Manager**   | Manager                     | Downtown & Uptown (NY) | Scheduling, staff suggestions, cutoff locks, peer swap approvals   |
| **Diana Manager** | Manager                     | The Beach Grill (LA)   | Regional LBAC isolation, managing West Coast schedule              |
| **Charlie Staff** | Staff (Server/Bartender)    | Downtown & Uptown (NY) | Shift marketplace swaps, desired hours tracking, notification sync |
| **Dave Staff**    | Staff (Line Cook)           | Downtown (NY)          | Peer swap partner, skills matching                                 |
| **Eva Staff**     | Staff (Server)              | Uptown (NY)            | Secondary NY peer                                                  |
| **Frank Staff**   | Staff (Line Cook/Bartender) | NY Locations           | 7th consecutive day overtime override testing                      |
| **Grace Staff**   | Staff (Host/Server)         | The Beach Grill (LA)   | LA regional privacy verification                                   |
| **Heidi Staff**   | Staff (Bartender)           | The Beach Grill (LA)   | LA staff peer verification                                         |

---

## 4. Living Specifications by Capability

### 📦 Audit Trail and System Transparency

**File**: `apps/client-e2e/src/features/audit-trail.feature`  
**Tags**: `@audit`

> As a restaurant manager or corporate auditor
> I want an immutable audit log of all scheduling changes
> So that modifications are fully traceable to the actor and timestamp

#### 📋 Rule: Managers can review individual shift modification histories

##### Scenario: Manager creates a shift and inspects its modification history `@smoke`

```gherkin
  Given "Alice" is logged in
  When Alice visits the Schedule Manager
  And Alice filters the schedule by location "Coastal Eats - Downtown"
  And Alice creates a new shift at "Coastal Eats - Downtown" for 6 days from now from "10:00" to "16:00" with headcount 77
  And Alice opens the shift with headcount 77
  And Alice clicks the View History button in the shift modal
  Then the Shift History modal displays audit log entries
```

#### 📋 Rule: Corporate Administrators have global oversight of all system modifications

##### Scenario: Corporate Admin inspects global audit trail with before and after diffs `@smoke`

```gherkin
  Given "Alice" is logged in
  When Alice visits the Corporate Audit Trail
  Then the page heading displays "Audit Trail"
  And the audit log list contains system modification records
  When Alice expands the first audit log entry
  Then the previous and resulting state diffs are visible
```

---

### 📦 User Authentication and Access Control

**File**: `apps/client-e2e/src/features/authentication.feature`  
**Tags**: `@auth`

> As a restaurant team member
> I want to securely log into ShiftSync
> So that I am directed to the correct workspace and my data remains protected

#### 📋 Rule: Valid credentials direct users to their role-appropriate dashboard

##### Scenario: Manager logs in successfully and lands on Manager Overview `@smoke`

```gherkin
  When Bob logs in as "Bob" through the form
  Then Bob is redirected to "/dashboard/manager"
  And the page heading displays "Manager Overview"
```

##### Scenario: Staff logs in successfully and lands on Staff Schedule `@smoke`

```gherkin
  When Charlie logs in as "Charlie" through the form
  Then Charlie is redirected to "/dashboard/staff"
  And the page heading displays "My Schedule"
```

##### Scenario: Corporate Admin logs in successfully and lands on Manager Overview

```gherkin
  When Alice logs in as "Alice" through the form
  Then Alice is redirected to "/dashboard/manager"
  And the page heading displays "Manager Overview"
```

#### 📋 Rule: Invalid credentials display descriptive feedback without authenticating

##### Scenario: User submits an invalid password

```gherkin
  When Bob visits the login page
  And Bob signs in with email "bob.manager@coastaleats.com" and password "wrongpassword"
  Then an authentication error containing "Invalid credentials" is displayed
```

#### 📋 Rule: Unauthenticated users are redirected from protected routes to login

##### Scenario: Anonymous user attempts to visit the manager dashboard

```gherkin
  When Anonymous navigates to "/dashboard/manager"
  Then Anonymous is redirected to "/login"
```

#### 📋 Rule: Authenticated users can log out safely

##### Scenario: Manager signs out from the dashboard

```gherkin
  Given "Bob" is logged in
  When Bob clicks the logout button
  Then Bob is redirected to "/login"
```

---

### 📦 Role-Based Operational Dashboards

**File**: `apps/client-e2e/src/features/dashboards.feature`  
**Tags**: `@dashboard`

> As a restaurant manager or staff member
> I want an informative dashboard overview
> So that I have immediate visibility into staffing, shifts, and weekly progress

#### 📋 Rule: Managers have real-time visibility into staff counts, pending swaps, and hour distribution

##### Scenario: Manager reviews operational summary on Manager Overview `@smoke`

```gherkin
  Given "Bob" is logged in
  Then the page heading displays "Manager Overview"
  And the KPI summary card "Total Staff" is visible
  And the KPI summary card "Pending Swaps" is visible
  And the KPI summary card "Upcoming Shifts" is visible
  And the On-Duty staff widget is visible
  And the Weekly Hour Distribution section is displayed
```

#### 📋 Rule: Staff members can track their upcoming shifts, timezone, and desired hours progress

##### Scenario: Staff reviews schedule and weekly target hours `@smoke`

```gherkin
  Given "Charlie" is logged in
  Then the page heading displays "My Schedule"
  And the user timezone badge displays "America/New_York"
  And the Next Shift card is displayed
  And the Desired Weekly Hours progress tracker is visible
```

---

### 📦 Fairness Index and Labor Distribution Analytics

**File**: `apps/client-e2e/src/features/fairness-analytics.feature`  
**Tags**: `@analytics`

> As a restaurant manager
> I want visibility into shift distribution equity and premium hours
> So that premium shifts and weekly hours are balanced fairly across the team

#### 📋 Rule: Managers can evaluate the Overall Fairness Index and shift distribution

##### Scenario: Manager reviews Overall Fairness Index and hours distribution `@smoke`

```gherkin
  Given "Bob" is logged in
  When Bob visits the Analytics dashboard
  Then the page heading displays "Analytics & Fairness"
  And the Overall Fairness Index score percentage is displayed
  And the metrics card "Avg Hours / Staff" is visible
  And the Hours Distribution chart section is displayed
```

---

### 📦 Labor Law Compliance and Override Verification

**File**: `apps/client-e2e/src/features/labor-compliance.feature`  
**Tags**: `@compliance`

> As a restaurant manager
> I want labor law compliance enforced during scheduling
> So that fatigue, overtime, and mandatory rest periods are strictly respected

#### 📋 Rule: Staff assignments requiring compliance override mandate a documented reason

##### Scenario: Manager documents an override reason when assigning a flagged staff member

```gherkin
  Given a published "line_cook" shift exists at "Coastal Eats - Downtown" tomorrow at "10:00"
  And "Bob" is logged in
  When Bob opens that shift on the Schedule Manager board
  Then the Shift Details modal shows "Suggested Staff"
```

---

### 📦 Notification Center and Real-Time Sync

**File**: `apps/client-e2e/src/features/notifications.feature`  
**Tags**: `@notifications`

> As a restaurant team member
> I want prompt notifications regarding shifts and swaps
> So that I am always updated on my work commitments

#### 📋 Rule: Marking notifications as read syncs the header bell badge immediately

##### Scenario: Staff marks a notification as read and observes instant badge decrement `@smoke`

```gherkin
  Given "Charlie" is logged in
  When Charlie notes the unread notification badge count
  And Charlie visits the Notifications page
  And Charlie marks the first unread notification as read
  Then the unread notification bell badge is updated immediately
```

#### 📋 Rule: Notification center supports pagination for notification archives

##### Scenario: Staff paginates through older notifications

```gherkin
  Given "Charlie" is logged in
  When Charlie visits the Notifications page
  And Charlie clicks "Load More Notifications"
  Then additional notifications are loaded in the list
```

---

### 📦 User Profile and Account Settings

**File**: `apps/client-e2e/src/features/profile-settings.feature`  
**Tags**: `@settings`

> As a restaurant team member
> I want to manage my account details and target hours
> So that my preferences are accurately reflected in the system

#### 📋 Rule: Staff members can update their desired weekly hours

##### Scenario: Staff updates desired weekly hours target `@smoke`

```gherkin
  Given "Charlie" is logged in
  When Charlie visits the Settings page
  And Charlie updates desired weekly hours to 38
  Then the desired weekly hours input reflects 38
```

---

### 📦 Schedule Cutoff and Past Shift Protections

**File**: `apps/client-e2e/src/features/schedule-cutoff.feature`  
**Tags**: `@cutoff` `@compliance`

> As Coastal Eats leadership
> We want past shifts locked and near-term schedules protected within 48 hours of start time
> So that staff have predictable schedules while Admins retain emergency override authority

#### 📋 Rule: Past shifts cannot have their staffing modified

##### Scenario: Manager inspects a completed shift from the previous week

```gherkin
  Given "Bob" is logged in
  When Bob opens a completed shift at "Coastal Eats - Downtown" from the previous week
  Then he sees the notice "This shift has already passed"
  And the Suggested Staff list is hidden
```

#### 📋 Rule: Shifts starting within 48 hours warn Managers but exempt Corporate Admins

##### Scenario: Manager sees the 48-hour schedule lock warning on a shift starting tomorrow `@smoke`

```gherkin
  Given a published "server" shift exists at "Coastal Eats - Downtown" tomorrow at "11:00"
  And "Bob" is logged in
  When Bob opens that shift on the Schedule Manager board
  Then he sees the 48-hour schedule lock warning banner
```

##### Scenario: Corporate Admin inspects a shift within 48 hours without lock restrictions

```gherkin
  Given a published "server" shift exists at "Coastal Eats - Downtown" tomorrow at "11:00"
  And "Alice" is logged in
  When Alice opens that shift on the Schedule Manager board
  Then she does not see the 48-hour schedule lock warning banner
```

---

### 📦 Shift Scheduling and Staff Assignment

**File**: `apps/client-e2e/src/features/shift-scheduling.feature`  
**Tags**: `@scheduling`

> As a restaurant manager
> I want to create shifts, navigate calendar weeks, and assign qualified staff
> So that every service is appropriately covered by certified team members

#### 📋 Rule: Managers can create future shifts and auto-navigate to the scheduled week

##### Scenario: Manager schedules a new shift in the upcoming week `@smoke`

```gherkin
  Given "Bob" is logged in
  When Bob visits the Schedule Manager
  And Bob filters the schedule by location "Coastal Eats - Downtown"
  And Bob creates a new shift at "Coastal Eats - Downtown" for 7 days from now from "10:00" to "16:00" with headcount 88
  Then a shift card with headcount 88 is displayed on the schedule grid
```

#### 📋 Rule: Managers can inspect shift details and assign suggested certified staff

##### Scenario: Manager opens a shift and assigns suggested staff

```gherkin
  Given "Bob" is logged in
  When Bob visits the Schedule Manager
  And Bob filters the schedule by location "Coastal Eats - Downtown"
  And Bob creates a new shift at "Coastal Eats - Downtown" for 16 days from now from "10:00" to "16:00" with headcount 66
  And Bob opens the shift with headcount 66
  Then the Shift Details modal shows "Suggested Staff"
  When Bob assigns the first suggested staff member
  Then the staff member is listed under Assigned Staff
```

#### 📋 Rule: Managers can navigate across calendar weeks to view schedules

##### Scenario: Manager navigates backwards and forwards across weeks

```gherkin
  Given "Bob" is logged in
  When Bob visits the Schedule Manager
  And Bob navigates to the previous week on the calendar
  And Bob navigates to the next week on the calendar
  Then the page heading displays "Schedule Manager"
```

---

### 📦 Peer Shift Swaps and Manager Approvals

**File**: `apps/client-e2e/src/features/shift-swaps.feature`  
**Tags**: `@swaps`

> As a restaurant staff member or manager
> I want a collaborative shift swap workflow
> So that schedule conflicts can be resolved fairly with manager oversight

#### 📋 Rule: Staff can initiate peer swap requests within their active limits

##### Scenario: Staff initiates a peer swap request `@smoke`

```gherkin
  Given "Charlie" is logged in
  When Charlie visits the Swap Marketplace
  And Charlie initiates a swap request for the first available shift targeting "Dave" with reason "Family event swap"
  Then the request with reason "Family event swap" appears in My Requests with status "pending peer"
```

#### 📋 Rule: Managers can review and approve pending peer-accepted swaps

##### Scenario: Manager reviews pending swaps on the schedule board

```gherkin
  Given "Bob" is logged in
  When Bob opens the Review Swaps modal on the schedule board
  Then the pending swap modal displays requests awaiting approval
```

#### 📋 Rule: Staff swap marketplace supports history pagination

##### Scenario: Staff paginates through historical swap requests

```gherkin
  Given "Charlie" is logged in
  When Charlie visits the Swap Marketplace
  And Charlie clicks "Load More Swaps"
  Then additional swap request history is loaded
```

---

### 📦 Staff Directory, Privacy and Location-Based Access Control

**File**: `apps/client-e2e/src/features/staff-directory.feature`  
**Tags**: `@staff`

> As a restaurant manager or corporate administrator
> I want staff directory visibility scoped to authorized locations
> So that employee privacy and regional management boundaries are strictly maintained

#### 📋 Rule: Managers can only view staff certified for locations under their authority

##### Scenario: New York Manager views only NY-certified staff members `@smoke` `@lbac`

```gherkin
  Given "Bob" is logged in
  When Bob visits the Staffing directory
  Then the staff member "Charlie Staff" is visible in the directory
  And the staff member "Dave Staff" is visible in the directory
  And the staff member "Grace Staff" is not visible in the directory
```

##### Scenario: Los Angeles Manager views only LA-certified staff members `@smoke` `@lbac`

```gherkin
  Given "Diana" is logged in
  When Diana visits the Staffing directory
  Then the staff member "Grace Staff" is visible in the directory
  And the staff member "Heidi Staff" is visible in the directory
  And the staff member "Charlie Staff" is not visible in the directory
```

##### Scenario: Corporate Administrator has global visibility across all locations `@lbac`

```gherkin
  Given "Alice" is logged in
  When Alice visits the Staffing directory
  Then the staff member "Charlie Staff" is visible in the directory
  And the staff member "Grace Staff" is visible in the directory
```

#### 📋 Rule: Managers can inspect detailed staff skills, certified locations, and upcoming schedule

##### Scenario: Manager inspects staff profile overview and schedule tabs

```gherkin
  Given "Bob" is logged in
  When Bob visits the Staffing directory
  And Bob opens the profile for "Charlie Staff"
  Then the staff profile modal is displayed for "Charlie Staff"
  And the profile modal displays the "Weekly Hours" section
  And the profile modal displays the "Certified Locations" section
  When Bob switches to the profile "Schedule" tab
  Then the profile modal displays the "Schedule" section
```

#### 📋 Rule: Staff directory supports cursor-based pagination for large rosters

##### Scenario: Manager paginates through staff members using Load More

```gherkin
  Given "Bob" is logged in
  When Bob visits the Staffing directory
  And Bob clicks "Load More Staff"
  Then additional staff cards are loaded into the directory
```

---

## 5. Traceability and Quality Gates

- **Automated Execution**: Run locally via `npm run bdd:test` or interactively via `npm run bdd:ui`.
- **Stakeholder Reports**: Every run produces an interactive HTML report at `dist/bdd-report/index.html`.
- **Wiki Synchronization**: Pushing changes to `develop` or `main` automatically publishes this living document to the [ShiftSync GitHub Wiki](https://github.com/JayKay24/ShiftSync/wiki/BDD-Living-Documentation).
