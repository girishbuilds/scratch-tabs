const { When, Then } = require('@cucumber/cucumber');

export { }; // Make this file a module to avoid global scope conflicts

// Doc strings keep multi-line pastes readable in the feature file.
When('I open the Global Scratchpad from the toolbar', async function () {
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

When('I close the Global Scratchpad with Escape', async function () {
  await this.scratchDrawer.close();
});

When('I reload the page', async function () {
  await this.scratchDrawer.reload();
});

When('I search Scratch for {string}', async function (text: string) {
  await this.scratchDrawer.search(text);
});

When('I pin the Scratch entry containing {string}', async function (text: string) {
  await this.scratchDrawer.pinEntryContaining(text);
});

When('I mark the first Scratch secret as not a secret', async function () {
  await this.scratchDrawer.unmaskFirstSecret();
});

When('I turn Scratch presenting mode {word}', async function (state: string) {
  await this.scratchDrawer.setPresenting(state === 'on');
});

When('I clear all Scratch entries', async function () {
  await this.scratchDrawer.clearAll();
});

When(
  'I mask {string} in the Scratch entry containing {string}',
  async function (selected: string, entryText: string) {
    await this.scratchDrawer.maskTextInEntry(entryText, selected);
  },
);

When('I click the text of the Scratch entry {string}', async function (text: string) {
  await this.scratchDrawer.clickEntryText(text);
});

When('I drag the Global Scratchpad edge {int} pixels to the left', async function (px: number) {
  await this.scratchDrawer.dragResizeHandleBy(-px);
});

When('I double-click the Global Scratchpad edge', async function () {
  await this.scratchDrawer.resetWidthByDoubleClick();
});

Then('the Scratch entry {string} should show it was copied', async function (text: string) {
  await this.scratchDrawer.expectEntryCopied(text);
});

Then('the Scratch entry {string} should not show it was copied', async function (text: string) {
  await this.scratchDrawer.expectEntryNotCopied(text);
});

Then('the Global Scratchpad should be wider than {int} pixels', async function (px: number) {
  await this.scratchDrawer.expectDrawerWiderThan(px);
});

Then('the Global Scratchpad should be {int} pixels wide', async function (px: number) {
  await this.scratchDrawer.expectDrawerWidth(px);
});

Then('the first Scratch entry should contain {string}', async function (text: string) {
  await this.scratchDrawer.expectFirstEntryContains(text);
});

Then('Scratch should offer no reveal or mask controls', async function () {
  await this.scratchDrawer.expectNoRevealControls();
});

Then('the Global Scratchpad should be {word}', async function (state: string) {
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

When('I start selecting Scratch entries', async function () {
  await this.scratchDrawer.startSelecting();
});

When('I select the Scratch entry containing {string}', async function (text: string) {
  await this.scratchDrawer.selectEntryContaining(text);
});

When('I Cmd-click the Scratch entry containing {string}', async function (text: string) {
  await this.scratchDrawer.modifierClickEntryContaining(text);
});

When('I delete the selected Scratch entries', async function () {
  await this.scratchDrawer.deleteSelected();
});

When('I pin the selected Scratch entries', async function () {
  await this.scratchDrawer.pinSelected();
});

When('I press Escape in the Scratch selection bar', async function () {
  await this.scratchDrawer.leaveSelectionWithEscape();
});

Then('Scratch should show {int} selected', async function (count: number) {
  await this.scratchDrawer.expectSelectedCount(count);
});

Then('Scratch selection mode should be {word}', async function (state: string) {
  await this.scratchDrawer.expectSelecting(state === 'on');
});

When(
  'I move the Scratch entry containing {string} to the {word}',
  async function (text: string, place: string) {
    await this.scratchDrawer.moveEntryContaining(text, place);
  },
);

When(
  'I move the Scratch entry containing {string} {word}',
  async function (text: string, direction: string) {
    await this.scratchDrawer.moveEntryContaining(text, direction);
  },
);

When('I move the selected Scratch entries to the {word}', async function (place: string) {
  await this.scratchDrawer.moveSelected(place);
});

Then('the Scratch entries should read {string}', async function (fragments: string) {
  await this.scratchDrawer.expectEntryOrder(fragments.split(' | '));
});

Then('Scratch should not offer to move entries', async function () {
  await this.scratchDrawer.expectMoveDisabled();
});
