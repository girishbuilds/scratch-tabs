Feature: Canvas paste, drop, and clipboard ingestion
  As a developer
  I want external and Canvas content to land predictably on my board
  So that collecting and rearranging material remains fast and local

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Paste plain text and complete JSON
    When I paste plain text and complete JSON into the Canvas
    Then the pasted content should become text and JSON cards

  Scenario: Drop mixed files without invoking the global tab drop
    When I drop an image and code file onto the Canvas
    Then the dropped files should become Canvas cards without creating tabs

  Scenario: Paste multiple inputs at the last pointer position
    When I paste multiple inputs at a known Canvas pointer position
    Then the pasted cards should be deterministically placed and selected

  @clipboard
  Scenario: Copy cut paste and preserve native editing paste
    When I add a Canvas text card containing "Clipboard one"
    And I add a Canvas text card containing "Clipboard two"
    And I multi-select Canvas cards "Clipboard one" and "Clipboard two"
    And I copy the Canvas selection
    And I cut the Canvas selection
    Then the Canvas text card count should be 0
    When I paste the Canvas selection
    Then the Canvas selected card count should be 2
    When I undo the Canvas operation
    Then the Canvas text card count should be 0
    When I undo the Canvas operation
    Then the Canvas text card count should be 2
    When I redo the Canvas operation
    Then the Canvas text card count should be 0
    When I redo the Canvas operation
    Then the Canvas text card count should be 2
    When I paste natively while editing the Canvas card
    Then the Canvas text card count should be 2
