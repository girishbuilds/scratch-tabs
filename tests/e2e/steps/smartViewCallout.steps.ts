import { Then, When } from '@cucumber/cucumber';

// Visibility checks
Then('I should see the smart view callout', async function() {
  await this.smartViewCallout.expectCalloutVisible();
});

Then('I should not see the smart view callout', async function() {
  await this.smartViewCallout.expectCalloutNotVisible();
});

// Message content checks
Then('the smart view callout message should contain {string}', async function(text) {
  await this.smartViewCallout.expectCalloutMessageContains(text);
});

Then('the smart view callout message should contain "{string}"', async function(text) {
  await this.smartViewCallout.expectCalloutMessageContains(text);
});

// Button interactions
When('I click the Smart View button in the smart view callout', async function() {
  await this.smartViewCallout.clickDataViewButton();
});

When('I click the smart view callout dismiss button', async function() {
  await this.smartViewCallout.clickDismissButton();
});

// Wait (used to check the callout does not auto-dismiss)
When('I wait for {int} seconds', async function(seconds) {
  await this.page.waitForTimeout(seconds * 1000);
});

// Format-specific message checks
Then('the smart view callout should show format {string}', async function(formatName) {
  await this.smartViewCallout.expectCalloutContainsFormat(formatName);
});

Then('the smart view callout should show format "{string}"', async function(formatName) {
  await this.smartViewCallout.expectCalloutContainsFormat(formatName);
});
