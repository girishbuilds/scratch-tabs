@pipeline
Feature: Transformations Pipeline
  As a user working with text data
  I want to use the Pipeline feature to chain multiple operations
  So that I can transform content through a series of steps

  Background:
    Given I am on the homepage

  Scenario: Open Pipeline modal and verify initial state
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    Then the Pipeline modal should be visible
    And the pipeline should be empty

  Scenario: Use a core text operation - Uppercase
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    Then the pipeline should have 1 steps
    And the pipeline output should be "HELLO WORLD"
    And the pipeline output should show as modified

  Scenario: Use a core text operation - Trim Lines
    When I click the icon for "New tab"
    And I type "  hello world  " into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Trim Lines" operation
    Then the pipeline output should be "hello world"

  Scenario: Use a JSON format operation - Format JSON
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"name":"John","age":30}
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Format JSON" operation
    Then the pipeline output should contain "name"
    And the pipeline output should show as modified

  Scenario: Use a JSON format operation - Minify JSON
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "name": "John",
        "age": 30
      }
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Minify JSON" operation
    Then the pipeline output should contain "{"
    And the pipeline output should show as modified

  Scenario: Use a tablet operation - Base64 Encode
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Base64 Encode" operation
    Then the pipeline output should be "aGVsbG8="
    And the pipeline output should show as modified

  Scenario: Use a tablet operation - Base64 Decode
    When I click the icon for "New tab"
    And I type "aGVsbG8=" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Base64 Decode" operation
    Then the pipeline output should be "hello"

  Scenario: Apply operation per line ON - Base64 encode each line separately
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      hello
      world
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Base64 Encode" operation
    And I toggle Apply per line for the current step
    Then the pipeline output should contain "aGVsbG8="
    And the pipeline output should contain "d29ybGQ="

  Scenario: Apply operation per line OFF - Base64 encode entire content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      hello
      world
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Base64 Encode" operation
    Then the pipeline output should contain "aGVsbG8Kd29ybGQ="

  Scenario: Save a pipeline and load it on another tab
    # Create and save a pipeline on first tab
    When I click the icon for "New tab"
    And I type "test content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    And I save the pipeline as "My Test Pipeline"
    Then the pipeline name should be displayed as "My Test Pipeline"
    When I close the Pipeline modal

    # Create new tab and load the saved pipeline
    And I click the icon for "New tab"
    And I type "another test" into the editor
    And I right-click the "Scratch 2" tab
    And I select "Transformation Pipeline" from the context menu
    And I load the saved pipeline "My Test Pipeline"
    # Verify the loaded pipeline works - output proves both operations loaded
    Then the pipeline output should be "ANOTHER TEST"

  Scenario: Saved pipeline persists after page refresh
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I save the pipeline as "Persist Test"
    When I close the Pipeline modal
    And I wait for the state to be saved
    And I refresh the page
    And I wait for the application to load
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    Then the saved pipeline "Persist Test" should exist

  Scenario: Create a long pipeline with 10 operations
    When I click the icon for "New tab"
    And I type "hello world test data" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    # Add 10 operations to create a long pipeline
    And I add the "Trim Lines" operation
    And I add the "Uppercase" operation
    And I add the "Lowercase" operation
    And I add the "Title Case" operation
    And I add the "Uppercase" operation
    And I add the "Lowercase" operation
    And I add the "Trim Lines" operation
    And I add the "Uppercase" operation
    And I add the "Lowercase" operation
    And I add the "Trim Lines" operation
    Then the pipeline should have 10 steps
    And the pipeline should show success message

  Scenario: Chain multiple operations - Trim, Uppercase, Base64 Encode
    When I click the icon for "New tab"
    And I type "  hello world  " into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Trim Lines" operation
    And I add the "Uppercase" operation
    And I add the "Base64 Encode" operation
    Then the pipeline should have 3 steps
    # "HELLO WORLD" in Base64
    And the pipeline output should be "SEVMTE8gV09STEQ="

  Scenario: Chain core, format, and tablet operations together
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"message": "hello world"}
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Minify JSON" operation
    And I add the "Base64 Encode" operation
    Then the pipeline should have 2 steps
    And the pipeline output should show as modified

  Scenario: Invalid JSON input for Format JSON operation shows error
    When I click the icon for "New tab"
    And I type "this is not json" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Format JSON" operation
    Then the pipeline should show an error
    And the pipeline footer should show error state

  Scenario: Invalid Base64 input for decode operation shows error
    When I click the icon for "New tab"
    And I type "!!!not-base64!!!" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Base64 Decode" operation
    Then the pipeline should show an error

  Scenario: JavaScript snippet with syntax error shows error in output
    When I click the icon for "New tab"
    And I type "test" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "JavaScript Snippet" operation
    And I set parameter "JavaScript Code" to "return invalid syntax {"
    # JavaScript errors are caught and returned as output, not pipeline errors
    Then the pipeline output should contain "Error in script"

  Scenario: Disable a step skips its execution
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Base64 Encode" operation
    # Both steps enabled - output is Base64 of "HELLO"
    Then the pipeline output should be "SEVMTE8="
    # Disable the first step
    When I toggle step 1 enabled state
    # Only Base64 encode runs on "hello"
    Then the pipeline output should be "aGVsbG8="

  Scenario: Remove a step from the pipeline
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    Then the pipeline should have 2 steps
    When I remove step 2
    Then the pipeline should have 1 steps

  Scenario: Reset pipeline clears all steps
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    And I add the "Base64 Encode" operation
    Then the pipeline should have 3 steps
    When I reset the pipeline
    Then the pipeline should be empty

  Scenario: Apply changes updates the editor content
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    Then the Apply Changes button should be enabled
    When I apply the pipeline changes
    Then the Pipeline modal should not be visible
    And the active editor content should be "HELLO WORLD"

  Scenario: Apply button is disabled when no changes
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    Then the pipeline should be empty
    And the Apply Changes button should be disabled

  Scenario: Modify input in pipeline modal
    When I click the icon for "New tab"
    And I type "original content" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I set the pipeline input to "new content"
    Then the pipeline output should be "NEW CONTENT"

  Scenario: Search for operations filters the list
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I search for operation "base64"
    And I add the "Base64 Encode" operation
    Then the pipeline output should be "aGVsbG8="

  Scenario: Operation with parameters - Keep First N Lines
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      line1
      line2
      line3
      line4
      line5
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Keep First N Lines" operation
    And I set number parameter "Number of lines" to 2
    Then the pipeline output should contain "line1"
    And the pipeline output should contain "line2"

  Scenario: Operation with parameters - Add Prefix
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      line1
      line2
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Add Prefix" operation
    And I set parameter "Prefix" to ">> "
    Then the pipeline output should contain ">> line1"
    And the pipeline output should contain ">> line2"

  Scenario: Operation with select parameter - Sort Lines
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      banana
      apple
      cherry
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Sort Lines" operation
    Then the pipeline output should be:
      """
      apple
      banana
      cherry
      """

  Scenario: Cancel closes the modal without applying changes
    When I click the icon for "New tab"
    And I type "hello" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    When I click Cancel in the Pipeline modal
    Then the Pipeline modal should not be visible
    # Original content unchanged
    And the active editor content should be "hello"

  Scenario: Execution stats are displayed after running pipeline
    When I click the icon for "New tab"
    And I type "hello world" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Uppercase" operation
    And I add the "Trim Lines" operation
    And I add the "Base64 Encode" operation
    Then the execution time should be displayed
    And the pipeline should show success message

  Scenario: XML to JSON conversion
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      <root><name>John</name><age>30</age></root>
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "XML to JSON" operation
    Then the pipeline output should contain "name"
    And the pipeline output should contain "John"
    And the pipeline output should show as modified

  Scenario: JSON to XML conversion
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {"person":{"name":"Jane","city":"NYC"}}
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "JSON to XML" operation
    Then the pipeline output should contain "<person>"
    And the pipeline output should contain "<name>Jane</name>"
    And the pipeline output should show as modified

  Scenario: CSV to JSON conversion
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      name,age,city
      John,30,NYC
      Jane,25,LA
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "CSV to JSON" operation
    Then the pipeline output should contain "name"
    And the pipeline output should contain "John"
    And the pipeline output should contain "NYC"

  Scenario: JSON to CSV conversion
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      [{"name":"John","age":30},{"name":"Jane","age":25}]
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "JSON to CSV" operation
    Then the pipeline output should contain "name"
    And the pipeline output should contain "John"
    And the pipeline output should contain "Jane"

  Scenario: CSV to Markdown Table conversion
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      name,score
      Alice,95
      Bob,87
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "CSV to Markdown" operation
    Then the pipeline output should contain "| name | score |"
    And the pipeline output should contain "| --- | --- |"
    And the pipeline output should contain "| Alice | 95 |"

  Scenario: Generate UUID
    When I click the icon for "New tab"
    And I type "placeholder" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Generate UUID" operation
    # UUID format: 8-4-4-4-12 hex characters
    Then the pipeline output should contain "-"
    And the pipeline output should show as modified

  Scenario: Generate Random String
    When I click the icon for "New tab"
    And I type "placeholder" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Generate Random String" operation
    Then the pipeline output should not be empty
    And the pipeline output should show as modified

  Scenario: Text Statistics operation
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Hello World.
      This is a test.
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Text Statistics" operation
    Then the pipeline output should contain "Characters:"
    And the pipeline output should contain "Words:"
    And the pipeline output should contain "Lines:"

  Scenario: Extract Numbers operation
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Price: $50.99
      Quantity: 10
      Tax: 4.50
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Extract Numbers" operation
    Then the pipeline output should contain "50.99"
    And the pipeline output should contain "10"
    And the pipeline output should contain "4.50"

  Scenario: Reverse Text operation - entire text
    When I click the icon for "New tab"
    And I type "Hello World" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Reverse Text" operation
    Then the pipeline output should be "dlroW olleH"

  Scenario: To Hex encoding operation
    When I click the icon for "New tab"
    And I type "ABC" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "To Hex" operation
    Then the pipeline output should contain "41"
    And the pipeline output should contain "42"
    And the pipeline output should contain "43"

  Scenario: Generate Sequence operation
    When I click the icon for "New tab"
    And I type "placeholder" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Generate Sequence" operation
    And I set number parameter "Start" to 1
    And I set number parameter "End" to 5
    Then the pipeline output should contain "1"
    And the pipeline output should contain "2"
    And the pipeline output should contain "3"
    And the pipeline output should contain "4"
    And the pipeline output should contain "5"

  Scenario: Lorem Ipsum Generator
    When I click the icon for "New tab"
    And I type "placeholder" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Generate Lorem Ipsum" operation
    Then the pipeline output should not be empty
    And the pipeline output should show as modified

  Scenario: Chain new operations - CSV to JSON to XML
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      name,value
      test,123
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "CSV to JSON" operation
    And I add the "JSON to XML" operation
    Then the pipeline should have 2 steps
    And the pipeline output should contain "<name>test</name>"
    And the pipeline output should contain "<value>123</value>"

  Scenario: Defang URL operation
    When I click the icon for "New tab"
    And I type "https://evil.example.com/malware" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Defang URL" operation
    Then the pipeline output should contain "hxxps://"
    And the pipeline output should contain "[.]"
    And the pipeline output should show as modified

  Scenario: Defang URL then Refang URL round-trips to original
    When I click the icon for "New tab"
    And I type "https://evil.example.com/path" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Defang URL" operation
    And I add the "Refang URL" operation
    Then the pipeline should have 2 steps
    And the pipeline output should be "https://evil.example.com/path"

  Scenario: Sort CSV rows by a column
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      name,score
      Charlie,85
      Alice,92
      Bob,78
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Sort CSV" operation
    Then the pipeline output should contain "Alice"
    And the pipeline output should contain "Charlie"
    And the pipeline output should contain "Bob"

  Scenario: Filter CSV rows by column value
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      name,city
      Alice,London
      Bob,Paris
      Charlie,London
      """
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Filter CSV Rows" operation
    And I set parameter "Value" to "London"
    Then the pipeline output should contain "Alice"
    And the pipeline output should contain "Charlie"
    And the pipeline output should contain "London"

  Scenario: Shannon Entropy produces a report
    When I click the icon for "New tab"
    And I type "Hello World" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Shannon Entropy" operation
    Then the pipeline output should contain "Entropy:"
    And the pipeline output should contain "Length:"
    And the pipeline output should show as modified

  Scenario: Morse code encode and decode
    When I click the icon for "New tab"
    And I type "SOS" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Transformation Pipeline" from the context menu
    And I add the "Text to Morse Code" operation
    Then the pipeline output should contain "..."
    And the pipeline output should contain "---"
    And the pipeline output should show as modified