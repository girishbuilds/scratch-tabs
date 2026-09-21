import { expect, Page } from '@playwright/test';

export class MergeTabsActions {
  constructor(private page: Page) {}

  private getDialog() {
    return this.page.getByRole('dialog', { name: 'Merge tabs' });
  }

  async expectDialogVisible() {
    await expect(this.getDialog()).toBeVisible();
  }

  async includeTab(tabTitle: string) {
    const checkbox = this.getDialog().getByRole('checkbox', {
      name: `Include ${tabTitle}`,
    });
    await expect(checkbox).toBeVisible();
    await checkbox.check();
  }

  async chooseFormat(formatName: string) {
    const option = this.getDialog().getByRole('radio', {
      name: `Merge as ${formatName}`,
    });
    await expect(option).toBeEnabled();
    await option.check();
  }

  async expectCsvOptions(tabTitles: string[]) {
    const dialog = this.getDialog();
    await expect(dialog.getByText('Header rows', { exact: true })).toBeVisible();
    for (const title of tabTitles) {
      await expect(
        dialog.getByRole('checkbox', { name: `${title} has a header` }),
      ).toBeChecked();
    }
    await expect(
      dialog.getByRole('checkbox', { name: 'Align columns by name' }),
    ).toBeVisible();
  }

  async enableColumnAlignment() {
    await this.getDialog()
      .getByRole('checkbox', { name: 'Align columns by name' })
      .check();
  }

  async setResultTitle(title: string) {
    await this.getDialog().getByLabel('Result title').fill(title);
  }

  async createMergedTab() {
    const button = this.getDialog().getByRole('button', {
      name: 'Create merged tab',
    });
    await expect(button).toBeEnabled();
    await button.click();
    await expect(this.getDialog()).toBeHidden();
  }

  async clickTabOnSide(tabTitle: string, side: 'left' | 'right') {
    const tab = this.page.locator(
      `[data-testid="tab-${tabTitle}"][data-side="${side}"]`,
    );
    await expect(tab).toBeVisible();
    await tab.click();
  }

  async expectEditorContent(
    side: 'left' | 'right',
    expectedContent: string,
  ) {
    const selector = `[data-editor-pane-side="${side}"] .monaco-editor`;
    await expect(this.page.locator(selector).first()).toBeVisible();
    await expect
      .poll(async () =>
        this.page.evaluate((editorSelector) => {
          type BrowserEditor = {
            getDomNode: () => HTMLElement | null;
            getValue: () => string;
          };
          const monacoWindow = window as typeof window & {
            monaco?: { editor?: { getEditors: () => BrowserEditor[] } };
          };
          const container = document.querySelector(editorSelector);
          const editors = monacoWindow.monaco?.editor?.getEditors() ?? [];
          const editor = editors.find((candidate) => {
            const node = candidate.getDomNode();
            return node && container?.contains(node);
          });
          return editor?.getValue() ?? null;
        }, selector),
      )
      .toBe(expectedContent);
  }
}
