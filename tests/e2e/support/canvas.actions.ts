import { expect, Page } from "@playwright/test";
const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

interface BrowserMonacoEditor {
  getDomNode(): HTMLElement | null;
  setValue(value: string): void;
  getModel(): {
    getLineCount(): number;
    getLineMaxColumn(lineNumber: number): number;
  } | null;
  setSelection(selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }): void;
}

interface BrowserMonacoWindow extends Window {
  monaco?: {
    editor: {
      getEditors(): BrowserMonacoEditor[];
    };
  };
}

export class CanvasActions {
  private lastDocumentId: string | null = null;
  private pendingSaveRevision = 0;
  private pendingPaneSaveRevision: Partial<Record<"left" | "right", number>> =
    {};
  private rememberedBounds: Record<
    "x" | "y" | "width" | "height",
    number
  > | null = null;
  private operationBounds: {
    before: Record<"x" | "y" | "width" | "height", number>;
    after: Record<"x" | "y" | "width" | "height", number>;
  } | null = null;
  private duplicatedSourceBounds = new Map<
    string,
    Record<"x" | "y" | "width" | "height", number>
  >();
  private sequentialTraversal: Record<"forward" | "backward", string[]> = {
    forward: [],
    backward: [],
  };
  private exitedCanvasAtBoundary: Record<"forward" | "backward", boolean> = {
    forward: false,
    backward: false,
  };
  private zoomBeforeOffscreenNavigation: string | null = null;
  private keyboardNudgeBounds: Array<{
    before: Record<"x" | "y" | "width" | "height", number>;
    after: Record<"x" | "y" | "width" | "height", number>;
  }> = [];
  private keyboardViewportCommandsCompleted = false;
  private shortcutEditingGuardCompleted = false;
  private openedCodeSource: string | null = null;
  private imageAssetId: string | null = null;
  private tabsBeforeCanvasDrop: string[] = [];
  private knownPasteAnchor: { x: number; y: number } | null = null;
  private canvasClipboardData: Record<string, string> | null = null;
  private searchTargetItemId: string | null = null;

  constructor(private page: Page) {}

  private async primaryShortcut(key: string) {
    const isMac = await this.page.evaluate(() =>
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform),
    );
    return `${isMac ? "Meta" : "Control"}+${key}`;
  }

  async enableFeature() {
    await this.page.goto(process.env.BASE_URL ?? "http://localhost:5173/");
    await expect(this.page.getByText("SCRATCH_TABS")).toBeVisible();
  }

  async useDesktopViewport() {
    await this.page.setViewportSize({ width: 1280, height: 800 });
  }

  async useNarrowViewport() {
    await this.page.setViewportSize({ width: 700, height: 800 });
  }

  async useWideSplitViewport() {
    await this.page.setViewportSize({ width: 1800, height: 900 });
  }

  async createCanvas() {
    const button = this.page.getByTestId("icon-new-canvas").first();
    await expect(button).toBeVisible();
    await button.click();
  }

  async createCanvasWithKeyboard() {
    const button = this.page.getByTestId("icon-new-canvas").first();
    await button.focus();
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
  }

  async createCanvasFromToolSelector() {
    await this.page.getByTestId("icon-new-tools").first().click();
    const selector = this.page.getByRole("dialog", { name: "Tool Selector" });
    await expect(selector).toBeVisible();
    const canvas = selector
      .getByRole("button")
      .filter({ hasText: "Canvas" })
      .first();
    await expect(canvas).toBeVisible();
    await canvas.click();
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
  }

  async createCanvasFromEmptyWorkspace() {
    const scratchClose = this.page
      .getByTestId("tab-Scratch 1")
      .getByRole("button", { name: "Close tab Scratch 1" });
    await expect(scratchClose).toBeVisible();
    await scratchClose.click();

    const welcome = this.page.getByTestId("tab-Welcome");
    await welcome.click();
    await welcome
      .getByRole("button", { name: "Close tab Welcome" })
      .click();
    const confirmation = this.page.getByTestId("confirmation-dialog");
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Confirm" }).click();

    const emptyState = this.page.getByTestId("workspace-empty-state");
    await expect(emptyState).toBeVisible();
    const canvasAction = this.page.getByTestId("new-canvas-action");
    await expect(canvasAction).toBeVisible();
    await canvasAction.click();
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
  }

  async createCanvasFromDirectRoute() {
    const baseUrl = process.env.BASE_URL ?? "http://localhost:5173";
    await this.page.goto(`${baseUrl}/canvas`);
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
    await expect(this.page).toHaveURL(/\/canvas$/);
  }

  async expectPrimaryNewTabStillCreatesText() {
    const newTab = this.page.getByTestId("icon-new-tab").first();
    await newTab.click();
    await expect(
      this.page.locator('[data-testid="tab-Scratch 1"][aria-selected="true"]'),
    ).toBeVisible();
    await expect(this.page.locator(".monaco-editor").first()).toBeVisible();
  }

  private async setActiveEditorContent(
    content: string,
    selectedLine?: number,
  ) {
    await expect(this.page.locator(".monaco-editor").first()).toBeVisible();
    await this.page.evaluate(
      ({ value, line }) => {
        const editors = (
          window as BrowserMonacoWindow
        ).monaco?.editor.getEditors() ?? [];
        const editor =
          editors.find((candidate) => {
            const node = candidate.getDomNode();
            return !!node && node.getClientRects().length > 0;
          }) ?? editors[editors.length - 1];
        if (!editor) throw new Error("Active Monaco editor was not found");
        editor.setValue(value);
        if (line !== undefined) {
          const model = editor.getModel();
          if (!model) throw new Error("Active Monaco model was not found");
          editor.setSelection({
            startLineNumber: line,
            startColumn: 1,
            endLineNumber: line,
            endColumn: model.getLineMaxColumn(line),
          });
        }
      },
      { value: content, line: selectedLine },
    );
  }

  private async openActiveTabContextMenu() {
    const activeTab = this.page
      .locator('[data-testid^="tab-"][aria-selected="true"][data-side="left"]')
      .first();
    await expect(activeTab).toBeVisible();
    await activeTab.click({ button: "right" });
  }

  async expectSendToCanvasDialogVisible() {
    await expect(this.page.getByTestId('send-to-canvas-dialog')).toBeVisible();
  }

  async sendFullTabToNewCanvas() {
    await this.setActiveEditorContent('{"sent":"full tab"}');
    await this.openActiveTabContextMenu();
    await this.page
      .getByRole("button", { name: "Send tab to Canvas...", exact: true })
      .click();
    await this.page.getByTestId("send-to-new-canvas").click();
    await expect(
      this.page.locator('[data-item-type="code"]').filter({
        hasText: '"sent": "full tab"',
      }),
    ).toBeVisible();
  }

  async sendSelectedUrlToExistingCanvas() {
    await this.page.getByTestId("tab-Scratch 1").click();
    await this.setActiveEditorContent(
      "prefix\nhttps://docs.example.com/canvas-selection\nsuffix",
      2,
    );
    await this.openActiveTabContextMenu();
    await this.page
      .getByRole("button", {
        name: "Send selection to Canvas...",
        exact: true,
      })
      .click();
    const dialog = this.page.getByTestId("send-to-canvas-dialog");
    await dialog.getByRole("button", { name: /Canvas 1/ }).click();
    const link = this.page.locator('[data-item-type="link"]').filter({
      hasText: "docs.example.com",
    });
    await expect(link).toBeVisible();
  }

  async sendImageTabToExistingCanvas() {
    await this.page.getByTestId("tab-Scratch 1").click();
    await this.setActiveEditorContent(
      `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`,
    );
    await this.openActiveTabContextMenu();
    await this.page
      .getByRole("button", { name: "Send tab to Canvas...", exact: true })
      .click();
    const dialog = this.page.getByTestId("send-to-canvas-dialog");
    await dialog.getByRole("button", { name: /Canvas 1/ }).click();
    await expect(
      this.page.locator('[data-item-type="image"]').first(),
    ).toBeVisible();
  }

  async expectSentCanvasContentAfterReload() {
    await this.waitForSceneSave();
    await this.page.reload();
    await this.page.getByTestId("tab-Canvas 1").click();
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
    await expect(this.page.locator('[data-item-type="code"]').first()).toBeVisible();
    await expect(this.page.locator('[data-item-type="link"]').first()).toBeVisible();
    await expect(this.page.locator('[data-item-type="image"]').first()).toBeVisible();
  }

  async duplicateCanvasTab(title: string) {
    const tab = this.page.getByTestId(`tab-${title}`);
    await expect(tab).toBeVisible();
    await tab.click({ button: "right" });
    const duplicateMenuItem = this.page
      .getByRole("button", { name: "Duplicate", exact: true })
      .first();
    await expect(duplicateMenuItem).toBeVisible();
    await duplicateMenuItem.click();
    await expect(
      this.page.locator(
        `[data-testid="tab-${title} (Copy)"][aria-selected="true"]`,
      ),
    ).toBeVisible();
  }

  private saveStatus() {
    return this.page.getByTestId("canvas-save-status");
  }

  private textCard() {
    return this.page.locator('[data-item-type="text"]').first();
  }

  private textCardContaining(text: string) {
    return this.page
      .locator('[data-item-type="text"]')
      .filter({ hasText: text });
  }

  private codeCard() {
    return this.page.locator('[data-item-type="code"]').first();
  }

  private imageCard() {
    return this.page.locator('[data-item-type="image"]').first();
  }

  private linkCard() {
    return this.page.locator('[data-item-type="link"]').first();
  }

  private videoCard() {
    return this.page.locator('[data-item-type="video"]').first();
  }

  private async readBounds(card: ReturnType<Page["locator"]>) {
    const readNumber = async (attribute: string) =>
      Number(await card.getAttribute(`data-${attribute}`));
    return {
      x: await readNumber("x"),
      y: await readNumber("y"),
      width: await readNumber("width"),
      height: await readNumber("height"),
    };
  }

  private async areAllCanvasCardsVisible() {
    const canvasBox = await this.page.getByTestId("canvas-flow").boundingBox();
    if (!canvasBox) return false;

    const cards = this.page.locator("[data-item-id]");
    const count = await cards.count();
    for (let index = 0; index < count; index += 1) {
      const cardBox = await cards.nth(index).boundingBox();
      if (
        !cardBox ||
        cardBox.x < canvasBox.x - 1 ||
        cardBox.y < canvasBox.y - 1 ||
        cardBox.x + cardBox.width > canvasBox.x + canvasBox.width + 1 ||
        cardBox.y + cardBox.height > canvasBox.y + canvasBox.height + 1
      ) {
        return false;
      }
    }
    return count > 0;
  }

  private async moveCardBy(text: string, deltaX: number, deltaY: number) {
    const card = this.textCardContaining(text).first();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    await this.page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      box!.x + box!.width / 2 + deltaX,
      box!.y + box!.height / 2 + deltaY,
      { steps: 8 },
    );
    await this.page.mouse.up();
  }

  private async focusedCardName() {
    const label = await this.page
      .locator('[data-item-id][data-focused="true"]')
      .getAttribute("aria-label");
    return label?.replace(/^Text card,?\s*/, "") ?? "";
  }

  private pane(side: "left" | "right") {
    return this.page.locator(`[data-editor-pane-side="${side}"]`);
  }

  private paneSaveStatus(side: "left" | "right") {
    return this.pane(side).getByTestId("canvas-save-status");
  }

  private async markPendingSceneChange() {
    const revision = await this.saveStatus().getAttribute("data-save-revision");
    this.pendingSaveRevision = Number(revision ?? "0");
  }

  async addTextCard(text: string) {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-add-text").click();
    const editor = this.page.getByTestId("canvas-text-editor");
    await expect(editor).toBeVisible();
    await editor.fill(text);
    await editor.press("Control+Enter");
  }

  async addCodeCard(source: string) {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-add-code").click();
    const editor = this.page.getByTestId("canvas-code-editor");
    await expect(editor).toBeVisible();
    await editor.fill(source);
    await editor.press("Control+Enter");
    await expect(this.codeCard()).toHaveAttribute("data-editing", "false");
  }

  private async dispatchTextPaste(text: string) {
    await this.page.getByTestId("canvas-flow").focus();
    await this.page.getByTestId("canvas-flow").evaluate((root, value) => {
      const transfer = new DataTransfer();
      transfer.setData("text/plain", value);
      root.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer,
        }),
      );
    }, text);
  }

  async pastePlainTextAndJson() {
    await this.markPendingSceneChange();
    await this.dispatchTextPaste("A plain pasted note");
    await expect(this.textCardContaining("A plain pasted note")).toBeVisible();
    await this.waitForSceneSave();

    await this.markPendingSceneChange();
    await this.dispatchTextPaste('{"pasted":true}');
    await expect(this.codeCard()).toBeVisible();
    await this.waitForSceneSave();
  }

  async pasteNormalUrl() {
    await this.markPendingSceneChange();
    await this.dispatchTextPaste("https://example.com/docs?mode=offline#intro");
    await expect(this.linkCard()).toHaveAttribute(
      "data-canonical-url",
      "https://example.com/docs?mode=offline",
    );
  }

  async reloadWithLinkedHostUnavailable() {
    await this.page.route("https://example.com/**", (route) => route.abort());
    await this.page.reload();
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
  }

  async expectRestoredLinkAndActions() {
    const card = this.linkCard();
    await expect(card).toHaveAttribute("data-hostname", "example.com");
    await expect(card).toContainText("https://example.com/docs?mode=offline");

    await this.page.evaluate(() => {
      const browserWindow = window as Window & {
        __canvasOpenedUrl?: string;
      };
      browserWindow.open = ((url?: string | URL) => {
        browserWindow.__canvasOpenedUrl = String(url);
        return null;
      }) as typeof window.open;
    });
    await card.getByTestId("canvas-url-open").click();
    expect(
      await this.page.evaluate(
        () =>
          (window as Window & { __canvasOpenedUrl?: string }).__canvasOpenedUrl,
      ),
    ).toBe("https://example.com/docs?mode=offline");

    await card.getByTestId("canvas-url-copy").click();
    await expect(card.getByTestId("canvas-url-copy")).toHaveAccessibleName(
      "Copied URL",
    );
    expect(await this.page.evaluate(() => navigator.clipboard.readText())).toBe(
      "https://example.com/docs?mode=offline",
    );
  }

  async pasteRecognizedAndUnrecognizedVideoUrls() {
    await this.dispatchTextPaste(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    await expect(this.videoCard()).toBeVisible();
    await this.dispatchTextPaste(
      "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    );
    await expect(this.linkCard()).toBeVisible();
  }

  async pasteRecognizedVideoUrl() {
    await this.dispatchTextPaste(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    await expect(this.videoCard()).toHaveAttribute(
      "data-video-provider",
      "youtube",
    );
  }

  async expectVideoClassification() {
    await expect(this.videoCard()).toHaveAttribute(
      "data-video-id",
      "dQw4w9WgXcQ",
    );
    await expect(this.linkCard()).toHaveAttribute(
      "data-hostname",
      "youtube.com.evil.example",
    );
  }

  async expectNoVideoIframe() {
    await expect(
      this.page.getByTestId("canvas-video-iframe"),
    ).not.toBeAttached();
  }

  async playCanvasVideo() {
    await this.videoCard().getByTestId("canvas-video-play").click();
  }

  async expectRestrictedVideoIframe() {
    const iframe = this.page.getByTestId("canvas-video-iframe");
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1",
    );
    await expect(iframe).toHaveAttribute(
      "referrerpolicy",
      "strict-origin-when-cross-origin",
    );
    await expect(iframe).toHaveAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-presentation",
    );
  }

  async stopAndReplayCanvasVideo() {
    await this.videoCard().getByTestId("canvas-video-stop").click();
    await this.expectNoVideoIframe();
    await this.videoCard().getByTestId("canvas-video-play").click();
    await expect(this.page.getByTestId("canvas-video-iframe")).toHaveCount(1);
  }

  async pasteUnsafeUrlScheme() {
    await this.dispatchTextPaste("javascript:alert(1)");
  }

  async expectNoUnsafeLink() {
    await expect(this.linkCard()).toHaveCount(0);
    await expect(this.videoCard()).toHaveCount(0);
    await expect(this.textCardContaining("javascript:alert(1)")).toHaveCount(1);
  }

  async expectPastedTextAndJsonCards() {
    await expect(this.textCardContaining("A plain pasted note")).toHaveCount(1);
    await expect(this.codeCard()).toHaveAttribute("data-language", "json");
    await expect(this.page.getByTestId("canvas-code-preview")).toHaveText(
      '{\n  "pasted": true\n}',
    );
  }

  async dropImageAndCodeFileOnCanvas() {
    await expect(this.page.getByTestId("tab-Canvas 1")).toBeVisible();
    this.tabsBeforeCanvasDrop = await this.page
      .locator('[data-testid^="tab-"][aria-selected]')
      .evaluateAll((tabs) =>
        tabs.map((tab) => tab.getAttribute("data-testid") ?? ""),
      );
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-flow").evaluate((root, pngBase64) => {
      const binary = atob(pngBase64);
      const bytes = Uint8Array.from(binary, (character) =>
        character.charCodeAt(0),
      );
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([bytes], "dropped.png", { type: "image/png" }),
      );
      transfer.items.add(
        new File(["const dropped = true;"], "dropped.js", {
          type: "text/javascript",
        }),
      );
      const bounds = root.getBoundingClientRect();
      root.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
          clientX: bounds.left + 100,
          clientY: bounds.top + 100,
        }),
      );
      root.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
          clientX: bounds.left + 100,
          clientY: bounds.top + 100,
        }),
      );
    }, ONE_PIXEL_PNG_BASE64);
    await expect(this.imageCard()).toHaveAttribute(
      "data-asset-status",
      "ready",
    );
    await expect(this.codeCard()).toBeVisible();
    await this.waitForSceneSave();
  }

  async expectDroppedFilesStayedInCanvas() {
    await expect(this.imageCard()).toHaveCount(1);
    await expect(this.codeCard()).toHaveCount(1);
    await expect(this.page.getByTestId("canvas-code-preview")).toContainText(
      "const dropped = true;",
    );
    const tabsAfterDrop = await this.page
      .locator('[data-testid^="tab-"][aria-selected]')
      .evaluateAll((tabs) =>
        tabs.map((tab) => tab.getAttribute("data-testid") ?? ""),
      );
    expect(tabsAfterDrop).toEqual(this.tabsBeforeCanvasDrop);
  }

  async pasteMultipleInputsAtKnownPointer() {
    const canvas = this.page.getByTestId("canvas-flow");
    const bounds = await canvas.boundingBox();
    expect(bounds).toBeTruthy();
    const clientPoint = { x: bounds!.x + 100, y: bounds!.y + 100 };
    await this.page.mouse.move(clientPoint.x, clientPoint.y);
    const viewport = {
      x: Number(await canvas.getAttribute("data-canvas-viewport-x")),
      y: Number(await canvas.getAttribute("data-canvas-viewport-y")),
      zoom: Number(await canvas.getAttribute("data-canvas-zoom")),
    };
    this.knownPasteAnchor = {
      x: (clientPoint.x - bounds!.x - viewport.x) / viewport.zoom,
      y: (clientPoint.y - bounds!.y - viewport.y) / viewport.zoom,
    };

    await this.markPendingSceneChange();
    await canvas.evaluate((root) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(["select * from users;"], "users.sql", {
          type: "text/plain",
        }),
      );
      transfer.setData("text/plain", "Pointer note");
      root.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer,
        }),
      );
    });
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(2);
    await this.waitForSceneSave();
  }

  async expectKnownPointerPlacement() {
    expect(this.knownPasteAnchor).toBeTruthy();
    const selected = this.page.locator('[data-item-id][aria-selected="true"]');
    const first = await this.readBounds(selected.nth(0));
    const second = await this.readBounds(selected.nth(1));
    expect(first.x).toBeCloseTo(this.knownPasteAnchor!.x, 3);
    expect(first.y).toBeCloseTo(this.knownPasteAnchor!.y, 3);
    expect(second.x).toBeCloseTo(first.x + first.width + 32, 3);
    expect(second.y).toBeCloseTo(first.y, 3);
    await expect(selected.nth(0)).toHaveAttribute("data-item-type", "code");
    await expect(selected.nth(1)).toHaveAttribute("data-item-type", "text");
  }

  async copyCanvasSelection() {
    const canvas = this.page.getByTestId("canvas-flow");
    const copied = await canvas.evaluate((root) => {
      const transfer = new DataTransfer();
      root.dispatchEvent(
        new ClipboardEvent("copy", {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer,
        }),
      );
      return Object.fromEntries(
        Array.from(transfer.types, (type) => [type, transfer.getData(type)]),
      );
    });
    expect(copied["application/x-scratch-tabs-canvas+json"]).toBeTruthy();
    expect(copied["text/plain"]).toContain("Clipboard one");
    await expect(this.page.locator("[data-item-id]")).toHaveCount(2);
  }

  async cutCanvasSelection() {
    const canvas = this.page.getByTestId("canvas-flow");
    await this.markPendingSceneChange();
    this.canvasClipboardData = await canvas.evaluate((root) => {
      const transfer = new DataTransfer();
      root.dispatchEvent(
        new ClipboardEvent("cut", {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer,
        }),
      );
      return Object.fromEntries(
        Array.from(transfer.types, (type) => [type, transfer.getData(type)]),
      );
    });
    await expect(this.page.locator("[data-item-id]")).toHaveCount(0);
  }

  async pasteCanvasSelection() {
    expect(this.canvasClipboardData).toBeTruthy();
    const canvas = this.page.getByTestId("canvas-flow");
    await canvas.evaluate((root, clipboardData) => {
      const transfer = new DataTransfer();
      Object.entries(clipboardData!).forEach(([type, value]) =>
        transfer.setData(type, value),
      );
      root.dispatchEvent(
        new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: transfer,
        }),
      );
    }, this.canvasClipboardData);
    await expect(this.page.locator("[data-item-id]")).toHaveCount(2);
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(2);
  }

  async pasteNativelyWhileEditingCanvasCard() {
    const card = this.textCardContaining("Clipboard one").first();
    await card.dblclick();
    const editor = this.page.getByTestId("canvas-text-editor");
    await expect(editor).toBeFocused();
    await this.page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await this.page.evaluate(() =>
      navigator.clipboard.writeText(" native paste"),
    );
    await editor.press("End");
    await editor.press(await this.primaryShortcut("v"));
    await expect(editor).toHaveValue("Clipboard one native paste");
  }

  async addImageCard() {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-image-input").setInputFiles({
      name: "architecture.png",
      mimeType: "image/png",
      buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, "base64"),
    });
    const card = this.imageCard();
    const error = this.page.getByTestId("canvas-image-error");
    await expect(card.or(error)).toBeVisible();
    if (await error.isVisible()) {
      throw new Error(
        `Canvas rejected the test image: ${await error.textContent()}`,
      );
    }
    await expect(card).toHaveAttribute("data-asset-status", "ready");
    this.imageAssetId = await card.getAttribute("data-asset-id");
    expect(this.imageAssetId).toBeTruthy();
  }

  private async openGlobalSearch() {
    await this.page.keyboard.press(await this.primaryShortcut("Shift+F"));
    const dialog = this.page.getByRole("dialog", { name: "Find in Tabs" });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  private async searchCanvas(term: string) {
    const dialog = await this.openGlobalSearch();
    await dialog.getByPlaceholder("Search...").fill(term);
    return dialog;
  }

  private async closeGlobalSearch() {
    const dialog = this.page.getByRole("dialog", { name: "Find in Tabs" });
    await dialog.getByRole("button", { name: "Close modal" }).click();
    await expect(dialog).not.toBeAttached();
  }

  async createSearchableCanvasCards() {
    await this.addTextCard("release planning note");
    await this.waitForSceneSave();
    await this.addCodeCard('const searchToken = "indexed-code";');
    await this.waitForSceneSave();
    await this.addImageCard();
    await this.waitForSceneSave();
    await this.pasteNormalUrl();
    await this.waitForSceneSave();
    await this.pasteRecognizedVideoUrl();
    await this.waitForSceneSave();
  }

  async expectEveryCanvasCardTypeIsSearchable() {
    const cases = [
      ["planning", "Text card"],
      ["indexed-code", "Code card"],
      ["architecture.png", "Image card"],
      ["example.com", "Link card"],
      ["youtube", "Video card"],
    ] as const;

    for (const [term, label] of cases) {
      const dialog = await this.searchCanvas(term);
      const result = dialog
        .locator('[data-testid^="canvas-search-result-"]')
        .filter({ hasText: label })
        .first();
      await expect(result).toBeVisible();
      await this.closeGlobalSearch();
    }
  }

  async placeSearchTargetOffscreen() {
    await this.addTextCard("offscreen search target");
    await this.waitForSceneSave();
    const card = this.textCardContaining("offscreen search target").first();
    this.searchTargetItemId = await card.getAttribute("data-item-id");
    expect(this.searchTargetItemId).toBeTruthy();
    const documentId = await this.page
      .getByTestId("canvas-flow")
      .getAttribute("data-canvas-document-id");
    expect(documentId).toBeTruthy();

    await this.page.evaluate(async ({ itemId, documentId }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const transaction = database.transaction(
          "canvasDocuments",
          "readwrite",
        );
        const store = transaction.objectStore("canvasDocuments");
        const document = await new Promise<Record<string, unknown>>(
          (resolve, reject) => {
            const request = store.get(documentId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          },
        );
        const items = (document.items as Array<Record<string, unknown>>).map(
          (item) =>
            item.id === itemId ? { ...item, x: 5_000, y: 4_000 } : item,
        );
        store.put({ ...document, items });
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    }, { itemId: this.searchTargetItemId, documentId });
    await this.page.reload();
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
  }

  async activateOffscreenCanvasSearchResult() {
    const dialog = await this.searchCanvas("offscreen search target");
    const result = dialog.getByTestId(
      `canvas-search-result-${this.searchTargetItemId}`,
    );
    await expect(result).toBeVisible();
    await result.dblclick();
    await expect(dialog).not.toBeAttached();
  }

  async expectSearchTargetVisibleSelectedAndFocused() {
    const itemId = this.searchTargetItemId;
    expect(itemId).toBeTruthy();
    const canvas = this.page.getByTestId("canvas-flow");
    const card = this.page.getByTestId(`canvas-item-${itemId}`);
    await expect(card).toHaveAttribute("aria-selected", "true");
    await expect(card).toHaveAttribute("data-focused", "true");
    await expect(card).toBeFocused();
    await expect
      .poll(async () => {
        const [canvasBox, cardBox] = await Promise.all([
          canvas.boundingBox(),
          card.boundingBox(),
        ]);
        if (!canvasBox || !cardBox) return false;
        return (
          cardBox.x >= canvasBox.x &&
          cardBox.y >= canvasBox.y &&
          cardBox.x + cardBox.width <= canvasBox.x + canvasBox.width &&
          cardBox.y + cardBox.height <= canvasBox.y + canvasBox.height
        );
      })
      .toBe(true);
  }

  async changeAndDeleteIndexedCanvasContent() {
    await this.addTextCard("stale edited value");
    await this.waitForSceneSave();
    await this.addTextCard("stale deleted value");
    await this.waitForSceneSave();

    const edited = this.textCardContaining("stale edited value").first();
    await edited.dblclick();
    await this.markPendingSceneChange();
    const editor = this.page.getByTestId("canvas-text-editor");
    await editor.fill("fresh replacement value");
    await editor.press("Control+Enter");
    await this.waitForSceneSave();

    const deleted = this.textCardContaining("stale deleted value").first();
    await deleted.click();
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-delete-selection").click();
    await this.waitForSceneSave();
  }

  async expectStaleCanvasSearchResultsRemoved() {
    const dialog = await this.searchCanvas("stale");
    await expect(dialog.getByText("No results found.").first()).toBeVisible();
    await expect(
      dialog.locator('[data-testid^="canvas-search-result-"]'),
    ).toHaveCount(0);
  }

  async seedAnotherWorkspaceCanvasAndTrackAssetReads() {
    await this.page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const now = Date.now();
        const workspaceId = "canvas-search-workspace";
        const tabId = "canvas-search-tab";
        const documentId = "canvas-search-document";
        const transaction = database.transaction(
          ["workspaces", "tabs", "canvasDocuments"],
          "readwrite",
        );
        transaction.objectStore("workspaces").put({
          id: workspaceId,
          name: "Search Workspace",
          links: [],
          createdAt: now,
          lastAccessed: now,
        });
        transaction.objectStore("tabs").put({
          id: tabId,
          title: "Remote Canvas",
          content: "",
          language: "plaintext",
          languageLocked: true,
          contentKind: "canvas",
          documentId,
          lastModified: now,
          lastAccessed: now,
          dateCreated: now,
          workspaceId,
        });
        transaction.objectStore("canvasDocuments").put({
          id: documentId,
          tabId,
          workspaceId,
          schemaVersion: 1,
          revision: 1,
          items: [
            {
              id: "remote-item",
              type: "text",
              x: 0,
              y: 0,
              width: 280,
              height: 180,
              zIndex: 1,
              createdAt: now,
              updatedAt: now,
              text: "remote metadata needle",
            },
          ],
          edges: [],
          settings: { background: "dots", snapToGrid: false },
          searchText: "remote metadata needle",
          createdAt: now,
          updatedAt: now,
        });
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }

      const browserWindow = window as Window & {
        __canvasAssetReadCount?: number;
      };
      browserWindow.__canvasAssetReadCount = 0;
      const originalGet = IDBObjectStore.prototype.get;
      const originalGetAll = IDBObjectStore.prototype.getAll;
      const originalOpenCursor = IDBObjectStore.prototype.openCursor;
      IDBObjectStore.prototype.get = function (...args) {
        if (this.name === "canvasAssets") browserWindow.__canvasAssetReadCount! += 1;
        return originalGet.apply(this, args);
      };
      IDBObjectStore.prototype.getAll = function (...args) {
        if (this.name === "canvasAssets") browserWindow.__canvasAssetReadCount! += 1;
        return originalGetAll.apply(this, args);
      };
      IDBObjectStore.prototype.openCursor = function (...args) {
        if (this.name === "canvasAssets") browserWindow.__canvasAssetReadCount! += 1;
        return originalOpenCursor.apply(this, args);
      };
    });
  }

  async searchAllWorkspacesForRemoteCanvas() {
    const dialog = await this.openGlobalSearch();
    await dialog.locator("select").selectOption("allWorkspaces");
    await dialog.getByPlaceholder("Search...").fill("remote metadata needle");
    await expect(
      dialog
        .locator('[data-testid^="canvas-search-result-"]')
        .filter({ hasText: "Remote Canvas" }),
    ).toBeVisible();
  }

  async expectNoCanvasAssetsReadBySearch() {
    await expect
      .poll(() =>
        this.page.evaluate(
          () =>
            (
              window as Window & { __canvasAssetReadCount?: number }
            ).__canvasAssetReadCount ?? -1,
        ),
      )
      .toBe(0);
  }

  async replaceImageCard() {
    const card = this.imageCard();
    const previousAssetId = await card.getAttribute("data-asset-id");
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-image-replace-input").setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, "base64"),
    });
    await expect
      .poll(() => card.getAttribute("data-asset-id"))
      .not.toBe(previousAssetId);
    await this.waitForSceneSave();
    this.imageAssetId = await card.getAttribute("data-asset-id");
  }

  async copyImageCard() {
    const copyButton = this.page.getByTestId("canvas-image-copy");
    await expect(copyButton).toHaveAccessibleName("Copy image");
    await copyButton.click();
  }

  async expectImageCopyFeedback() {
    const copyButton = this.page.getByTestId("canvas-image-copy");
    await expect(copyButton).toHaveAccessibleName("Copied image");
    await expect(copyButton.locator(".text-success")).toBeVisible();
    await this.page.waitForTimeout(1500);
    await expect(copyButton).toHaveAccessibleName("Copied image");
    await expect(copyButton).toHaveAccessibleName("Copy image", {
      timeout: 1500,
    });
  }

  async chooseUnsupportedImage() {
    await this.page.getByTestId("canvas-image-input").setInputFiles({
      name: "not-an-image.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image", "utf8"),
    });
  }

  async expectImageRejected() {
    await expect(this.page.getByTestId("canvas-image-error")).toContainText(
      "Choose a PNG, JPEG, GIF, WebP, BMP, ICO, or SVG image.",
    );
    await expect(this.page.locator('[data-item-type="image"]')).toHaveCount(0);
  }

  async expectImageRestored() {
    const card = this.imageCard();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-width", "160");
    await expect(card).toHaveAttribute("data-height", "160");
    await expect(card).toHaveAttribute("data-asset-status", "ready");
    await expect(this.page.getByTestId("canvas-image-rendered")).toBeVisible();
    const assetId = await card.getAttribute("data-asset-id");
    const dimensions = await this.page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const transaction = database.transaction("canvasAssets", "readonly");
        const record = await new Promise<
          { width?: number; height?: number } | undefined
        >((resolve, reject) => {
          const request = transaction.objectStore("canvasAssets").get(id!);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return record ? { width: record.width, height: record.height } : null;
      } finally {
        database.close();
      }
    }, assetId);
    expect(dimensions).toEqual({ width: 1, height: 1 });
  }

  async openImageInSmartView() {
    await this.page.getByTestId("canvas-image-open").click();
    await expect(this.page.getByTestId("image-smart-view")).toBeVisible();
    await expect(
      this.page.locator(
        '[data-testid="tab-replacement.png"][aria-selected="true"]',
      ),
    ).toBeVisible();
  }

  async removeImageAssetFromStorage() {
    const assetId = await this.imageCard().getAttribute("data-asset-id");
    expect(assetId).toBeTruthy();
    await this.page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const transaction = database.transaction("canvasAssets", "readwrite");
        transaction.objectStore("canvasAssets").delete(id!);
        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    }, assetId);
  }

  async expectMissingImagePlaceholder() {
    await expect(this.imageCard()).toHaveAttribute(
      "data-asset-status",
      "error",
    );
    const placeholder = this.page.getByTestId("canvas-image-placeholder");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText(
      "Use Replace to recover this card.",
    );
  }

  async formatAndConfigureCodeCard() {
    await this.page.getByTestId("canvas-code-format").click();
    await this.page.getByTestId("canvas-code-wrap").click();
    await this.page.getByTestId("canvas-code-collapse").click();
  }

  async collapseCodeCard() {
    await this.page.getByTestId("canvas-code-collapse").click();
    await expect(this.codeCard()).toHaveAttribute("data-collapsed", "true");
  }

  async dragCollapsedCodeCardByHeader() {
    const card = this.codeCard();
    const before = await this.readBounds(card);
    const header = card.getByTestId("canvas-code-drag-handle");
    const bounds = await header.boundingBox();
    expect(bounds).toBeTruthy();

    await this.markPendingSceneChange();
    await this.page.mouse.move(bounds!.x + 20, bounds!.y + bounds!.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(
      bounds!.x + 140,
      bounds!.y + bounds!.height / 2 + 80,
      { steps: 8 },
    );
    await this.page.mouse.up();

    this.operationBounds = {
      before,
      after: await this.readBounds(card),
    };
  }

  async expectCodeCardMoved() {
    expect(this.operationBounds).toBeTruthy();
    expect(this.operationBounds!.after.x).not.toBe(
      this.operationBounds!.before.x,
    );
    expect(this.operationBounds!.after.y).not.toBe(
      this.operationBounds!.before.y,
    );
  }

  async expectFormattedCodeCardAfterReload() {
    const card = this.codeCard();
    await expect(card).toHaveAttribute("data-language", "json");
    await expect(card).toHaveAttribute("data-language-locked", "true");
    await expect(card).toHaveAttribute("data-wrap", "true");
    await expect(card).toHaveAttribute("data-collapsed", "true");
    await expect(card).toHaveAttribute("data-height", "40");
    await this.page.getByTestId("canvas-code-collapse").click();
    await expect(card).toHaveAttribute("data-height", "320");
    await expect(this.page.getByTestId("canvas-code-preview")).toHaveText(
      '{\n  "users": [\n    {\n      "id": 1\n    }\n  ]\n}',
    );
  }

  async expectCodeLanguageAndEscapedRendering(language: string) {
    const card = this.codeCard();
    await expect(card).toHaveAttribute("data-language", language);
    await expect(this.page.getByTestId("canvas-code-preview")).toContainText(
      "<strong>",
    );
    await expect(card.locator("strong")).toHaveCount(0);
    await expect(card.locator(".monaco-editor")).toHaveCount(0);
  }

  async openCodeCardInTextTab() {
    this.openedCodeSource = await this.page
      .getByTestId("canvas-code-preview")
      .textContent();
    await this.page.getByTestId("canvas-code-open-tab").click();
    await expect(
      this.page.locator(
        '[data-testid="tab-JSON from Canvas"][aria-selected="true"]',
      ),
    ).toBeVisible();
  }

  async editOpenedCodeTabWithoutChangingCanvas() {
    const selector = '[data-editor-pane-side="left"] .monaco-editor';
    await expect(this.page.locator(selector).first()).toBeVisible();
    await this.page.waitForFunction((cssSelector) => {
      const container = document.querySelector(cssSelector);
      return (window as BrowserMonacoWindow).monaco?.editor
        ?.getEditors()
        .some((editor) => container?.contains(editor.getDomNode()));
    }, selector);
    await this.page.evaluate((cssSelector) => {
      const container = document.querySelector(cssSelector);
      const editor = (window as BrowserMonacoWindow).monaco?.editor
        .getEditors()
        .find((candidate) => container?.contains(candidate.getDomNode()));
      editor?.setValue('{"changedOutsideCanvas":true}');
    }, selector);
    await this.page.getByTestId("tab-Canvas 1").click();
  }

  async expectCanvasCodeUnchanged() {
    expect(this.openedCodeSource).toBeTruthy();
    await expect(this.page.getByTestId("canvas-code-preview")).toHaveText(
      this.openedCodeSource!,
    );
    await expect(
      this.page.getByTestId("canvas-code-preview"),
    ).not.toContainText("changedOutsideCanvas");
  }

  async openQuickTransformForCodeCard() {
    await this.codeCard().getByTestId("canvas-code-transform").click();
    await expect(
      this.page.getByTestId("canvas-transform-dialog"),
    ).toBeVisible();
  }

  async searchCanvasTransform(query: string) {
    const search = this.page.getByTestId("canvas-transform-search");
    await expect(search).toBeVisible();
    await search.fill(query);
  }

  async runCanvasTransform(operationId: string) {
    await this.markPendingSceneChange();
    await this.page.getByTestId(`canvas-transform-op-${operationId}`).click();
    await this.page.getByTestId("canvas-transform-run").click();
    await expect(
      this.page.getByTestId("canvas-transform-dialog"),
    ).not.toBeVisible();
  }

  private derivedCodeCard() {
    return this.page.locator('[data-item-type="code"][data-derived="true"]');
  }

  async expectDerivedCodeCardContaining(text: string) {
    await expect(
      this.derivedCodeCard().filter({ hasText: text }),
    ).toBeVisible();
  }

  async expectDerivedBadgeToShow(name: string) {
    await expect(
      this.page.getByTestId("canvas-code-derived-badge"),
    ).toContainText(name);
  }

  async expectTransformEdgeCount(count: number) {
    await expect(this.page.locator(".react-flow__edge")).toHaveCount(count);
  }

  async editCodeCardContaining(current: string, next: string) {
    const card = this.page
      .locator('[data-item-type="code"]')
      .filter({ hasText: current })
      .first();
    await expect(card).toBeVisible();
    await this.markPendingSceneChange();
    await card.dblclick();
    const editor = this.page.getByTestId("canvas-code-editor");
    await expect(editor).toBeVisible();
    await editor.fill(next);
    await editor.press("Control+Enter");
    await expect(editor).toHaveCount(0);
  }

  async detachDerivedCard() {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-code-detach").click();
    await expect(
      this.page.getByTestId("canvas-code-derived-badge"),
    ).toHaveCount(0);
  }

  async expectCodeCardContainingEditable(text: string) {
    const card = this.page
      .locator('[data-item-type="code"]')
      .filter({ hasText: text })
      .first();
    await expect(card).toHaveAttribute("data-derived", "false");
  }

  async multiSelectTextCards(firstText: string, secondText: string) {
    const first = this.textCardContaining(firstText).first();
    const second = this.textCardContaining(secondText).first();
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();

    if ((await second.getAttribute("aria-selected")) !== "true") {
      await second.click();
    }
    await first.click({ modifiers: ["Shift"] });

    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(
      this.page.getByTestId("canvas-selection-toolbar"),
    ).toContainText("2 selected");
  }

  async duplicateSelection(texts: string[]) {
    this.duplicatedSourceBounds.clear();
    for (const text of texts) {
      this.duplicatedSourceBounds.set(
        text,
        await this.readBounds(this.textCardContaining(text).first()),
      );
    }
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-duplicate-selection").click();
  }

  async duplicateCurrentSelection() {
    await this.markPendingSceneChange();
    await this.page.getByTestId("canvas-duplicate-selection").click();
  }

  async expectOffsetDuplicatesSelected(texts: string[]) {
    await expect(
      this.page.locator('[data-item-type="text"][aria-selected="true"]'),
    ).toHaveCount(texts.length);

    for (const text of texts) {
      const matches = this.textCardContaining(text);
      await expect(matches).toHaveCount(2);
      const duplicate = this.page
        .locator('[data-item-type="text"][aria-selected="true"]')
        .filter({ hasText: text });
      await expect(duplicate).toHaveCount(1);
      const sourceBounds = this.duplicatedSourceBounds.get(text);
      expect(sourceBounds).toBeTruthy();
      const duplicateBounds = await this.readBounds(duplicate);
      expect(duplicateBounds.x).toBe(sourceBounds!.x + 32);
      expect(duplicateBounds.y).toBe(sourceBounds!.y + 32);
      expect(duplicateBounds.width).toBe(sourceBounds!.width);
      expect(duplicateBounds.height).toBe(sourceBounds!.height);
    }
  }

  async moveSelectedCard() {
    const card = this.page
      .locator('[data-item-type="text"][aria-selected="true"]')
      .first();
    await expect(card).toBeVisible();
    const before = await this.readBounds(card);
    await this.markPendingSceneChange();
    const box = await card.boundingBox();
    expect(box).toBeTruthy();
    await this.page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      box!.x + box!.width / 2 + 120,
      box!.y + box!.height / 2 + 80,
      { steps: 8 },
    );
    await this.page.mouse.up();
    const after = await this.readBounds(card);
    expect(after.x).not.toBe(before.x);
    expect(after.y).not.toBe(before.y);
    this.operationBounds = { before, after };
  }

  async resizeSelectedCard() {
    const card = this.page
      .locator('[data-item-type="text"][aria-selected="true"]')
      .first();
    await expect(card).toBeVisible();
    const before = await this.readBounds(card);
    const resizeHandle = this.page
      .locator(".react-flow__resize-control.handle.bottom.right")
      .first();
    await expect(resizeHandle).toBeVisible();
    const box = await resizeHandle.boundingBox();
    expect(box).toBeTruthy();
    await this.page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + box!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      box!.x + box!.width / 2 + 80,
      box!.y + box!.height / 2 + 60,
      {
        steps: 8,
      },
    );
    await this.page.mouse.up();
    const after = await this.readBounds(card);
    expect(after.width).not.toBe(before.width);
    expect(after.height).not.toBe(before.height);
    this.operationBounds = { before, after };
  }

  async undoOperation() {
    await this.page.getByTestId("canvas-undo").click();
  }

  async redoOperation() {
    await this.page.getByTestId("canvas-redo").click();
  }

  async expectOperationBounds(state: "before" | "after") {
    expect(this.operationBounds).toBeTruthy();
    const expectedBounds = this.operationBounds![state];
    const card = this.page.locator('[data-item-type="text"]').first();
    await expect(card).toBeVisible();
    for (const [name, expected] of Object.entries(expectedBounds)) {
      await expect
        .poll(async () => Number(await card.getAttribute(`data-${name}`)))
        .toBeCloseTo(expected, 3);
    }
  }

  async deleteSelectionFromToolbar() {
    await this.page.getByTestId("canvas-delete-selection").click();
  }

  async expectTextCardCount(count: number) {
    await expect(this.page.locator('[data-item-type="text"]')).toHaveCount(
      count,
    );
  }

  async expectUndoHistoryEmpty() {
    await expect(this.page.getByTestId("canvas-undo")).toBeDisabled();
    await expect(this.page.getByTestId("canvas-redo")).toBeDisabled();
  }

  async addTextCardInPane(text: string, side: "left" | "right") {
    const pane = this.pane(side);
    const status = this.paneSaveStatus(side);
    this.pendingPaneSaveRevision[side] = Number(
      (await status.getAttribute("data-save-revision")) ?? "0",
    );
    await pane.getByTestId("canvas-add-text").click();
    const editor = pane.getByTestId("canvas-text-editor");
    await expect(editor).toBeVisible();
    await editor.fill(text);
    await editor.press("Control+Enter");
  }

  async waitForPaneSceneSave(side: "left" | "right") {
    const status = this.paneSaveStatus(side);
    const previousRevision = this.pendingPaneSaveRevision[side] ?? 0;
    await expect
      .poll(async () => Number(await status.getAttribute("data-save-revision")))
      .toBeGreaterThan(previousRevision);
    await expect(status).toHaveAttribute("data-save-state", "saved");
  }

  async waitForSceneSave() {
    const status = this.saveStatus();
    await expect
      .poll(async () => Number(await status.getAttribute("data-save-revision")))
      .toBeGreaterThan(this.pendingSaveRevision);
    await expect(status).toHaveAttribute("data-save-state", "saved");
  }

  async moveAndResizeTextCard() {
    const card = this.textCard();
    await expect(card).toBeVisible();

    await this.markPendingSceneChange();
    const cardBox = await card.boundingBox();
    expect(cardBox).toBeTruthy();
    await this.page.mouse.move(
      cardBox!.x + cardBox!.width / 2,
      cardBox!.y + cardBox!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      cardBox!.x + cardBox!.width / 2 + 110,
      cardBox!.y + cardBox!.height / 2 + 70,
      { steps: 8 },
    );
    await this.page.mouse.up();
    await this.waitForSceneSave();

    await card.click();
    const resizeHandle = this.page
      .locator(".react-flow__resize-control.handle.bottom.right")
      .first();
    await expect(resizeHandle).toBeVisible();
    await this.markPendingSceneChange();
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).toBeTruthy();
    await this.page.mouse.move(
      handleBox!.x + handleBox!.width / 2,
      handleBox!.y + handleBox!.height / 2,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + 90,
      handleBox!.y + handleBox!.height / 2 + 60,
      { steps: 8 },
    );
    await this.page.mouse.up();
  }

  async rememberTextCardBounds() {
    const card = this.textCard();
    const readNumber = async (attribute: string) =>
      Number(await card.getAttribute(`data-${attribute}`));
    this.rememberedBounds = {
      x: await readNumber("x"),
      y: await readNumber("y"),
      width: await readNumber("width"),
      height: await readNumber("height"),
    };
    Object.values(this.rememberedBounds).forEach((value) =>
      expect(Number.isFinite(value)).toBe(true),
    );
  }

  async expectRememberedTextCardBounds() {
    expect(this.rememberedBounds).toBeTruthy();
    const card = this.textCard();
    await expect(card).toBeVisible();
    for (const [name, expectedValue] of Object.entries(
      this.rememberedBounds!,
    )) {
      await expect
        .poll(async () => Number(await card.getAttribute(`data-${name}`)))
        .toBeCloseTo(expectedValue, 3);
    }
  }

  async deleteTextCard() {
    const card = this.textCard();
    await card.click();
    await this.markPendingSceneChange();
    await this.page.keyboard.press("Delete");
    await expect(card).not.toBeAttached();
  }

  async expectTextCard(text: string) {
    const card = this.textCard();
    await expect(card).toBeVisible();
    await expect(card).toContainText(text);
    await expect(card).toHaveAttribute("aria-selected", /true|false/);
    await expect(card).toHaveAttribute("data-item-id", /.+/);
  }

  async expectNoTextCard(text: string) {
    await expect(this.textCardContaining(text)).toHaveCount(0);
  }

  async expectRememberedImageAsset(exists: boolean) {
    expect(this.imageAssetId).toBeTruthy();
    const assetExists = await this.page.evaluate(async (assetId) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const transaction = database.transaction("canvasAssets", "readonly");
        return await new Promise<boolean>((resolve, reject) => {
          const request = transaction.objectStore("canvasAssets").get(assetId!);
          request.onsuccess = () => resolve(request.result !== undefined);
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    }, this.imageAssetId);
    expect(assetExists).toBe(exists);
  }

  async expectMovedImageAssetRemapped() {
    const movedAssetId = await this.imageCard().getAttribute("data-asset-id");
    const documentId = await this.page
      .getByTestId("canvas-flow")
      .getAttribute("data-canvas-document-id");
    expect(movedAssetId).toBeTruthy();
    expect(movedAssetId).not.toBe(this.imageAssetId);

    const ownership = await this.page.evaluate(
      async ({ assetId, oldAssetId, canvasDocumentId }) => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open("ScratchTabsDB");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          const transaction = database.transaction(
            ["canvasAssets", "canvasDocuments"],
            "readonly",
          );
          const assetStore = transaction.objectStore("canvasAssets");
          const documentStore = transaction.objectStore("canvasDocuments");
          const read = <T>(request: IDBRequest<T>) =>
            new Promise<T>((resolve, reject) => {
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
          const [asset, oldAsset, document] = await Promise.all([
            read<{ workspaceId?: string } | undefined>(
              assetStore.get(assetId!),
            ),
            read<{ workspaceId?: string } | undefined>(
              assetStore.get(oldAssetId!),
            ),
            read<{ workspaceId?: string } | undefined>(
              documentStore.get(canvasDocumentId!),
            ),
          ]);
          return {
            assetWorkspaceId: asset?.workspaceId,
            documentWorkspaceId: document?.workspaceId,
            oldAssetExists: oldAsset !== undefined,
          };
        } finally {
          database.close();
        }
      },
      {
        assetId: movedAssetId,
        oldAssetId: this.imageAssetId,
        canvasDocumentId: documentId,
      },
    );

    expect(ownership.assetWorkspaceId).toBe(ownership.documentWorkspaceId);
    expect(ownership.oldAssetExists).toBe(false);
  }

  async expectTextCardInPane(text: string, side: "left" | "right") {
    const card = this.pane(side).locator('[data-item-type="text"]').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(text);
  }

  async expectIndependentSplitStatusContributions() {
    const leftStatus = this.paneSaveStatus("left");
    const rightStatus = this.paneSaveStatus("right");
    await expect(leftStatus).toBeVisible();
    await expect(rightStatus).toBeVisible();
    const leftTabId = await leftStatus.getAttribute("data-renderer-tab-id");
    const rightTabId = await rightStatus.getAttribute("data-renderer-tab-id");
    expect(leftTabId).toBeTruthy();
    expect(rightTabId).toBeTruthy();
    expect(leftTabId).not.toBe(rightTabId);
    await expect(leftStatus).toContainText("1 item");
    await expect(rightStatus).toContainText("1 item");
  }

  async expectNoCards() {
    await expect(this.page.locator("[data-item-id]")).toHaveCount(0);
  }

  async createKeyboardNavigationLayout() {
    for (const text of [
      "Top left",
      "Top right",
      "Middle left",
      "Middle right",
      "Bottom left",
    ]) {
      await this.addTextCard(text);
    }
    await this.moveCardBy("Top right", 70, 0);
  }

  async focusCanvasCard(text: string) {
    const card = this.textCardContaining(text).first();
    await card.focus();
    await expect(card).toHaveAttribute("data-focused", "true");
    await expect(card).toHaveAttribute("aria-selected", "true");
  }

  async pressCanvasKey(key: string) {
    await this.page.keyboard.press(key);
  }

  async createTwoCardsWithKeyboard() {
    const addButton = this.page.getByTestId("canvas-add-text");
    await addButton.focus();
    for (const text of ["Keyboard first", "Keyboard second"]) {
      await this.page.keyboard.press("Enter");
      const editor = this.page.getByTestId("canvas-text-editor");
      await expect(editor).toBeFocused();
      await this.page.keyboard.type(text);
      await this.page.keyboard.press("Control+Enter");
      await addButton.focus();
    }
  }

  async selectAllCardsWithKeyboard() {
    await this.focusCanvasCard("Keyboard first");
    await this.page.keyboard.press(await this.primaryShortcut("a"));
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(2);
    await expect(
      this.page.getByTestId("canvas-navigation-announcement"),
    ).toHaveText("2 cards selected");
  }

  async nudgeSelectionWithKeyboard() {
    const selected = this.page.locator('[data-item-id][aria-selected="true"]');
    const count = await selected.count();
    const before = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        this.readBounds(selected.nth(index)),
      ),
    );
    await this.page.keyboard.press("Alt+ArrowRight");
    await this.page.keyboard.press("Alt+Shift+ArrowDown");
    const after = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        this.readBounds(selected.nth(index)),
      ),
    );
    this.keyboardNudgeBounds = before.map((bounds, index) => ({
      before: bounds,
      after: after[index],
    }));
  }

  async duplicateSelectionWithKeyboard() {
    await this.page.keyboard.press(await this.primaryShortcut("d"));
  }

  async deleteSelectionWithKeyboard() {
    await this.page.keyboard.press("Delete");
  }

  async undoWithKeyboard() {
    await this.page.keyboard.press(await this.primaryShortcut("z"));
  }

  async redoWithKeyboard() {
    await this.page.keyboard.press(await this.primaryShortcut("Shift+z"));
  }

  async expectKeyboardNudgeDistances() {
    expect(this.keyboardNudgeBounds).toHaveLength(2);
    for (const { before, after } of this.keyboardNudgeBounds) {
      expect(after.x).toBe(before.x + 10);
      expect(after.y).toBe(before.y + 100);
    }
  }

  async expectSelectedCardCount(count: number) {
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(count);
  }

  async exerciseKeyboardViewportCommands() {
    await this.addTextCard("Viewport near");
    await this.addTextCard("Viewport far");
    await this.moveCardBy("Viewport far", 1000, 350);
    await this.focusCanvasCard("Viewport near");
    await this.page.keyboard.press(await this.primaryShortcut("a"));

    const canvas = this.page.getByTestId("canvas-flow");
    const initialZoom = Number(await canvas.getAttribute("data-canvas-zoom"));
    await this.page.keyboard.press("f");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-canvas-zoom")))
      .not.toBeCloseTo(initialZoom, 3);

    await this.page.keyboard.press("0");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-canvas-zoom")))
      .toBeCloseTo(1, 3);

    await expect(canvas).toHaveAttribute("data-canvas-selected-tool", "select");
    await this.page.keyboard.down("Space");
    await expect(canvas).toHaveAttribute("data-canvas-active-tool", "pan");
    await expect(canvas).toHaveAttribute("data-canvas-pan-active", "true");

    const pane = this.page.locator(".react-flow__pane");
    const paneBox = await pane.boundingBox();
    expect(paneBox).toBeTruthy();
    const beforeX = Number(await canvas.getAttribute("data-canvas-viewport-x"));
    await this.page.mouse.move(
      paneBox!.x + paneBox!.width * 0.75,
      paneBox!.y + paneBox!.height * 0.75,
    );
    await this.page.mouse.down();
    await this.page.mouse.move(
      paneBox!.x + paneBox!.width * 0.75 - 80,
      paneBox!.y + paneBox!.height * 0.75 - 40,
      { steps: 6 },
    );
    await this.page.mouse.up();
    await expect
      .poll(async () =>
        Number(await canvas.getAttribute("data-canvas-viewport-x")),
      )
      .not.toBeCloseTo(beforeX, 3);

    await this.page.keyboard.up("Space");
    await expect(canvas).toHaveAttribute("data-canvas-active-tool", "select");
    await expect(canvas).toHaveAttribute("data-canvas-selected-tool", "select");

    await this.page.keyboard.press("Escape");
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(0);
    const zoomIn = this.page.getByTitle("Zoom in");
    await zoomIn.click();
    await zoomIn.click();
    await canvas.focus();
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(0);
    const zoomBeforeFitAll = Number(
      await canvas.getAttribute("data-canvas-zoom"),
    );
    await this.page.keyboard.press("f");
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-canvas-zoom")))
      .not.toBeCloseTo(zoomBeforeFitAll, 3);
    await expect.poll(() => this.areAllCanvasCardsVisible()).toBe(true);

    await zoomIn.click();
    await canvas.focus();
    await this.page.keyboard.press("Escape");
    await expect(
      this.page.locator('[data-item-id][aria-selected="true"]'),
    ).toHaveCount(0);
    await this.page.keyboard.press("0");
    await expect.poll(() => this.areAllCanvasCardsVisible()).toBe(true);
    this.keyboardViewportCommandsCompleted = true;
  }

  async exerciseShortcutHelpAndEditingGuard() {
    await this.addTextCard("Shortcut guard");
    await this.focusCanvasCard("Shortcut guard");
    await this.page.keyboard.press("?");
    const help = this.page.getByTestId("canvas-shortcut-help");
    await expect(help).toBeVisible();
    await expect(
      help.getByText("Copy selected cards"),
    ).toBeVisible();
    await expect(help.getByText("Cut selected cards")).toBeVisible();
    await expect(
      help.getByText(/Paste cards or external content/),
    ).toBeVisible();
    await this.page.keyboard.press("Escape");
    await expect(help).not.toBeAttached();
    await expect(
      this.textCardContaining("Shortcut guard").first(),
    ).toBeFocused();

    await this.page.keyboard.press("Enter");
    const editor = this.page.getByTestId("canvas-text-editor");
    await expect(editor).toBeFocused();
    await editor.press(await this.primaryShortcut("a"));
    await editor.press("Delete");
    await editor.type("?0f");
    await expect(editor).toHaveValue("?0f");
    await expect(
      this.page.getByTestId("canvas-shortcut-help"),
    ).not.toBeAttached();
    await expect(this.page.locator("[data-item-id]")).toHaveCount(1);
    await expect(this.page.getByTestId("canvas-flow")).toHaveAttribute(
      "data-canvas-zoom",
      "1",
    );
    this.shortcutEditingGuardCompleted = true;
  }

  expectKeyboardViewportCommandsCompleted() {
    expect(this.keyboardViewportCommandsCompleted).toBe(true);
  }

  expectShortcutEditingGuardCompleted() {
    expect(this.shortcutEditingGuardCompleted).toBe(true);
  }

  async expectFocusedCanvasCard(text: string) {
    const card = this.textCardContaining(text).first();
    await expect(card).toHaveAttribute("data-focused", "true");
    await expect(card).toHaveAttribute("aria-selected", "true");
    await expect(card).toBeFocused();
    await expect(
      this.page.getByTestId("canvas-navigation-announcement"),
    ).toHaveText(`Text card, ${text}`);
  }

  async traverseCanvasSequentially(direction: "forward" | "backward") {
    const expected = [
      "Top left",
      "Top right",
      "Middle left",
      "Middle right",
      "Bottom left",
    ];
    const ordered =
      direction === "forward" ? expected : [...expected].reverse();
    const key = direction === "forward" ? "Tab" : "Shift+Tab";
    await this.focusCanvasCard(ordered[0]);
    this.sequentialTraversal[direction] = [await this.focusedCardName()];

    for (let index = 1; index < ordered.length; index += 1) {
      await this.page.keyboard.press(key);
      this.sequentialTraversal[direction].push(await this.focusedCardName());
    }

    await this.page.keyboard.press(key);
    this.exitedCanvasAtBoundary[direction] = await this.page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      return Boolean(
        active &&
        !active.closest("[data-item-id]") &&
        !active.matches('[data-testid="canvas-flow"]'),
      );
    });
  }

  async expectSequentialTraversal(direction: "forward" | "backward") {
    const expected = [
      "Top left",
      "Top right",
      "Middle left",
      "Middle right",
      "Bottom left",
    ];
    expect(this.sequentialTraversal[direction]).toEqual(
      direction === "forward" ? expected : [...expected].reverse(),
    );
    expect(this.exitedCanvasAtBoundary[direction]).toBe(true);
  }

  async createOffscreenNavigationLayout() {
    await this.addTextCard("Visible card");
    await this.addTextCard("Offscreen card");
    await this.moveCardBy("Offscreen card", 1400, 0);
    await this.focusCanvasCard("Visible card");
    this.zoomBeforeOffscreenNavigation = await this.page
      .getByTestId("canvas-flow")
      .getAttribute("data-canvas-zoom");
  }

  async expectOffscreenCardRevealedWithoutZoomChange() {
    const canvas = this.page.getByTestId("canvas-flow");
    const card = this.textCardContaining("Offscreen card").first();
    await expect
      .poll(async () => {
        const [canvasBox, cardBox] = await Promise.all([
          canvas.boundingBox(),
          card.boundingBox(),
        ]);
        if (!canvasBox || !cardBox) return false;
        return (
          cardBox.x >= canvasBox.x + 24 &&
          cardBox.y >= canvasBox.y + 24 &&
          cardBox.x + cardBox.width <= canvasBox.x + canvasBox.width - 24 &&
          cardBox.y + cardBox.height <= canvasBox.y + canvasBox.height - 24
        );
      })
      .toBe(true);
    await expect(canvas).toHaveAttribute(
      "data-canvas-zoom",
      this.zoomBeforeOffscreenNavigation ?? "1",
    );
  }

  async enterFocusedCardEditing() {
    await this.page.keyboard.press("Enter");
    await expect(this.page.getByTestId("canvas-text-editor")).toBeFocused();
  }

  async expectEditingKeysStayInCard(text: string) {
    const canvas = this.page.getByTestId("canvas-flow");
    const focusedItemId = await canvas.getAttribute("data-focused-item-id");
    const editor = this.page.getByTestId("canvas-text-editor");
    await editor.press("ArrowRight");
    await editor.press("Home");
    await expect(editor).toBeFocused();
    await expect(canvas).toHaveAttribute(
      "data-focused-item-id",
      focusedItemId ?? "",
    );
    await expect(this.textCardContaining(text).first()).toHaveAttribute(
      "data-editing",
      "true",
    );
  }

  async leaveCardEditing() {
    await this.page.getByTestId("canvas-text-editor").press("Escape");
  }

  async expectEmptyCanvas() {
    const canvas = this.page.getByTestId("canvas-flow");
    await expect(canvas).toBeVisible();
    await expect(
      canvas.getByText("Empty Canvas", { exact: true }),
    ).toBeVisible();
    this.lastDocumentId = await canvas.getAttribute("data-canvas-document-id");
    expect(this.lastDocumentId).toBeTruthy();
  }

  async expectSavedLocally() {
    const status = this.page.getByTestId("canvas-save-status");
    await expect(status).toHaveAttribute("data-save-state", "saved");
    await expect(status).toContainText("Local only");
    await expect(status).toContainText("Saved");
  }

  async expectDesktopOnlyNotice() {
    await expect(
      this.page.getByTestId("canvas-desktop-only-notice"),
    ).toContainText("Canvas editing is currently available on desktop");
    await expect(this.page.getByTestId("canvas-flow")).not.toBeAttached();
  }

  async expectRememberedCanvas() {
    await expect(
      this.page.locator('[data-testid="tab-Canvas 1"][aria-selected="true"]'),
    ).toBeVisible();
    await this.expectEmptyCanvas();
  }

  async rememberDocumentId() {
    this.lastDocumentId = await this.page
      .getByTestId("canvas-flow")
      .getAttribute("data-canvas-document-id");
    expect(this.lastDocumentId).toBeTruthy();
  }

  async expectRememberedDocumentDeleted() {
    const documentId = this.lastDocumentId;
    expect(documentId).toBeTruthy();

    const exists = await this.page.evaluate(async (id) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("ScratchTabsDB");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      try {
        const transaction = database.transaction("canvasDocuments", "readonly");
        const store = transaction.objectStore("canvasDocuments");
        return await new Promise<boolean>((resolve, reject) => {
          const request = store.get(id!);
          request.onsuccess = () => resolve(request.result !== undefined);
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    }, documentId);

    expect(exists).toBe(false);
  }

  async completeKeyboardReleaseWorkflow() {
    await this.createCanvasWithKeyboard();
    await this.createTwoCardsWithKeyboard();
    await this.selectAllCardsWithKeyboard();
    await this.nudgeSelectionWithKeyboard();
    await this.duplicateSelectionWithKeyboard();
    await expect(this.page.locator("[data-item-id]")).toHaveCount(4);
    await this.deleteSelectionWithKeyboard();
    await expect(this.page.locator("[data-item-id]")).toHaveCount(2);
    await this.undoWithKeyboard();
    await expect(this.page.locator("[data-item-id]")).toHaveCount(4);
    await this.redoWithKeyboard();
    await expect(this.page.locator("[data-item-id]")).toHaveCount(2);
    await this.waitForSceneSave();
    await this.page.reload();
  }

  async expectKeyboardReleaseWorkflowRestored() {
    const canvas = this.page.getByTestId("canvas-flow");
    await expect(canvas).toBeVisible();
    await expect(this.textCardContaining("Keyboard first")).toBeVisible();
    await expect(this.textCardContaining("Keyboard second")).toBeVisible();
    await canvas.focus();
    await expect(
      this.page.locator('[data-item-id][data-focused="true"]'),
    ).toBeFocused();

    const instructionsId = await canvas.getAttribute("aria-describedby");
    expect(instructionsId).toBeTruthy();
    await expect(this.page.locator(`#${instructionsId}`)).toContainText(
      "Use Arrow keys to move between cards",
    );
  }

  async createMixedReleaseBoard() {
    await this.createSearchableCanvasCards();
    await this.page.reload();
    await expect(this.page.getByTestId("canvas-flow")).toBeVisible();
    await this.page.context().setOffline(true);
  }

  async expectMixedReleaseBoardOffline() {
    await expect(this.textCard()).toBeVisible();
    await expect(this.codeCard()).toBeVisible();
    await expect(this.imageCard()).toHaveAttribute("data-asset-status", "ready");
    await expect(this.linkCard()).toBeVisible();
    await expect(this.linkCard()).toHaveAttribute(
      "data-hostname",
      "example.com",
    );
    await expect(this.videoCard()).toBeVisible();
    await expect(this.page.getByTestId("canvas-video-iframe")).toHaveCount(0);
  }

  async exhaustQuotaForNextSceneSave(text: string) {
    await this.page.evaluate(() => {
      const nativePut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === "canvasDocuments") {
          IDBObjectStore.prototype.put = nativePut;
          throw new DOMException(
            "Storage quota exceeded",
            "QuotaExceededError",
          );
        }
        return key === undefined
          ? nativePut.call(this, value)
          : nativePut.call(this, value, key);
      };
    });
    await this.addTextCard(text);
  }

  async expectFailedSaveAndRetry() {
    const status = this.saveStatus();
    await expect(status).toHaveAttribute("data-save-state", "error");
    await expect(status).toHaveAttribute(
      "data-save-revision",
      String(this.pendingSaveRevision),
    );
    await expect(this.page.getByTestId("canvas-save-error")).toContainText(
      "unsaved changes",
    );

    await this.page.getByTestId("canvas-save-retry").click();
    await expect(status).toHaveAttribute("data-save-state", "saved");
    await expect
      .poll(async () => Number(await status.getAttribute("data-save-revision")))
      .toBeGreaterThan(this.pendingSaveRevision);
    await expect(this.page.getByTestId("canvas-save-error")).not.toBeAttached();
  }

  async verifySplitShortcutIsolationAndNarrowFallback() {
    const leftCard = this.pane("left").locator("[data-item-id]").first();
    const rightCard = this.pane("right").locator("[data-item-id]").first();
    const leftBefore = await this.readBounds(leftCard);
    const rightBefore = await this.readBounds(rightCard);

    await leftCard.focus();
    await this.page.keyboard.press("Alt+ArrowRight");

    const leftAfter = await this.readBounds(leftCard);
    const rightAfter = await this.readBounds(rightCard);
    expect(leftAfter.x).toBe(leftBefore.x + 10);
    expect(rightAfter).toEqual(rightBefore);

    await this.useNarrowViewport();
    await expect(
      this.page.getByTestId("canvas-desktop-only-notice"),
    ).toHaveCount(2);
    await expect(this.page.getByTestId("canvas-flow")).toHaveCount(0);
  }
}
