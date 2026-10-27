@cutoff @compliance
Feature: Schedule Cutoff and Past Shift Protections
  As Coastal Eats leadership
  We want past shifts locked and near-term schedules protected within 48 hours of start time
  So that staff have predictable schedules while Admins retain emergency override authority

  Rule: Past shifts cannot have their staffing modified

    Scenario: Manager inspects a completed shift from the previous week
      Given "Bob" is logged in
      When Bob opens a completed shift at "Coastal Eats - Downtown" from the previous week
      Then he sees the notice "This shift has already passed"
      And the Suggested Staff list is hidden

  Rule: Shifts starting within 48 hours warn Managers but exempt Corporate Admins

    @smoke
    Scenario: Manager sees the 48-hour schedule lock warning on a shift starting tomorrow
      Given a published "server" shift exists at "Coastal Eats - Downtown" tomorrow at "11:00"
      And "Bob" is logged in
      When Bob opens that shift on the Schedule Manager board
      Then he sees the 48-hour schedule lock warning banner

    Scenario: Corporate Admin inspects a shift within 48 hours without lock restrictions
      Given a published "server" shift exists at "Coastal Eats - Downtown" tomorrow at "11:00"
      And "Alice" is logged in
      When Alice opens that shift on the Schedule Manager board
      Then she does not see the 48-hour schedule lock warning banner
