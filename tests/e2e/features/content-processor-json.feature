Feature: Json content processing

  Background:
    Given I am on the homepage

  @clipboard
  Scenario: Clean and format stringified json
    When I set clipboard content to ""{\"name\":\"John Doe\",\"age\":30,\"isStudent\":false,\"courses\":[{\"id\":1,\"name\":\"History\"},{\"id\":2,\"name\":\"Math\"}]}""
    And I create a new tab from the document menu and clipboard
    Then the "Welcome" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And the editor content should not be on a single line
    And the active editor content should contain "John Doe"
    And the active editor content should contain "History"
    And the active editor content should contain "Math"
    And the status bar language should be "JSON"
    And the status bar should show a green validation tick