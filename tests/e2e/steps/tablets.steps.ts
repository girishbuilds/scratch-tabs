const { Then, When } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

export { }; // Make this file a module to avoid global scope conflicts

// ============================================================================
// Calculator Tablet Steps
// ============================================================================

Then('I should see a calculator interface', async function () {
  await this.tablets.expectCalculatorInterfaceVisible();
});

When('I click calculator button {string}', async function (buttonText: string) {
  await this.tablets.clickCalculatorButton(buttonText);
});

Then('the calculator display should show {string}', async function (expectedValue: string) {
  await this.tablets.expectCalculatorDisplay(expectedValue);
});

Then('I should see calculator mode selector', async function () {
  await this.tablets.expectCalculatorModeSelectorVisible();
});

Then('I should see number buttons in calculator', async function () {
  await this.tablets.expectCalculatorNumberButtonsVisible();
});

// ============================================================================
// UUID Generator Tablet Steps
// ============================================================================

Then('I should see the UUID generator interface', async function () {
  await this.tablets.expectUuidGeneratorInterfaceVisible();
});

When('I click the generate UUID button', async function () {
  await this.tablets.clickGenerateUuidButton();
});

Then('I should see at least one generated UUID in the list', async function () {
  await this.tablets.expectAtLeastOneUuidVisible();
});

// ============================================================================
// Base64 Tablet Steps
// ============================================================================

Then('I should see the Base64 encoder interface', async function () {
  await this.tablets.expectBase64InterfaceVisible();
});

When('I type {string} into the Base64 input', async function (text: string) {
  await this.tablets.typeIntoBase64Input(text);
});

Then('the Base64 output should contain {string}', async function (expectedText: string) {
  await this.tablets.expectBase64OutputContains(expectedText);
});

// ============================================================================
// Tool Selector Steps
// ============================================================================

When('I click on Base64 tool card in selector', async function () {
  // Wait for the tool selector modal to appear
  const toolSelector = this.page.getByRole('dialog', { name: 'Tool Selector' });
  await expect(toolSelector).toBeVisible();

  // Click on the Base64 tool card
  const toolCard = toolSelector.locator('button').filter({
    has: this.page.locator('span, h3').filter({ hasText: /^Base64$/ })
  }).first();

  await expect(toolCard).toBeVisible();
  await toolCard.click();

  // Wait for the modal to close
  await expect(toolSelector).not.toBeVisible();
});

// ============================================================================
// Password Generator Tablet Steps
// ============================================================================

Then('I should see the password generator interface', async function () {
  await this.tablets.expectPasswordGeneratorInterfaceVisible();
});

Then('I should see a generated password', async function () {
  await this.tablets.expectGeneratedPasswordVisible();
});

When('I click the regenerate password button', async function () {
  await this.tablets.clickRegeneratePasswordButton();
});

Then('I should see a different generated password', async function () {
  await this.tablets.expectDifferentPasswordGenerated();
});

// ============================================================================
// Lorem Ipsum Generator Tablet Steps
// ============================================================================

Then('I should see the lorem ipsum generator interface', async function () {
  await this.tablets.expectLoremIpsumInterfaceVisible();
});

Then('I should see generated lorem ipsum text', async function () {
  await this.tablets.expectLoremIpsumTextVisible();
});

// ============================================================================
// Cron Expression Builder Tablet Steps
// ============================================================================

Then('I should see the cron builder interface', async function () {
  await this.tablets.expectCronBuilderInterfaceVisible();
});

Then('I should see next execution times', async function () {
  await this.tablets.expectNextExecutionTimesVisible();
});

// ============================================================================
// Word Count Tablet Steps
// ============================================================================

Then('I should see the word count interface', async function () {
  await this.tablets.expectWordCountInterfaceVisible();
});

When('I type {string} into the word count input', async function (text: string) {
  await this.tablets.typeIntoWordCountInput(text);
});

Then('the word count should show {string} words', async function (expectedCount: string) {
  await this.tablets.expectWordCountValue(expectedCount);
});

// ============================================================================
// URL Parser Tablet Steps
// ============================================================================

Then('I should see the URL parser interface', async function () {
  await this.tablets.expectUrlParserInterfaceVisible();
});

When('I type {string} into the URL input', async function (url: string) {
  await this.tablets.typeIntoUrlInput(url);
});

Then('the URL parser should show host {string}', async function (expectedHost: string) {
  await this.tablets.expectUrlParserHost(expectedHost);
});

Then('the URL parser should show port {string}', async function (expectedPort: string) {
  await this.tablets.expectUrlParserPort(expectedPort);
});

// ============================================================================
// Checksum Tablet Steps
// ============================================================================

Then('I should see the checksum interface', async function () {
  await this.tablets.expectChecksumInterfaceVisible();
});

When('I type {string} into the checksum text input', async function (text: string) {
  await this.tablets.typeIntoChecksumInput(text);
});

Then('the checksum text input should contain {string}', async function (text: string) {
  await this.tablets.expectChecksumInputValue(text);
});

Then('I should see a calculated hash', async function () {
  await this.tablets.expectCalculatedHashVisible();
});

// ============================================================================
// Colour Palette Tablet Steps
// ============================================================================

Then('I should see the colour palette interface', async function () {
  await this.tablets.expectColourPaletteInterfaceVisible();
});

Then('I should see color swatches', async function () {
  await this.tablets.expectColorSwatchesVisible();
});

// ============================================================================
// Converter Tablet Steps
// ============================================================================

Then('I should see the converter interface', async function () {
  await this.tablets.expectConverterInterfaceVisible();
});

Then('I should see converter section buttons', async function () {
  await this.tablets.expectConverterSectionButtonsVisible();
});

// ============================================================================
// Date & Time Tablet Steps
// ============================================================================

Then('I should see the date time interface', async function () {
  await this.tablets.expectDateTimeInterfaceVisible();
});

Then('I should see current time display', async function () {
  await this.tablets.expectCurrentTimeDisplayVisible();
});

// ============================================================================
// QR Code Generator Tablet Steps
// ============================================================================

Then('I should see the QR code generator interface', async function () {
  await this.tablets.expectQRCodeInterfaceVisible();
});

When('I type {string} into the QR URL input', async function (url: string) {
  await this.tablets.typeIntoQRUrlInput(url);
});

Then('I should see a QR code preview', async function () {
  await this.tablets.expectQRCodePreviewVisible();
});

Then('I should see QR code action buttons', async function () {
  await this.tablets.expectQRCodeActionButtonsVisible();
});

// ============================================================================
// TOTP 2FA Generator Tablet Steps
// ============================================================================

Then('I should see the TOTP generator interface', async function () {
  await this.tablets.expectTotpInterfaceVisible();
});

When('I click the add account button', async function () {
  await this.tablets.clickTotpAddAccountButton();
});

When('I switch to the manual entry tab', async function () {
  await this.tablets.clickTotpManualEntryTab();
});

When('I fill in the TOTP account with label {string} and secret {string}', async function (label: string, secret: string) {
  await this.tablets.fillTotpAccountForm(label, secret);
});

When('I save the TOTP account', async function () {
  await this.tablets.saveTotpAccount();
});

Then('I should see a {int}-digit TOTP code', async function (digits: number) {
  await this.tablets.expectTotpCodeVisible(digits);
});

Then('I should see a countdown timer', async function () {
  await this.tablets.expectTotpCountdownVisible();
});

// ============================================================================
// Hex Viewer Tablet Steps
// ============================================================================

Then('I should see the hex viewer interface', async function () {
  await this.tablets.expectHexViewerInterfaceVisible();
});

When('I type {string} into the hex viewer raw input', async function (text: string) {
  await this.tablets.typeIntoHexViewerRawInput(text);
});

Then('I should see hex bytes in the hex grid', async function () {
  await this.tablets.expectHexGridVisible();
});

// ============================================================================
// Secret Scanner Tablet Steps
// ============================================================================

Then('I should see the secret scanner interface', async function () {
  await this.tablets.expectSecretScannerInterfaceVisible();
});

When('I type {string} into the secret scanner input', async function (text: string) {
  await this.tablets.typeIntoSecretScannerInput(text);
});

When('I click the scan button', async function () {
  await this.tablets.clickScanButton();
});

Then('I should see at least one secret finding', async function () {
  await this.tablets.expectAtLeastOneSecretFinding();
});

Then('the redaction preview should contain {string}', async function (text: string) {
  await this.tablets.expectRedactionPreviewContains(text);
});

// ============================================================================
// Webhook HMAC Verifier Tablet Steps
// ============================================================================

Then('I should see the webhook HMAC verifier interface', async function () {
  await this.tablets.expectWebhookHmacInterfaceVisible();
});

When('I fill the webhook HMAC verifier with a valid GitHub sample', async function () {
  await this.tablets.fillWebhookHmacGithubSample();
});

When('I click the webhook HMAC verify button', async function () {
  await this.tablets.clickWebhookHmacVerifyButton();
});

Then('the webhook HMAC verification should pass', async function () {
  await this.tablets.expectWebhookHmacVerificationPass();
});

// ============================================================================
// Emoji as Data Tablet Steps
// ============================================================================

Then('I should see the emoji picker interface', async function () {
  await this.tablets.expectEmojiPickerInterfaceVisible();
});

Then('I should see emoji grid', async function () {
  await this.tablets.expectEmojiGridVisible();
});
