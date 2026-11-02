Feature: Global Scratchpad

  Quick capture of commands, links and secrets. Secrets are masked in the UI
  and encrypted before they reach IndexedDB. All keys below are random keyboard
  mashing, not real credentials.

  Background:
    Given I am on the homepage

  Scenario: Pasting a scratch pad masks the keys but keeps commands readable
    When I open the Global Scratchpad from the toolbar
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
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds
      """
    And I reveal the first secret in Scratch
    Then the revealed Scratch secret should be "3knd8dsuhds89hds-ds8hdshds-ds98hds"

  Scenario: Entries are encrypted at rest and survive a reload
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds
      Prod-Key: 8d8sd89hsdh8-sdc0shc-sdcsdc-cdsc

      mvn -B -ntp -fae -T 1C clean verify
      """
    Then IndexedDB should hold 3 Scratch entries without "3knd8dsuhds89hds" or "mvn -B -ntp" in readable form
    When I reload the page
    And I open the Global Scratchpad from the toolbar
    Then Scratch should list 3 entries
    And Scratch should mask 2 secrets
    And Scratch should show "mvn -B -ntp -fae -T 1C clean verify"
    When I reveal the first secret in Scratch
    Then the revealed Scratch secret should be "3knd8dsuhds89hds-ds8hdshds-ds98hds"

  Scenario: Deleting an entry removes it
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      mvn -B -ntp -fae -T 1C clean verify
      """
    And I delete the Scratch entry containing "mvn -B"
    Then Scratch should list 0 entries

  Scenario: The keyboard shortcut and Escape toggle the Global Scratchpad
    When I press the Scratch shortcut
    Then the Global Scratchpad should be visible
    When I close the Global Scratchpad with Escape
    Then the Global Scratchpad should be hidden

  Scenario: In split view the Scratch toggle moves to the right pane
    When I click the icon for "New tab"
    And I click the icon for "New tab"
    Then the Scratch toggle should be in the left pane only
    When I right-click the "Scratch 1" tab
    And I select "Split Right" from the context menu
    Then I should be in split view mode
    And the Scratch toggle should be in the right pane only
    When I open the Global Scratchpad from the toolbar
    Then the Global Scratchpad should be visible

  Scenario: Search finds entries by visible text but never by a secret
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds

      mvn -B -ntp -fae -T 1C clean verify
      """
    And I search Scratch for "clean verify"
    Then Scratch should list 1 entries
    When I search Scratch for "3knd8dsuhds89hds"
    Then Scratch should list 0 entries

  Scenario: A pinned entry stays at the top
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      TODO: Make allow list include notes header
      """
    And I paste into Scratch:
      """
      mvn -B -ntp -fae -T 1C clean verify
      """
    Then the first Scratch entry should contain "mvn -B"
    When I pin the Scratch entry containing "TODO"
    Then the first Scratch entry should contain "TODO"

  Scenario: A false positive can be unmasked
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds
      """
    And I mark the first Scratch secret as not a secret
    Then Scratch should mask 0 secrets
    And Scratch should show "3knd8dsuhds89hds-ds8hdshds-ds98hds"

  Scenario: Text the detector missed can be selected and masked
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      deploy pw is plainword now
      """
    Then Scratch should mask 0 secrets
    When I mask "plainword" in the Scratch entry containing "deploy pw"
    Then Scratch should mask 1 secrets
    And Scratch should not show "plainword" anywhere

  Scenario: Presenting mode removes the ways to reveal a secret
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds
      """
    And I turn Scratch presenting mode on
    Then Scratch should offer no reveal or mask controls
    And Scratch should mask 1 secrets
    When I turn Scratch presenting mode off
    And I reveal the first secret in Scratch
    Then the revealed Scratch secret should be "3knd8dsuhds89hds-ds8hdshds-ds98hds"

  Scenario: Clear all removes every entry after confirmation
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      mvn -B -ntp -fae -T 1C clean verify

      TODO: Make allow list include notes header
      """
    Then Scratch should list 2 entries
    When I clear all Scratch entries
    Then Scratch should list 0 entries

  Scenario: Clicking an entry copies it and ticks its icon
    When I open the Global Scratchpad from the toolbar
    And I paste into Scratch:
      """
      mvn -B -ntp -fae -T 1C clean verify
      """
    Then the Scratch entry "mvn -B" should not show it was copied
    When I click the text of the Scratch entry "mvn -B"
    Then the Scratch entry "mvn -B" should show it was copied
    And the Scratch entry "mvn -B" should not show it was copied

  Scenario: The Global Scratchpad can be widened and reset
    When I open the Global Scratchpad from the toolbar
    Then the Global Scratchpad should be 380 pixels wide
    When I drag the Global Scratchpad edge 200 pixels to the left
    Then the Global Scratchpad should be wider than 500 pixels
    When I double-click the Global Scratchpad edge
    Then the Global Scratchpad should be 380 pixels wide
