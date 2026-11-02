import { Page, expect } from '@playwright/test';

export class ScratchDrawerActions {
  constructor(private page: Page) { }

  private get drawer() {
    return this.page.getByTestId('scratch-drawer');
  }

  async openFromToolbar() {
    await this.page.getByTestId('icon-scratch').first().click();
    await expect(this.drawer).toBeVisible();
  }

  async toggleWithShortcut() {
    await this.page.keyboard.press('Control+Shift+Y');
  }

  /**
   * The toggle must appear once per window: in the only pane when not split,
   * and in the right pane (beside the menu) when split.
   */
  async expectToggleInPaneOnly(pane: 'left' | 'right') {
    const toggles = this.page.getByTestId('icon-scratch');
    await expect(toggles).toHaveCount(1);
    const rightPaneLocator = this.page.locator('[data-editor-pane-side="right"]');
    if (pane === 'left') {
      expect(await rightPaneLocator.count()).toBe(0);
      return;
    }
    const toggleBox = await toggles.boundingBox();
    const rightPaneBox = await rightPaneLocator.boundingBox();
    expect(toggleBox).not.toBeNull();
    expect(rightPaneBox).not.toBeNull();
    // The toggle sits above the right pane's editor, so it must be at or past its left edge.
    expect(toggleBox!.x).toBeGreaterThanOrEqual(rightPaneBox!.x);
  }

  async expectDrawerVisible(visible: boolean) {
    if (visible) await expect(this.drawer).toBeVisible();
    else await expect(this.drawer).toHaveCount(0);
  }

  /** Dispatches a real paste event so the capture path matches Cmd+V. */
  async pasteText(text: string) {
    await this.page.getByTestId('scratch-input').evaluate((el, value) => {
      const data = new DataTransfer();
      data.setData('text/plain', value);
      el.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      );
    }, text);
  }

  async expectEntryCount(count: number) {
    await expect(this.page.getByTestId('scratch-entry')).toHaveCount(count);
  }

  async expectMaskCount(count: number) {
    await expect(this.page.getByTestId('scratch-mask')).toHaveCount(count);
  }

  async expectDrawerDoesNotContain(text: string) {
    await expect(this.drawer).not.toContainText(text);
    expect(await this.drawer.innerHTML()).not.toContain(text);
  }

  async expectDrawerContains(text: string) {
    await expect(this.drawer).toContainText(text);
  }

  async revealFirstSecret() {
    await this.page.getByTestId('scratch-reveal').first().click();
  }

  async expectRevealedSecret(value: string) {
    await expect(this.page.getByTestId('scratch-secret-revealed').first()).toHaveText(value);
  }

  async deleteEntryContaining(text: string) {
    const row = this.page.getByTestId('scratch-entry').filter({ hasText: text });
    await row.getByTestId('scratch-delete').click();
    await row.getByTestId('scratch-delete').click();
  }

  async close() {
    await this.page.keyboard.press('Escape');
  }

  async reload() {
    await this.page.reload();
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByText('SCRATCH_TABS')).toBeVisible();
  }

  /**
   * Reads the raw rows straight out of IndexedDB, bypassing the app, and
   * returns everything that is stored as one searchable string.
   */
  async readRawStoredEntries(): Promise<{ count: number; haystack: string }> {
    return this.page.evaluate(
      () =>
        new Promise<{ count: number; haystack: string }>((resolve, reject) => {
          const open = indexedDB.open('ScratchTabsDB');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('scratchEntries', 'readonly');
            const req = tx.objectStore('scratchEntries').getAll();
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
              const rows = req.result as Array<Record<string, unknown>>;
              const haystack = rows
                .map((row) =>
                  Object.values(row)
                    .map((v) =>
                      v instanceof Uint8Array
                        ? new TextDecoder('latin1').decode(v)
                        : String(v),
                    )
                    .join('|'),
                )
                .join('\n');
              open.result.close();
              resolve({ count: rows.length, haystack });
            };
          };
        }),
    );
  }

  async expectNothingReadableAtRest(forbidden: string[], expectedCount: number) {
    const { count, haystack } = await this.readRawStoredEntries();
    expect(count).toBe(expectedCount);
    for (const text of forbidden) expect(haystack).not.toContain(text);
  }
}
