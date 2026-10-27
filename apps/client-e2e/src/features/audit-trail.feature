@audit
Feature: Audit Trail and System Transparency
  As a restaurant manager or corporate auditor
  I want an immutable audit log of all scheduling changes
  So that modifications are fully traceable to the actor and timestamp

  Rule: Managers can review individual shift modification histories

    @smoke
    Scenario: Manager creates a shift and inspects its modification history
      Given "Alice" is logged in
      When Alice visits the Schedule Manager
      And Alice filters the schedule by location "Coastal Eats - Downtown"
      And Alice creates a new shift at "Coastal Eats - Downtown" for 6 days from now from "10:00" to "16:00" with headcount 77
      And Alice opens the shift with headcount 77
      And Alice clicks the View History button in the shift modal
      Then the Shift History modal displays audit log entries

  Rule: Corporate Administrators have global oversight of all system modifications

    @smoke
    Scenario: Corporate Admin inspects global audit trail with before and after diffs
      Given "Alice" is logged in
      When Alice visits the Corporate Audit Trail
      Then the page heading displays "Audit Trail"
      And the audit log list contains system modification records
      When Alice expands the first audit log entry
      Then the previous and resulting state diffs are visible
