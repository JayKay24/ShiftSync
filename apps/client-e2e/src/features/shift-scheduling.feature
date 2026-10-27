@scheduling
Feature: Shift Scheduling and Staff Assignment
  As a restaurant manager
  I want to create shifts, navigate calendar weeks, and assign qualified staff
  So that every service is appropriately covered by certified team members

  Rule: Managers can create future shifts and auto-navigate to the scheduled week

    @smoke
    Scenario: Manager schedules a new shift in the upcoming week
      Given "Bob" is logged in
      When Bob visits the Schedule Manager
      And Bob filters the schedule by location "Coastal Eats - Downtown"
      And Bob creates a new shift at "Coastal Eats - Downtown" for 7 days from now from "10:00" to "16:00" with headcount 88
      Then a shift card with headcount 88 is displayed on the schedule grid

  Rule: Managers can inspect shift details and assign suggested certified staff

    Scenario: Manager opens a shift and assigns suggested staff
      Given "Bob" is logged in
      When Bob visits the Schedule Manager
      And Bob filters the schedule by location "Coastal Eats - Downtown"
      And Bob creates a new shift at "Coastal Eats - Downtown" for 16 days from now from "10:00" to "16:00" with headcount 66
      And Bob opens the shift with headcount 66
      Then the Shift Details modal shows "Suggested Staff"
      When Bob assigns the first suggested staff member
      Then the staff member is listed under Assigned Staff

  Rule: Managers can navigate across calendar weeks to view schedules

    Scenario: Manager navigates backwards and forwards across weeks
      Given "Bob" is logged in
      When Bob visits the Schedule Manager
      And Bob navigates to the previous week on the calendar
      And Bob navigates to the next week on the calendar
      Then the page heading displays "Schedule Manager"
