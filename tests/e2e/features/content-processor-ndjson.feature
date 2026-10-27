Feature: NDJSON content processing

  Background:
    Given I am on the homepage

  @clipboard
  Scenario: Clean and extract valid JSON from mixed NDJSON content
    When I set clipboard content to:
      """
      2025-08-01T10 : 15:30.123Z {"event":"user_login","user_id":123,"ip":"192.168.1.10"}
      2025-1.004Z sdc {"event":"view_page","user_id":123,"page":"/dashboard"}
      2025-08-01T10 : 15:35.876Z sdvsdvsdv{"event":"click_button","user_id":123,"button_id":"submit-form"}
      sdvsdv2025-08-01T10 : 15:42.110Z {"event":"api_call","user_id":123,"endpoint":"/api/data","status":200}
      xcvdsvsdvsdvs {"event":"logout","user_id":123}
      """
    And I create a new tab from the document menu and clipboard
    Then the "Welcome" tab should exist and not be active
    And the "Scratch 1" tab should be active
    And each line should be valid JSON
    And the active editor content should contain "user_login"
    And the active editor content should contain "view_page"
    And the active editor content should contain "click_button"
    And the active editor content should contain "api_call"
    And the active editor content should contain "logout"
    And the status bar language should be "JSON Log"