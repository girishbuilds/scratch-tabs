Feature: Tab context menu

  Background:
    Given I am on the homepage

  Scenario: Tablet context menu items
    When I open the Tool Selector from the document menu
    And I select "Calculator" from the tablet selector
    And I right-click the "Calculator" tab
    Then the context menu should not show "Share" option
    And the context menu should not show "Open in..." option
    And the context menu should not show "Transformations" option

  @clipboard
  Scenario: Rename a tab using context menu
    When I create a new tab from the document menu and clipboard
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "Rename" from the "Organize" submenu
    Then the tab rename input should appear
    When I type "My Custom Tab" in the rename input
    And I press Enter to confirm rename
    Then the "My Custom Tab" tab should be active

  @clipboard
  Scenario: Copy content using context menu
    When I create a new tab from the document menu and clipboard
    Then the "Scratch 1" tab should be active
    When I type "Hello World! This is my test content." into the editor
    And I right-click the "Scratch 1" tab
    And I select "Copy Content" from the context menu
    When I create a new tab from the document menu and clipboard
    Then the "Scratch 2" tab should be active
    And the active editor content should contain "Hello World! This is my test content."

  Scenario: Load samples using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "From Sample" from the context menu
    When I select "JSON" from the "From Sample" submenu
    Then the first 10 lines of the editor should contain JSON content
    And the status bar language should be "JSON"
    When I right-click the "Scratch 1" tab
    And I select "From Sample" from the context menu
    When I select "Markdown" from the "From Sample" submenu
    Then the active editor content should contain "#"
    And the status bar language should be "Markdown"

  @clipboard
  Scenario: Duplicate tab using context menu
    When I create a new tab from the document menu and clipboard
    Then the "Scratch 1" tab should be active
    When I type "Original tab content for duplication test" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Duplicate" from the context menu
    Then the "Scratch 1 (Copy)" tab should be active
    And the active editor content should contain "Original tab content for duplication test"

  @clipboard
  Scenario: Compare with clipboard using context menu
    When I set clipboard content to "Clipboard content for comparison test"
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Different content from clipboard for comparison" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Compare with Clipboard" from the context menu
    Then the diff modal should appear
    When I close the diff modal
    Then I should be in split view mode
    And the "Clipboard Compare" tab should exist on the page

  Scenario: Split tab using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Content for Scratch 1 tab" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Content for Scratch 2 tab" into the editor
    When I click the "Scratch 2" tab
    Then the "Scratch 2" tab should be active
    When I click the "Scratch 1" tab
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode

  Scenario: Compare with previous tab using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Original content in first tab" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Modified content in second tab" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I type "Different content in third tab" into the editor
    When I click the "Scratch 1" tab
    Then the "Scratch 1" tab should be active
    When I click the "Scratch 2" tab
    Then the "Scratch 2" tab should be active
    When I right-click the "Scratch 2" tab
    And I select "Compare with Previous Tab" from the context menu
    Then the diff modal should appear
    And the diff modal should show comparison between "Scratch 1" and "Scratch 2"
    And the diff modal left side should contain "Original content in first tab"
    And the diff modal right side should contain "Modified content in second tab"

  Scenario: Compare with other side in split view
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Left side first tab content" into the left editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Left side second tab content" into the left editor
    When I right-click the "Scratch 2" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 3" tab should be active
    When I type "Right side first tab content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 4" tab should be active
    When I type "Right side second tab content" into the right editor
    When I right-click the "Scratch 1" tab
    And I select "Compare with other side" from the context menu
    Then the diff modal should appear
    And the diff modal should show comparison between "Scratch 1" and "Scratch 4"
    And the diff modal left side should contain "Left side first tab content"
    And the diff modal right side should contain "Right side second tab content"
    When I close the diff modal
    When I click the "Scratch 3" tab on the right side
    Then the "Scratch 3" tab should be active
    When I right-click the "Scratch 3" tab
    And I select "Compare with other side" from the context menu
    Then the diff modal should appear
    And the diff modal should show comparison between "Scratch 1" and "Scratch 3"
    And the diff modal left side should contain "Left side first tab content"
    And the diff modal right side should contain "Right side first tab content"

  Scenario: Group tabs by type using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "From Sample" from the context menu
    When I select "JSON" from the "From Sample" submenu
    Then the status bar language should be "JSON"
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I right-click the "Scratch 2" tab
    And I select "From Sample" from the context menu
    When I select "CSV / TSV" from the "From Sample" submenu
    Then the status bar language should be "CSV / TSV"
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I right-click the "Scratch 3" tab
    And I select "From Sample" from the context menu
    When I select "JSON" from the "From Sample" submenu
    Then the status bar language should be "JSON"
    When I click the icon for "New tab"
    Then the "Scratch 4" tab should be active
    When I right-click the "Scratch 4" tab
    And I select "From Sample" from the context menu
    When I select "CSV / TSV" from the "From Sample" submenu
    Then the status bar language should be "CSV / TSV"
    When I right-click the "Scratch 1" tab
    And I select "Group Tabs by Type" from the "Organize" submenu
    Then the tabs should be ordered as "Welcome, Scratch 1, Scratch 3, Scratch 2, Scratch 4"

  Scenario: Move tab right using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Left tab 1 content" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Left tab 2 content" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I type "Left tab 3 content" into the editor
    When I right-click the "Scratch 2" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 4" tab should be active
    When I type "Right tab 1 content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 5" tab should be active
    When I type "Right tab 2 content" into the right editor
    When I right-click the "Scratch 1" tab
    And I select "Move to Right" from the context menu
    Then the left panel should contain tabs "Welcome, Scratch 3"
    And the right panel should contain tabs "Scratch 2, Scratch 4, Scratch 5, Scratch 1"

  Scenario: Move tab left using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Left tab 1 content" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Left tab 2 content" into the editor
    When I right-click the "Scratch 1" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 3" tab should be active
    When I type "Right tab 1 content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 4" tab should be active
    When I type "Right tab 2 content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 5" tab should be active
    When I type "Right tab 3 content" into the right editor
    When I right-click the "Scratch 4" tab
    And I select "Move to Left" from the context menu
    Then the left panel should contain tabs "Welcome, Scratch 2, Scratch 4"
    And the right panel should contain tabs "Scratch 1, Scratch 3, Scratch 5"

  Scenario: Download tab content using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Hello World!\nThis is test content for download." into the editor
    When I right-click the "Scratch 1" tab
    And I select "From Sample" from the context menu
    When I select "JSON" from the "From Sample" submenu
    Then the status bar language should be "JSON"
    When I right-click the "Scratch 1" tab
    And I select "Download Tab" from the "Download" submenu
    Then a file should be downloaded with the name "Scratch 1.json"

  Scenario: Download all tabs using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "First tab content" into the editor
    When I right-click the "Scratch 1" tab
    And I select "From Sample" from the context menu
    When I select "JSON" from the "From Sample" submenu
    Then the status bar language should be "JSON"
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Second tab content" into the editor
    When I right-click the "Scratch 2" tab
    And I select "From Sample" from the context menu
    When I select "CSV / TSV" from the "From Sample" submenu
    Then the status bar language should be "CSV / TSV"
    When I right-click the "Scratch 1" tab
    And I select "Download All" from the "Download" submenu
    Then the download modal should appear
    When I click "Select All" in the download modal
    And I click "Download 3 Files" in the download modal
    Then a file should be downloaded with the name "scratch-tabs-export.zip"

  Scenario: Close tabs to the left using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I right-click the "Scratch 3" tab
    And I select "Close Tabs to Left" from the "Close" submenu
    Then a confirmation dialog should appear with message "This will close all tabs to the left of the current tab. This action cannot be undone."
    When I click "Close Left Tabs" in the confirmation dialog
    Then the tabs should be ordered as "Scratch 3"
    And the "Scratch 3" tab should be active

  Scenario: Close tabs to the right using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "Close Tabs to Right" from the "Close" submenu
    Then a confirmation dialog should appear with message "This will close all tabs to the right of the current tab. This action cannot be undone."
    When I click "Close Right Tabs" in the confirmation dialog
    Then the tabs should be ordered as "Welcome, Scratch 1"
    And the "Scratch 1" tab should be active

  Scenario: Close all other tabs using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I right-click the "Scratch 2" tab
    And I select "Close All Other Tabs" from the "Close" submenu
    Then a confirmation dialog should appear with message "This will close all tabs except the current one. This action cannot be undone."
    When I click "Close Others" in the confirmation dialog
    Then the tabs should be ordered as "Scratch 2"
    And the "Scratch 2" tab should be active

  Scenario: Close single tab using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I right-click the "Scratch 2" tab
    And I select "Close Tab" from the "Close" submenu
    Then a confirmation dialog should appear with message "Close tab \"Scratch 2\"? This action cannot be undone."
    When I click "Close Tab" in the confirmation dialog
    Then the tabs should be ordered as "Welcome, Scratch 1"
    And the "Scratch 1" tab should be active

  Scenario: Close all other tabs should preserve pinned tabs
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I pin the "Welcome" tab
    When I pin the "Scratch 1" tab
    When I right-click the "Scratch 3" tab
    And I select "Close All Other Tabs" from the "Close" submenu
    Then a confirmation dialog should appear with message "This will close all tabs except the current one. This action cannot be undone."
    When I click "Close Others" in the confirmation dialog
    Then the tabs should be ordered as "Welcome, Scratch 1, Scratch 3"
    And the "Scratch 3" tab should be active

  Scenario: Close tab with content normally shows confirmation
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Some important content that should trigger confirmation" into the editor
    When I click the close button on the "Scratch 1" tab
    Then a confirmation dialog should appear with message "Tab content cannot be recovered once closed. Are you sure you want to close this tab?"
    When I click "Cancel" in the confirmation dialog
    Then the "Scratch 1" tab should be active
    And the active editor content should contain "Some important content that should trigger confirmation"

  Scenario: CTRL+click close button bypasses confirmation dialog
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Content that would normally trigger confirmation" into the editor
    When I CTRL+click the close button on the "Scratch 1" tab
    Then the "Scratch 1" tab should not exist on the page
    And the "Welcome" tab should be active

  Scenario: CMD+click close button bypasses confirmation dialog on Mac
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Content that would normally trigger confirmation" into the editor
    When I CMD+click the close button on the "Scratch 1" tab
    Then the "Scratch 1" tab should not exist on the page
    And the "Welcome" tab should be active

  Scenario: Regular click on empty tab closes without confirmation
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I click the close button on the "Scratch 1" tab
    Then the "Scratch 1" tab should not exist on the page
    And the "Welcome" tab should be active