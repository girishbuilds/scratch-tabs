// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Tab } from "../../types";

const mockStorageProvider = {
  deleteTab: jest.fn().mockResolvedValue(undefined),
  updateTabAccessed: jest.fn().mockResolvedValue(undefined),
  updateTabPinned: jest.fn().mockResolvedValue(undefined),
  getTabsByWorkspace: jest.fn().mockResolvedValue([]),
  getSplitViewByWorkspace: jest.fn().mockResolvedValue(null),
  saveSplitViewNow: jest.fn().mockResolvedValue(undefined),
  purgeOrphanedTabData: jest.fn().mockResolvedValue(undefined),
};

const mockTabDocumentAdapter = {
  hasContent: jest.fn(),
  duplicate: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
  move: jest.fn(),
};

jest.mock("../../services/tabDocumentAdapter", () => ({
  tabDocumentAdapterResolver: {
    resolve: jest.fn().mockResolvedValue(mockTabDocumentAdapter),
  },
}));

// Mock dependencies
jest.mock("../tabsStore", () => ({
  useTabsStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../splitViewStore", () => ({
  useSplitViewStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../workspaceStore", () => ({
  useWorkspaceStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../sidebarStore", () => ({
  useSidebarStore: {
    getState: jest.fn(),
  },
}));

import { useWorkspaceStore } from "../workspaceStore";
import { useSidebarStore } from "../sidebarStore";

jest.mock("../editorStore", () => ({
  useEditorStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../../db", () => ({
  incrementSetting: jest.fn().mockResolvedValue(undefined),
  getSetting: jest.fn().mockResolvedValue(undefined),
  setSetting: jest.fn().mockResolvedValue(undefined),
  StorageProviderFactory: {
    getProvider: jest.fn().mockReturnValue(mockStorageProvider),
  },
}));

jest.mock("../broadcastStore", () => ({
  broadcastManager: {
    broadcastWorkspaceState: jest.fn(),
    broadcastWorkspaceTabsMetadata: jest.fn(),
  },
}));

jest.mock("../../services/modelManager", () => ({
  modelManager: {
    dispose: jest.fn(),
  },
}));

import { useTabsStore } from "../tabsStore";
import { useSplitViewStore } from "../splitViewStore";
import { useRootStore } from "../rootStore";

describe("RootStore - Pinned Tabs Protection", () => {
  let tabsStoreMock: any;
  let splitViewStoreMock: any;
  let workspaceStoreMock: any;
  let mockTabs: Tab[];
  let rootStore: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock tabs
    mockTabs = [
      {
        id: "welcome",
        title: "Welcome",
        content: "",
        language: "plaintext",
        isPinned: true,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
      {
        id: "scratch1",
        title: "Scratch 1",
        content: "",
        language: "plaintext",
        isPinned: true,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
      {
        id: "scratch2",
        title: "Scratch 2",
        content: "",
        language: "plaintext",
        isPinned: false,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
      {
        id: "scratch3",
        title: "Scratch 3",
        content: "",
        language: "plaintext",
        isPinned: false,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
    ];

    // Setup mocks
    tabsStoreMock = {
      tabs: mockTabs,
      removeTab: jest.fn(),
      updateTabState: jest.fn(),
      updateTabAccessed: jest.fn(),
    };

    splitViewStoreMock = {
      splitView: {
        leftTabs: ["welcome", "scratch1", "scratch2", "scratch3"],
        rightTabs: [],
        activeLeftTabId: "scratch3",
        activeRightTabId: null,
        leftTabHistory: [],
        rightTabHistory: [],
      },
      getAllExcept: jest.fn(),
      getTabsToLeft: jest.fn(),
      getTabsToRight: jest.fn(),
      setSplitView: jest.fn(),
      setActiveLeftTab: jest.fn(),
      setActiveRightTab: jest.fn(),
      removeTabFromSide: jest.fn(),
      closeAllExceptRespectingPins: jest.fn(),
      closeTabsToLeftRespectingPins: jest.fn(),
      closeTabsToRightRespectingPins: jest.fn(),
    };

    workspaceStoreMock = {
      activeWorkspaceId: "workspace1",
      deleteWorkspace: jest.fn().mockResolvedValue(undefined),
    };

    (useTabsStore as any).getState.mockReturnValue(tabsStoreMock);
    (useSplitViewStore as any).getState.mockReturnValue(splitViewStoreMock);
    (useWorkspaceStore as any).getState.mockReturnValue(workspaceStoreMock);
    (useSidebarStore as any).getState.mockReturnValue({
      workspaceTabsMetadata: new Map(),
      refreshWorkspaceMetadata: jest.fn().mockResolvedValue(undefined),
    });
    mockStorageProvider.deleteTab.mockClear();
    mockStorageProvider.updateTabAccessed.mockClear();
    mockStorageProvider.updateTabPinned.mockClear();
    mockStorageProvider.getTabsByWorkspace.mockClear();
    mockStorageProvider.getSplitViewByWorkspace.mockClear();
    mockStorageProvider.purgeOrphanedTabData.mockClear();
    mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);
    mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(null);

    // Get a fresh instance of the store
    rootStore = useRootStore.getState();
  });

  it("should protect pinned tabs when closing all other tabs", async () => {
    // Setup: Split view store returns tabs that would be closed
    splitViewStoreMock.getAllExcept.mockReturnValue(["welcome", "scratch1", "scratch2"]);
    
    // Execute: Close all other tabs except scratch3
    await rootStore.closeAllExcept("scratch3", false);

    // Verify: Only unpinned tabs should be removed from data store
    expect(tabsStoreMock.removeTab).toHaveBeenCalledTimes(1);
    expect(tabsStoreMock.removeTab).toHaveBeenCalledWith("scratch2");
    expect(tabsStoreMock.removeTab).not.toHaveBeenCalledWith("welcome");
    expect(tabsStoreMock.removeTab).not.toHaveBeenCalledWith("scratch1");

    // Verify: Pin-aware method was called
    expect(splitViewStoreMock.closeAllExceptRespectingPins).toHaveBeenCalledWith(
      "scratch3", 
      false, 
      expect.any(Function)
    );
  });

  it("should protect pinned tabs when closing tabs to the left", async () => {
    // Setup: Split view store returns tabs that would be closed  
    splitViewStoreMock.getTabsToLeft = jest.fn().mockReturnValue(["welcome", "scratch1"]);
    
    // Execute: Close tabs to the left of scratch2
    await rootStore.closeTabsToLeft("scratch2", false);

    // Verify: No pinned tabs should be removed from data store
    expect(tabsStoreMock.removeTab).not.toHaveBeenCalled();

    // Verify: Pin-aware method was called
    expect(splitViewStoreMock.closeTabsToLeftRespectingPins).toHaveBeenCalledWith(
      "scratch2", 
      false, 
      expect.any(Function)
    );
  });

  it("should protect pinned tabs when closing tabs to the right", async () => {
    // Setup: Split view store returns tabs that would be closed
    splitViewStoreMock.getTabsToRight = jest.fn().mockReturnValue(["scratch2", "scratch3"]);
    
    // Execute: Close tabs to the right of scratch1
    await rootStore.closeTabsToRight("scratch1", false);

    // Verify: Only unpinned tabs should be removed from data store
    expect(tabsStoreMock.removeTab).toHaveBeenCalledTimes(2);
    expect(tabsStoreMock.removeTab).toHaveBeenCalledWith("scratch2");
    expect(tabsStoreMock.removeTab).toHaveBeenCalledWith("scratch3");

    // Verify: Pin-aware method was called
    expect(splitViewStoreMock.closeTabsToRightRespectingPins).toHaveBeenCalledWith(
      "scratch1", 
      false, 
      expect.any(Function)
    );
  });

  it("should persist pin state for tabs in inactive workspace metadata", async () => {
    const refreshWorkspaceMetadata = jest.fn().mockResolvedValue(undefined);

    tabsStoreMock.tabs = [];
    (useSidebarStore as any).getState.mockReturnValue({
      workspaceTabsMetadata: new Map([
        [
          "workspace2",
          [
            {
              id: "inactive-tab",
              title: "Inactive Tab",
              language: "plaintext",
              isPinned: false,
              lastModified: 100,
              workspaceId: "workspace2",
            },
          ],
        ],
      ]),
      refreshWorkspaceMetadata,
    });
    mockStorageProvider.getTabsByWorkspace.mockResolvedValue([
      {
        id: "inactive-tab",
        title: "Inactive Tab",
        language: "plaintext",
        isPinned: true,
        lastModified: 100,
        workspaceId: "workspace2",
      },
    ]);

    rootStore.toggleTabPin("inactive-tab");

    await Promise.resolve();
    await Promise.resolve();

    expect(mockStorageProvider.updateTabPinned).toHaveBeenCalledWith("inactive-tab", true);
    expect(refreshWorkspaceMetadata).toHaveBeenCalledWith("workspace2");
  });

  it("should hard-delete orphaned tabs whose workspace no longer exists", async () => {
    mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);

    await rootStore.removeTab("orphaned-tab");

    expect(mockStorageProvider.purgeOrphanedTabData).toHaveBeenCalledWith(
      "orphaned-tab",
    );
    expect(mockTabDocumentAdapter.remove).not.toHaveBeenCalled();
    expect(tabsStoreMock.removeTab).not.toHaveBeenCalled();
  });

  it("should update tab access time when setting the active tab", () => {
    jest.spyOn(Date, "now").mockReturnValue(12345);

    rootStore.setActiveTab("scratch2");

    expect(splitViewStoreMock.setActiveLeftTab).toHaveBeenCalledWith("scratch2");
    expect(tabsStoreMock.updateTabAccessed).toHaveBeenCalledWith("scratch2", 12345);
    expect(mockStorageProvider.updateTabAccessed).toHaveBeenCalledWith("scratch2", 12345);

    (Date.now as jest.Mock).mockRestore();
  });

});

describe("RootStore - duplicateTab insertion position", () => {
  let tabsStoreMock: any;
  let splitViewStoreMock: any;
  let rootStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const sourceTab = {
      id: "tab-b",
      title: "Source",
      content: "content",
      language: "plaintext",
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: 1,
      lastModified: 1,
      workspaceId: "workspace1",
    };
    tabsStoreMock = {
      tabs: [sourceTab],
      addTab: jest.fn(),
    };
    mockTabDocumentAdapter.duplicate.mockResolvedValue({
      ...sourceTab,
      id: "new-tab-id",
      title: "Source (Copy)",
    });

    splitViewStoreMock = {
      splitView: {
        leftTabs: ["tab-a", "tab-b", "tab-c"],
        rightTabs: [],
        activeLeftTabId: "tab-a",
        activeRightTabId: null,
        leftTabHistory: [],
        rightTabHistory: [],
        workspaceId: "workspace1",
      },
      addTabToSide: jest.fn(),
      setActiveLeftTab: jest.fn(),
      setActiveRightTab: jest.fn(),
    };

    (useTabsStore as any).getState.mockReturnValue(tabsStoreMock);
    (useSplitViewStore as any).getState.mockReturnValue(splitViewStoreMock);

    rootStore = useRootStore.getState();
  });

  it("calls addTabToSide with source tab as insertAfterId", async () => {
    await rootStore.duplicateTab("tab-b", false);

    expect(splitViewStoreMock.addTabToSide).toHaveBeenCalledWith(
      "new-tab-id",
      false,
      undefined,
      "tab-b",
    );
  });

  it("passes isRightSide=true to addTabToSide when duplicating on right", async () => {
    await rootStore.duplicateTab("tab-b", true);

    expect(splitViewStoreMock.addTabToSide).toHaveBeenCalledWith(
      "new-tab-id",
      true,
      undefined,
      "tab-b",
    );
  });

  it("activates the new tab after duplication", async () => {
    await rootStore.duplicateTab("tab-b", false);
    expect(splitViewStoreMock.setActiveLeftTab).toHaveBeenCalledWith("new-tab-id");
  });

  it("returns empty string when source tab does not exist", async () => {
    const result = await rootStore.duplicateTab("nonexistent", false);
    expect(result).toBe("");
    expect(splitViewStoreMock.addTabToSide).not.toHaveBeenCalled();
  });
});
