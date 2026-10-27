import { Page, expect } from '@playwright/test';

export class TabBarActions {
  constructor(private page: Page) { }

  async clickTab(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await tab.click();
  }

  async rightClickTab(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
    await tab.click({ button: 'right' });
  }

  async expectTabIsActive(tabTitle: string) {
    // First check if tab exists at all
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();

    // Then check if it's active using aria-selected
    const activeTab = this.page.locator(`[data-testid="tab-${tabTitle}"][aria-selected="true"]`);
    await expect(activeTab).toBeVisible();
  }

  async expectTabExistsAndNotActive(tabTitle: string) {
    // First check if the tab exists
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();

    // Then check if it's not active using aria-selected
    const activeTab = this.page.locator(`[data-testid="tab-${tabTitle}"][aria-selected="true"]`);
    await expect(activeTab).not.toBeVisible();
  }

  async clickSmartViewButton() {
    const button = this.page.locator('[data-testid="data-view-button"]');
    await button.click();
  }

  async selectTablet(tabletName: string) {
    // Wait for the tool selector modal to appear using its accessible role and label
    const toolSelector = this.page.getByRole('dialog', { name: 'Tool Selector' });
    await expect(toolSelector).toBeVisible();

    // Click on the tool card with the specified label
    // The ToolCard renders the label in a span (List) or h3 (Grid)
    const toolCard = toolSelector.locator('button').filter({
      has: this.page.locator('span, h3').filter({ hasText: new RegExp(`^${tabletName}$`) })
    }).first();

    await expect(toolCard).toBeVisible();
    await toolCard.click();

    // Wait for the tablet tab to appear to confirm the action
    const tabletTab = this.page.locator(`[data-testid="tab-${tabletName}"]`);
    await expect(tabletTab).toBeVisible();
  }

  async expectTabletIsActive(tabletName: string) {
    // Use stable ARIA attribute instead of brittle CSS classes
    const activeTab = this.page.locator(`[data-testid="tab-${tabletName}"][aria-selected="true"]`);
    await expect(activeTab).toBeVisible();
  }

  async clickDevTools() {
    const button = this.page.locator('button:has-text("Dev Tools")');
    await expect(button).toBeVisible();
    await button.click();
  }

  async clickPasteContent() {
    // A second copy lives in the collapsed mobile section; getByRole skips hidden elements
    const button = this.page.getByRole('button', { name: /Paste Content/ });
    await expect(button).toBeVisible();
    await button.click();
  }

  async expectTabRenameInputToAppear() {
    // Wait for the rename input to appear - use specific test ID
    const renameInput = this.page.getByTestId('tab-rename-input');
    await expect(renameInput).toBeVisible();
    await expect(renameInput).toBeFocused();
  }

  async typeInRenameInput(text: string) {
    // Clear existing content and type new text
    const renameInput = this.page.getByTestId('tab-rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill(text);
  }

  async pressEnterToConfirmRename() {
    // Press Enter to confirm the rename
    const renameInput = this.page.locator('input[type="text"]').last();
//    const renameInput = this.page.getByTestId('tab-rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.press('Enter');
  }

  async clickTabOnRightSide(tabTitle: string) {
    // In split view, tabs are shared across both sides, so we can click any tab by its title
    // The "right side" aspect refers to which editor pane becomes active, not tab location
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
    await tab.click();
  }

  async expectTabsInOrder(expectedOrder: string) {
    // Parse the expected order string (e.g., "Welcome, Scratch 1, Scratch 3, Scratch 2, Scratch 4")
    const expectedTabNames = expectedOrder.split(',').map(name => name.trim());

    // Get all visible tabs in order (excluding the tab-bar-empty-area)
    const tabs = this.page.locator('[data-testid^="tab-"]:not([data-testid="tab-bar-empty-area"])');
    const tabCount = await tabs.count();

    // Verify we have the expected number of tabs
    expect(tabCount).toBe(expectedTabNames.length);

    // For each tab, check its name by getting the tab title
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);

      // Get the tab title from the tab element's text content or title attribute
      const tabTitle = await tab.textContent();

      // Compare with expected tab name
      expect(tabTitle?.trim()).toBe(expectedTabNames[i]);
    }
  }

  async clickCloseButton(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();

    // Find the close button within the tab - it has an aria-label that starts with "Close tab"
    const closeButton = tab.locator('button[aria-label*="Close tab"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();
  }

  async ctrlClickCloseButton(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();

    // Find the close button within the tab - it has an aria-label that starts with "Close tab"
    const closeButton = tab.locator('button[aria-label*="Close tab"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click({ modifiers: ['Control'] });
  }

  async cmdClickCloseButton(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();

    // Find the close button within the tab - it has an aria-label that starts with "Close tab"
    const closeButton = tab.locator('button[aria-label*="Close tab"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click({ modifiers: ['Meta'] });
  }

  async expectTabDoesNotExist(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).not.toBeVisible();
  }

  async doubleClickActiveTab() {
    // Find the currently active tab (has aria-selected="true")
    const activeTab = this.page.locator('[data-testid^="tab-"][aria-selected="true"]');
    await expect(activeTab).toBeVisible();
    await activeTab.dblclick({ force: true });
  }
}
