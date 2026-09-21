Feature: URL Tab Handling

  Rule: Persisted tab navigation

    Background:
      Given I am on the homepage
      When I click the icon for "New tab"
      And I type the following content into the active editor:
        """
        Content for Scratch 1
        This is some test content for the first tab.
        """
      When I click the icon for "New tab"
      And I type the following content into the active editor:
        """
        Content for Scratch 2
        This is some test content for the second tab.
        """
      When I open the Tool Selector from the document menu
      And I select "Calculator" from the tablet selector
      And I wait for the tablet to be ready
      When I open the Tool Selector from the document menu
      And I select "Password Generator" from the tablet selector
      And I wait for the tablet to be ready
      When I click the "Scratch 2" tab
      Then the "Scratch 2" tab should be active
      And the active editor content should contain "Content for Scratch 2"

    Scenario: Refreshing the page preserves active tab state
      When I wait for the state to be saved
      And I refresh the page
      And I wait for the application to load
      Then the "Scratch 2" tab should be active
      And the active editor content should contain "Content for Scratch 2"

  Rule: Tablet deep links

    Scenario: Opening a tablet route creates the first workspace and tablet tab
      When I open the direct path "/spin-the-wheel"
      Then the "Spin the Wheel" tab should be active
      And the URL should contain "/spin-the-wheel"

    Scenario: Opening a tablet route adds the tablet to an existing workspace
      Given I am on the homepage
      When I click the icon for "New tab"
      And I open the direct path "/spin-the-wheel"
      Then the "Spin the Wheel" tab should be active
      And the URL should contain "/spin-the-wheel"
