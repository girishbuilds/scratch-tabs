@welcome
Feature: Welcome Screen Entry Points

  Background:
    Given I am on the homepage

  Scenario: Create new tab from + icon
    When I click the icon for "New tab"
    Then the "Welcome" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"

  @clipboard
  Scenario: Create new tab from the document menu with clipboard content
    When I set clipboard content to "Hello from clipboard"
    And I create a new tab from the document menu and clipboard
    Then the "Welcome" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And the active editor content should be:
      """
      Hello from clipboard
      """
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"

  Scenario: Create a tablet from the document menu
    When I open the Tool Selector from the document menu
    And I select "Calculator" from the tablet selector
    Then the "Welcome" tab should exist and not be active
    And the "Calculator" tablet should be active
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"

  Scenario: Create new tab from double-click on page
    When I double-click on the page
    Then the "Welcome" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"

  Scenario: Create new tab from file upload
    When I upload file "test-file.txt" with content "File content here"
    Then the "Welcome" tab should exist and not be active
    And the "test-file" tab should be active
    And the active editor content should be:
      """
      File content here
      """
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"

  Scenario: Create new tablet from "Dev Tools" button
    When I click the "Dev Tools" button
    And I select "Password Generator" from the tablet selector
    Then the "Welcome" tab should exist and not be active
    And the "Password Generator" tablet should be active
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"

  @clipboard
  Scenario: Create new tab from "Paste Content" button
    When I set clipboard content to "Imported clipboard content"
    And I click the "Paste Content" button
    Then the "Welcome" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And the active editor content should be:
      """
      Imported clipboard content
      """
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"

  Scenario: Create new tab from drag and drop file
    When I drag file "dragged-file.json" with content '{"key": "value"}' onto the page
    Then the "Welcome" tab should exist and not be active
    And the "dragged-file" tab should be active
    And the active editor content should be:
      """
      {"key": "value"}
      """
    And I click the "Welcome" tab
    Then the active editor should contain markdown content
    When I click the Smart View button
    Then the preview should be visible
    And the URL should contain "welcome"
