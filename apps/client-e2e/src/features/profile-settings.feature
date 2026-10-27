@settings
Feature: User Profile and Account Settings
  As a restaurant team member
  I want to manage my account details and target hours
  So that my preferences are accurately reflected in the system

  Rule: Staff members can update their desired weekly hours

    @smoke
    Scenario: Staff updates desired weekly hours target
      Given "Charlie" is logged in
      When Charlie visits the Settings page
      And Charlie updates desired weekly hours to 38
      Then the desired weekly hours input reflects 38
