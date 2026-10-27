@quick-transform
Feature: Quick Transform
  As a user working with text
  I want to quickly apply operations from the editor's right-click menu
  So that I can transform content without opening the full pipeline

  Background:
    Given I am on the homepage

  @serial
  Scenario: Quick Transform is registered in the Monaco editor context menu
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I verify Quick Transform appears in the editor context menu

  Scenario: Open Quick Transform modal and close with Escape
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I open the Quick Transform modal
    Then the Quick Transform modal should be visible
    When I press Escape in the Quick Transform modal
    Then the Quick Transform modal should not be visible
    And the active editor content should be "hello world"

  Scenario: Apply a param-free operation - Uppercase
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I open the Quick Transform modal
    And I search for "uppercase" in the Quick Transform modal
    And I select the first Quick Transform result
    Then the Quick Transform modal should not be visible
    And the active editor content should be "HELLO WORLD"

  Scenario: Params form appears for an operation with parameters
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I open the Quick Transform modal
    And I search for "add suffix" in the Quick Transform modal
    And I select the first Quick Transform result
    Then the Quick Transform params form should be visible

  Scenario: Apply an operation with parameters - Add Suffix
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I open the Quick Transform modal
    And I search for "add suffix" in the Quick Transform modal
    And I select the first Quick Transform result
    And I set the Quick Transform text field to "!"
    And I apply the Quick Transform
    Then the Quick Transform modal should not be visible
    And the active editor content should be "hello!"

  Scenario: Back button in params form returns to search
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I open the Quick Transform modal
    And I search for "add suffix" in the Quick Transform modal
    And I select the first Quick Transform result
    Then the Quick Transform params form should be visible
    When I click back in the Quick Transform params form
    Then the Quick Transform modal should be visible
    And the Quick Transform params form should not exist
