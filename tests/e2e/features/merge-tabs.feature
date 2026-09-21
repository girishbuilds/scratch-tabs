Feature: Merge tabs

  Background:
    Given I am on the homepage

  Scenario: Merge CSV tabs across split view without changing the sources
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "From Sample" from the context menu
    And I select "CSV / TSV" from the "From Sample" submenu
    And I type the following content into the active editor:
      """
      city,name
      London,Alice
      """
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I right-click the "Scratch 2" tab
    And I select "From Sample" from the context menu
    And I select "CSV / TSV" from the "From Sample" submenu
    And I type the following content into the active editor:
      """
      name,city
      Bob,Paris
      """
    When I right-click the "Scratch 2" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    When I right-click the "Scratch 2" tab
    And I select "Merge tabs..." from the context menu
    Then the merge tabs dialog should appear
    When I include the "Scratch 1" tab in the merge
    And I choose to merge as "CSV / TSV"
    Then CSV merge options should appear for "Scratch 2" and "Scratch 1"
    When I enable merge column alignment
    And I set the merge result title to "Merged contacts"
    And I create the merged tab
    Then the right panel should contain the "Merged contacts" tab
    And the "Merged contacts" tab should be active
    And the editor on the "right" side should exactly contain:
      """
      name,city
      Bob,Paris
      Alice,London
      """
    When I click the "Scratch 1" tab on the "left" merge test side
    Then the editor on the "left" side should exactly contain:
      """
      city,name
      London,Alice
      """
    When I click the "Scratch 2" tab on the "right" merge test side
    Then the editor on the "right" side should exactly contain:
      """
      name,city
      Bob,Paris
      """
