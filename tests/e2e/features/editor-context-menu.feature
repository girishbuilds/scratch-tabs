@editor-context-menu
Feature: Editor context menu
  As a user editing text
  I want extra actions in the editor's right-click menu
  So that I can transform, copy and compare content without leaving the editor

  Background:
    Given I am on the homepage

  @serial
  Scenario: Editor context menu exposes the app actions
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click in the editor
    Then the editor context menu should show "Quick Transform"
    And the editor context menu should show "Transformations"
    And the editor context menu should show "Macro Recording"
    And the editor context menu should show "Copy All Content"
    And the editor context menu should show "Download"
    And the editor context menu should show "Compare with Previous Tab"
    And the editor context menu should not show "Compare with other side"

  Scenario: Macro Recording opens the floating macro toolbar
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I run the "macro-recording" editor context menu action
    Then the macro toolbar should be visible

  @serial
  Scenario: Compare with other side is available in split view
    When I click the icon for "New tab"
    And I type "left content" into the editor
    And I click the icon for "New tab"
    And I type "right content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    And I right-click on the first line of the editor
    Then the editor context menu should show "Compare with other side"

  @serial
  Scenario: Compare with other side opens the diff modal
    When I click the icon for "New tab"
    And I type "left content" into the editor
    And I click the icon for "New tab"
    And I type "right content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    And I run the "compare-with-other-side" editor context menu action
    Then the diff modal should be visible

  @serial
  Scenario: Selection only actions are hidden without a selection
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click in the editor
    Then the editor context menu should not show "UPPERCASE"
    And the editor context menu should not show "Send Selection to Canvas..."

  @serial
  Scenario: Selection only actions are shown when text is selected
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I select all text in the editor
    And I right-click on the first line of the editor
    Then the editor context menu should show "UPPERCASE"
    And the editor context menu should show "Send Selection to Canvas..."

  Scenario: Case transform rewrites the selected text
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I select all text in the editor
    And I run the "case-uppercase" editor context menu action
    Then the active editor content should be "HELLO WORLD"

  @clipboard
  Scenario: Copy All Content copies the whole document
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I run the "copy-all-content" editor context menu action
    Then the clipboard should contain "hello world"

  Scenario: Send Selection to Canvas opens the shared dialog
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I select all text in the editor
    And I run the "send-selection-to-canvas" editor context menu action
    Then the send to canvas dialog should be visible

  @serial
  Scenario: Generate Mock Content is not offered in the editor menu
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click in the editor
    Then the editor context menu should not show "Generate Mock Content"

  @serial
  Scenario: Calculate Checksum is listed in the editor menu
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click in the editor
    Then the editor context menu should show "Calculate Checksum"

  Scenario: Calculate Checksum opens the checksum tablet with the editor content
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I run the "tablet-calculate-checksum" editor context menu action
    And I wait for the tablet to be ready
    Then the "Checksum" tab should exist on the page
    And the checksum text input should contain "hello world"
    And I should see a calculated hash
