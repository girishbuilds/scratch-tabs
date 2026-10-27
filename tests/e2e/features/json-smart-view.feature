Feature: JSON Smart View Tab Management
  As a user working with multiple JSON tabs
  I want each tab to maintain its own independent JSON content when using the JSON Smart View
  So that switching between tabs preserves each tab's unique content in the JSON mapper

  Background:
    Given I am on the homepage

  Scenario: JSON Smart View maintains content isolation between tabs
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "user": "John",
        "age": 30,
        "city": "New York"
      }
      """
    Then the status bar language should be "JSON"
    When I click the Smart View button
    Then I should see the JSON Smart View
    And the JSON Smart View should contain "John"
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "product": "iPhone",
        "price": 999,
        "available": true
      }
      """
    Then the status bar language should be "JSON"
    When I click the Smart View button
    Then I should see the JSON Smart View
    And the JSON Smart View should contain "iPhone"
    When I click the "Scratch 1" tab
    Then the JSON Smart View should contain "John"
    When I click the "Scratch 2" tab
    Then the JSON Smart View should contain "iPhone"
    When I click the "Scratch 1" tab
    Then the JSON Smart View should contain "John"

  Scenario: JSON Smart View content switching between multiple tabs
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"category": "electronics", "item": "laptop"}
      """
    Then the status bar language should be "JSON"
    When I click the Smart View button
    Then I should see the JSON Smart View
    And the JSON Smart View should contain "electronics"
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"category": "books", "item": "novel"}
      """
    Then the status bar language should be "JSON"
    When I click the Smart View button
    Then I should see the JSON Smart View
    And the JSON Smart View should contain "books"
    When I click the "Scratch 1" tab
    Then the JSON Smart View should contain "electronics"
    When I click the "Scratch 2" tab
    Then the JSON Smart View should contain "books"
    When I click the "Scratch 1" tab
    Then the JSON Smart View should contain "electronics"

  Scenario: JSON Smart View editing synchronizes back to main editor
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"original": "data", "version": 1}
      """
    Then the status bar language should be "JSON"
    When I click the Smart View button
    Then I should see the JSON Smart View
    And the JSON Smart View should contain "original"
    When I make changes to the JSON in Smart View
    And I click the Text View button in the status bar
    Then I should not see the JSON Smart View
    And I should see the Monaco editor
    And the active editor content should contain "edited"

  Scenario: TreeView click navigation works for nested JSON
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "config": {
            "name": "MyApp",
            "version": "1.0.0",
            "host": "localhost",
            "port": 5432,
            "timeout": 30000,
            "caching": true,
            "logging": false,
            "maxConnections": 100,
            "retryAttempts": 5,
            "retryDelay": 2000,
            "experimental": true,
            "beta": false,
            "darkMode": true,
            "enableTLS": true,
            "allowedIPs": "127.0.0.1",
            "dataDir": "/var/lib/myapp/data",
            "logDir": "/var/log/myapp",
            "tempDir": "/tmp/myapp"
        }
      }
      """
    Then the status bar language should be "JSON"
    When I click the Smart View button
    Then I should see the JSON Smart View
    When I click on the JSON tree node for "config.tempDir"
    Then the Monaco editor should scroll to show "/tmp/myapp"
    And the text "tempDir" should be highlighted in the Monaco editor