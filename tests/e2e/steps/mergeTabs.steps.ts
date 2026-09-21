import { Then, When } from '@cucumber/cucumber';

When('I include the {string} tab in the merge', async function (tabTitle) {
  await this.mergeTabs.includeTab(tabTitle);
});

When('I choose to merge as {string}', async function (formatName) {
  await this.mergeTabs.chooseFormat(formatName);
});

When('I enable merge column alignment', async function () {
  await this.mergeTabs.enableColumnAlignment();
});

When('I set the merge result title to {string}', async function (title) {
  await this.mergeTabs.setResultTitle(title);
});

When('I create the merged tab', async function () {
  await this.mergeTabs.createMergedTab();
});

When(
  'I click the {string} tab on the {string} merge test side',
  async function (tabTitle, side) {
    await this.mergeTabs.clickTabOnSide(tabTitle, side);
  },
);

Then('the merge tabs dialog should appear', async function () {
  await this.mergeTabs.expectDialogVisible();
});

Then(
  'CSV merge options should appear for {string} and {string}',
  async function (firstTitle, secondTitle) {
    await this.mergeTabs.expectCsvOptions([firstTitle, secondTitle]);
  },
);

Then(
  'the editor on the {string} side should exactly contain:',
  async function (side, expectedContent) {
    await this.mergeTabs.expectEditorContent(side, expectedContent);
  },
);
