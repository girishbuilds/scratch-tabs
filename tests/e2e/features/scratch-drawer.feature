Feature: Scratch drawer

  Quick capture of commands, links and secrets. Secrets are masked in the UI
  and encrypted before they reach IndexedDB. All keys below are random keyboard
  mashing, not real credentials.

  Background:
    Given I am on the homepage

  Scenario: Pasting a scratch pad masks the keys but keeps commands readable
    When I open the Scratch drawer from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds
      Prod-Key: 8d8sd89hsdh8-sdc0shc-sdcsdc-cdsc

      mvn -B -ntp -fae -T 1C clean verify
      """
    Then Scratch should list 3 entries
    And Scratch should mask 2 secrets
    And Scratch should show "UAT key:"
    And Scratch should show "mvn -B -ntp -fae -T 1C clean verify"
    And Scratch should not show "3knd8dsuhds89hds-ds8hdshds-ds98hds" anywhere
    And Scratch should not show "8d8sd89hsdh8-sdc0shc-sdcsdc-cdsc" anywhere

  Scenario: A secret is only shown when revealed
    When I open the Scratch drawer from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds
      """
    And I reveal the first secret in Scratch
    Then the revealed Scratch secret should be "3knd8dsuhds89hds-ds8hdshds-ds98hds"

  Scenario: Entries are encrypted at rest and survive a reload
    When I open the Scratch drawer from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds
      Prod-Key: 8d8sd89hsdh8-sdc0shc-sdcsdc-cdsc

      mvn -B -ntp -fae -T 1C clean verify
      """
    Then IndexedDB should hold 3 Scratch entries without "3knd8dsuhds89hds" or "mvn -B -ntp" in readable form
    When I reload the page
    And I open the Scratch drawer from the toolbar
    Then Scratch should list 3 entries
    And Scratch should mask 2 secrets
    And Scratch should show "mvn -B -ntp -fae -T 1C clean verify"
    When I reveal the first secret in Scratch
    Then the revealed Scratch secret should be "3knd8dsuhds89hds-ds8hdshds-ds98hds"

  Scenario: Deleting an entry removes it
    When I open the Scratch drawer from the toolbar
    And I paste into Scratch:
      """
      mvn -B -ntp -fae -T 1C clean verify
      """
    And I delete the Scratch entry containing "mvn -B"
    Then Scratch should list 0 entries

  Scenario: The keyboard shortcut and Escape toggle the drawer
    When I press the Scratch shortcut
    Then the Scratch drawer should be visible
    When I close the Scratch drawer with Escape
    Then the Scratch drawer should be hidden

  Scenario: In split view the Scratch toggle moves to the right pane
    When I click the icon for "New tab"
    And I click the icon for "New tab"
    Then the Scratch toggle should be in the left pane only
    When I right-click the "Scratch 1" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    And the Scratch toggle should be in the right pane only
    When I open the Scratch drawer from the toolbar
    Then the Scratch drawer should be visible
