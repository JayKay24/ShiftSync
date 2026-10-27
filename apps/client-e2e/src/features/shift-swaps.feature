@swaps
Feature: Peer Shift Swaps and Manager Approvals
  As a restaurant staff member or manager
  I want a collaborative shift swap workflow
  So that schedule conflicts can be resolved fairly with manager oversight

  Rule: Staff can initiate peer swap requests within their active limits

    @smoke
    Scenario: Staff initiates a peer swap request
      Given "Charlie" is logged in
      When Charlie visits the Swap Marketplace
      And Charlie initiates a swap request for the first available shift targeting "Dave" with reason "Family event swap"
      Then the request with reason "Family event swap" appears in My Requests with status "pending peer"

  Rule: Managers can review and approve pending peer-accepted swaps

    Scenario: Manager reviews pending swaps on the schedule board
      Given "Bob" is logged in
      When Bob opens the Review Swaps modal on the schedule board
      Then the pending swap modal displays requests awaiting approval

  Rule: Staff swap marketplace supports history pagination

    Scenario: Staff paginates through historical swap requests
      Given "Charlie" is logged in
      When Charlie visits the Swap Marketplace
      And Charlie clicks "Load More Swaps"
      Then additional swap request history is loaded
