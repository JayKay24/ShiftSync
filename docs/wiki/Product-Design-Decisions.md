# Product Design Decisions & Edge Case Resolutions

## 1. Overview

In real-world restaurant workforce management, operational scenarios frequently arise that sit on the boundary of standard scheduling rules. This document formalizes the deliberate product design decisions made for ShiftSync to resolve ambiguous edge cases in the **Coastal Eats** domain.

---

## 2. Decision Log: Ambiguous Domain Scenarios

### Decision 1: Location De-Certification vs. Historical Schedule Integrity

- **The Ambiguity**: When a staff member is de-certified from a restaurant location (e.g., due to an expired food handler permit, branch transfer, or skill revocation), what should happen to shifts they worked in the past and shifts they are assigned to in the future?
- **Business Impact**: Deleting or invalidating historical records destroys auditability and payroll integrity; leaving future shifts active exposes the restaurant to compliance liability.
- **Implemented Resolution**:
  1. **Historical Immutability**: All past shift assignments, completed swaps, and audit records remain permanently intact. De-certification does not rewrite historical records.
  2. **Future Shift Protection**: The system prevents assigning de-certified staff to future shifts at that location.
  3. **Pending Swap Invalidation**: If the staff member has pending swap or drop requests for future shifts at that location, the system cancels those requests and notifies the affected manager.

---

### Decision 2: Desired Hours vs. Availability Windows

- **The Ambiguity**: Staff profiles may define both **Availability Windows** (e.g., _"Available Mondays and Wednesdays 09:00–17:00"_) and **Desired Hours** (e.g., _"Targeting 25 hours per week"_). How do these interact during shift assignment?
- **Business Impact**: Confusing target hours with hard constraints could prevent managers from filling emergency shifts or lead to understaffing.
- **Implemented Resolution**:
  1. **Availability as a Hard Constraint**: Weekly recurring availability windows and date-specific unavailability exceptions are enforced by `ComplianceService`. Assigning a staff member outside their availability generates a scheduling block/warning.
  2. **Desired Hours as an Advisory Metric**: Desired hours serve as an analytics and ranking metric. The smart suggestion engine uses desired hours to prioritize under-scheduled staff who want additional hours, without blocking managers from scheduling up to legal overtime thresholds.

---

### Decision 3: Consecutive Day Counting for Short Shifts

- **The Ambiguity**: If an employee attends a mandatory 1-hour staff meeting or prep shift on a Tuesday, does that 1-hour shift count as a full "worked day" toward the 6th and 7th consecutive day overtime threshold?
- **Business Impact**: Under federal and California labor standards, attempting to exempt short shifts from consecutive-day tracking creates significant legal liability.
- **Implemented Resolution**:
  - **Any Shift Counts**: In ShiftSync, **any scheduled shift of any duration** within a calendar day counts as a worked calendar day toward consecutive day streaks.
  - A 1-hour shift on day 6 followed by a regular shift on day 7 will strictly trigger the 7th consecutive day override requirement with mandatory documented justification.

---

### Decision 4: Shift Modification Following Approved Swaps

- **The Ambiguity**: What happens if a manager alters shift hours or location _after_ a shift swap has already received final manager approval? Does the swap revert to the original owner?
- **Business Impact**: Reverting an already approved swap causes confusion for both employees who have already adjusted their personal schedules.
- **Implemented Resolution**:
  1. **Swap Approval is Final**: Once a swap request reaches `APPROVED` status, the database record is atomically updated; Staff B is now the sole canonical assignee of the shift.
  2. **Edits Apply to Current Assignee**: If a manager subsequently modifies the shift:
     - The modification is evaluated against the _new assignee's_ availability, rest periods, and hour caps.
     - The modification is subject to the **48-hour schedule lock** rule.
     - The shift does **not** revert to Staff A.

---

### Decision 5: Multi-Timezone Operations & Border Locations

- **The Ambiguity**: Coastal Eats operates restaurants across New York (`America/New_York`) and California (`America/Los_Angeles`). Staff occasionally travel or transfer between coasts. How are midnight-crossing shifts, availability, and premium hours evaluated?
- **Business Impact**: Using client-local time or server-local time for rule evaluations leads to phantom overtime, incorrect rest calculations, and false premium shift flags.
- **Implemented Resolution**:
  1. **UTC Storage**: All timestamps (`startTime`, `endTime`, `createdAt`, `updatedAt`) are stored strictly in UTC in PostgreSQL.
  2. **Location Canonical Timezone**: Every restaurant location entity defines its authoritative IANA timezone (`locations.timezone`).
  3. **Location-Centric Evaluation**: All business rules (calendar day boundaries, the 10-hour rest gap, overnight intervals, and the Friday/Saturday 17:00–23:59 premium window) are evaluated strictly in the **shift's restaurant location timezone** using JavaScript's native `Intl.DateTimeFormat`.
