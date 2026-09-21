import { Page, expect } from '@playwright/test';

export class NavigationActions {
  constructor(private page: Page) { }

  async navigateToHome() {
    await this.page.goto(process.env.BASE_URL ?? 'http://localhost:5173/');
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByText('SCRATCH_TABS')).toBeVisible();
    await this.waitForPageStabilization();
  }

  async clickButton(buttonText: string) {
    await this.page.getByRole('button', { name: buttonText, exact: true }).click();
  }

  async clickLink(linkText: string) {
    await this.page.getByRole('link', { name: linkText, exact: true }).click();
  }

  async clickIcon(iconName: string, side: 'left' | 'right' = 'left') {
    const iconTestIdMap: { [key: string]: string } = {
      'New tab': 'icon-new-tab'
    };

    const testId = iconTestIdMap[iconName] || `icon-${iconName.toLowerCase().replace(/\s+/g, '-')}`;
    const splitViewExists = await this.page.locator('[data-editor-pane-side="right"]').isVisible();

    let locator;
    if (splitViewExists) {
      locator = this.page.locator(`[data-testid="${testId}"][data-side="${side}"]`);
    } else {
      locator = this.page.locator(`[data-testid="${testId}"]`);
    }

    await expect(locator).toBeVisible();
    await locator.click();
  }

  async createTabFromClipboardMenu(side: "left" | "right" = "left") {
    await this.clickIcon("New tab from clipboard", side);
  }

  async openToolSelectorFromDocumentMenu(side: "left" | "right" = "left") {
    await this.clickIcon("New tools", side);
  }

  async doubleClickOnPage() {
    await this.page.locator('body').dblclick();
  }

  async waitForPageStabilization() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForSeconds(seconds: number) {
    await this.page.waitForTimeout(seconds * 1000);
  }

  async expectUrlContains(expectedUrlPart: string) {
    await expect(this.page).toHaveURL(new RegExp(`.*${expectedUrlPart}.*`));
  }

  async expectTextToExist(text: string) {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  async expectTextToBeVisible(text: string) {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async expectTextToNotBeVisible(text: string) {
    await expect(this.page.getByText(text)).not.toBeVisible();
  }

  async expectElementToBeVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementToNotBeVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async reloadPage() {
    await this.page.reload();
    await this.waitForPageStabilization();
  }

  async refreshPage() {
    await this.reloadPage();
  }

  async goBack() {
    await this.page.goBack();
    await this.waitForPageStabilization();
  }

  async goForward() {
    await this.page.goForward();
    await this.waitForPageStabilization();
  }

  async expectDiffModalToAppear() {
    await expect(this.page.locator('.monaco-diff-editor')).toBeVisible();
  }

  async closeDiffModal() {
    const closeButton = this.page.locator('button[title="Close and Save Changes"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    await expect(this.page.locator('.monaco-diff-editor')).toBeHidden();
    await this.waitForPageStabilization();
  }

  async expectSplitViewMode() {
    await expect(this.page.locator('[data-editor-pane-side="right"]')).toBeVisible();
  }

  async expectLeftPanelContainsTab(tabTitle: string) {
    const tab = this.page.locator(
      `[data-testid="tab-${tabTitle}"][data-side="left"]`,
    );
    await expect(tab).toBeVisible();
  }

  async expectRightPanelContainsTab(tabTitle: string) {
    const tab = this.page.locator(
      `[data-testid="tab-${tabTitle}"][data-side="right"]`,
    );
    await expect(tab).toBeVisible();
  }

  async expectTabContentContains(tabTitle: string, expectedContent: string) {
    await this.page.locator(`[data-testid="tab-${tabTitle}"]`).click();
    const editor = this.page.locator('.monaco-editor');
    await expect(editor).toBeVisible();
    const content = await editor.textContent();
    expect(content).toContain(expectedContent);
  }

  async expectTabExistsOnPage(tabTitle: string) {
    const tab = this.page.locator(`[data-testid="tab-${tabTitle}"]`);
    await expect(tab).toBeVisible();
  }

  async expectTabActiveOnLeftSide(tabTitle: string) {
    const tab = this.page.locator(
      `[data-testid="tab-${tabTitle}"][data-side="left"]`,
    );
    await expect(tab).toBeVisible();
    const activeTab = this.page.locator(
      `[data-testid="tab-${tabTitle}"][data-side="left"][aria-selected="true"]`,
    );
    await expect(activeTab).toBeVisible();
  }

  async expectTabExistsOnRightSide(tabTitle: string) {
    const tab = this.page.locator(
      `[data-testid="tab-${tabTitle}"][data-side="right"]`,
    );
    await expect(tab).toBeVisible();
  }

  async expectDiffModalComparison(tab1: string, tab2: string) {
    const diffModal = this.page.locator('[data-testid="diff-modal"]');
    await expect(diffModal).toBeVisible();
    const comparisonTitle = diffModal.locator(`h2[title="${tab1} ↔ ${tab2}"]`);
    await expect(comparisonTitle).toBeVisible();
    const diffContainer = this.page.locator('.monaco-diff-editor');
    await expect(diffContainer).toBeVisible();
  }

  async expectDiffModalLeftSideContains(content: string) {
    await this.expectDiffModalContains(content, 'left');
  }

  async expectDiffModalRightSideContains(content: string) {
    await this.expectDiffModalContains(content, 'right');
  }

  async expectDiffModalContains(content: string, side: 'left' | 'right') {
    const sideSelector = side === 'left' ? '.editor.original' : '.editor.modified';
    const viewLinesSelector = `[data-testid="diff-editor-container"] ${sideSelector} .view-lines`;

    await expect(this.page.locator(viewLinesSelector)).toBeVisible();

    const normalizedExpected = content.replace(/\s+/g, ' ').trim();

    await expect.poll(async () => {
      const locator = this.page.locator(viewLinesSelector);
      if (!await locator.isVisible()) return "";

      const text = await locator.textContent() || "";
      return text.replace(/\s+/g, ' ').trim();
    }, {
      message: `Expected diff editor (${side}) to contain text "${normalizedExpected}"`
    }).toContain(normalizedExpected);
  }

  async expectLeftPanelContainsTabs(tabList: string) {
    const expectedTabs = tabList.split(',').map(name => name.trim());
    await expect(this.page.locator('[data-editor-pane-side="right"]')).toBeVisible();

    for (const expectedTab of expectedTabs) {
      const tabElement = this.page.locator(`[data-testid="tab-${expectedTab}"]`);
      await expect(tabElement).toBeVisible();
      await expect(tabElement).toHaveAttribute('data-side', 'left');
    }

    const leftSideTabs = this.page.locator('[data-testid^="tab-"][data-side="left"]');
    const leftTabCount = await leftSideTabs.count();
    expect(leftTabCount).toBe(expectedTabs.length);

    for (let i = 0; i < leftTabCount; i++) {
      const tab = leftSideTabs.nth(i);
      const tabTitle = await tab.textContent();
      expect(tabTitle?.trim()).toBe(expectedTabs[i]);
    }
  }

  async expectRightPanelContainsTabs(tabList: string) {
    const expectedTabs = tabList.split(',').map(name => name.trim());
    await expect(this.page.locator('[data-editor-pane-side="right"]')).toBeVisible();

    for (const expectedTab of expectedTabs) {
      const tabElement = this.page.locator(`[data-testid="tab-${expectedTab}"]`);
      await expect(tabElement).toBeVisible();
      await expect(tabElement).toHaveAttribute('data-side', 'right');
    }

    const rightSideTabs = this.page.locator('[data-testid^="tab-"][data-side="right"]');
    const rightTabCount = await rightSideTabs.count();
    expect(rightTabCount).toBe(expectedTabs.length);

    for (let i = 0; i < rightTabCount; i++) {
      const tab = rightSideTabs.nth(i);
      const tabTitle = await tab.textContent();
      expect(tabTitle?.trim()).toBe(expectedTabs[i]);
    }
  }
}
