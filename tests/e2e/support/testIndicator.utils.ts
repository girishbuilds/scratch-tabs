import { expect, Page } from '@playwright/test';

/**
 * Generic function to wait for a test indicator to change.
 *
 * @param page - Playwright page object
 * @param indicatorId - ID of the test indicator element
 * @param attributeName - Name of the attribute to monitor
 * @param preActionValue - Value captured before the triggering action. When
 *   provided, the function waits for the attribute to differ from this value
 *   instead of reading the attribute at call time. This eliminates the race
 *   where a debounce fires between the action completing and this function
 *   reading the "initial" value, which would cause the wait to time out
 *   waiting for a second change that never comes.
 */
export async function waitForTestIndicator(
  page: Page,
  indicatorId: string,
  attributeName: string,
  preActionValue?: string | null,
): Promise<void> {
  const testIndicator = page.locator(`#${indicatorId}`);
  await expect(testIndicator).toBeAttached();

  const baseValue = preActionValue !== undefined
    ? preActionValue
    : await testIndicator.getAttribute(attributeName);

  await expect(testIndicator).not.toHaveAttribute(attributeName, baseValue);
}

/**
 * Wait for save state to complete
 */
export async function waitForSaveIndicator(page: Page): Promise<void> {
  return waitForTestIndicator(page, 'test-save-indicator', 'data-last-save');
}

/**
 * Wait until an autosave has completed that began after this call.
 *
 * The autosave tick that is already in flight when this is called may have snapshotted the stores
 * before the caller's changes, so a single indicator change is not enough. Waiting for two ticks
 * guarantees the second one saw them. Needed before a reload when the change under test (tab
 * layout, split view) is only persisted by the 2.5s autosave. Takes up to ~5s.
 */
export async function waitForFullSaveCycle(page: Page): Promise<void> {
  const indicator = page.locator('#test-save-indicator');
  await expect(indicator).toBeAttached();

  let lastSeen = await indicator.getAttribute('data-last-save');
  for (let tick = 0; tick < 2; tick++) {
    await expect(indicator).not.toHaveAttribute('data-last-save', lastSeen ?? '', { timeout: 10_000 });
    lastSeen = await indicator.getAttribute('data-last-save');
  }
}

/**
 * Wait for cursor position to stabilize.
 *
 * Pass `preActionValue` (the indicator value captured before the cursor-moving
 * action) to avoid a race where the 1 s debounce fires while the browser is
 * busy and before this function reads the "initial" value.
 */
export async function waitForCursorIndicator(page: Page, preActionValue?: string | null): Promise<void> {
  return waitForTestIndicator(page, 'test-cursor-indicator', 'data-last-cursor-save', preActionValue);
}

/**
 * Wait for a cursor save at a specific line number.
 *
 * Uses `data-cursor-line` (written by the app alongside the timestamp) so the
 * wait resolves only when the exact line we clicked was persisted — not when
 * any background cursor debounce fires. Combined with a pre-action timestamp
 * baseline to avoid matching a stale save from a prior step at the same line.
 */
export async function waitForCursorAtLine(
  page: Page,
  lineNumber: number,
  preActionTimestamp?: string | null,
): Promise<void> {
  const indicator = page.locator('#test-cursor-indicator');
  await expect(indicator).toBeAttached();

  await expect.poll(async () => {
    const timestamp = await indicator.getAttribute('data-last-cursor-save');
    const line = await indicator.getAttribute('data-cursor-line');
    const timestampChanged = preActionTimestamp === undefined || timestamp !== preActionTimestamp;
    return timestampChanged && line === lineNumber.toString();
  }, { timeout: 5000 }).toBe(true);
}