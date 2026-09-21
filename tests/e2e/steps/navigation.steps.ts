const { Given } = require('@cucumber/cucumber');

// Updated to use action classes directly instead of delegate methods
Given('I am on the home page', async function() {
  await this.navigation.navigateToHome();
});

Given('I am on the homepage', async function() {
  await this.navigation.navigateToHome();
});

Given('I am on the scratch tabs application', async function() {
  await this.navigation.navigateToHome();
});

Given('I open the direct path {string}', async function(path) {
  await this.navigation.navigateToPath(path);
});

Given('I create a new tab with content {string}', async function(content) {
  await this.navigation.clickIcon("New tab");
  await this.editor.typeInEditor(content);
});
