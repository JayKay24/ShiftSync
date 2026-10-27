@compliance
Feature: Labor Law Compliance and Override Verification
  As a restaurant manager
  I want labor law compliance enforced during scheduling
  So that fatigue, overtime, and mandatory rest periods are strictly respected

  Rule: Staff assignments requiring compliance override mandate a documented reason

    Scenario: Manager documents an override reason when assigning a flagged staff member
      Given a published "line_cook" shift exists at "Coastal Eats - Downtown" tomorrow at "10:00"
      And "Bob" is logged in
      When Bob opens that shift on the Schedule Manager board
      Then the Shift Details modal shows "Suggested Staff"
