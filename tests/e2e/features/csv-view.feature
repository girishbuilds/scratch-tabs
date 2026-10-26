Feature: CSV View and Auto-Detection
  Background:
    Given I am on the homepage

  Scenario: CSV auto-detection with comma-separated values
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    Then the status bar should show language "CSV / TSV"
    And the status bar should contain a Data View button

  Scenario: CSV auto-detection with tab-separated values
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID	Name	Age	City
      1	John Doe	28	New York
      2	Jane Smith	32	San Francisco
      3	Bob Johnson	25	Chicago
      """
    Then the status bar should show language "CSV / TSV"
    And the status bar should contain a Data View button

  Scenario: CSV auto-detection with semicolon-separated values
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID;Name;Age;City
      1;John Doe;28;New York
      2;Jane Smith;32;San Francisco
      3;Bob Johnson;25;Chicago
      """
    Then the status bar should show language "CSV / TSV"
    And the status bar should contain a Data View button

  Scenario: CSV auto-detection with quoted values
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      "Product","Price","Description","Age"
      "Laptop","$999.99","High-performance laptop","1"
      "Mouse","$29.99","Wireless optical mouse","2"
      "Keyboard","$79.99","Mechanical keyboard","3"
      """
    Then the status bar should show language "CSV / TSV"
    And the status bar should contain a Data View button

  Scenario: JSON content should expose its Data View without CSV detection
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      {
        "name": "John Doe",
        "age": 28,
        "city": "New York"
      }
      """
    Then the status bar should show language "JSON"
    And the status bar should contain a Data View button

  Scenario: Toggle from editor to CSV table view
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    And I should see column headers "ID", "Name", "Age", "City"
    And I should see the row count "3 rows × 4 columns"
    And I should see the "Undo" button
    And I should see the "Redo" button

  Scenario: Toggle from CSV table view back to editor
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    And I should see the CSV table view
    When I click the Text View button in the status bar
    Then I should see the Monaco editor
    And the active editor content should be:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """

  Scenario: CSV data manipulation - duplicate row detection
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    And I should see the "Find duplicate rows" button
    When I click the "Find duplicate rows" button
    Then I should see a message indicating no duplicates found

  Scenario: CSV data manipulation with actual duplicates
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    When I click the "Find duplicate rows" button
    Then I should see duplicate row indicators
    And I should see options to remove duplicates

  Scenario: CSV data synchronization between views
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    And I should see the CSV table view
    When I make changes to the CSV data in table view
    And I click the Text View button in the status bar
    Then I should see the Monaco editor
    And the active editor content should reflect the changes made in table view

  Scenario: CSV table view specialized tools
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    And I should see the "Add column after" button
    And I should see the "Create snapshot" button
    And I should see the "Export" dropdown
    And I should see column sorting options

  Scenario: CSV table view with malformed data
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York,Extra
      2,Jane Smith
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "Plaintext"

  Scenario: CSV table view performance with larger dataset
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City,Country,Email,Phone
      1,John Doe,28,New York,USA,john@example.com,123-456-7890
      2,Jane Smith,32,San Francisco,USA,jane@example.com,098-765-4321
      3,Bob Johnson,25,Chicago,USA,bob@example.com,555-123-4567
      4,Alice Brown,30,Boston,USA,alice@example.com,444-555-6666
      5,Charlie Davis,35,Seattle,USA,charlie@example.com,777-888-9999
      6,Diana Wilson,29,Miami,USA,diana@example.com,111-222-3333
      7,Eve Miller,27,Denver,USA,eve@example.com,222-333-4444
      8,Frank Garcia,31,Austin,USA,frank@example.com,333-444-5555
      9,Grace Lee,33,Portland,USA,grace@example.com,444-555-6666
      10,Henry Kim,26,Phoenix,USA,henry@example.com,555-666-7777
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    And I should see the row count "10 rows × 7 columns"
    And the table should render efficiently with virtualization
    And I should be able to scroll through the data smoothly

  Scenario: CSV table view export functionality
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    When I click the "Export" dropdown
    Then I should see export options for "CSV", "JSON", "Markdown", and "SQL"

  Scenario: CSV table view per-column text filtering
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    When I enable the CSV filter row
    And I filter the "Name" column by "jane"
    Then I should see 1 CSV data row
    And I should see the filter chip for "Name"

  Scenario: CSV table view per-column numeric filtering
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    When I enable the CSV filter row
    And I filter the "Age" column to a minimum of "30"
    Then I should see 1 CSV data row
    And I should see the filter chip for "Age"
    When I click the "Clear all filters" button
    Then I should see 3 CSV data rows
    And I should see no filter chips

  Scenario: CSV table view removes an individual filter via its chip
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    When I enable the CSV filter row
    And I filter the "City" column by "Chicago"
    Then I should see 1 CSV data row
    And I should see the filter chip for "City"
    When I click the remove button on the "City" filter chip
    Then I should see 3 CSV data rows
    And I should see no filter chips

  Scenario: CSV table view undo/redo functionality
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    When I make changes to the CSV data in table view
    And I click the "Undo" button
    Then the changes should be reverted
    When I click the "Redo" button
    Then the changes should be reapplied

  Scenario: CSV table view column manipulation
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      ID,Name,Age,City
      1,John Doe,28,New York
      2,Jane Smith,32,San Francisco
      3,Bob Johnson,25,Chicago
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    When I click the "Add column after" button for the "Name" column
    Then I should see a new column added after "Name"
    And the table structure should update accordingly
    When I click the Text View button in the status bar
    Then I should see the Monaco editor
    And the active editor content should include the new column

  Scenario: CSV table view preserves data integrity
    Given I click the icon for "New tab"
    When I type the following content into the active editor:
      """
      "Product","Price","Description","Age"
      "Laptop","$999.99","HP laptop with ""quotes""","1"
      "Mouse","$29.99","Wireless optical mouse","2"
      "Keyboard","$79.99","Mechanical keyboard","3"
      """
    And the status bar should show language "CSV / TSV"
    And I click the Data View button in the status bar
    Then I should see the CSV table view
    And the quoted values should be preserved correctly
    And special characters should be handled properly
    When I click the Text View button in the status bar
    Then I should see the Monaco editor
    And the active editor content should maintain the original formatting and quotes
