const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
import { waitForSaveIndicator, waitForCursorAtLine } from '../support/testIndicator.utils';

// Updated to use action classes directly instead of delegate methods
// Aliases for quoted and unquoted variants
When('I click the icon for {string}', async function (iconTestId) {
  await this.navigation.clickIcon(iconTestId);
});
When('I click the icon for "{string}"', async function (iconTestId) {
  await this.navigation.clickIcon(iconTestId);
});

When(
  "I create a new tab from the document menu and clipboard",
  async function () {
    await this.navigation.createTabFromClipboardMenu();
  },
);

When("I open the Tool Selector from the document menu", async function () {
  await this.navigation.openToolSelectorFromDocumentMenu();
});

When('I click the icon for {string} on the {string} side', async function (iconTestId, side) {
  await this.navigation.clickIcon(iconTestId, side);
});
When('I click the icon for "{string}" on the "{string}" side', async function (iconTestId, side) {
  await this.navigation.clickIcon(iconTestId, side);
});

When('I set clipboard content to {string}', async function (content) {
  await this.clipboard.setClipboardContent(content);
});
When('I set clipboard content to "{string}"', async function (content) {
  await this.clipboard.setClipboardContent(content);
});

When('I set clipboard content to:', async function (content) {
  await this.clipboard.setClipboardContent(content);
});

When('I select {string} from the tablet selector', async function (tabletName) {
  await this.tabBar.selectTablet(tabletName);
});
When('I select "{string}" from the tablet selector', async function (tabletName) {
  await this.tabBar.selectTablet(tabletName);
});

When('I upload file {string} with content {string}', async function (filename, content) {
  await this.file.uploadFile(filename, content);
});
When('I upload file "{string}" with content "{string}"', async function (filename, content) {
  await this.file.uploadFile(filename, content);
});

When('I drag file {string} with content {string} onto the page', async function (filename, content) {
  await this.file.dragFileOntoPage(filename, content);
});
When('I drag file "{string}" with content {string} onto the page', async function (filename, content) {
  await this.file.dragFileOntoPage(filename, content);
});

When('I click the {string} tab', async function (tabTitle) {
  await this.tabBar.clickTab(tabTitle);
});
When('I click the "{string}" tab', async function (tabTitle) {
  await this.tabBar.clickTab(tabTitle);
});

// Updated to use action classes directly instead of delegate methods
When('I click the "{string}" button', async function (buttonText) {
  await this.navigation.clickButton(buttonText);
});

When('I wait for the tablet to be ready', async function () {
  // Wait for any tablet loading to complete and DOM to stabilize
  await this.navigation.waitForPageStabilization();
});

When('I wait for the application to load', async function () {
  // Wait for the application to fully load after refresh
  await this.navigation.waitForPageStabilization();
});

When('I wait for the state to be saved', async function () {
  // Wait for the app's save operation to complete by observing DOM changes
  await waitForSaveIndicator(this.page);
});

When('I refresh the page', async function () {
  await this.navigation.refreshPage();
});

When('I click in the editor at line {int}', async function (lineNumber) {
  // Capture the timestamp before the click so the wait step can distinguish a
  // fresh save from a stale one at the same line number.
  const indicator = this.page.locator('#test-cursor-indicator');
  this._preCursorTimestamp = await indicator.getAttribute('data-last-cursor-save');
  this._expectedCursorLine = lineNumber;
  await this.editor.clickAtLine(lineNumber);
});

When('I wait for cursor position to stabilize', async function () {
  // Wait until the app saves the specific line number we clicked (data-cursor-line).
  // This is immune to background cursor debounces (setModel, other tabs) that
  // happen to fire before or after the click — they save different line numbers
  // and won't satisfy the condition.  The pre-click timestamp guards against a
  // stale previous save at the same line.
  const expectedLine = this._expectedCursorLine;
  const preTimestamp = this._preCursorTimestamp;
  this._expectedCursorLine = undefined;
  this._preCursorTimestamp = undefined;
  await waitForCursorAtLine(this.page, expectedLine, preTimestamp);
});

When('I click the "{string}" link', async function (linkText) {
  await this.navigation.clickLink(linkText);
});
When('I click the tab titled "{string}"', async function (tabTitle) {
  await this.tabBar.clickTab(tabTitle);
});
When('I type the following content into the active editor:', async function (content) {
  await this.editor.typeInEditor(content);
});
When('I right-click in the editor', async function () {
  await this.editor.rightClickEditor();
});
When('I double-click in the editor', async function () {
  await this.editor.doubleClickEditor();
});
When('I select "{string}" from the context menu', async function (optionText) {
  await this.contextMenu.selectContextMenuOption(optionText);
});
When('I right-click on the first line of the editor', async function () {
  await this.editor.rightClickFirstLineOfEditor();
});
When('I select all text in the editor', async function () {
  await this.editor.selectAllTextInEditor();
});
When('I select {string} from the editor context menu', async function (optionText) {
  await this.contextMenu.selectFromEditorContextMenu(optionText);
});
When('I run the {string} editor context menu action', async function (actionId) {
  await this.editor.runEditorContextMenuAction(actionId);
});
Then('the editor context menu should show {string}', async function (optionText) {
  await this.contextMenu.expectEditorContextMenuHasOption(optionText);
});
Then('the editor context menu should not show {string}', async function (optionText) {
  await this.contextMenu.expectEditorContextMenuDoesNotHaveOption(optionText);
});
Then('the macro toolbar should be visible', async function () {
  await this.editor.expectMacroToolbarVisible();
});
Then('the send to canvas dialog should be visible', async function () {
  await this.canvas.expectSendToCanvasDialogVisible();
});
Then('the diff modal should be visible', async function () {
  await this.navigation.expectDiffModalToAppear();
});
When('I wait for the page to stabilize', async function () {
  await this.navigation.waitForPageStabilization();
});
When('I double-click on the page', async function () {
  await this.navigation.doubleClickOnPage();
});
When('I click the "Dev Tools" button', async function () {
  await this.tabBar.clickDevTools();
});
When('I click the "Paste Content" button', async function () {
  await this.tabBar.clickPasteContent();
});

When('I generate a 1.5MB JSON file and set it to clipboard', async function () {
  await this.file.generateLargeJsonFile();
});

When('I type the following markdown content into the editor:', async function (content) {
  await this.editor.typeInEditor(content);
});

When('I type {string} into the editor', async function (text) {
  await this.editor.typeText(text);
});

When('I press Ctrl+Z', async function () {
  await this.editor.pressCtrlZ();
});

When('I right-click the {string} tab', async function (tabTitle) {
  await this.tabBar.rightClickTab(tabTitle);
});

When('I right-click the "{string}" tab', async function (tabTitle) {
  await this.tabBar.rightClickTab(tabTitle);
});

When('I select {string} from the context menu', async function (menuItem) {
  // Set up download capture for download actions
  if (menuItem === "Download") {
    this.download.startDownloadCapture();
  }
  await this.contextMenu.selectFromContextMenu(menuItem);
});

When('I select "{string}" from the context menu', async function (menuItem) {
  // Set up download capture for download actions
  if (menuItem === "Download") {
    this.download.startDownloadCapture();
  }
  await this.contextMenu.selectFromContextMenu(menuItem);
});

When('I click {string} in the download modal', async function (buttonText) {
  if (buttonText === "Select All") {
    await this.download.clickSelectAllInModal();
  } else if (buttonText.includes("Download")) {
    await this.download.clickDownloadFilesInModal(buttonText);
  } else {
    // Generic button click in modal
    const button = this.page.getByRole('button', { name: buttonText });
    await button.click();
  }
});

When('I click "{string}" in the download modal', async function (buttonText) {
  if (buttonText === "Select All") {
    await this.download.clickSelectAllInModal();
  } else if (buttonText.includes("Download")) {
    await this.download.clickDownloadFilesInModal(buttonText);
  } else {
    // Generic button click in modal
    const button = this.page.getByRole('button', { name: buttonText });
    await button.click();
  }
});

When('I click {string} in the confirmation dialog', async function (buttonText) {
  await this.confirmationDialog.clickConfirmationButton(buttonText);
});

When('I click "{string}" in the confirmation dialog', async function (buttonText) {
  await this.confirmationDialog.clickConfirmationButton(buttonText);
});

When('I pin the {string} tab', async function (tabTitle) {
  // Right-click the tab and select "Pin" from Organize submenu
  await this.tabBar.rightClickTab(tabTitle);
  await this.contextMenu.selectFromSubmenu("Organize", "Pin");
});

When('I pin the "{string}" tab', async function (tabTitle) {
  // Right-click the tab and select "Pin" from Organize submenu
  await this.tabBar.rightClickTab(tabTitle);
  await this.contextMenu.selectFromSubmenu("Organize", "Pin");
});

When('I select {string} from the {string} submenu', async function (subItem, parentItem) {
  if (subItem.startsWith('Download')) {
    this.download.startDownloadCapture();
  }
  await this.contextMenu.selectFromSubmenu(parentItem, subItem);
});

When('I select "{string}" from the "{string}" submenu', async function (subItem, parentItem) {
  if (subItem.startsWith('Download')) {
    this.download.startDownloadCapture();
  }
  await this.contextMenu.selectFromSubmenu(parentItem, subItem);
});

When('I click the Smart View button', async function () {
  await this.tabBar.clickSmartViewButton();
});

When('I click in the editor', async function () {
  await this.editor.clickInEditor();
});

When('I type {string} in the rename input', async function (text) {
  await this.tabBar.typeInRenameInput(text);
});

When('I press Enter to confirm rename', async function () {
  await this.tabBar.pressEnterToConfirmRename();
});

When('I double-click on the active tab', async function () {
  await this.tabBar.doubleClickActiveTab();
});

When('I close the diff modal', async function () {
  await this.navigation.closeDiffModal();
});

When('I click the {string} tab on the right side', async function (tabTitle) {
  await this.tabBar.clickTabOnRightSide(tabTitle);
});
When('I click the "{string}" tab on the right side', async function (tabTitle) {
  await this.tabBar.clickTabOnRightSide(tabTitle);
});

When('I type {string} into the left editor', async function (text) {
  await this.editor.typeText(text, 'left');
});

When('I type "{string}" into the left editor', async function (text) {
  await this.editor.typeText(text, 'left');
});

When('I type {string} into the right editor', async function (text) {
  await this.editor.typeText(text, 'right');
});

When('I type "{string}" into the right editor', async function (text) {
  await this.editor.typeText(text, 'right');
});

// Format popup search functionality
When('I click on the format selector in the status bar', async function () {
  await this.statusBar.clickStatusBarLanguage();
});

When('I type {string} in the format search input', async function (searchText) {
  await this.statusBar.typeInFormatSearch(searchText);
});

When('I type "{string}" in the format search input', async function (searchText) {
  await this.statusBar.typeInFormatSearch(searchText);
});

When('I clear the format search input', async function () {
  await this.statusBar.clearFormatSearch();
});

When('I click on {string} in the search results', async function (formatName) {
  await this.statusBar.clickFormatOption(formatName);
});

When('I click on "{string}" in the search results', async function (formatName) {
  await this.statusBar.clickFormatOption(formatName);
});

// Tab close button interactions
When('I click the close button on the {string} tab', async function (tabTitle) {
  await this.tabBar.clickCloseButton(tabTitle);
});

When('I click the close button on the "{string}" tab', async function (tabTitle) {
  await this.tabBar.clickCloseButton(tabTitle);
});

When('I CTRL+click the close button on the {string} tab', async function (tabTitle) {
  await this.tabBar.ctrlClickCloseButton(tabTitle);
});

When('I CTRL+click the close button on the "{string}" tab', async function (tabTitle) {
  await this.tabBar.ctrlClickCloseButton(tabTitle);
});

When('I CMD+click the close button on the {string} tab', async function (tabTitle) {
  await this.tabBar.cmdClickCloseButton(tabTitle);
});

When('I CMD+click the close button on the "{string}" tab', async function (tabTitle) {
  await this.tabBar.cmdClickCloseButton(tabTitle);
});
