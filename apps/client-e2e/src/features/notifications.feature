@notifications
Feature: Notification Center and Real-Time Sync
  As a restaurant team member
  I want prompt notifications regarding shifts and swaps
  So that I am always updated on my work commitments

  Rule: Marking notifications as read syncs the header bell badge immediately

    @smoke
    Scenario: Staff marks a notification as read and observes instant badge decrement
      Given "Charlie" is logged in
      When Charlie notes the unread notification badge count
      And Charlie visits the Notifications page
      And Charlie marks the first unread notification as read
      Then the unread notification bell badge is updated immediately

  Rule: Notification center supports pagination for notification archives

    Scenario: Staff paginates through older notifications
      Given "Charlie" is logged in
      When Charlie visits the Notifications page
      And Charlie clicks "Load More Notifications"
      Then additional notifications are loaded in the list
