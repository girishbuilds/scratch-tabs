import { Page, expect, JSHandle } from '@playwright/test';

export class EditorActions {
  constructor(private page: Page) {}

  private async getVisibleEditorInstance(side: 'left' | 'right' = 'left'): Promise<JSHandle> {
    const selector = `[data-editor-pane-side="${side}"] .monaco-editor`;

    await expect(this.page.locator(selector).first()).toBeVisible();

    const handle = await this.page.waitForFunction(
      (cssSelector) => {
        const container = document.querySelector(cssSelector);
        if (!container) return null;

        const allEditors = (window as any).monaco?.editor?.getEditors() || [];

        const targetEditor = allEditors.find((e: any) => {
          const domNode = e.getDomNode();
          return domNode && container.contains(domNode);
        });

        return targetEditor || null;
      },
      selector
    );

    return handle;
  }

  async typeInEditor(content: string) {
    const editorInstance = await this.getVisibleEditorInstance();

    await editorInstance.evaluate((editor, text) => {
      if (!editor || !editor.getModel) {
        throw new Error("Editor instance found but getModel is missing - Editor may have been disposed");
      }

      const model = editor.getModel();
      if (model) {
        const fullRange = model.getFullModelRange();
        model.pushEditOperations([], [{ range: fullRange, text }], () => null);
        editor.pushUndoStop();
      }
    }, content);
  }

  async rightClickEditor() {
    const editorInstance = await this.getVisibleEditorInstance();
    const domNodeHandle = await editorInstance.evaluateHandle((e: any) => e.getDomNode());
    await domNodeHandle.asElement()?.click({ button: 'right' });
  }

  /**
   * Right-click directly on the first line of text so that an existing
   * selection is preserved (Monaco clears the selection when the right-click
   * lands on empty space).
   *
   * The text area is resolved through a locator so that the click always
   * targets the current DOM node, even when the editor was just re-created
   * (for example right after the view was split).
   */
  async rightClickFirstLineOfEditor(side: 'left' | 'right' = 'left') {
    const lines = this.page
      .locator(`[data-editor-pane-side="${side}"] .monaco-editor .view-lines`)
      .first();
    await expect(lines).toBeVisible();

    const box = await lines.boundingBox();
    if (!box) {
      throw new Error('Could not locate the editor text area');
    }

    await this.page.mouse.click(box.x + 10, box.y + 8, { button: 'right' });
  }

  /** Selects the whole content of the editor. */
  async selectAllTextInEditor(side: 'left' | 'right' = 'left') {
    const editorInstance = await this.getVisibleEditorInstance(side);
    await editorInstance.evaluate((e: any) => {
      const model = e.getModel();
      if (!model) return;
      e.setSelection(model.getFullModelRange());
      e.focus();
    });
  }

  /**
   * Runs one of the editor context menu actions directly, bypassing the
   * native context menu (more reliable in headless runs).
   */
  async runEditorContextMenuAction(actionId: string, side: 'left' | 'right' = 'left') {
    const editorInstance = await this.getVisibleEditorInstance(side);
    await editorInstance.evaluate((e: any, id: string) => {
      e.trigger('e2e', id, null);
    }, actionId);
  }

  async doubleClickEditor() {
    const editorInstance = await this.getVisibleEditorInstance();
    const domNodeHandle = await editorInstance.evaluateHandle((e: any) => e.getDomNode());
    await domNodeHandle.asElement()?.dblclick();
  }

  async clickInEditor() {
    const editorInstance = await this.getVisibleEditorInstance();
    const domNodeHandle = await editorInstance.evaluateHandle((e: any) => e.getDomNode());
    await domNodeHandle.asElement()?.click();
  }

  async clickAtLine(lineNumber: number) {
    const editorInstance = await this.getVisibleEditorInstance();
    await editorInstance.evaluate((editor, line) => {
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.revealLine(line);
      editor.focus();
    }, lineNumber);
  }

  async typeText(text: string, side: 'left' | 'right' = 'left') {
    const editorInstance = await this.getVisibleEditorInstance(side);

    await editorInstance.evaluate((editor, newText) => {
      const model = editor.getModel();
      const position = editor.getPosition();
      if (model && position) {
        model.pushEditOperations(
          [],
          [{ range: new (window as any).monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: newText }],
          () => null
        );
        editor.pushUndoStop();
      }
    }, text);
  }

  async pressCtrlZ() {
    const editorInstance = await this.getVisibleEditorInstance();
    await editorInstance.evaluate(editor => {
      editor.trigger('keyboard', 'undo', null);
    });
  }

  async getMonacoEditorContent(): Promise<string> {
    const editorInstance = await this.getVisibleEditorInstance();
    return await editorInstance.evaluate((editor) => editor.getValue() || '');
  }

  // --- Assertion Helpers ---

  async expectEditorContentToEqual(expectedContent: string) {
    // Poll until content matches or timeout
    await expect.poll(async () => {
      return this.getMonacoEditorContent();
    }).toBe(expectedContent);
  }

  async expectEditorContentToContain(text: string) {
    await expect.poll(async () => {
      return this.getMonacoEditorContent();
    }).toContain(text);
  }

  async expectEditorContainsMarkdown() {
    const markdownPatterns = [/^#\s+/m, /\*\*.*\*\*/, /\*.*\*/, /\[.*\]\(.*\)/, /```[\s\S]*```/, /^\s*[-*+]\s+/m];
    await expect.poll(
      async () => {
        const content = await this.getMonacoEditorContent();
        return markdownPatterns.some(pattern => pattern.test(content));
      },
      { message: 'Editor content does not contain markdown syntax' },
    ).toBe(true);
  }

  getRichTextEditor(side: 'left' | 'right' = 'left') {
    return this.page.locator(`[data-editor-pane-side="${side}"] .rich-text-editor`);
  }

  async expectMonacoEditorVisible() {
    await this.getVisibleEditorInstance();
  }

  /** Asserts the floating macro toolbar is visible for the active tab. */
  async expectMacroToolbarVisible() {
    await expect(this.page.getByText('Macro Controls')).toBeVisible();
  }

  async expectFirst10LinesContainJson() {
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n');
    const first10Lines = lines.slice(0, 10).join('\n');
    const jsonPattern = /[{}\[\]"':,]/;
    if (!jsonPattern.test(first10Lines)) {
      throw new Error(`First 10 lines do not contain JSON content. Content: "${first10Lines}"`);
    }
  }

  async expectContentIsSingleLine() {
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n').filter(line => line.trim() !== '');
    expect(lines.length).toBe(1);
  }

  async expectContentIsNotSingleLine() {
    await expect.poll(async () => {
       const content = await this.getMonacoEditorContent();
       const lines = content.split('\n').filter(line => line.trim() !== '');
       return lines.length;
    }).toBeGreaterThan(1);
  }

  async expectEachLineIsValidJson() {
    const content = await this.getMonacoEditorContent();
    const lines = content.split('\n').filter(line => line.trim() !== '');
    for (let i = 0; i < lines.length; i++) {
      try {
        JSON.parse(lines[i]);
      } catch {
        throw new Error(`Line ${i + 1} is not valid JSON: "${lines[i]}"`);
      }
    }
  }

  async expectEditorToBeEmpty() {
    await expect.poll(async () => {
      const content = await this.getMonacoEditorContent();
      return content.trim();
    }).toBe('');
  }

  async expectPreviewIsVisible() {
    const previewPane = this.page.locator('[data-testid="preview-pane"]');
    await expect(previewPane).toBeVisible();
  }

  async expectCursorAtLine(expectedLine: number) {
    await expect.poll(async () => {
      const editorInstance = await this.getVisibleEditorInstance();
      return editorInstance.evaluate(editor => editor.getPosition()?.lineNumber);
    }).toBe(expectedLine);
  }

  async typeInRichTextEditor(text: string, side: 'left' | 'right' = 'left') {
    const tipTapEditor = this.page.locator(`[data-editor-pane-side="${side}"] .ProseMirror`);
    await expect(tipTapEditor).toBeVisible();
    await tipTapEditor.click({ position: { x: 100, y: 120 } });
    await tipTapEditor.type(text);
  }

  async expectRichTextEditorVisible(side: 'left' | 'right' = 'left') {
      const richTextEditor = this.page.locator(`[data-editor-pane-side="${side}"] .rich-text-editor`);
      await expect(richTextEditor).toBeVisible();
  }

  async expectRichTextDateCreatedVisible(side: 'left' | 'right' = 'left') {
      const dateCreated = this.page.locator(`[data-editor-pane-side="${side}"] [data-testid="rich-text-date-created"]`);
      await expect(dateCreated).toBeVisible();
  }

  async expectRichTextDateCreatedContainsText(text: string, side: 'left' | 'right' = 'left') {
      const dateCreated = this.page.locator(`[data-editor-pane-side="${side}"] [data-testid="rich-text-date-created"]`);
      await expect(dateCreated).toContainText(text);
  }

  async expectRichTextEditorContainsText(text: string, side: 'left' | 'right' = 'left') {
      const tipTapEditor = this.page.locator(`[data-editor-pane-side="${side}"] .ProseMirror`);
      await expect(tipTapEditor).toContainText(text);
  }

  async expectRichTextEditorDoesNotContainText(text: string, side: 'left' | 'right' = 'left') {
      const tipTapEditor = this.page.locator(`[data-editor-pane-side="${side}"] .ProseMirror`);
      await expect(tipTapEditor).not.toContainText(text);
  }
}