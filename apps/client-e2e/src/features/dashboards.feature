@dashboard
Feature: Role-Based Operational Dashboards
  As a restaurant manager or staff member
  I want an informative dashboard overview
  So that I have immediate visibility into staffing, shifts, and weekly progress

  Rule: Managers have real-time visibility into staff counts, pending swaps, and hour distribution

    @smoke
    Scenario: Manager reviews operational summary on Manager Overview
      Given "Bob" is logged in
      Then the page heading displays "Manager Overview"
      And the KPI summary card "Total Staff" is visible
      And the KPI summary card "Pending Swaps" is visible
      And the KPI summary card "Upcoming Shifts" is visible
      And the On-Duty staff widget is visible
      And the Weekly Hour Distribution section is displayed

  Rule: Staff members can track their upcoming shifts, timezone, and desired hours progress

    @smoke
    Scenario: Staff reviews schedule and weekly target hours
      Given "Charlie" is logged in
      Then the page heading displays "My Schedule"
      And the user timezone badge displays "America/New_York"
      And the Next Shift card is displayed
      And the Desired Weekly Hours progress tracker is visible
