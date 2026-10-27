Feature: Performance and Language Detection

  Background:
    Given I am on the homepage

  @clipboard
  Scenario: Handle large JSON file and verify language detection
    When I generate a 1.5MB JSON file and set it to clipboard
    And I create a new tab from the document menu and clipboard
    Then the "Welcome" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And the first 10 lines of the editor should contain JSON content
    And the status bar language should be "JSON"
    And the status bar should show a green validation tick
    When I click the icon for "New tab"
    And I type the following markdown content into the editor:
      """
      # Test Markdown Document
      
      This is a **bold** test markdown file with *italic* text.
      
      ## Features
      
      - List item 1 with **bold text**
      - List item 2 with *italic text*
      - List item 3 with `code`
      
      ### Code Block
      
      ```javascript
      console.log("Hello World");
      ```
      
      > This is a blockquote
      """
    Then the status bar language should be "Markdown" 