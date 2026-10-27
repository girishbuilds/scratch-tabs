import { Page, expect } from '@playwright/test';

/**
 * TabletsActions - Encapsulates tablet-specific interactions
 *
 * Provides helpers for interacting with different tablets (Calculator, UUID, Base64, etc.)
 */
export class TabletsActions {
  constructor(private page: Page) { }

  // ============================================================================
  // Calculator Tablet
  // ============================================================================

  /**
   * Check if calculator interface is visible
   */
  async expectCalculatorInterfaceVisible() {
    // Look for calculator-specific elements (display, buttons)
    const calculatorDisplay = this.page.locator('[data-testid*="calculator"], .calculator, [class*="calculator"]').first();
    await expect(calculatorDisplay).toBeVisible();
  }

  /**
   * Click a calculator button
   * @param buttonText - The text on the button to click (e.g., "5", "+", "=")
   */
  async clickCalculatorButton(buttonText: string) {
    // Calculator buttons are typically text-based buttons
    const button = this.page.getByRole('button', { name: buttonText, exact: true });
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Get the calculator display value
   */
  async getCalculatorDisplayValue(): Promise<string> {
    // The display is typically a div or input with the result
    // Try multiple selectors to find the display
    const displaySelectors = [
      '[data-testid*="display"]',
      '[class*="display"]',
      'input[readonly]',
      '.calculator-display'
    ];

    for (const selector of displaySelectors) {
      const display = this.page.locator(selector).first();
      if (await display.isVisible().catch(() => false)) {
        const value = await display.textContent() || await display.inputValue();
        return value.trim();
      }
    }

    throw new Error('Calculator display not found');
  }

  /**
   * Expect calculator display to show a specific value
   * @param expectedValue - The expected value on the display
   */
  async expectCalculatorDisplay(expectedValue: string) {
    const actualValue = await this.getCalculatorDisplayValue();
    expect(actualValue).toBe(expectedValue);
  }

  /**
   * Check if calculator mode selector is visible
   */
  async expectCalculatorModeSelectorVisible() {
    // Look for mode buttons (Standard, Scientific, Programmer)
    const modeButton = this.page.getByRole('button', { name: /Standard|Scientific|Programmer/i }).first();
    await expect(modeButton).toBeVisible();
  }

  /**
   * Check if calculator has number buttons
   */
  async expectCalculatorNumberButtonsVisible() {
    // Check if number buttons 0-9 are visible
    const numberButtons = this.page.getByRole('button', { name: /^[0-9]$/ });
    const count = await numberButtons.count();
    expect(count).toBeGreaterThan(0);
  }

  // ============================================================================
  // UUID Generator Tablet
  // ============================================================================

  /**
   * Check if UUID generator interface is visible
   */
  async expectUuidGeneratorInterfaceVisible() {
    // Look for UUID-specific heading or generate button
    const heading = this.page.getByRole('heading', { name: /UUID Generator/i });
    await expect(heading).toBeVisible();
  }

  /**
   * Click the generate UUID button
   */
  async clickGenerateUuidButton() {
    // Look for button with "Generate" text
    const button = this.page.getByRole('button', { name: /Generate.*UUID/i });
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Check if at least one UUID is visible in the list
   */
  async expectAtLeastOneUuidVisible() {
    // UUIDs are typically displayed in a list or grid
    // Look for elements containing UUID pattern (8-4-4-4-12 format)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

    // Wait for an element containing a UUID
    await this.page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text);
      }
    );
  }

  // ============================================================================
  // Base64 Tablet
  // ============================================================================

  /**
   * Check if Base64 encoder interface is visible
   */
  async expectBase64InterfaceVisible() {
    // Look for Base64-specific elements (mode selector, input/output areas)
    // Check for "Encode" or "Decode" mode buttons
    const encodeButton = this.page.getByRole('button', { name: /encode/i }).first();
    await expect(encodeButton).toBeVisible();
  }

  /**
   * Type text into the Base64 input field
   * @param text - The text to encode
   */
  async typeIntoBase64Input(text: string) {
    // Find the input textarea - typically has placeholder "Enter text to encode..."
    const input = this.page.getByPlaceholder(/Enter text to encode/i);
    await expect(input).toBeVisible();
    await input.fill(text);
  }

  /**
   * Get the Base64 output value
   */
  async getBase64OutputValue(): Promise<string> {
    // Output is typically in a textarea or pre element
    const outputSelectors = [
      '[data-testid*="output"]',
      'textarea:not([placeholder*="encode"])',
      'pre',
      '[class*="output"]'
    ];

    for (const selector of outputSelectors) {
      const output = this.page.locator(selector).last();
      if (await output.isVisible().catch(() => false)) {
        const value = await output.textContent() || await output.inputValue();
        return value.trim();
      }
    }

    throw new Error('Base64 output not found');
  }

  /**
   * Check if Base64 output contains expected text
   * @param expectedText - The expected encoded text
   */
  async expectBase64OutputContains(expectedText: string) {
    const actualValue = await this.getBase64OutputValue();
    expect(actualValue).toContain(expectedText);
  }

  // ============================================================================
  // Password Generator Tablet
  // ============================================================================

  private lastPasswordValue: string = '';

  /**
   * Check if password generator interface is visible
   */
  async expectPasswordGeneratorInterfaceVisible() {
    // Look for the password generator heading or mode toggle
    const modeButton = this.page.getByRole('button', { name: /Password|Passphrase/i }).first();
    await expect(modeButton).toBeVisible();
  }

  /**
   * Check if a generated password is visible and store it
   */
  async expectGeneratedPasswordVisible() {
    // Password is displayed in an input with placeholder "Generated password (editable)"
    const passwordInput = this.page.getByPlaceholder(/Generated password/i);
    await expect(passwordInput).toBeVisible();

    // Wait for the password to be generated (non-empty value)
    await expect(async () => {
      this.lastPasswordValue = await passwordInput.inputValue();
      expect(this.lastPasswordValue.length).toBeGreaterThan(0);
    }).toPass();
  }

  /**
   * Click the regenerate password button
   */
  async clickRegeneratePasswordButton() {
    // The regenerate button has title "Regenerate"
    const regenerateButton = this.page.locator('button[title="Regenerate"]');
    await expect(regenerateButton).toBeVisible();
    await regenerateButton.click();
  }

  /**
   * Check that a different password was generated
   */
  async expectDifferentPasswordGenerated() {
    const passwordInput = this.page.getByPlaceholder(/Generated password/i);
    await expect(passwordInput).toBeVisible();

    // Wait for the password to change
    await expect(async () => {
      const newPassword = await passwordInput.inputValue();
      expect(newPassword).not.toBe(this.lastPasswordValue);
    }).toPass();
  }

  // ============================================================================
  // Lorem Ipsum Generator Tablet
  // ============================================================================

  /**
   * Check if lorem ipsum generator interface is visible
   */
  async expectLoremIpsumInterfaceVisible() {
    // Look for mode selection buttons (Text, HTML, Markdown, JSON)
    const modeButton = this.page.getByRole('button', { name: /^Text$|^HTML$|^Markdown$/i }).first();
    await expect(modeButton).toBeVisible();
  }

  /**
   * Check if generated lorem ipsum text is visible
   */
  async expectLoremIpsumTextVisible() {
    // Look for content area with generated text (contains "Lorem" or paragraphs)
    await this.page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        // Check for common lorem ipsum patterns or generated content area
        return text.includes('Lorem') || text.includes('ipsum') ||
               document.querySelector('[class*="output"]') !== null;
      }
    );
  }

  // ============================================================================
  // Cron Expression Builder Tablet
  // ============================================================================

  /**
   * Check if cron builder interface is visible
   */
  async expectCronBuilderInterfaceVisible() {
    // Look for dialect selector or tab navigation
    const dialectSelector = this.page.getByRole('combobox').first();
    const tabButton = this.page.getByRole('tab').first();

    const isDialectVisible = await dialectSelector.isVisible().catch(() => false);
    const isTabVisible = await tabButton.isVisible().catch(() => false);

    expect(isDialectVisible || isTabVisible).toBe(true);
  }

  /**
   * Check if next execution times are visible
   */
  async expectNextExecutionTimesVisible() {
    // Execution times are typically displayed in a list
    // Look for elements containing time patterns (HH:MM or dates)
    await this.page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        // Check for time patterns or "Next" execution text
        return /\d{1,2}:\d{2}/.test(text) || text.includes('Next');
      }
    );
  }

  // ============================================================================
  // Word Count Tablet
  // ============================================================================

  /**
   * Check if word count interface is visible
   */
  async expectWordCountInterfaceVisible() {
    // Look for the word count heading in the header
    const heading = this.page.getByRole('heading', { name: /Word Count/i });
    await expect(heading).toBeVisible();
  }

  /**
   * Type text into word count input
   * @param text - The text to type
   */
  async typeIntoWordCountInput(text: string) {
    // Word Count uses Monaco Editor - click on it first to focus
    const monacoEditor = this.page.locator('.monaco-editor').first();
    await expect(monacoEditor).toBeVisible();

    // Click to focus the editor
    await monacoEditor.click();

    // Type the text using keyboard
    await this.page.keyboard.type(text);
  }

  /**
   * Expect word count to show specific value
   * @param expectedCount - The expected word count
   */
  async expectWordCountValue(expectedCount: string) {
    // After typing text, the WordCountDisplay should show stats
    // The stats appear in "Core Counts" section with format like "Words" : "6"
    // Wait for the stats to appear and show the correct count
    await expect(async () => {
      // Look for the word count in the page text
      const pageContent = await this.page.textContent('body');
      // The value appears in a font-mono span after "Words"
      expect(pageContent).toContain(expectedCount);
    }).toPass();
  }

  // ============================================================================
  // URL Parser Tablet
  // ============================================================================

  /**
   * Check if URL parser interface is visible
   */
  async expectUrlParserInterfaceVisible() {
    // Look for URL input field or component labels
    const urlInput = this.page.locator('input[type="text"], input[type="url"]').first();
    await expect(urlInput).toBeVisible();
  }

  /**
   * Type URL into the URL parser input
   * @param url - The URL to parse
   */
  async typeIntoUrlInput(url: string) {
    // Find the URL input by its placeholder
    const urlInput = this.page.getByPlaceholder(/Enter URL/i);
    await expect(urlInput).toBeVisible();

    // Clear existing value and type new URL character by character to trigger React onChange
    await urlInput.click();
    await urlInput.fill('');
    await urlInput.pressSequentially(url, { delay: 5 });

    // Tab out to blur and potentially trigger additional parsing
    await urlInput.press('Tab');
  }

  /**
   * Expect URL parser to show specific host
   * @param expectedHost - The expected host value
   */
  async expectUrlParserHost(expectedHost: string) {
    // The host is shown in a ComponentEditor with label "Host"
    // Find the section containing "Host" label and check its input
    const hostSection = this.page.locator('div.mb-4').filter({ has: this.page.locator('h3:text("Host")') });
    const hostInput = hostSection.locator('input').first();
    await expect(hostInput).toHaveValue(expectedHost);
  }

  /**
   * Expect URL parser to show specific port
   * @param expectedPort - The expected port value
   */
  async expectUrlParserPort(expectedPort: string) {
    // The port is shown in a ComponentEditor with label "Port"
    // Find the section containing "Port" label and check its input
    const portSection = this.page.locator('div.mb-4').filter({ has: this.page.locator('h3:text("Port")') });
    const portInput = portSection.locator('input').first();
    await expect(portInput).toHaveValue(expectedPort);
  }

  // ============================================================================
  // Checksum Tablet
  // ============================================================================

  /**
   * Check if checksum interface is visible
   */
  async expectChecksumInterfaceVisible() {
    // Look for algorithm buttons (MD5, SHA-256, etc.)
    const algorithmButton = this.page.getByRole('button', { name: /MD5|SHA-256|SHA-1/i }).first();
    await expect(algorithmButton).toBeVisible();
  }

  /**
   * Type text into checksum input
   * @param text - The text to hash
   */
  async typeIntoChecksumInput(text: string) {
    const textArea = this.page.locator('textarea').first();
    await expect(textArea).toBeVisible();
    await textArea.fill(text);
  }

  /**
   * Check the checksum text input holds the given text
   */
  async expectChecksumInputValue(text: string) {
    await expect(this.page.locator('textarea').first()).toHaveValue(text);
  }

  /**
   * Check if a calculated hash is visible
   */
  async expectCalculatedHashVisible() {
    // Hashes are hex strings - look for hex pattern
    await this.page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        // Look for hex hash pattern (at least 32 hex chars for MD5)
        return /[0-9a-f]{32,}/i.test(text);
      }
    );
  }

  // ============================================================================
  // Colour Palette Tablet
  // ============================================================================

  /**
   * Check if colour palette interface is visible
   */
  async expectColourPaletteInterfaceVisible() {
    // Look for generate button or palette canvas
    const generateButton = this.page.getByRole('button', { name: /Generate/i });
    const isGenerateVisible = await generateButton.isVisible().catch(() => false);

    // Alternative: look for color-related UI elements
    const colorElement = this.page.locator('[style*="background-color"], [class*="swatch"], [class*="color"]').first();
    const isColorVisible = await colorElement.isVisible().catch(() => false);

    expect(isGenerateVisible || isColorVisible).toBe(true);
  }

  /**
   * Check if color swatches are visible
   */
  async expectColorSwatchesVisible() {
    // Look for elements with background colors (color swatches)
    await this.page.waitForFunction(
      () => {
        // Check for elements that look like color swatches
        const swatches = document.querySelectorAll('[style*="background"], [class*="swatch"], [class*="color"]');
        return swatches.length > 0;
      }
    );
  }

  // ============================================================================
  // Converter Tablet
  // ============================================================================

  /**
   * Check if converter interface is visible
   */
  async expectConverterInterfaceVisible() {
    // Look for converter title or section header
    const heading = this.page.locator('text=/Converter|Encode|Decode|Hash/i').first();
    await expect(heading).toBeVisible();
  }

  /**
   * Check if converter section buttons are visible
   */
  async expectConverterSectionButtonsVisible() {
    // Look for section navigation buttons
    const sectionButtons = this.page.getByRole('button', { name: /Encode|Hash|Number|Text|Date|Color|Network/i });
    const count = await sectionButtons.count();
    expect(count).toBeGreaterThan(0);
  }

  // ============================================================================
  // Date & Time Tablet
  // ============================================================================

  /**
   * Check if date time interface is visible
   */
  async expectDateTimeInterfaceVisible() {
    // Look for date/time related headings or inputs
    const heading = this.page.locator('text=/Date|Time|Timezone/i').first();
    await expect(heading).toBeVisible();
  }

  /**
   * Check if current time display is visible
   */
  async expectCurrentTimeDisplayVisible() {
    // Look for time display (HH:MM format)
    await this.page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        // Check for time pattern
        return /\d{1,2}:\d{2}(:\d{2})?/.test(text);
      }
    );
  }

  // ============================================================================
  // QR Code Generator Tablet
  // ============================================================================

  async expectQRCodeInterfaceVisible() {
    // The Generate/Decode mode tabs are always rendered and unique to this tablet
    const generateTab = this.page.getByRole('button', { name: /Generate/i });
    await expect(generateTab).toBeVisible();
    const decodeTab = this.page.getByRole('button', { name: /Decode/i });
    await expect(decodeTab).toBeVisible();
    // Content-type selector row (URL is always the default)
    const urlTypeBtn = this.page.getByRole('button', { name: /^URL$/i });
    await expect(urlTypeBtn).toBeVisible();
  }

  async typeIntoQRUrlInput(url: string) {
    const input = this.page.getByPlaceholder('https://example.com');
    await expect(input).toBeVisible();
    await input.fill(url);
  }

  async expectQRCodePreviewVisible() {
    // qr-code-styling injects an SVG into the preview container
    const svg = this.page.locator('svg').filter({ has: this.page.locator('rect, path') }).first();
    await expect(svg).toBeVisible({ timeout: 5000 });
  }

  async expectQRCodeActionButtonsVisible() {
    const copyBtn = this.page.getByRole('button', { name: /Copy PNG/i });
    await expect(copyBtn).toBeVisible();
    const pngBtn = this.page.getByRole('button', { name: /^PNG$/i });
    await expect(pngBtn).toBeVisible();
    const svgBtn = this.page.getByRole('button', { name: /^SVG$/i });
    await expect(svgBtn).toBeVisible();
  }

  // ============================================================================
  // TOTP 2FA Generator Tablet
  // ============================================================================

  async expectTotpInterfaceVisible() {
    const codesTab = this.page.getByRole('button', { name: /^Codes$/i });
    await expect(codesTab).toBeVisible();
    const verifyTab = this.page.getByRole('button', { name: /^Verify$/i });
    await expect(verifyTab).toBeVisible();
  }

  async clickTotpAddAccountButton() {
    // Try the header "Add" button first; fall back to the empty-state button
    const headerBtn = this.page.locator('[data-testid="add-account-button"]');
    const emptyBtn = this.page.locator('[data-testid="add-first-account-button"]');

    if (await headerBtn.isVisible().catch(() => false)) {
      await headerBtn.click();
    } else {
      await expect(emptyBtn).toBeVisible();
      await emptyBtn.click();
    }

    // Modal should now be open
    await expect(this.page.getByRole('heading', { name: /Add Account/i })).toBeVisible();
  }

  async clickTotpManualEntryTab() {
    const manualTab = this.page.getByRole('button', { name: /Manual Entry/i });
    await expect(manualTab).toBeVisible();
    await manualTab.click();
  }

  async fillTotpAccountForm(label: string, secret: string) {
    const labelInput = this.page.getByPlaceholder(/GitHub, AWS Console/i);
    await expect(labelInput).toBeVisible();
    await labelInput.fill(label);

    const secretInput = this.page.getByPlaceholder(/Base32 secret/i);
    await expect(secretInput).toBeVisible();
    await secretInput.fill(secret);
  }

  async saveTotpAccount() {
    const saveBtn = this.page.getByRole('button', { name: /Add Account/i }).last();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    // Modal should close
    await expect(this.page.getByRole('heading', { name: /Add Account/i })).not.toBeVisible();
  }

  async expectTotpCodeVisible(digits: number) {
    const codeEl = this.page.locator('[data-testid="totp-code"]').first();
    await expect(codeEl).toBeVisible();
    const text = (await codeEl.textContent() ?? '').replace(/\s/g, '');
    expect(text).toMatch(new RegExp(`^\\d{${digits}}$`));
  }

  async expectTotpCountdownVisible() {
    // The countdown timer renders an SVG ring plus a text label ending in "s"
    const countdownText = this.page.locator('text=/\\d+s/').first();
    await expect(countdownText).toBeVisible();
  }

  // ============================================================================
  // Hex Viewer Tablet
  // ============================================================================

  async expectHexViewerInterfaceVisible() {
    // The toolbar has an Input format selector with "Hex String", "Base64", "Raw Text", "Local File" options
    const inputSelect = this.page.locator('select').filter({ hasText: /Hex String/i });
    await expect(inputSelect).toBeVisible();
  }

  async typeIntoHexViewerRawInput(text: string) {
    // Switch to Raw Text format so the source textarea is available
    const inputSelect = this.page.locator('select').filter({ hasText: /Hex String/i });
    await expect(inputSelect).toBeVisible();
    await inputSelect.selectOption('raw');

    const textarea = this.page.getByPlaceholder(/Enter raw text/i);
    await expect(textarea).toBeVisible();
    await textarea.fill(text);
  }

  async expectHexGridVisible() {
    // Each byte cell has data-testid="byte-{offset}"; presence of byte-0 confirms the grid rendered
    const firstByte = this.page.locator('[data-testid="byte-0"]');
    await expect(firstByte).toBeVisible();
  }

  // ============================================================================
  // Secret Scanner Tablet
  // ============================================================================

  async expectSecretScannerInterfaceVisible() {
    const container = this.page.locator('[data-testid="secret-scanner-tablet"]');
    await expect(container).toBeVisible();
    const scanBtn = this.page.getByRole('button', { name: /^Scan$/i });
    await expect(scanBtn).toBeVisible();
  }

  async typeIntoSecretScannerInput(text: string) {
    const input = this.page.locator('[data-testid="secret-scanner-input"]');
    await expect(input).toBeVisible();
    await input.fill(text);
  }

  async clickScanButton() {
    const scanBtn = this.page.getByRole('button', { name: /^Scan$/i });
    await expect(scanBtn).toBeVisible();
    await scanBtn.click();
  }

  async expectAtLeastOneSecretFinding() {
    // FindingsTable rows have a severity badge; wait for at least one to appear
    const severityBadge = this.page.locator('table tbody tr td span').first();
    await expect(severityBadge).toBeVisible();
  }

  async expectRedactionPreviewContains(text: string) {
    const redactedTab = this.page.getByRole('button', { name: /^Redacted$/i });
    await expect(redactedTab).toBeEnabled();
    await redactedTab.click();

    const preview = this.page.locator('[data-testid="secret-scanner-redacted"]');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(text);
  }

  // ============================================================================
  // Webhook HMAC Verifier Tablet
  // ============================================================================

  async expectWebhookHmacInterfaceVisible() {
    await expect(this.page.locator('[data-testid="webhook-hmac-tablet"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="webhook-provider-select"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="webhook-secret-input"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="webhook-headers-input"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="webhook-body-input"]')).toBeVisible();
  }

  async fillWebhookHmacGithubSample() {
    await this.page.locator('[data-testid="webhook-provider-select"]').selectOption('github');
    await this.page.locator('[data-testid="webhook-secret-input"]').fill('github_sample_secret');
    await this.page.locator('[data-testid="webhook-headers-input"]').fill([
      'X-GitHub-Event: ping',
      'X-Hub-Signature-256: sha256=b143bbdd7e1c889ac9231cbd1bde5d39e5c5e7bd62a6fdd013baeffe4717c7d4',
      'Content-Type: application/json',
    ].join('\n'));
    await this.page.locator('[data-testid="webhook-body-input"]').fill('{"zen":"Keep it logically awesome."}');
  }

  async clickWebhookHmacVerifyButton() {
    const verifyButton = this.page.locator('[data-testid="webhook-verify-button"]');
    await expect(verifyButton).toBeVisible();
    await verifyButton.click();
  }

  async expectWebhookHmacVerificationPass() {
    const status = this.page.locator('[data-testid="webhook-verification-status"]');
    await expect(status).toContainText('Signature verified');
    await expect(this.page.locator('[data-testid="webhook-computed-signature"]')).not.toContainText('No signature computed');
    await expect(this.page.locator('[data-testid="webhook-received-signature"]')).not.toContainText('No signature parsed');
  }

  // ============================================================================
  // Emoji as Data Tablet
  // ============================================================================

  /**
   * Check if emoji picker interface is visible
   */
  async expectEmojiPickerInterfaceVisible() {
    // Look for search input or category buttons
    const searchInput = this.page.getByPlaceholder(/Search emoji/i);
    const isSearchVisible = await searchInput.isVisible().catch(() => false);

    // Alternative: look for category buttons
    const categoryButton = this.page.getByRole('button', { name: /Smileys|People|Animals|Food/i }).first();
    const isCategoryVisible = await categoryButton.isVisible().catch(() => false);

    expect(isSearchVisible || isCategoryVisible).toBe(true);
  }

  /**
   * Check if emoji grid is visible
   */
  async expectEmojiGridVisible() {
    // Look for emoji characters in the grid
    await this.page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        // Check for common emoji characters (using unicode ranges)
        return /[\u{1F300}-\u{1F9FF}]/u.test(text);
      }
    );
  }
}
