@share
Feature: Tab Sharing

  Background:
    Given I am on the homepage

  Scenario: Open share modal from context menu
    When I click the icon for "New tab"
    And I type "Hello from shared tab" into the editor
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    And the share modal should show the tab title "Scratch 1"

  Scenario: Share modal displays URL for small content
    When I click the icon for "New tab"
    And I type "Small content" into the editor
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    And the shareable URL input should be visible
    And the shareable URL input should contain "#/s/v1/"

  @clipboard
  Scenario: Copy share URL and verify clipboard
    When I click the icon for "New tab"
    And I type "Content to share" into the editor
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    When I click the "Copy" button in the share modal
    Then the clipboard should contain "#/s/v1/"

  Scenario: Close share modal
    When I click the icon for "New tab"
    And I type "Test content" into the editor
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    When I close the share modal
    Then the share modal should not be visible

  @clipboard
  Scenario: Open shared tab from link in new browser instance
    When I click the icon for "New tab"
    And I type "This is shared content from the original tab" into the editor
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    When I copy the share URL from the modal
    And I open the share URL in a new browser instance
    Then the new browser instance should have a tab with content "This is shared content from the original tab"

  @clipboard
  Scenario: Shared tab appears in correct browser tab when app already open
    When I click the icon for "New tab"
    And I type "Content for multi-tab share test" into the editor
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    When I copy the share URL from the modal
    And I close the share modal
    And I open the share URL in a new browser tab
    Then the new browser tab should show the shared content
    And the new browser tab should have a tab with content "Content for multi-tab share test"

  @clipboard
  Scenario: Share JSON content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "name": "Test",
        "value": 123
      }
      """
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    When I copy the share URL from the modal
    And I open the share URL in a new browser instance
    Then the new browser instance should have a tab with JSON content
    And the new browser instance tab content should contain "Test"
    And the new browser instance tab content should contain "123"

  Scenario: Share modal shows correct tab title
    When I click the icon for "New tab"
    And I type "Test" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Rename" from the "Organize" submenu
    And I type "My Custom Tab" in the rename input
    And I press Enter to confirm rename
    And I right-click the "My Custom Tab" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    And the share modal should show the tab title "My Custom Tab"

  Scenario: Cannot share a tablet
    When I open the Tool Selector from the document menu
    And I select "Calculator" from the tablet selector
    And I right-click the "Calculator" tab
    Then the context menu should not show "Share" option

  @clipboard
  Scenario: Trim large JSON content before sharing
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "keep_me": "small",
        "remove_me": "this is a very long string that will take up a lot of space in the URL if we keep it. it needs to be long enough to exceed the 1800 character limit of the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. this is a very long string that will take up a lot of space in the URL. ADDDING MORE UNIQUE DATA TO BREAK COMPRESSION: ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*() _+ [] {} | ; : , . / < > ? ~ ` RANDOM DATA 1: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 2: 0123456789 0123456789 0123456789 RANDOM DATA 3: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 4: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 5: 0123456789 0123456789 0123456789 RANDOM DATA 6: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 7: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 8: 0123456789 0123456789 0123456789 RANDOM DATA 9: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 10: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 11: 0123456789 0123456789 0123456789 RANDOM DATA 12: !@#$%^&*() !@#$%^&*() !@#$%^&*() RANDOM DATA 13: abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ RANDOM DATA 14: 0123456789 0123456789 0123456789"
      }
      """
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    And the JSON trim UI should be visible
    And the JSON key "remove_me" should be "unselected"
    And the JSON key "keep_me" should be "selected"
    And the budget bar should show the max of "1800" characters
    When I copy the share URL from the modal
    And I open the share URL in a new browser instance
    Then the new browser instance should have a tab with JSON content
    And the new browser instance tab content should contain "keep_me"
    And the new browser instance tab content should not contain "this is a very long string"

  Scenario: Fall back to default trimming for invalid JSON
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "invalid": "json",
        "oops": [1, 2, 3,
        "padding": "this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL. this is a very long string that will be repeated many times to ensure we exceed the 1800 character limit of the URL.",
        "random_1": "a1b2c3d4e5f6g7h8i9j0 k1l2m3n4o5p6q7r8s9t0 u1v2w3x4y5z6 a!b@c#d$e%f^g&h*i(j) k-l=m+n[o]p{q}r|s;t:u,v.w/x<y>z?",
        "random_2": "q1w2e3r4t5y6u7i8o9p0 a1s2d3f4g5h6j7k8l9 z1x2c3v4b5n6m7 q!w@e#r$t%y^u&i*o(p) a-s=d+f[g]h{j}k|l; z:x,c.v/b<n>m?",
        "random_3": "1q2w3e4r5t6y7u8i9o0p q1a2z3w4s5x6e7d8c9 r1f2v3t4g5b6y7 h1n2u3j4m5i6k7o8 l1p2q3w4e5r6t7y8",
        "random_4": "abc123DEF456ghi789JKL012 mno345PQR678stu901VWX234 yza567BCD890efg123HIJ456",
        "random_5": "!@#123$%^456&*()789 []{}012 \\|; :345 '\",678 <.>901 ?/!234 @#$567 %^&890",
        "random_6": "this is more padding to be absolutely sure. 1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz !@#$%^&*()",
        "random_7": "final push for the limit: a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 ! @ # $ % ^ & * ( )"
      }
      """
    And I right-click the "Scratch 1" tab
        And I select "Share" from the context menu
    Then the share modal should appear
    And the JSON trim UI should not be visible
    And the default trim UI should be visible

  Scenario: Manually customize content that fits
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Small content that fits
      Over two lines
      """
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    And the shareable URL input should be visible
    And the "Customize Content" button should be visible
    When I click the "Customize Content" button in the share modal
    Then the default trim UI should be visible
    And the modal should show "Shareable URL (Trimmed Content)"

  @clipboard
  Scenario: Manually customize small JSON to exclude sensitive fields
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      {
        "username": "john_doe",
        "password": "secret123",
        "email": "john@example.com"
      }
      """
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    And the shareable URL input should be visible
    When I click the "Customize Content" button in the share modal
    Then the JSON trim UI should be visible
    And the JSON key "username" should be "selected"
    And the JSON key "password" should be "selected"
    And the JSON key "email" should be "selected"
    When I toggle the JSON key "password"
    Then the JSON key "password" should be "unselected"
    When I copy the share URL from the modal
    And I open the share URL in a new browser instance
    Then the new browser instance should have a tab with JSON content
    And the new browser instance tab content should contain "username"
    And the new browser instance tab content should not contain "secret123"

  Scenario: Customize Content button appears for text content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Line 1: This is public information
      Line 2: This is also public
      Line 3: SECRET DATA HERE
      Line 4: More public content
      """
    And I right-click the "Scratch 1" tab
    And I select "Share" from the context menu
    Then the share modal should appear
    And the "Customize Content" button should be visible
    When I click the "Customize Content" button in the share modal
    Then the default trim UI should be visible
