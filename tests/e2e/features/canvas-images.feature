Feature: Canvas image cards
  As a developer
  I want Canvas images stored as local binary assets
  So that image boards remain durable, private, and recoverable

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Add and restore a durable image card
    When I add an image through the Canvas file chooser
    And I wait for the Canvas scene to be saved
    And I refresh the page
    Then the Canvas image and its dimensions should be restored

  Scenario: Replace an image and open it in Image Smart View
    When I add an image through the Canvas file chooser
    And I wait for the Canvas scene to be saved
    And I replace the Canvas image
    Then I can open the replacement in the Image Smart View

  @clipboard
  Scenario: Copy an image with durable success feedback
    When I add an image through the Canvas file chooser
    And I copy the Canvas image
    Then the Canvas image copy should show two-second success feedback

  Scenario: Reject an unsupported image without creating a card
    When I choose an unsupported file for a Canvas image
    Then I should see a Canvas image error and no image card

  Scenario: Recover gracefully when a local image asset is missing
    When I add an image through the Canvas file chooser
    And I wait for the Canvas scene to be saved
    And I remove the Canvas image asset from local storage
    And I refresh the page
    Then the Canvas image card should show a recoverable placeholder
