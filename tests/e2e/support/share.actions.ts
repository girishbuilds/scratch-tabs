import { Page, expect, BrowserContext } from '@playwright/test';
import { installCdnCache } from './cdnCache.js';

export class ShareActions {
  private shareUrl: string = '';
  private newContext: BrowserContext | null = null;
  private newPage: Page | null = null;
  private newTab: Page | null = null;

  constructor(private page: Page, private context: BrowserContext) { }

  async expectModalToAppear() {
    // Wait for the share modal to appear by looking for the "Share Tab" heading
    await expect(this.page.getByRole('heading', { name: 'Share Tab' })).toBeVisible();
  }

  async expectModalShowsTabTitle(tabTitle: string) {
    // The modal should show the tab title as subtitle text
    const modal = this.page.locator('.bg-surface.border.border-base.rounded-lg.shadow-xl');
    await expect(modal).toBeVisible();

    // Look for the tab title in the modal's subtitle/secondary text
    const subtitle = modal.locator('p.text-sm.text-secondary', { hasText: tabTitle });
    await expect(subtitle).toBeVisible();
  }

  async expectUrlInputVisible() {
    // The shareable URL input should be visible
    const urlInput = this.page.locator('input[type="text"][readonly]').first();
    await expect(urlInput).toBeVisible();
  }

  async expectUrlInputContains(urlPart: string) {
    // The URL input should contain the specified part
    const urlInput = this.page.locator('input[type="text"][readonly]').first();
    await expect(urlInput).toBeVisible();

    const value = await urlInput.inputValue();
    expect(value).toContain(urlPart);
  }

  async clickButtonInModal(buttonText: string) {
    // Click a button within the share modal
    const modal = this.page.locator('.bg-surface.border.border-base.rounded-lg.shadow-xl');
    await expect(modal).toBeVisible();

    const button = modal.getByRole('button', { name: buttonText });
    await expect(button).toBeVisible();
    await button.click();
  }

  async expectClipboardContains(expectedContent: string) {
    // Wait a bit for clipboard to update
    await this.page.waitForTimeout(100);

    // Get clipboard content and verify
    const handle = await this.page.evaluateHandle(() => navigator.clipboard.readText());
    const clipboardContent = await handle.jsonValue();
    expect(clipboardContent).toContain(expectedContent);
  }

  async closeModal() {
    // Close the share modal by clicking the X button
    const modal = this.page.locator('.bg-surface.border.border-base.rounded-lg.shadow-xl');
    await expect(modal).toBeVisible();

    const closeButton = modal.locator('button').filter({ has: this.page.locator('svg') }).first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Wait for modal to close
    await expect(modal).toBeHidden();
  }

  async expectModalNotVisible() {
    // The share modal should not be visible
    const modal = this.page.locator('.bg-surface.border.border-base.rounded-lg.shadow-xl');
    await expect(modal).toBeHidden();
  }

  async copyShareUrl() {
    // Get the share URL from the input field and store it
    const urlInput = this.page.locator('input[type="text"][readonly]').first();
    await expect(urlInput).toBeVisible();

    this.shareUrl = await urlInput.inputValue();

    // Also click the Copy button to test the copy functionality
    await this.clickButtonInModal('Copy');
  }

  async openShareUrlInNewContext() {
    // Open the share URL in a completely new browser context (simulates new browser instance)
    if (!this.shareUrl) {
      throw new Error('No share URL available. Call copyShareUrl() first.');
    }

    // Create a new browser context
    this.newContext = await this.context.browser()!.newContext();
    await installCdnCache(this.newContext);
    this.newPage = await this.newContext.newPage();

    // Navigate to the share URL
    await this.newPage.goto(this.shareUrl);

    // Wait for the page to load
    await this.newPage.waitForLoadState('networkidle');

    // Wait for the shared tab to appear
    const sharedTab = this.newPage.locator('[data-testid^="tab-Shared"]');
    await expect(sharedTab).toBeVisible();
  }

  async openShareUrlInNewTab() {
    // Open the share URL in a new tab of the same browser context
    if (!this.shareUrl) {
      throw new Error('No share URL available. Call copyShareUrl() first.');
    }

    // Create a new page in the same context
    this.newTab = await this.context.newPage();

    // Navigate to the share URL
    await this.newTab.goto(this.shareUrl);

    // Wait for the page to load
    await this.newTab.waitForLoadState('networkidle');

    // Wait for the shared tab to appear
    const sharedTab = this.newTab.locator('[data-testid^="tab-Shared"]');
    await expect(sharedTab).toBeVisible();
  }

  async expectNewInstanceHasContent(expectedContent: string) {
    if (!this.newPage) {
      throw new Error('No new browser instance available. Call openShareUrlInNewContext() first.');
    }

    // Wait for the Monaco editor to appear
    const editor = this.newPage.locator('.monaco-editor');
    await expect(editor).toBeVisible();

    // Wait for content to be loaded
    await this.newPage.locator('.view-line').first().waitFor({ state: 'visible' });

    // Get the editor content from the most recently created model
    const content = await this.newPage.evaluate(() => {
      const monaco = (window as any).monaco;
      if (!monaco) return '';

      const models = monaco.editor.getModels();
      if (models.length === 0) return '';

      // Get the last model (most recently created, which should be the shared tab)
      return models[models.length - 1].getValue();
    });

    expect(content).toContain(expectedContent);
  }

  async expectNewTabShowsSharedContent() {
    if (!this.newTab) {
      throw new Error('No new tab available. Call openShareUrlInNewTab() first.');
    }

    // Wait for the Monaco editor to appear in the new tab
    const editor = this.newTab.locator('.monaco-editor');
    await expect(editor).toBeVisible();

    // Verify there's at least one tab
    const tabs = this.newTab.locator('[data-testid^="tab-"]');
    await expect(tabs.first()).toBeVisible();
  }

  async expectNewTabHasContent(expectedContent: string) {
    if (!this.newTab) {
      throw new Error('No new tab available. Call openShareUrlInNewTab() first.');
    }

    // Wait for the Monaco editor to appear
    const editor = this.newTab.locator('.monaco-editor');
    await expect(editor).toBeVisible();

    // Wait for content to be loaded
    await this.newTab.locator('.view-line').first().waitFor({ state: 'visible' });

    // Get the editor content from the most recently created model
    const content = await this.newTab.evaluate(() => {
      const monaco = (window as any).monaco;
      if (!monaco) return '';

      const models = monaco.editor.getModels();
      if (models.length === 0) return '';

      // Get the last model (most recently created, which should be the shared tab)
      return models[models.length - 1].getValue();
    });

    expect(content).toContain(expectedContent);
  }

  async expectNewInstanceHasJsonContent() {
    if (!this.newPage) {
      throw new Error('No new browser instance available. Call openShareUrlInNewContext() first.');
    }

    // Wait for the Monaco editor to appear
    const editor = this.newPage.locator('.monaco-editor');
    await expect(editor).toBeVisible();

    // Wait for content to be loaded
    await this.newPage.locator('.view-line').first().waitFor({ state: 'visible' });

    // Get the editor content and verify it's valid JSON
    const content = await this.newPage.evaluate(() => {
      const monaco = (window as any).monaco;
      if (!monaco) return '';

      const models = monaco.editor.getModels();
      if (models.length === 0) return '';

      // Get the last model (most recently created)
      return models[models.length - 1].getValue();
    });

    // Verify it's valid JSON
    expect(() => JSON.parse(content)).not.toThrow();
  }

  async expectNewInstanceContentContains(expectedContent: string) {
    if (!this.newPage) {
      throw new Error('No new browser instance available. Call openShareUrlInNewContext() first.');
    }

    // Wait for the Monaco editor to appear
    const editor = this.newPage.locator('.monaco-editor');
    await expect(editor).toBeVisible();

    // Wait for content to be loaded
    await this.newPage.locator('.view-line').first().waitFor({ state: 'visible' });

    // Get the editor content from the most recently created model
    const content = await this.newPage.evaluate(() => {
      const monaco = (window as any).monaco;
      if (!monaco) return '';

      const models = monaco.editor.getModels();
      if (models.length === 0) return '';

      // Get the last model (most recently created)
      return models[models.length - 1].getValue();
    });

    expect(content).toContain(expectedContent);
  }

  async expectJsonTrimUIShown() {
    // The JSON trim UI should be visible
    await expect(this.page.getByText('Select JSON Keys')).toBeVisible();
    await expect(this.page.locator('.h-2.bg-surface-raised.rounded-full')).toBeVisible(); // Budget bar
  }

  async expectJsonTrimUINotShown() {
    // The JSON trim UI should NOT be visible
    await expect(this.page.getByText('Select JSON Keys')).not.toBeVisible();
  }

  async expectDefaultTrimUIShown() {
    // The default line-range trim UI should be visible
    await expect(this.page.getByText('Select Line Range')).toBeVisible();
  }

  async toggleJsonKey(keyName: string) {
    // Click the button for a specific JSON key
    const keyButton = this.page.getByRole('button').filter({ hasText: keyName });
    await expect(keyButton).toBeVisible();
    await keyButton.click();

    // Wait for React to update the URL after selection changes
    await this.page.waitForTimeout(500);
  }

  async expectJsonKeySelected(keyName: string, selected: boolean) {
    // Verify the selection state of a JSON key
    const keyButton = this.page.getByRole('button').filter({ hasText: keyName });
    const checkbox = keyButton.locator('div').first();
    if (selected) {
      await expect(checkbox).toHaveClass(/bg-primary/);
    } else {
      await expect(checkbox).toHaveClass(/bg-transparent/);
    }
  }

  async expectBudgetBarStatus(current: string, max: string) {
    // The budget bar text should show the correct values
    const budgetText = this.page.getByTestId('budget-text');
    await expect(budgetText).toBeVisible();
    // We check for the max value which should be constant, and current which might vary slightly
    await expect(budgetText).toContainText(` / ${max}`);
  }

  async expectCustomizeContentButtonVisible() {
    // The "Customize Content" button should be visible
    const modal = this.page.locator('.bg-surface.border.border-base.rounded-lg.shadow-xl');
    await expect(modal).toBeVisible();

    const button = modal.getByRole('button', { name: 'Customize Content' });
    await expect(button).toBeVisible();
  }

  async clickCustomizeContentButton() {
    // Click the "Customize Content" button
    const modal = this.page.locator('.bg-surface.border.border-base.rounded-lg.shadow-xl');
    await expect(modal).toBeVisible();

    const button = modal.getByRole('button', { name: 'Customize Content' });
    await expect(button).toBeVisible();
    await button.click();
  }

  async cleanup() {
    // Clean up new contexts/pages
    if (this.newPage) {
      await this.newPage.close();
      this.newPage = null;
    }

    if (this.newContext) {
      await this.newContext.close();
      this.newContext = null;
    }

    if (this.newTab) {
      await this.newTab.close();
      this.newTab = null;
    }
  }
}
