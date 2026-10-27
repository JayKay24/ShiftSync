@analytics
Feature: Fairness Index and Labor Distribution Analytics
  As a restaurant manager
  I want visibility into shift distribution equity and premium hours
  So that premium shifts and weekly hours are balanced fairly across the team

  Rule: Managers can evaluate the Overall Fairness Index and shift distribution

    @smoke
    Scenario: Manager reviews Overall Fairness Index and hours distribution
      Given "Bob" is logged in
      When Bob visits the Analytics dashboard
      Then the page heading displays "Analytics & Fairness"
      And the Overall Fairness Index score percentage is displayed
      And the metrics card "Avg Hours / Staff" is visible
      And the Hours Distribution chart section is displayed
