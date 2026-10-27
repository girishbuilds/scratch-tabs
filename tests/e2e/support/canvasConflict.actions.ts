import { expect, type BrowserContext, type Page } from "@playwright/test";
import { CanvasActions } from "./canvas.actions";

declare global {
  interface Window {
    __canvasRevisionMessages?: unknown[];
  }
}

export class CanvasConflictActions {
  private secondaryPage: Page | null = null;
  private secondaryCanvas: CanvasActions | null = null;
  private revisionMessages: unknown[] = [];

  constructor(
    private readonly primaryPage: Page,
    private readonly context: BrowserContext,
    private readonly primaryCanvas: CanvasActions,
  ) {}

  async openInSecondWindow(): Promise<void> {
    this.secondaryPage = await this.context.newPage();
    await this.secondaryPage.addInitScript(() => {
      const NativeBroadcastChannel = window.BroadcastChannel;
      const messages: unknown[] = [];
      window.__canvasRevisionMessages = messages;
      window.BroadcastChannel = class extends NativeBroadcastChannel {
        constructor(name: string) {
          super(name);
          if (name === "scratch-tabs-canvas-revisions-v1") {
            this.addEventListener("message", (event) => {
              messages.push(event.data);
            });
          }
        }
      };
    });
    await this.secondaryPage.setViewportSize({ width: 1440, height: 900 });
    await this.secondaryPage.goto(this.primaryPage.url());
    await expect(this.secondaryPage.getByTestId("canvas-flow")).toBeVisible();
    this.secondaryCanvas = new CanvasActions(this.secondaryPage);
  }

  async saveInFirstWindow(text: string): Promise<void> {
    await this.primaryCanvas.addTextCard(text);
    await this.primaryCanvas.waitForSceneSave();
  }

  async editInSecondWindow(text: string): Promise<void> {
    const page = this.requireSecondaryPage();
    const revision = await page
      .getByTestId("canvas-save-status")
      .getAttribute("data-save-revision");
    await page.getByTestId("canvas-add-text").click();
    const editor = page.getByTestId("canvas-text-editor");
    await editor.fill(text);
    await editor.press("Control+Enter");
    await expect(page.getByTestId("canvas-conflict-notice")).toBeVisible();
    await expect(page.getByTestId("canvas-save-status")).toHaveAttribute(
      "data-save-state",
      "conflict",
    );
    await expect(page.getByTestId("canvas-save-status")).toHaveAttribute(
      "data-save-revision",
      revision ?? "0",
    );
  }

  async expectConflictWarning(): Promise<void> {
    const notice = this.requireSecondaryPage().getByTestId(
      "canvas-conflict-notice",
    );
    await expect(notice).toContainText(
      "Your unsaved changes are still visible here and have not been saved",
    );
    await expect(notice.getByTestId("canvas-conflict-reload")).toBeVisible();
    await expect(notice.getByTestId("canvas-conflict-take-over")).toBeVisible();
  }

  async reloadSavedVersion(): Promise<void> {
    const page = this.requireSecondaryPage();
    await page.getByTestId("canvas-conflict-reload").click();
    await expect(page.getByTestId("canvas-conflict-notice")).not.toBeAttached();
    await expect(page.getByTestId("canvas-save-status")).toHaveAttribute(
      "data-save-state",
      "saved",
    );
  }

  async expectOnlyText(text: string, discardedText: string): Promise<void> {
    const page = this.requireSecondaryPage();
    await expect(
      page.locator('[data-item-type="text"]').filter({ hasText: text }),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-item-type="text"]')
        .filter({ hasText: discardedText }),
    ).toHaveCount(0);
  }

  async takeOverFromSecondWindow(): Promise<void> {
    const page = this.requireSecondaryPage();
    const before = Number(
      (await page
        .getByTestId("canvas-conflict-notice")
        .getAttribute("data-remote-revision")) ?? "0",
    );
    await page.getByTestId("canvas-conflict-take-over").click();
    await expect(page.getByTestId("canvas-conflict-notice")).not.toBeAttached();
    const status = page.getByTestId("canvas-save-status");
    await expect(status).toHaveAttribute("data-save-state", "saved");
    await expect
      .poll(async () => Number(await status.getAttribute("data-save-revision")))
      .toBeGreaterThan(before);
  }

  async reloadBothWindows(): Promise<void> {
    const secondary = this.requireSecondaryPage();
    this.revisionMessages.push(
      ...(await secondary.evaluate(
        () => window.__canvasRevisionMessages ?? [],
      )),
    );
    // The `load` event also waits on CDN fonts and Monaco, which can take 30s+ with parallel shards;
    // canvas-flow being visible is the readiness signal this step actually needs.
    await Promise.all([
      this.primaryPage.reload({ waitUntil: "domcontentloaded" }),
      secondary.reload({ waitUntil: "domcontentloaded" }),
    ]);
    await Promise.all([
      expect(this.primaryPage.getByTestId("canvas-flow")).toBeVisible({
        timeout: 20000,
      }),
      expect(secondary.getByTestId("canvas-flow")).toBeVisible({
        timeout: 20000,
      }),
    ]);
  }

  async expectBothWindowsContain(text: string): Promise<void> {
    const secondary = this.requireSecondaryPage();
    for (const page of [this.primaryPage, secondary]) {
      await expect(
        page.locator('[data-item-type="text"]').filter({ hasText: text }),
      ).toBeVisible();
    }
  }

  async expectMetadataOnlyBroadcasts(): Promise<void> {
    const messages = [
      ...this.revisionMessages,
      ...(await this.requireSecondaryPage().evaluate(
        () => window.__canvasRevisionMessages ?? [],
      )),
    ];
    expect(messages.length).toBeGreaterThan(0);
    for (const message of messages) {
      expect(Object.keys(message as Record<string, unknown>).sort()).toEqual([
        "documentId",
        "revision",
        "tabId",
      ]);
      expect(message).toEqual({
        tabId: expect.any(String),
        documentId: expect.any(String),
        revision: expect.any(Number),
      });
    }
  }

  async cleanup(): Promise<void> {
    await this.secondaryPage?.close();
    this.secondaryPage = null;
    this.secondaryCanvas = null;
    this.revisionMessages = [];
  }

  private requireSecondaryPage(): Page {
    if (!this.secondaryPage || !this.secondaryCanvas) {
      throw new Error("The second Canvas window has not been opened");
    }
    return this.secondaryPage;
  }
}
