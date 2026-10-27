@rich
Feature: Rich Text Editor

  Background:
    Given I am on the homepage
    When I click the icon for "New tab"

  Scenario: Activate Rich Text editor and verify functionality
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I type "Hello Rich Text World" in the Rich Text editor
    Then I should see at least one paragraph in the Rich Text editor
    And the Rich Text editor should contain the text "Hello Rich Text World"
    And the Rich Text toggle should show "Rich" text

  Scenario: Rich Text editors in split view maintain content isolation
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    And I type "Left Side Content" in the Rich Text editor
    When I click the icon for "New tab"
    And I click the Rich Text toggle in the status bar
    And I type "Right Side Content" in the Rich Text editor
    When I split the tab to create a side-by-side view
    Then the left side Rich Text editor should contain "Left Side Content"
    And the right side Rich Text editor should contain "Right Side Content"
    And the left side Rich Text editor should not contain "Right Side Content"
    And the right side Rich Text editor should not contain "Left Side Content"

  Scenario: Toggling between Rich Text and standard text maintains separate content
    Given I am on a plain text editor tab
    When I type "This is plain text content" in the Monaco editor
    Then the Monaco editor should contain "This is plain text content"
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "This is rich text content" in the Rich Text editor
    Then the Rich Text editor should contain the text "This is rich text content"
    When I click the Rich Text toggle in the status bar
    Then I should see the Monaco editor is displayed
    And the Monaco editor should contain "This is plain text content"
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And the Rich Text editor should contain the text "This is rich text content"

  @clipboard
  Scenario: Image paste creates rich text tab with proper title and content
    When I set clipboard content to contain an image
    And I create a new tab from the document menu and clipboard
    Then the "Scratch 2" tab should be active
    And I should see the Rich Text editor is displayed
    And the Rich Text editor should contain an image
    And I should see the date created text with "now" time

  @clipboard
  Scenario: Plain text to rich text conversion when pasting image
    Given I am on a plain text editor tab
    When I type "This is plain text content" in the Monaco editor
    Then the Monaco editor should contain "This is plain text content"
    When I set clipboard content to contain an image
    And I paste into the editor
    Then I should see the rich text conversion modal with "Paste image" title
    And the modal should contain "How would you like to use this image?"
    When I click "Paste in Rich Text" in the modal
    Then the modal should be dismissed
    And I should see the Rich Text editor is displayed
    And the Rich Text editor should contain an image
    And the Rich Text editor should contain the text "This is plain text content"
    And I should see the date created text with "now" time

  @clipboard
  Scenario: Paste image data into an empty Monaco tab
    Given I am on a plain text editor tab
    When I set clipboard content to contain an image
    And I paste into the editor
    Then the modal should contain "Paste as data URL"
    When I click "Paste as data URL" in the modal
    Then the modal should be dismissed
    And I should see the Monaco editor is displayed
    And the Monaco editor should contain "data:image/png;base64"
    And the status bar language should be "Image"

  @clipboard
  Scenario: Paste image data into a new tab when Monaco has content
    Given I am on a plain text editor tab
    When I type "Keep this content" in the Monaco editor
    And I set clipboard content to contain an image
    And I paste into the editor
    Then the modal should contain "Open data URL in new tab"
    When I click "Open data URL in new tab" in the modal
    Then the modal should be dismissed
    And the "Pasted image data" tab should be active
    And the Monaco editor should contain "data:image/png;base64"
    And the status bar language should be "Image"

  @clipboard
  Scenario: Paste a Monaco image into Canvas
    Given I am on a plain text editor tab
    When I set clipboard content to contain an image
    And I paste into the editor
    And I click "Paste in Canvas" in the modal
    Then the "Canvas 1" tab should be active
    And the Canvas image and its dimensions should be restored

  Scenario: Rich text toolbar heading controls
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "Heading 1" in the Rich Text editor
    And I select the text "Heading 1"
    And I click the "H1" button in the Rich Text toolbar
    Then the text should be formatted as H1 in the Rich Text editor
    When I press Enter and type "Heading 2"
    And I select the text "Heading 2"
    And I click the "H2" button in the Rich Text toolbar
    Then the text should be formatted as H2 in the Rich Text editor
    When I press Enter and type "Heading 3"
    And I select the text "Heading 3"
    And I click the "H3" button in the Rich Text toolbar
    Then the text should be formatted as H3 in the Rich Text editor

  Scenario: Rich text toolbar formatting controls
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "This text will be formatted" in the Rich Text editor
    And I select the text "text will be"
    And I click the "Bold" button in the Rich Text toolbar
    Then the selected text should be bold in the Rich Text editor
    When I select the text "will be"
    And I click the "Italic" button in the Rich Text toolbar
    Then the selected text should be italic in the Rich Text editor
    When I select the text "will be"
    And I click the "Underline" button in the Rich Text toolbar
    Then the selected text should be underlined in the Rich Text editor
    When I select the text "be"
    And I click the "Inline Code" button in the Rich Text toolbar
    Then the selected text should be inline code in the Rich Text editor

  Scenario: Rich text toolbar list and quote controls
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "First item" in the Rich Text editor
    And I click the "Bullet List" button in the Rich Text toolbar
    Then I should see a bullet list in the Rich Text editor
    When I press Enter and type "Second item"
    Then I should see "Second item" as the next bullet point
    When I press Enter and click the "Numbered List" button in the Rich Text toolbar
    And I type "Numbered item"
    Then I should see a numbered list in the Rich Text editor
    When I press Enter twice
    And I click the "Quote" button in the Rich Text toolbar
    And I type "This is a quote"
    Then I should see a blockquote in the Rich Text editor

  Scenario: Rich text toolbar advanced controls
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "Code example:" in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    And I type "console.log('Hello World');" in the code block
    Then I should see a code block in the Rich Text editor
    When I click after the code block
    And I click the "Insert Separator" button in the Rich Text toolbar
    Then I should see a horizontal separator in the Rich Text editor
    When I press Enter
    And I click the "Insert Table" button in the Rich Text toolbar
    Then I should see a table with 3 rows and 3 columns in the Rich Text editor
    When I type "Background test" in the Rich Text editor
    And I click the "Background" button in the Rich Text toolbar
    Then the background texture should change

  Scenario: Code block with selected text content
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "function hello() { return 'world'; }" in the Rich Text editor
    And I select all text in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    Then I should see a code block in the Rich Text editor
    And the code block should contain "function hello() { return 'world'; }"

  Scenario: Multi-line text to single code block conversion
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type the following content into the Rich Text editor:
      """
      Line one
      Line two
      Line three
      """
    And I select all text in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    Then I should see exactly one code block in the Rich Text editor
    And the code block should contain "Line one"
    And the code block should contain "Line two"
    And the code block should contain "Line three"

  Scenario: JSON language detection in code blocks
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type the following JSON content into the Rich Text editor:
      """
      {
        "name": "test",
        "value": 123
      }
      """
    And I select all text in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    Then I should see a code block in the Rich Text editor
    And the code block should have JSON syntax highlighting

  Scenario: JavaScript language detection in code blocks
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "const greeting = 'Hello World'; console.log(greeting);" in the Rich Text editor
    And I select all text in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    Then I should see a code block in the Rich Text editor
    And the code block should have JavaScript syntax highlighting

  Scenario: Tab indentation in code blocks
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I click the "Code Block" button in the Rich Text toolbar
    And I type "if (true) {" in the code block
    And I press Enter
    And I press Tab
    And I type "console.log('indented');" in the code block
    Then the second line in the code block should be indented

  Scenario: Shift+Tab deindentation in code blocks
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I click the "Code Block" button in the Rich Text toolbar
    And I type "  indented line" in the code block
    And I press Shift+Tab
    Then the line should have reduced indentation

  Scenario: Syntax highlighting preservation when toggling code blocks
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type the following JSON content into the Rich Text editor:
      """
      {
        "test": "value"
      }
      """
    And I select all text in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    Then I should see a code block in the Rich Text editor
    And the code block should have JSON syntax highlighting
    When I click the "Code Block" button in the Rich Text toolbar
    Then I should see the text is no longer in a code block
    When I click the "Code Block" button in the Rich Text toolbar
    Then I should see a code block in the Rich Text editor
    And the code block should have JSON syntax highlighting

  Scenario: Background texture cycles properly on single click
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "Background cycling test" in the Rich Text editor
    And I note the current background texture
    When I click the "Background" button in the Rich Text toolbar once
    Then the background texture should be different from the noted texture
    When I click the "Background" button in the Rich Text toolbar once
    Then the background texture should be different again

  Scenario: Link creation and editing in Rich Text editor
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "Visit our website" in the Rich Text editor
    And I select the text "website"
    And I click the "Add Link" button in the Rich Text toolbar
    Then I should see the link modal
    And the link text field should contain "website"
    When I type "https://example.com" in the URL field
    And I click "Save" in the link modal
    Then the text "website" should be a link
    And the link should point to "https://example.com"

  Scenario: Code block toggle preserves content
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "const x = 42;" in the Rich Text editor
    And I select all text in the Rich Text editor
    And I click the "Code Block" button in the Rich Text toolbar
    Then I should see a code block in the Rich Text editor
    And the code block should contain "const x = 42;"
    When I click the "Code Block" button in the Rich Text toolbar
    Then I should see the text is no longer in a code block
    And the Rich Text editor should contain "const x = 42;"

  Scenario: Cursor cannot move above created date with left arrow key
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I type "Hello World" in the Rich Text editor
    And I place cursor at the beginning of the first line after the date
    And I press the left arrow key multiple times
    Then the cursor should remain after the date created text
    And I should not be able to type above the date created text

  @clipboard
  Scenario: Cursor cannot move above created date with up arrow key after content import
    Given I am on a plain text editor tab
    When I type "Some content to import" in the Monaco editor
    And I copy all content from the Monaco editor
    And I click the icon for "New tab"
    And I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I paste the copied content into the Rich Text editor
    And I place cursor at the end of the imported content
    And I press the up arrow key multiple times to try to reach the top
    Then the cursor should remain after the date created text
    And I should not be able to type above the date created text

  Scenario: Date created text prevents all navigation methods that would go above it
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I type "Test content for navigation" in the Rich Text editor
    And I place cursor at the beginning of the first line after the date
    And I press the Home key
    Then the cursor should remain after the date created text
    When I press the up arrow key
    Then the cursor should remain after the date created text
    When I press the left arrow key
    Then the cursor should remain after the date created text
    And I should not be able to type above the date created text

  Scenario: Select all (Ctrl+A) works properly and preserves date created text
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I type "Some content to select with Ctrl+A" in the Rich Text editor
    And I press Ctrl+A to select all content
    Then all content should be selected including the date created text
    When I type "Replacement text" to replace the selection
    Then I should see the date created text with "now" time
    And the Rich Text editor should contain "Replacement text"
    And the Rich Text editor should not contain "Some content to select with Ctrl+A"

  @clipboard
  Scenario: Copying content with date created node doesn't duplicate dates when pasted
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I type "Content to copy and paste" in the Rich Text editor
    And I press Ctrl+A to select all content including the date
    And I press Ctrl+C to copy the selection
    When I click the icon for "New tab"
    And I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    And I should see the date created text with "now" time
    When I press Ctrl+V to paste the copied content
    Then I should see exactly one date created text
    And the Rich Text editor should contain "Content to copy and paste"
    And I should not see duplicate date created nodes

  Scenario: Rich text tab with content shows close confirmation
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "This is rich text content" in the Rich Text editor
    When I click the close button on the "Scratch 1" tab
    Then I should see the close confirmation dialog
    And the dialog should contain "Tab content cannot be recovered once closed"

  Scenario: Empty rich text tab does not show close confirmation
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I click the close button on the "Scratch 1" tab
    Then the tab should close immediately without confirmation
    And the "Scratch 1" tab should not exist on the page

  Scenario: Rich text tab cleared of content does not show close confirmation
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "This will be deleted" in the Rich Text editor
    And the Rich Text editor should contain "This will be deleted"
    When I select all text in the Rich Text editor
    And I press Delete
    And the Rich Text editor should not contain "This will be deleted"
    When I click the close button on the "Scratch 1" tab
    Then the tab should close immediately without confirmation
    And the "Scratch 1" tab should not exist on the page

  Scenario: CTRL+click bypasses close confirmation for rich text tabs
    Given I am on a plain text editor tab
    When I click the Rich Text toggle in the status bar
    Then I should see the Rich Text editor is displayed
    When I type "Content that should normally require confirmation" in the Rich Text editor
    When I CTRL+click the close button on the "Scratch 1" tab
    Then the tab should close immediately without confirmation
    And the "Scratch 1" tab should not exist on the page
