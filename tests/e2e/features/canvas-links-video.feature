Feature: Canvas offline links and click-to-load videos
  As a privacy-conscious developer
  I want pasted URLs to remain useful without background requests
  So that I control when third-party video content loads

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  @clipboard
  Scenario: Restore and use an offline baseline link card
    When I paste a normal URL into the Canvas
    And I wait for the Canvas scene to be saved
    And I reload the Canvas with the linked host unavailable
    Then the Canvas link should retain its URL hostname and actions

  Scenario: Classify allowlisted and unknown video-like URLs
    When I paste recognized and unrecognized video URLs into the Canvas
    Then the recognized URL should be a video card and the unknown URL a link card

  Scenario: Load an allowlisted video only on explicit Play
    When I paste a recognized video URL into the Canvas
    Then no Canvas video iframe should exist
    When I play the Canvas video
    Then one policy-restricted Canvas video iframe should exist
    When I stop and replay the Canvas video
    And I refresh the page
    Then no Canvas video iframe should exist

  Scenario: Reject unsafe URL schemes
    When I paste an unsafe URL scheme into the Canvas
    Then no unsafe Canvas link should be created
