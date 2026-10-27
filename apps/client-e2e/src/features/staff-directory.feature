@staff
Feature: Staff Directory, Privacy and Location-Based Access Control
  As a restaurant manager or corporate administrator
  I want staff directory visibility scoped to authorized locations
  So that employee privacy and regional management boundaries are strictly maintained

  Rule: Managers can only view staff certified for locations under their authority

    @smoke @lbac
    Scenario: New York Manager views only NY-certified staff members
      Given "Bob" is logged in
      When Bob visits the Staffing directory
      Then the staff member "Charlie Staff" is visible in the directory
      And the staff member "Dave Staff" is visible in the directory
      And the staff member "Grace Staff" is not visible in the directory

    @smoke @lbac
    Scenario: Los Angeles Manager views only LA-certified staff members
      Given "Diana" is logged in
      When Diana visits the Staffing directory
      Then the staff member "Grace Staff" is visible in the directory
      And the staff member "Heidi Staff" is visible in the directory
      And the staff member "Charlie Staff" is not visible in the directory

    @lbac
    Scenario: Corporate Administrator has global visibility across all locations
      Given "Alice" is logged in
      When Alice visits the Staffing directory
      Then the staff member "Charlie Staff" is visible in the directory
      And the staff member "Grace Staff" is visible in the directory

  Rule: Managers can inspect detailed staff skills, certified locations, and upcoming schedule

    Scenario: Manager inspects staff profile overview and schedule tabs
      Given "Bob" is logged in
      When Bob visits the Staffing directory
      And Bob opens the profile for "Charlie Staff"
      Then the staff profile modal is displayed for "Charlie Staff"
      And the profile modal displays the "Weekly Hours" section
      And the profile modal displays the "Certified Locations" section
      When Bob switches to the profile "Schedule" tab
      Then the profile modal displays the "Schedule" section

  Rule: Staff directory supports cursor-based pagination for large rosters

    Scenario: Manager paginates through staff members using Load More
      Given "Bob" is logged in
      When Bob visits the Staffing directory
      And Bob clicks "Load More Staff"
      Then additional staff cards are loaded into the directory
