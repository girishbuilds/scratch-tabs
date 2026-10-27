Feature: Smart View Callout Notification
  As a user pasting content with available smart views
  I want to see a notification suggesting the smart view
  So that I can easily discover and activate smart views for my content

  Background:
    Given I am on the homepage

  @clipboard
  Scenario: Smart View callout appears for "New tab from clipboard" button
    When I set clipboard content to:
      """
      {
        "clipboard": "test",
        "source": "paste button"
      }
      """
    And I create a new tab from the document menu and clipboard
    Then the status bar language should be "JSON"
    And I should see the smart view callout
    And the smart view callout message should contain "Data View"

  @clipboard
  Scenario: Clicking Data View button activates Smart View
    When I set clipboard content to:
      """
      {
        "product": "Laptop",
        "price": 999.99
      }
      """
    And I create a new tab from the document menu and clipboard
    Then I should see the smart view callout
    When I click the Data View button in the smart view callout
    Then I should not see the smart view callout
    And I should see the JSON Smart View

  @clipboard
  Scenario: Clicking Dismiss button hides callout permanently for that tab
    When I set clipboard content to:
      """
      {
        "user": "Alice",
        "role": "admin"
      }
      """
    And I create a new tab from the document menu and clipboard
    Then I should see the smart view callout
    When I click the smart view callout dismiss button
    Then I should not see the smart view callout

  @clipboard
  Scenario: Smart View callout auto-dismisses after 15 seconds
    When I set clipboard content to:
      """
      {
        "timeout": "test"
      }
      """
    And I create a new tab from the document menu and clipboard
    Then I should see the smart view callout
    When I wait for 16 seconds
    Then I should not see the smart view callout

  @clipboard
  Scenario: Smart View callout shows correct format name for CSV
    When I set clipboard content to:
      """
      name,age,city
      John,30,New York
      Jane,25,London
      """
    And I create a new tab from the document menu and clipboard
    Then the status bar language should be "CSV / TSV"
    And I should see the smart view callout
    And the smart view callout message should contain "Data View"
