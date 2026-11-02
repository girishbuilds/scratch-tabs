const { When, Then } = require('@cucumber/cucumber');

export { }; // Make this file a module to avoid global scope conflicts

// Doc strings keep multi-line pastes readable in the feature file.
When('I open the Scratch drawer from the toolbar', async function () {
  await this.scratchDrawer.openFromToolbar();
});

When('I press the Scratch shortcut', async function () {
  await this.scratchDrawer.toggleWithShortcut();
});

When('I paste into Scratch:', async function (text: string) {
  await this.scratchDrawer.pasteText(text);
});

When('I reveal the first secret in Scratch', async function () {
  await this.scratchDrawer.revealFirstSecret();
});

When('I delete the Scratch entry containing {string}', async function (text: string) {
  await this.scratchDrawer.deleteEntryContaining(text);
});

When('I close the Scratch drawer with Escape', async function () {
  await this.scratchDrawer.close();
});

When('I reload the page', async function () {
  await this.scratchDrawer.reload();
});

Then('the Scratch drawer should be {word}', async function (state: string) {
  await this.scratchDrawer.expectDrawerVisible(state === 'visible');
});

Then('the Scratch toggle should be in the left pane only', async function () {
  await this.scratchDrawer.expectToggleInPaneOnly('left');
});

Then('the Scratch toggle should be in the right pane only', async function () {
  await this.scratchDrawer.expectToggleInPaneOnly('right');
});

Then('Scratch should list {int} entries', async function (count: number) {
  await this.scratchDrawer.expectEntryCount(count);
});

Then('Scratch should mask {int} secrets', async function (count: number) {
  await this.scratchDrawer.expectMaskCount(count);
});

Then('Scratch should show {string}', async function (text: string) {
  await this.scratchDrawer.expectDrawerContains(text);
});

Then('Scratch should not show {string} anywhere', async function (text: string) {
  await this.scratchDrawer.expectDrawerDoesNotContain(text);
});

Then('the revealed Scratch secret should be {string}', async function (value: string) {
  await this.scratchDrawer.expectRevealedSecret(value);
});

Then(
  'IndexedDB should hold {int} Scratch entries without {string} or {string} in readable form',
  async function (count: number, a: string, b: string) {
    await this.scratchDrawer.expectNothingReadableAtRest([a, b], count);
  },
);
