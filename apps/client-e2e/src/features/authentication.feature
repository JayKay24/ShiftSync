@auth
Feature: User Authentication and Access Control
  As a restaurant team member
  I want to securely log into ShiftSync
  So that I am directed to the correct workspace and my data remains protected

  Rule: Valid credentials direct users to their role-appropriate dashboard

    @smoke
    Scenario: Manager logs in successfully and lands on Manager Overview
      When Bob logs in as "Bob" through the form
      Then Bob is redirected to "/dashboard/manager"
      And the page heading displays "Manager Overview"

    @smoke
    Scenario: Staff logs in successfully and lands on Staff Schedule
      When Charlie logs in as "Charlie" through the form
      Then Charlie is redirected to "/dashboard/staff"
      And the page heading displays "My Schedule"

    Scenario: Corporate Admin logs in successfully and lands on Manager Overview
      When Alice logs in as "Alice" through the form
      Then Alice is redirected to "/dashboard/manager"
      And the page heading displays "Manager Overview"

  Rule: Invalid credentials display descriptive feedback without authenticating

    Scenario: User submits an invalid password
      When Bob visits the login page
      And Bob signs in with email "bob.manager@coastaleats.com" and password "wrongpassword"
      Then an authentication error containing "Invalid credentials" is displayed

  Rule: Unauthenticated users are redirected from protected routes to login

    Scenario: Anonymous user attempts to visit the manager dashboard
      When Anonymous navigates to "/dashboard/manager"
      Then Anonymous is redirected to "/login"

  Rule: Authenticated users can log out safely

    Scenario: Manager signs out from the dashboard
      Given "Bob" is logged in
      When Bob clicks the logout button
      Then Bob is redirected to "/login"
