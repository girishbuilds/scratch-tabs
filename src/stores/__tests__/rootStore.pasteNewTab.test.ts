import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("../tabsStore", () => ({ useTabsStore: { getState: jest.fn() } }));
jest.mock("../splitViewStore", () => ({ useSplitViewStore: { getState: jest.fn() } }));
jest.mock("../workspaceStore", () => ({ useWorkspaceStore: { getState: jest.fn() } }));
jest.mock("../sidebarStore", () => ({ useSidebarStore: { getState: jest.fn() } }));
jest.mock("../editorStore", () => ({ useEditorStore: { getState: jest.fn() } }));
jest.mock("../broadcastStore", () => ({ broadcastManager: {} }));
jest.mock("../../services/modelManager", () => ({ modelManager: {} }));
jest.mock("../../services/tabDocumentAdapter", () => ({
  tabDocumentAdapterResolver: { resolve: jest.fn() },
}));
jest.mock("../../db", () => ({
  incrementSetting: jest.fn(),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
  StorageProviderFactory: { getProvider: jest.fn().mockReturnValue({}) },
}));

const mockReadImageOnlyDataUrl = jest.fn();
jest.mock("../../utils/clipboardPaste", () => ({
  readImageOnlyDataUrl: (...args: unknown[]) => mockReadImageOnlyDataUrl(...args),
}));

const mockSetPendingImageData = jest.fn();
jest.mock("../clipboardStore", () => ({
  useClipboardStore: {
    getState: () => ({ setPendingImageData: mockSetPendingImageData }),
  },
}));

import { useRootStore } from "../rootStore";

describe("RootStore.handleNewTabFromPaste", () => {
  const clipboardItems = [{ types: ["text/plain"] }];
  let handleNewTab: jest.Mock;
  let canAddNewTab: jest.Mock;
  let readText: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    handleNewTab = jest.fn().mockResolvedValue("new-tab-id");
    canAddNewTab = jest.fn().mockReturnValue(false);
    readText = jest.fn().mockResolvedValue("a\tb\n1\t2");
    useRootStore.setState({ handleNewTab, canAddNewTab });

    Object.defineProperty(global.navigator, "clipboard", {
      configurable: true,
      value: { read: jest.fn().mockResolvedValue(clipboardItems), readText },
    });
  });

  it("opens the clipboard text in a text tab when the clipboard also holds an image render", async () => {
    mockReadImageOnlyDataUrl.mockResolvedValue(null);

    const result = await useRootStore.getState().handleNewTabFromPaste(false);

    expect(mockReadImageOnlyDataUrl).toHaveBeenCalledWith(clipboardItems);
    expect(handleNewTab).toHaveBeenCalledWith(false, "a\tb\n1\t2");
    expect(canAddNewTab).not.toHaveBeenCalled();
    expect(result).toBe("new-tab-id");
  });

  it("routes an image-only clipboard to the image tab flow instead of a text tab", async () => {
    mockReadImageOnlyDataUrl.mockResolvedValue("data:image/png;base64,abc");

    const result = await useRootStore.getState().handleNewTabFromPaste(true);

    expect(canAddNewTab).toHaveBeenCalledWith(true);
    expect(handleNewTab).not.toHaveBeenCalled();
    expect(readText).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it("falls back to reading text when the Clipboard API read fails", async () => {
    navigator.clipboard.read.mockRejectedValue(new Error("denied"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    await useRootStore.getState().handleNewTabFromPaste(false);

    expect(handleNewTab).toHaveBeenCalledWith(false, "a\tb\n1\t2");
  });

  it("creates an empty tab when no clipboard access is possible", async () => {
    navigator.clipboard.read.mockRejectedValue(new Error("denied"));
    readText.mockRejectedValue(new Error("denied"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    await useRootStore.getState().handleNewTabFromPaste(false);

    expect(handleNewTab).toHaveBeenCalledWith(false, "");
  });
});
