Feature: Canvas lifecycle persistence

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"

  Scenario: Pending edits survive an immediate workspace switch
    When I create a new Canvas
    And I add a Canvas text card containing "Flush before workspace switch"
    And I click the create workspace button in sidebar
    And I click on tab "Canvas 1" in the sidebar
    Then the Canvas should contain a text card with "Flush before workspace switch"

  Scenario: A non-empty Canvas is protected from accidental closure
    When I create a new Canvas
    And I add a Canvas text card containing "Do not lose this"
    And I click the close button on the "Canvas 1" tab
    Then I should see the close confirmation dialog
    When I click "Cancel" in the confirmation dialog
    Then the Canvas should contain a text card with "Do not lose this"
    When I click the close button on the "Canvas 1" tab
    And I click "Confirm" in the confirmation dialog
    Then the "Canvas 1" tab should not exist on the page

  Scenario: Two split Canvas documents persist independently
    When I resize to a wide Canvas split viewport
    And I create a new Canvas
    And I create a new Canvas
    And I click the "Canvas 1" tab
    And I right-click the "Canvas 2" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    When I add a Canvas text card containing "Left Canvas note" on the left side
    And I add a Canvas text card containing "Right Canvas note" on the right side
    And I wait for the left Canvas scene to be saved
    And I wait for the right Canvas scene to be saved
    And I wait for the workspace layout to be persisted
    And I refresh the page
    Then the left Canvas should contain a text card with "Left Canvas note"
    And the right Canvas should contain a text card with "Right Canvas note"
    And each split Canvas should show its own status contribution
