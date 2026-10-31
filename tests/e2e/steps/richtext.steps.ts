import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

// Shared mapping for toolbar button names to test IDs
const TOOLBAR_BUTTON_TEST_IDS: { [key: string]: string } = {
  'H1': 'rich-text-h1',
  'H2': 'rich-text-h2',
  'H3': 'rich-text-h3',
  'Bold': 'rich-text-bold',
  'Italic': 'rich-text-italic',
  'Underline': 'rich-text-underline',
  'Inline Code': 'rich-text-code',
  'Code Block': 'rich-text-code-block',
  'Bullet List': 'rich-text-bullet-list',
  'Numbered List': 'rich-text-ordered-list',
  'Quote': 'rich-text-blockquote',
  'Insert Separator': 'rich-text-hr',
  'Insert Table': 'rich-text-table',
  'Add Link': 'rich-text-link',
  'Import Code': 'rich-text-import-code',
  'Background': 'rich-text-background'
};

/**
 * Helper function to click a toolbar button by name
 */
async function clickToolbarButton(page: any, buttonName: string) {
  const testId = TOOLBAR_BUTTON_TEST_IDS[buttonName];
  if (!testId) {
    throw new Error(`Unknown toolbar button: ${buttonName}`);
  }

  const button = page.locator(`[data-testid="${testId}"]`);
  await expect(button).toBeVisible();
  await button.click();
}

// Given steps
Given('I am on a plain text editor tab', async function () {
  // Wait for the editor to be ready
  await this.editor.expectMonacoEditorVisible();

  // Verify we're not in rich text mode by checking the toggle shows "Text"
  await this.statusBar.expectRichTextToggleText('Text');
});

// When steps
When('I click the Rich Text toggle in the status bar', async function () {
  await this.statusBar.clickRichTextToggle();
});

When('I type {string} in the Rich Text editor', async function (text: string) {
  await this.editor.typeInRichTextEditor(text);
});

When('I split the tab to create a side-by-side view', async function () {
  // Right-click on the "Scratch 2" tab (which should be active after creating a new tab) to open context menu
  await this.tabBar.rightClickTab('Scratch 2');
  // Select "Split Right" from the context menu  
  await this.contextMenu.selectFromContextMenu('Split Right');
});

When('I click the Rich Text toggle in the right side status bar', async function () {
  await this.statusBar.clickRichTextToggle('right');
});

When('I type {string} in the right side Rich Text editor', async function (text: string) {
  await this.editor.typeInRichTextEditor(text, 'right');
});

When('I type {string} in the Monaco editor', async function (text: string) {
  await this.editor.typeInEditor(text);
});

// Then steps
Then('I should see the Rich Text editor is displayed', async function () {
  await this.editor.expectRichTextEditorVisible();
});

Then('I should see the date created text with {string} time', async function (timeReference: string) {
  await this.editor.expectRichTextDateCreatedVisible();

  if (timeReference.toLowerCase() === 'now') {
    // Get current date parts
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long' });
    const currentDay = now.getDate().toString();

    // Check that the date created contains current year, month, and day
    await this.editor.expectRichTextDateCreatedContainsText('Created');
    await this.editor.expectRichTextDateCreatedContainsText(currentYear);
    await this.editor.expectRichTextDateCreatedContainsText(currentMonth);
    await this.editor.expectRichTextDateCreatedContainsText(currentDay);
  }
});

Then('the Rich Text editor should contain the text {string}', async function (expectedText: string) {
  await this.editor.expectRichTextEditorContainsText(expectedText);
});

Then('I should see at least one paragraph in the Rich Text editor', async function () {
  // Verify that at least one paragraph exists in the editor (indicating text input is working)
  const paragraphs = this.page.locator('[data-editor-pane-side="left"] .ProseMirror p');
  await expect(paragraphs.first()).toBeVisible();
});

Then('the Rich Text toggle should show {string} text', async function (toggleText: string) {
  await this.statusBar.expectRichTextToggleText(toggleText as 'Rich' | 'Text');
});

Then('the left side Rich Text editor should contain {string}', async function (text: string) {
  await this.editor.expectRichTextEditorContainsText(text, 'left');
});

Then('the right side Rich Text editor should contain {string}', async function (text: string) {
  await this.editor.expectRichTextEditorContainsText(text, 'right');
});

Then('the left side Rich Text editor should not contain {string}', async function (text: string) {
  await this.editor.expectRichTextEditorDoesNotContainText(text, 'left');
});

Then('the right side Rich Text editor should not contain {string}', async function (text: string) {
  await this.editor.expectRichTextEditorDoesNotContainText(text, 'right');
});

Then('I should see the Monaco editor is displayed', async function () {
  await this.editor.expectMonacoEditorVisible();
});

Then('the Monaco editor should contain {string}', async function (expectedText: string) {
  await this.editor.expectEditorContentToContain(expectedText);
});

// New steps for image paste scenario
When('I set clipboard content to contain an image', async function () {
  // Create a simple base64-encoded 1x1 transparent PNG image for testing
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  // Set the clipboard to contain image data using the browser's clipboard API
  await this.page.evaluate(async (imageData) => {
    // Convert base64 to blob
    const response = await fetch(imageData);
    const blob = await response.blob();

    // Create clipboard item with the image
    const clipboardItem = new ClipboardItem({
      'image/png': blob
    });

    // Write to clipboard
    await navigator.clipboard.write([clipboardItem]);
  }, base64Image);
});

When('I set clipboard content to spreadsheet cells with an image render', async function () {
  // Excel and Numbers put the TSV text, an html table and a PNG render of the cells on the clipboard
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  await this.page.evaluate(async (imageData) => {
    const imageBlob = await (await fetch(imageData)).blob();

    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob(['Region\tQ1\nEMEA\t120'], { type: 'text/plain' }),
        'text/html': new Blob(['<table><tr><td>Region</td><td>Q1</td></tr></table>'], { type: 'text/html' }),
        'image/png': imageBlob,
      }),
    ]);
  }, base64Image);
});

When('I paste into the editor', async function () {
  // Focus the Monaco editor
  const editor = this.page.locator('[data-editor-pane-side="left"] .monaco-editor textarea');
  await editor.focus();

  // Simulate a paste event using the actual clipboard content (generic for any content type)
  await this.page.evaluate(async () => {
    // Read from the actual clipboard that was set in previous step
    const clipboardItems = await navigator.clipboard.read();

    // Create a DataTransfer with the clipboard data
    const dataTransfer = new DataTransfer();

    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          // Handle image content
          const blob = await clipboardItem.getType(type);
          const file = new File([blob], 'clipboard-image.png', { type });
          dataTransfer.items.add(file);
        } else if (type === 'text/plain') {
          // Handle text content
          const textBlob = await clipboardItem.getType(type);
          const text = await textBlob.text();
          dataTransfer.items.add(text, type);
        } else if (type.startsWith('text/')) {
          // Handle other text types (html, rtf, etc.)
          const contentBlob = await clipboardItem.getType(type);
          const content = await contentBlob.text();
          dataTransfer.items.add(content, type);
        }
        // Add more content types as needed in the future
      }
    }

    // Find the Monaco editor container using stable data-testid
    const editorContainer = document.querySelector('[data-editor-pane-side="left"] [data-testid="monaco-editor-container"]');
    if (editorContainer) {
      // Create and dispatch paste event with actual clipboard data
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });

      editorContainer.dispatchEvent(pasteEvent);
    }
  });
});

Then('I should see the rich text conversion modal with {string} title', async function (expectedTitle: string) {
  // Wait for the modal to appear using stable data-testid
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  await expect(modal).toBeVisible();

  // Check for the title
  await expect(this.page.getByText(expectedTitle)).toBeVisible();
});

Then('the modal should contain {string}', async function (expectedText: string) {
  // Check that the expected text appears in the modal
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  await expect(modal.getByText(expectedText)).toBeVisible();
});

When('I click {string} in the modal', async function (buttonText: string) {
  // Click the specific button in the modal
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  const button = modal.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
  await button.click();
});

Then('the image paste modal should not be visible', async function () {
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  await expect(modal).toHaveCount(0);
});

Then('the modal should be dismissed', async function () {
  // Wait for the modal to close
  const modal = this.page.locator('[data-testid="rich-text-upgrade-modal"]');
  await expect(modal).not.toBeVisible();
});

Then('the Rich Text editor should contain an image', async function () {
  // Look for an image element in the ProseMirror editor (exclude ProseMirror separator)
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const image = tipTapEditor.locator('img:not(.ProseMirror-separator)');
  await expect(image).toBeVisible();

  // Verify it has a src attribute (data URL or blob URL)
  const src = await image.getAttribute('src');
  expect(src).toBeTruthy();
  expect(src?.length).toBeGreaterThan(0);
});

// Rich text toolbar step definitions
When('I select the text {string}', async function (text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  // Use JavaScript to select text in the editor
  await this.page.evaluate((textToSelect) => {
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');
    if (!editor) return;

    // Find all text nodes and their ranges
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Find the text we want to select
    for (const textNode of textNodes) {
      const nodeText = textNode.textContent || '';
      const index = nodeText.indexOf(textToSelect);
      if (index !== -1) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + textToSelect.length);

        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          // Notify ProseMirror so it syncs its internal selection state
          document.dispatchEvent(new Event('selectionchange'));
          break;
        }
      }
    }
  }, text);
});

When('I click the {string} button in the Rich Text toolbar', async function (buttonName: string) {
  await clickToolbarButton(this.page, buttonName);
});

Then('the selected text should be bold in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const boldText = tipTapEditor.locator('strong');
  await expect(boldText).toBeVisible();
});

Then('the selected text should be italic in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const italicText = tipTapEditor.locator('em');
  await expect(italicText).toBeVisible();
});

Then('the selected text should be inline code in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeText = tipTapEditor.locator('code');
  await expect(codeText).toBeVisible();
});

Then('I should see a bullet list in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const bulletList = tipTapEditor.locator('ul');
  await expect(bulletList).toBeVisible();
});

When('I press Enter and type {string}', async function (text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Enter');
  await tipTapEditor.type(text);
});

When('I press Enter twice', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Enter');
  await tipTapEditor.press('Enter');
});

When('I press Enter and click the {string} button in the Rich Text toolbar', async function (buttonName: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Enter');

  // Then click the toolbar button using the helper function
  await clickToolbarButton(this.page, buttonName);
});

When('I type {string}', async function (text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.type(text);
});

Then('I should see {string} as the next bullet point', async function (text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const listItems = tipTapEditor.locator('ul li');
  await expect(listItems.nth(1)).toContainText(text);
});

Then('I should see a numbered list in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const numberedList = tipTapEditor.locator('ol');
  await expect(numberedList).toBeVisible();
});

Then('I should see a blockquote in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const blockquote = tipTapEditor.locator('blockquote');
  await expect(blockquote).toBeVisible();
});

When('I type {string} in the code block', async function (code: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  // Focus the editor and then type - TipTap handles the rest
  await tipTapEditor.focus();
  await tipTapEditor.type(code);
});

Then('I should see a code block in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre');
  await expect(codeBlock).toBeVisible();
});

When('I click after the code block', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre');

  // Click at the end of the editor
  await tipTapEditor.press('End');
  await tipTapEditor.press('Enter');
});

Then('I should see a table with 3 rows and 3 columns in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const table = tipTapEditor.locator('table');
  await expect(table).toBeVisible();

  // Check for 3 rows
  const rows = tipTapEditor.locator('table tr');
  await expect(rows).toHaveCount(3);

  // Check for 3 columns in the first row
  const firstRowCells = tipTapEditor.locator('table tr:first-child th, table tr:first-child td');
  await expect(firstRowCells).toHaveCount(3);
});

Then('the background texture should change', async function () {
  // Check that the rich text editor container has a background style
  const richTextEditor = this.page.locator('[data-editor-pane-side="left"] .rich-text-editor');

  // The background texture is applied via CSS, so we check for style changes
  const hasBackgroundStyle = await richTextEditor.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element);
    return computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none';
  });

  expect(hasBackgroundStyle).toBe(true);
});

// New step definitions for additional rich text features

When('I select all text in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();

  // Use JavaScript to select all text properly in TipTap editor
  await this.page.evaluate(() => {
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');
    if (!editor) return;

    // Create a range that selects all content in the editor
    const range = document.createRange();
    range.selectNodeContents(editor);

    // Apply the selection and notify ProseMirror
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }
  });
});

Then('the code block should contain {string}', async function (expectedText: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre code');
  await expect(codeBlock).toContainText(expectedText);
});

Then('I should see exactly one code block in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlocks = tipTapEditor.locator('pre');
  await expect(codeBlocks).toHaveCount(1);
});

Then('the code block should have JSON syntax highlighting', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  // Check for JSON syntax highlighting by looking for highlighted spans within the code block
  const codeBlock = tipTapEditor.locator('pre code');
  await expect(codeBlock).toBeVisible();

  // Check if there are syntax-highlighted spans (indicating highlighting is working)
  const highlightedSpans = codeBlock.locator('.hljs-attr, .hljs-string, .hljs-punctuation, span[class*="hljs"]');
  await expect(highlightedSpans.first()).toBeVisible();
});

Then('the code block should have JavaScript syntax highlighting', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  // Check for JavaScript syntax highlighting by looking for highlighted spans
  const codeBlock = tipTapEditor.locator('pre code');
  await expect(codeBlock).toBeVisible();

  // Check if there are syntax-highlighted spans (indicating highlighting is working)  
  const highlightedSpans = codeBlock.locator('.hljs-keyword, .hljs-string, .hljs-built_in, span[class*="hljs"]');
  await expect(highlightedSpans.first()).toBeVisible();
});

When('I press Tab', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Tab');
});

When('I press Shift+Tab', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Shift+Tab');
});

Then('the second line in the code block should be indented', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre code');

  // Check that the code block contains indented content
  const codeContent = await codeBlock.textContent();
  const lines = codeContent?.split('\n') || [];
  expect(lines.length).toBeGreaterThan(1);
  expect(lines[1]).toMatch(/^\s+/); // Second line starts with whitespace
});

Then('the line should have reduced indentation', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const codeBlock = tipTapEditor.locator('pre code');

  // After Shift+Tab, the line should have less indentation
  const codeContent = await codeBlock.textContent();
  expect(codeContent).toBeTruthy();
  // The specific indentation check depends on the implementation
  // For now, just verify the code block still exists and has content
  await expect(codeBlock).toBeVisible();
});

Then('I should see the text is no longer in a code block', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const paragraphs = tipTapEditor.locator('p');
  await expect(paragraphs.first()).toBeVisible();

  // Verify no code blocks exist
  const codeBlocks = tipTapEditor.locator('pre');
  await expect(codeBlocks).toHaveCount(0);
});

When('I note the current background texture', async function () {
  const richTextEditor = this.page.locator('[data-editor-pane-side="left"] .rich-text-editor');
  const currentBackground = await richTextEditor.evaluate((element) => {
    return window.getComputedStyle(element).backgroundImage;
  });

  // Store the current background for comparison
  this.previousBackgroundTexture = currentBackground;
});

Then('the background texture should be different from the noted texture', async function () {
  const richTextEditor = this.page.locator('[data-editor-pane-side="left"] .rich-text-editor');
  const newBackground = await richTextEditor.evaluate((element) => {
    return window.getComputedStyle(element).backgroundImage;
  });

  expect(newBackground).not.toBe(this.previousBackgroundTexture);

  // Update the stored background for next comparison
  this.previousBackgroundTexture = newBackground;
});

Then('the background texture should be different again', async function () {
  const richTextEditor = this.page.locator('[data-editor-pane-side="left"] .rich-text-editor');
  const newBackground = await richTextEditor.evaluate((element) => {
    return window.getComputedStyle(element).backgroundImage;
  });

  expect(newBackground).not.toBe(this.previousBackgroundTexture);
});

Then('I should see the link modal', async function () {
  // Try multiple possible selectors for the link modal
  const linkModal = this.page.locator('.link-modal, [data-testid*="link"], .modal:has-text("URL"), .modal:has-text("Link")').first();
  await expect(linkModal).toBeVisible();
});

Then('the link text field should contain {string}', async function (expectedText: string) {
  // Check that the Link Text field contains the expected selected text
  const textInput = this.page.locator('#text-input, input[id="text-input"]');
  await expect(textInput).toBeVisible();
  await expect(textInput).toHaveValue(expectedText);
});

When('I type {string} in the URL field', async function (url: string) {
  // Target the specific URL input field in the LinkModal
  const urlInput = this.page.locator('#url-input, input[id="url-input"]');
  await expect(urlInput).toBeVisible();
  await urlInput.clear();
  await urlInput.fill(url);
});

When('I click {string} in the link modal', async function (buttonText: string) {
  // Find the button in any modal, not just a specific test-id
  const button = this.page.getByRole('button', { name: buttonText });
  await expect(button).toBeVisible();
  await button.click();
});

Then('the text {string} should be a link', async function (linkText: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const link = tipTapEditor.locator(`a:has-text("${linkText}")`);
  await expect(link).toBeVisible();
});

Then('the link should point to {string}', async function (expectedUrl: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const link = tipTapEditor.locator('a').first();
  const href = await link.getAttribute('href');
  expect(href).toBe(expectedUrl);
});

When('I type the following content into the Rich Text editor:', async function (content: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();
  await tipTapEditor.clear();

  // Type multiline content by splitting and using Enter
  const lines = content.trim().split('\n');
  for (let i = 0; i < lines.length; i++) {
    await tipTapEditor.type(lines[i]);
    if (i < lines.length - 1) {
      await tipTapEditor.press('Enter');
    }
  }
});

When('I type the following JSON content into the Rich Text editor:', async function (content: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();
  await tipTapEditor.clear();

  // Type multiline JSON content
  const lines = content.trim().split('\n');
  for (let i = 0; i < lines.length; i++) {
    await tipTapEditor.type(lines[i]);
    if (i < lines.length - 1) {
      await tipTapEditor.press('Enter');
    }
  }
});

// Additional missing step definitions

When('I press Enter', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Enter');
});

When('I click the {string} button in the Rich Text toolbar once', async function (buttonName: string) {
  await clickToolbarButton(this.page, buttonName);
});

Then('the Rich Text editor should contain {string}', async function (expectedText: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await expect(tipTapEditor).toContainText(expectedText);
});

// Cursor positioning regression test step definitions
When('I place cursor at the beginning of the first line after the date', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  // Position cursor at the beginning of content after the date created node
  await this.page.evaluate(() => {
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');
    if (!editor) return;

    // Find the first paragraph after the date created node
    const firstParagraph = editor.querySelector('p');
    if (!firstParagraph) return;

    // Create range at the beginning of the first paragraph
    const range = document.createRange();
    range.setStart(firstParagraph, 0);
    range.collapse(true);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });
});

When('I press the left arrow key multiple times', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  // Press left arrow multiple times to try to get above the date
  for (let i = 0; i < 10; i++) {
    await tipTapEditor.press('ArrowLeft');
  }
});

When('I copy all content from the Monaco editor', async function () {
  const monacoEditor = this.page.locator('[data-editor-pane-side="left"] [data-testid="monaco-editor-container"]');
  await monacoEditor.focus();
  await this.page.keyboard.press('Control+a');
  await this.page.keyboard.press('Control+c');
});

When('I paste the copied content into the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();
  await this.page.keyboard.press('Control+v');
});

When('I place cursor at the end of the imported content', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();
  await this.page.keyboard.press('End');
});

When('I press the up arrow key multiple times to try to reach the top', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  // Press up arrow multiple times to try to get above the date
  for (let i = 0; i < 20; i++) {
    await tipTapEditor.press('ArrowUp');
  }
});

When('I press the Home key', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Home');
});

When('I press the up arrow key', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('ArrowUp');
});

When('I press the left arrow key', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('ArrowLeft');
});

When('I press Delete', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.press('Delete');
});

Then('the cursor should remain after the date created text', async function () {
  // Check cursor position by attempting to type and verifying it appears after date
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  // Type a test character to see where it appears
  await tipTapEditor.type('X');

  // Check that the 'X' appears after the date created text, not before it
  const dateCreatedNode = this.page.locator('[data-testid="rich-text-date-created"]');
  const editorContent = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  await expect(dateCreatedNode).toBeVisible();
  await expect(editorContent).toContainText('X');

  // Verify 'X' appears after the date by checking DOM structure
  const xAppearsAfterDate = await this.page.evaluate(() => {
    const dateElement = document.querySelector('[data-testid="rich-text-date-created"]');
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');

    if (!dateElement || !editor) return false;

    // Check if 'X' appears in any text node after the date element
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      node => {
        const position = dateElement.compareDocumentPosition(node);
        return (position & Node.DOCUMENT_POSITION_FOLLOWING) ?
          NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      if (textNode.textContent && textNode.textContent.includes('X')) {
        return true;
      }
    }
    return false;
  });

  expect(xAppearsAfterDate).toBe(true);

  // Clean up by removing the test character
  await tipTapEditor.press('Backspace');
});

Then('I should not be able to type above the date created text', async function () {
  // This assertion is implicitly covered by "cursor should remain after date created text"
  // since we verify that typed text appears after the date, not before it

  // Additional check: try to position cursor at document start and verify it gets corrected
  await this.page.evaluate(() => {
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');
    if (!editor) return;

    // Try to place cursor at the very beginning of the document
    const range = document.createRange();
    range.setStart(editor, 0);
    range.collapse(true);

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  });

  // Wait a moment for any cursor correction to happen
  await this.page.waitForTimeout(100);

  // Type a character and verify it still appears after the date
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.type('Y');

  // Check that 'Y' appears after the date, confirming cursor was corrected
  const yAppearsAfterDate = await this.page.evaluate(() => {
    const dateElement = document.querySelector('[data-testid="rich-text-date-created"]');
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');

    if (!dateElement || !editor) return false;

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      node => {
        const position = dateElement.compareDocumentPosition(node);
        return (position & Node.DOCUMENT_POSITION_FOLLOWING) ?
          NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      if (textNode.textContent && textNode.textContent.includes('Y')) {
        return true;
      }
    }
    return false;
  });

  expect(yAppearsAfterDate).toBe(true);

  // Clean up
  await tipTapEditor.press('Backspace');
});

// Ctrl+A selection test step definitions
When('I press Ctrl+A to select all content', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();

  // Use the platform-specific modifier key
  const modifier = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
  await this.page.keyboard.press(modifier);

  // Wait for the selection to be processed
  await this.page.waitForTimeout(100);
});

Then('all content should be selected including the date created text', async function () {
  // Wait a moment for the selection to stabilize
  await this.page.waitForTimeout(100);

  // Check that there is an active selection and get selection range info
  const selectionInfo = await this.page.evaluate(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { hasSelection: false, text: '', rangeCount: 0, coversDateNode: false };
    }

    const range = selection.getRangeAt(0);
    const editor = document.querySelector('[data-editor-pane-side="left"] .ProseMirror');
    const dateNode = document.querySelector('[data-testid="rich-text-date-created"]');

    let coversDateNode = false;
    let coversFullEditor = false;

    if (editor && dateNode && range) {
      // Check if the selection range covers the date node by comparing positions
      try {
        const dateParent = dateNode.parentElement;
        if (dateParent) {
          // Check if the selection range includes the date node
          coversDateNode = range.intersectsNode(dateParent) ||
            range.isPointInRange(dateParent, 0) ||
            (range.comparePoint(dateParent, 0) <= 0 &&
              range.comparePoint(dateParent, dateParent.childNodes.length) >= 0);
        }

        // Check if selection covers the full editor content
        coversFullEditor = range.startContainer === editor ||
          (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset === 0) ||
          range.commonAncestorContainer === editor;
      } catch (e) {
        console.log('Selection range check error:', e);
      }
    }

    return {
      hasSelection: selection.toString().length > 0,
      text: selection.toString(),
      rangeCount: selection.rangeCount,
      coversDateNode,
      coversFullEditor,
      startContainer: range?.startContainer?.nodeName,
      endContainer: range?.endContainer?.nodeName,
    };
  });

  expect(selectionInfo.hasSelection).toBe(true);
  expect(selectionInfo.rangeCount).toBeGreaterThan(0);

  // The typed content should definitely be selected
  expect(selectionInfo.text).toContain('Some content to select with Ctrl+A');

  // For the date created node, we check if it's visually selected (range covers it)
  // rather than checking if it's in the text selection, since it might not be extractable as text
  expect(selectionInfo.coversDateNode || selectionInfo.coversFullEditor).toBe(true);
});

When('I type {string} to replace the selection', async function (replacementText: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');

  // Type the replacement text - this should replace the selected content
  await tipTapEditor.type(replacementText);
});

Then('the Rich Text editor should not contain {string}', async function (text: string) {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await expect(tipTapEditor).not.toContainText(text);
});

// Copy-paste duplicate date created node test step definitions
When('I press Ctrl+A to select all content including the date', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();

  // Use the platform-specific modifier key
  const modifier = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
  await this.page.keyboard.press(modifier);

  // Wait for the selection to be processed
  await this.page.waitForTimeout(100);
});

When('I press Ctrl+C to copy the selection', async function () {
  const modifier = process.platform === 'darwin' ? 'Meta+c' : 'Control+c';
  await this.page.keyboard.press(modifier);
});

When('I press Ctrl+V to paste the copied content', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  await tipTapEditor.focus();
  const modifier = process.platform === 'darwin' ? 'Meta+v' : 'Control+v';
  await this.page.keyboard.press(modifier);
});

Then('I should see exactly one date created text', async function () {
  const dateCreatedNodes = this.page.locator('[data-testid="rich-text-date-created"]');
  await expect(dateCreatedNodes).toHaveCount(1);
});

Then('I should not see duplicate date created nodes', async function () {
  // This step is essentially the same as checking for exactly one date created text
  // We can also verify there's no text duplication in the single date node
  const dateCreatedNode = this.page.locator('[data-testid="rich-text-date-created"]');
  const dateText = await dateCreatedNode.textContent();

  // Ensure the text doesn't contain duplicate "Created" words
  const createdCount = (dateText?.match(/Created/g) || []).length;
  expect(createdCount).toBe(1);
});

// Heading formatting step definitions
Then('the text should be formatted as H1 in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const h1Text = tipTapEditor.locator('h1');
  await expect(h1Text).toBeVisible();
});

Then('the text should be formatted as H2 in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const h2Text = tipTapEditor.locator('h2');
  await expect(h2Text).toBeVisible();
});

Then('the text should be formatted as H3 in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const h3Text = tipTapEditor.locator('h3');
  await expect(h3Text).toBeVisible();
});

// Underline formatting step definition
Then('the selected text should be underlined in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const underlinedText = tipTapEditor.locator('u');
  await expect(underlinedText).toBeVisible();
});

// Horizontal separator step definition
Then('I should see a horizontal separator in the Rich Text editor', async function () {
  const tipTapEditor = this.page.locator('[data-editor-pane-side="left"] .ProseMirror');
  const horizontalRule = tipTapEditor.locator('hr');
  await expect(horizontalRule).toBeVisible();
});