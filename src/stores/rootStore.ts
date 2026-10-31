import { create } from "zustand";
import { useTabsStore } from "./tabsStore";
import { useSplitViewStore } from "./splitViewStore";
import { useEditorStore } from "./editorStore";
import { useWorkspaceStore } from "./workspaceStore";
import { useSidebarStore } from "./sidebarStore";
import { useMilestoneCelebrationStore } from "./milestoneCelebrationStore";
import { useNavigationStore } from "./navigationStore";
import { Tab } from "../types";
import { formatRegistry } from "../formats/registry";
import { incrementSetting } from "../db";
import { NEW_TAB_PREFIX } from "../constants";
import { isTabEmpty, countEmptyTabs, groupTabsByLanguage } from "../utils";
import { detectFormat, isAmbiguousFormat } from "../formats";
import { StorageProviderFactory, StorageProvider } from "../db";
import { broadcastManager } from "./broadcastStore";
import { modelManager } from "../services/modelManager";
import { useQueryPanelStore } from "../formats/json/stores/useQueryPanelStore";
import { contentProcessingService } from "../services/contentProcessing";
import { navigationService } from "../services/navigationService";
import { SidebarTabInfo } from "../types";
import { getTabContentKind } from "../utils/tabContentKind";
import { readImageOnlyDataUrl } from "../utils/clipboardPaste";
import { tabDocumentAdapterResolver } from "../services/tabDocumentAdapter";

const _updateStoredTabAccessed = (
  storage: StorageProvider,
  tabId: string,
  lastAccessed: number,
) => {
  if (!storage.updateTabAccessed) return;

  storage
    .updateTabAccessed(tabId, lastAccessed)
    .catch((err) => console.error("Failed to update tab access time:", err));
};

const _updateStoredTabPinned = (
  storage: StorageProvider,
  tabId: string,
  isPinned: boolean,
) => {
  if (!storage.updateTabPinned) return Promise.resolve();

  return storage.updateTabPinned(tabId, isPinned);
};

// The RootStore now primarily holds ACTIONS that coordinate other stores.
// It does NOT hold mirrored state like `tabs` or `splitView`.
interface RootStore {
  // STATE for URL sync suppression (used during share tab creation)
  suppressUrlSync: boolean;
  setSuppressUrlSync: (suppress: boolean) => void;

  // ACTIONS ONLY
  addTab: (tab: Tab, toRightSide?: boolean) => void;
  handleNewPopulatedTab: (tab: Partial<Tab>, toRightSide?: boolean) => Promise<string | undefined>;
  addBackgroundTab: (tab: Tab, toRightSide?: boolean) => void;
  handleNewTab: (isRightSide: boolean, content?: string) => Promise<string | undefined>;
  handleNewCanvas: (isRightSide: boolean) => Promise<string | undefined>;
  handleNewTabFromPaste: (isRightSide: boolean) => Promise<string | undefined>;
  removeTab: (id: string) => Promise<void>;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string, lock?: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabState: (id: string, updates: Partial<Tab>) => void;
  toggleTabPin: (id: string) => void;
  updateTabOrder: (leftTabs: string[], rightTabs: string[]) => void;
  togglePreviewMode: () => void;
  splitScreen: (leftTabId: string, rightTabId?: string) => void;
  unsplitScreen: (tabId?: string) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setActiveSide: (side: "left" | "right") => void;
  setSplitRatio: (ratio: number) => void;
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => Promise<void>;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => Promise<void>;
  closeAllExcept: (tabId: string, isRightSide: boolean) => Promise<void>;
  duplicateTab: (
    tabId: string,
    isRightSide: boolean,
  ) => Promise<string>;
  duplicateAndSplitTab: (tabId: string) => Promise<string>;

  groupTabsByType: (isRightSide: boolean) => void;
  canAddNewTab: (toRightSide?: boolean) => boolean;
  compareFromClipboard: (
    originalTabId: string,
    isRightSide: boolean,
  ) => Promise<void>;
  reorderTabs: (side: "left" | "right", newOrder: string[]) => void;
  moveTabBetweenWorkspaces: (
    tabId: string,
    sourceWorkspaceId: string,
    targetWorkspaceId: string
  ) => Promise<void>;
  reorderTabsInWorkspace: (
    workspaceId: string,
    newTabOrder: string[]
  ) => Promise<void>;
  saveTabDataById: (tabId: string) => void;
  setActiveView: (tabId: string, viewId: string | null) => void;
  getActiveView: (tabId: string) => string | null;
  initialUrlProcessed: boolean;
  setInitialUrlProcessed: (status: boolean) => void;

  // Navigation actions
  navigateBack: () => Promise<void>;
  navigateForward: () => Promise<void>;
}

/**
 * Extracts image data from clipboard when the clipboard carries no text
 */
const _extractImageFromClipboard = async (): Promise<string | null> =>
  readImageOnlyDataUrl(await navigator.clipboard.read());

/**
 * Helper to broadcast tab metadata updates for inactive workspaces
 * This ensures all browser windows stay in sync when tabs are moved/reordered
 */
const _broadcastMetadataUpdate = async (workspaceId: string): Promise<void> => {
  const storage = StorageProviderFactory.getProvider();
  try {
    const tabs = await storage.getTabsByWorkspace(workspaceId);
    const splitView = await storage.getSplitViewByWorkspace(workspaceId);

    // Create tab map for quick lookup
    const tabMap = new Map<string, Tab>(tabs.map(t => [t.id, t]));

    // Order tabs according to splitView order (leftTabs then rightTabs)
    let orderedTabs: Tab[] = [];
    if (splitView) {
      const allTabIds = [...(splitView.leftTabs || []), ...(splitView.rightTabs || [])];
      orderedTabs = allTabIds
        .map(id => tabMap.get(id))
        .filter((t): t is Tab => t !== undefined);

      // Add any tabs not in splitView
      const remainingTabs = tabs.filter(t => !allTabIds.includes(t.id));
      orderedTabs = [...orderedTabs, ...remainingTabs];
    } else {
      orderedTabs = tabs;
    }

    const metadata: SidebarTabInfo[] = orderedTabs.map((t) => ({
      id: t.id,
      title: t.title,
      language: t.language,
      isTablet: t.isTablet,
      isRich: t.isRich,
      contentKind: t.contentKind,
      documentId: t.documentId,
      isPinned: t.isPinned,
      lastModified: t.lastModified,
      lastAccessed: t.lastAccessed,
      workspaceId: t.workspaceId,
    }));

    broadcastManager.broadcastWorkspaceTabsMetadata(workspaceId, metadata);
  } catch (error) {
    console.error(`Failed to broadcast metadata for workspace ${workspaceId}:`, error);
  }
};

/**
 * Creates a new rich text tab for image pasting
 */
const _createImageTab = async (
  imageDataUrl: string,
  isRightSide: boolean,
  storeActions: RootStore,
  createFinalTabObjectFn: (partialInputTab: Partial<Tab>, workspaceId: string, options: { defaultTitle: string; initialContent?: string }) => Tab
): Promise<void> => {
  const { canAddNewTab, addTab } = storeActions;
  if (!canAddNewTab(isRightSide)) return;

  // Store image data for the rich text editor
  const { useClipboardStore } = await import('./clipboardStore');
  useClipboardStore.getState().setPendingImageData(imageDataUrl);

  // Generate proper "Scratch n" title
  const ensuredWorkspaceId = await useWorkspaceStore.getState().ensureWorkspace();
  if (!ensuredWorkspaceId) return;

  const currentTabs = useTabsStore.getState().tabs.filter((t) => t.workspaceId === ensuredWorkspaceId);
  const nonWelcomeTabs = currentTabs.filter((tab) => tab.title !== "Welcome");
  const defaultTitle = `${NEW_TAB_PREFIX} ${nonWelcomeTabs.length + 1}`;

  const newTabObject = createFinalTabObjectFn({
    isRich: true,
    content: '', // Rich text tabs use richContent, not content
    richContent: undefined, // Will be initialized by the editor with the pending image
  }, ensuredWorkspaceId, {
    defaultTitle,
  });

  addTab(newTabObject, isRightSide);

  // Trigger inline editing in sidebar
  useSidebarStore.getState().setEditingId(newTabObject.id, newTabObject.title);
};

export const useRootStore = create<RootStore>((set, get) => {
  // NO MORE SUBSCRIPTIONS HERE
  const storage = StorageProviderFactory.getProvider();

  const _createFinalTabObject = (
    partialInputTab: Partial<Tab>, // Input data, can be empty or partially filled
    workspaceId: string,
    options: {
      defaultTitle: string;
      initialContent?: string;
    },
  ): Tab => {
    const now = Date.now();
    // Use content from input, fallback to initialContent, then to empty string
    const content = partialInputTab.content ?? options.initialContent ?? "";

    const language = content ? detectFormat(content) : "plaintext";
    const languageLocked =
      language !== "plaintext" && !isAmbiguousFormat(content || "");

    const finalTab = {
      id: partialInputTab.id || crypto.randomUUID(),
      title: partialInputTab.title || options.defaultTitle,
      content: content,
      richContent: partialInputTab.richContent || undefined,
      language: partialInputTab.language || language,
      languageLocked: partialInputTab.languageLocked ?? languageLocked,
      isRich: partialInputTab.isRich ?? false,
      contentKind: partialInputTab.contentKind,
      documentId: partialInputTab.documentId,
      workspaceId: workspaceId,
      dateCreated: partialInputTab.dateCreated || now,
      lastModified: now,
      lastAccessed: partialInputTab.lastAccessed || now,
      cursorPosition: partialInputTab.cursorPosition || {
        lineNumber: 1,
        column: 1,
      },
      isPinned: partialInputTab.isPinned || false,
      isTablet: partialInputTab.isTablet || false,
      tabletState: partialInputTab.tabletState || "",
      previewMode: partialInputTab.previewMode || false,
    };
    return finalTab;
  };

  const _findTabForLifecycle = async (tabId: string): Promise<Tab | undefined> => {
    const activeTab = useTabsStore.getState().tabs.find((tab) => tab.id === tabId);
    if (activeTab) return activeTab;

    const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
    const inactiveWorkspaceIds = (useWorkspaceStore
      .getState()
      .workspaces ?? []).map((workspace) => workspace.id)
      .filter((workspaceId) => workspaceId !== activeWorkspaceId);
    const workspaceTabs = await Promise.all(
      inactiveWorkspaceIds.map((workspaceId) =>
        storage.getTabsByWorkspace(workspaceId),
      ),
    );
    return workspaceTabs.flat().find((tab) => tab.id === tabId);
  };

  return {
    // NO MORE STATE MIRRORING
    initialUrlProcessed: false,
    setInitialUrlProcessed: (status) => set({ initialUrlProcessed: status }),

    // URL sync suppression (for share tab creation)
    suppressUrlSync: false,
    setSuppressUrlSync: (suppress) => set({ suppressUrlSync: suppress }),

    // ACTIONS
    addTab: (tab, toRightSide = false) => {
      useTabsStore.getState().addTab(tab);
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide, tab.id);

      broadcastManager.broadcastWorkspaceState(
        useSplitViewStore.getState().splitView.workspaceId,
        {
          tabs: useTabsStore.getState().tabs,
          splitView: useSplitViewStore.getState().splitView,
        },
      );

      incrementSetting("tabs.created.total")
        .then((newTotal) => {
          useMilestoneCelebrationStore.getState().checkMilestone(newTotal);
        })
        .catch((err) =>
          console.error("Failed to increment tab counter:", err),
        );
    },

    addBackgroundTab: (tab, toRightSide = false) => {
      useTabsStore.getState().addBackgroundTab(tab);
      const currentTabId = toRightSide
        ? useSplitViewStore.getState().splitView.activeRightTabId
        : useSplitViewStore.getState().splitView.activeLeftTabId;
      useSplitViewStore
        .getState()
        .addTabToSide(tab.id, toRightSide, currentTabId || undefined);
    },

    handleNewPopulatedTab: async (tabInput, toRightSide = false) => {
      const { addTab } = get();
      // Populated tabs (tablets, rich text, or tabs with content) bypass the empty tab limit
      // Only check the limit if this is truly an empty scratch tab
      const isPopulated = tabInput.isTablet || tabInput.isRich || (tabInput.content && tabInput.content.length > 0);

      if (!isPopulated) {
        const { canAddNewTab } = get();
        if (!canAddNewTab(toRightSide)) {
          console.error('[handleNewPopulatedTab] Cannot add new tab - empty tab limit reached');
          return undefined;
        }
      }

      const ensuredWorkspaceId = await useWorkspaceStore
        .getState()
        .ensureWorkspace();

      if (!ensuredWorkspaceId) {
        return undefined;
      }

      // Ensure the workspace is expanded in the sidebar
      // This is especially important when creating from the welcome screen
      useSidebarStore.getState().expandWorkspace(ensuredWorkspaceId);

      const newTabObject = _createFinalTabObject(tabInput, ensuredWorkspaceId, {
        defaultTitle: tabInput.title || "Populated Tab",
      });

      addTab(newTabObject, toRightSide);

      // Trigger inline editing in sidebar
      useSidebarStore.getState().setEditingId(newTabObject.id, newTabObject.title);

      return newTabObject.id;
    },

    handleNewTab: async (isRightSide, content) => {
      const { canAddNewTab, addTab } = get();
      if (!canAddNewTab(isRightSide)) return undefined;
      const ensuredWorkspaceId = await useWorkspaceStore
        .getState()
        .ensureWorkspace();
      if (!ensuredWorkspaceId) return undefined;

      // Ensure the workspace is expanded in the sidebar
      // This is especially important when creating from the welcome screen
      useSidebarStore.getState().expandWorkspace(ensuredWorkspaceId);

      const currentTabs = useTabsStore
        .getState()
        .tabs.filter((t) => t.workspaceId === ensuredWorkspaceId);
      const nonWelcomeTabs = currentTabs.filter(
        (tab) => tab.title !== "Welcome",
      );
      const defaultTitle = `${NEW_TAB_PREFIX} ${nonWelcomeTabs.length + 1}`;
      const newTabObject = _createFinalTabObject({}, ensuredWorkspaceId, {
        defaultTitle,
        initialContent: content,
      });
      addTab(newTabObject, isRightSide);

      // Trigger inline editing in sidebar
      useSidebarStore.getState().setEditingId(newTabObject.id, newTabObject.title);

      return newTabObject.id;
    },

    handleNewCanvas: async (isRightSide) => {
      const ensuredWorkspaceId = await useWorkspaceStore
        .getState()
        .ensureWorkspace();
      if (!ensuredWorkspaceId) return undefined;

      useSidebarStore.getState().expandWorkspace(ensuredWorkspaceId);

      const canvasCount = useTabsStore
        .getState()
        .tabs.filter(
          (tab) =>
            tab.workspaceId === ensuredWorkspaceId &&
            getTabContentKind(tab) === "canvas",
        ).length;
      const tabId = crypto.randomUUID();
      const canvasTab = _createFinalTabObject(
        {
          id: tabId,
          title: `Canvas ${canvasCount + 1}`,
          contentKind: "canvas",
          documentId: tabId,
          content: "",
          language: "plaintext",
          languageLocked: true,
        },
        ensuredWorkspaceId,
        { defaultTitle: `Canvas ${canvasCount + 1}` },
      );

      const { canvasDocumentManager } = await import(
        "../features/canvas/services/CanvasDocumentManager"
      );
      await canvasDocumentManager.create(canvasTab);
      get().addTab(canvasTab, isRightSide);

      await storage.saveSplitViewNow({
        ...useSplitViewStore.getState().splitView,
        lastModified: Date.now(),
      });

      return tabId;
    },

    handleNewTabFromPaste: async (isRightSide) => {
      try {
        const imageDataUrl = await _extractImageFromClipboard();
        if (imageDataUrl) {
          // Note: _createImageTab doesn't return the ID yet, but for now we follow the existing pattern
          await _createImageTab(imageDataUrl, isRightSide, get(), _createFinalTabObject);
          // We can't easily get the ID from _createImageTab without refactoring it too
          // but handleNewTab below returns it.
          return undefined;
        }

        // No images found, fall back to text content
        const content = await navigator.clipboard.readText();
        return get().handleNewTab(isRightSide, content);
      } catch (error) {
        // Fallback to text-only if clipboard API fails
        console.warn('Clipboard API failed, falling back to text:', error);
        try {
          const content = await navigator.clipboard.readText();
          return get().handleNewTab(isRightSide, content);
        } catch {
          // If even text reading fails, create an empty tab
          return get().handleNewTab(isRightSide, '');
        }
      }
    },

    removeTab: async (id) => {
      const tabToRemove = await _findTabForLifecycle(id);
      if (!tabToRemove) {
        // The tab's workspace no longer exists (orphaned record), so the
        // normal lifecycle path cannot find it. Hard-delete it instead.
        await storage.purgeOrphanedTabData(id);
        return;
      }

      const isCanvas = getTabContentKind(tabToRemove) === "canvas";
      const activeWorkspaceId =
        useWorkspaceStore.getState().activeWorkspaceId;
      const isActiveWorkspace =
        tabToRemove.workspaceId === activeWorkspaceId;
      const adapter = await tabDocumentAdapterResolver.resolve(tabToRemove);

      await adapter.remove(tabToRemove);

      if (isActiveWorkspace) {
        if (!isCanvas) modelManager.dispose(id);
        useQueryPanelStore.getState().removePanelState(id);
        useSplitViewStore.getState().removeTabFromSide(id);
        useTabsStore.getState().removeTab(id);

        broadcastManager.broadcastWorkspaceState(
          useSplitViewStore.getState().splitView.workspaceId,
          {
            tabs: useTabsStore.getState().tabs,
            splitView: useSplitViewStore.getState().splitView,
          },
        );
      } else {
        const splitView = await storage.getSplitViewByWorkspace(
          tabToRemove.workspaceId,
        );
        if (splitView) {
          splitView.leftTabs = splitView.leftTabs.filter(
            (tabId) => tabId !== id,
          );
          splitView.rightTabs = splitView.rightTabs.filter(
            (tabId) => tabId !== id,
          );
          splitView.leftTabHistory = (splitView.leftTabHistory ?? []).filter(
            (tabId) => tabId !== id,
          );
          splitView.rightTabHistory = (splitView.rightTabHistory ?? []).filter(
            (tabId) => tabId !== id,
          );
          if (splitView.activeLeftTabId === id) {
            splitView.activeLeftTabId = splitView.leftTabs[0] ?? null;
          }
          if (splitView.activeRightTabId === id) {
            splitView.activeRightTabId = splitView.rightTabs[0] ?? null;
          }
          splitView.lastModified = Date.now();
          await storage.saveSplitViewNow(splitView);
        }
        await useSidebarStore
          .getState()
          .refreshWorkspaceMetadata(tabToRemove.workspaceId);
        await _broadcastMetadataUpdate(tabToRemove.workspaceId);
      }
    },

    setActiveTab: (id) => {
      const { splitView } = useSplitViewStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();
      const lastAccessed = Date.now();

      if (splitView.leftTabs.includes(id)) {
        useSplitViewStore.getState().setActiveLeftTab(id);
      } else if (splitView.rightTabs.includes(id)) {
        useSplitViewStore.getState().setActiveRightTab(id);
      } else {
        useSplitViewStore.getState().setActiveLeftTab(id);
      }

      useTabsStore.getState().updateTabAccessed?.(id, lastAccessed);
      _updateStoredTabAccessed(storage, id, lastAccessed);

      // Record navigation history (only if not currently navigating via back/forward)
      if (activeWorkspaceId && !navigationService.isCurrentlyNavigating()) {
        useNavigationStore.getState().pushEntry(activeWorkspaceId, id);
      }
    },

    updateTabContent: (id, content) =>
      useTabsStore.getState().updateTabContent(id, content),
    updateTabLanguage: (id, language, lock = true) =>
      useTabsStore.getState().updateTabLanguage(id, language, lock),
    updateTabTitle: (id, title) =>
      useTabsStore.getState().updateTabTitle(id, title),
    updateTabState: (id, updates) =>
      useTabsStore.getState().updateTabState(id, updates),

    toggleTabPin: (id) => {
      const { tabs } = useTabsStore.getState();
      const { splitView } = useSplitViewStore.getState();
      const tab = tabs.find((t) => t.id === id);
      if (!tab) {
        const sidebarState = useSidebarStore.getState();
        let metadataTab: SidebarTabInfo | undefined;

        for (const metadata of sidebarState.workspaceTabsMetadata.values()) {
          metadataTab = metadata.find((t) => t.id === id);
          if (metadataTab) break;
        }

        if (!metadataTab) return;

        const isPinned = !metadataTab.isPinned;
        _updateStoredTabPinned(storage, id, isPinned)
          .then(() => sidebarState.refreshWorkspaceMetadata(metadataTab!.workspaceId))
          .then(() => _broadcastMetadataUpdate(metadataTab!.workspaceId))
          .catch((err) => console.error("Failed to toggle inactive tab pin:", err));
        return;
      }
      const isPinned = !tab.isPinned;
      useTabsStore.getState().updateTabState(id, { isPinned });
      _updateStoredTabPinned(storage, id, isPinned)
        .catch((err) => console.error("Failed to update tab pin state:", err));
      if (isPinned) {
        const side = splitView.leftTabs.includes(id) ? "left" : "right";
        let currentList =
          side === "left" ? [...splitView.leftTabs] : [...splitView.rightTabs];
        const allCurrentTabs = useTabsStore.getState().tabs;
        let firstUnpinnedIndex = -1;
        for (let i = 0; i < currentList.length; i++) {
          const currentTab = allCurrentTabs.find(
            (t) => t.id === currentList[i],
          );
          if (currentTab && !currentTab.isPinned && currentList[i] !== id) {
            firstUnpinnedIndex = i;
            break;
          }
        }
        currentList = currentList.filter((tabId) => tabId !== id);
        const insertIndex =
          firstUnpinnedIndex === -1 ? currentList.length : firstUnpinnedIndex;
        currentList.splice(insertIndex, 0, id);
        if (side === "left")
          useSplitViewStore.getState().setSplitView({ leftTabs: currentList });
        else
          useSplitViewStore.getState().setSplitView({ rightTabs: currentList });
      }
    },

    updateTabOrder: (leftTabs, rightTabs) =>
      useSplitViewStore.getState().updateTabOrder(leftTabs, rightTabs),
    togglePreviewMode: () => useEditorStore.getState().togglePreviewMode(),

    splitScreen: (leftTabId, rightTabId) => {
      const { splitView } = useSplitViewStore.getState();

      // FIX: Only use tabs currently visible in the unsplit view, not all tabs from all workspaces
      let targetLeftIds: string[];
      let targetRightId: string;

      if (splitView.isSplit) {
        // Already split, shouldn't happen but handle gracefully
        return;
      }

      if (rightTabId) {
        // rightTabId is provided - put it on right, everything else on left
        targetLeftIds = splitView.leftTabs.filter((id) => id !== rightTabId);
        targetRightId = rightTabId;
      } else {
        // leftTabId is provided (from context menu) - put it on right, everything else on left
        targetLeftIds = splitView.leftTabs.filter((id) => id !== leftTabId);
        targetRightId = leftTabId;
      }

      if (!targetRightId) return;

      useSplitViewStore.getState().splitScreen(targetLeftIds, targetRightId);
    },

    unsplitScreen: (tabId) => useSplitViewStore.getState().unsplitScreen(tabId),
    moveTabToRight: (tabId) =>
      useSplitViewStore.getState().moveTabToRight(tabId),
    moveTabToLeft: (tabId) => useSplitViewStore.getState().moveTabToLeft(tabId),
    setActiveLeftTab: (id) => {
      const lastAccessed = Date.now();
      useSplitViewStore.getState().setActiveLeftTab(id);
      useTabsStore.getState().updateTabAccessed?.(id, lastAccessed);
      _updateStoredTabAccessed(storage, id, lastAccessed);
    },
    setActiveRightTab: (id) => {
      const lastAccessed = Date.now();
      useSplitViewStore.getState().setActiveRightTab(id);
      useTabsStore.getState().updateTabAccessed?.(id, lastAccessed);
      _updateStoredTabAccessed(storage, id, lastAccessed);
    },
    setActiveSide: (side) => useSplitViewStore.getState().setActiveSide(side),
    setSplitRatio: (ratio) => useSplitViewStore.getState().setSplitRatio(ratio),

    // Bulk tab operations (delegate to splitViewStore)
    closeTabsToLeft: async (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getTabsToLeft(tabId, isRightSide);
      const { tabs } = useTabsStore.getState();
      const isPinnedTab = (id: string) => tabs.find(t => t.id === id)?.isPinned || false;

      // Update UI respecting pinned tabs
      useSplitViewStore.getState().closeTabsToLeftRespectingPins(tabId, isRightSide, isPinnedTab);

      // Remove only unpinned tabs from data store
      await Promise.all(
        tabsToClose
          .filter((id) => !isPinnedTab(id))
          .map((id) => get().removeTab(id)),
      );
    },
    closeTabsToRight: async (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getTabsToRight(tabId, isRightSide);
      const { tabs } = useTabsStore.getState();
      const isPinnedTab = (id: string) => tabs.find(t => t.id === id)?.isPinned || false;

      // Update UI respecting pinned tabs
      useSplitViewStore.getState().closeTabsToRightRespectingPins(tabId, isRightSide, isPinnedTab);

      // Remove only unpinned tabs from data store
      await Promise.all(
        tabsToClose
          .filter((id) => !isPinnedTab(id))
          .map((id) => get().removeTab(id)),
      );
    },
    closeAllExcept: async (tabId, isRightSide) => {
      const tabsToClose = useSplitViewStore.getState().getAllExcept(tabId, isRightSide);
      const { tabs } = useTabsStore.getState();
      const isPinnedTab = (id: string) => tabs.find(t => t.id === id)?.isPinned || false;

      // Update UI respecting pinned tabs
      useSplitViewStore.getState().closeAllExceptRespectingPins(tabId, isRightSide, isPinnedTab);

      // Remove only unpinned tabs from data store
      await Promise.all(
        tabsToClose
          .filter((id) => !isPinnedTab(id))
          .map((id) => get().removeTab(id)),
      );
    },
    duplicateTab: async (tabId, isRightSide = false) => {
      const source = await _findTabForLifecycle(tabId);
      if (!source) return "";

      const adapter = await tabDocumentAdapterResolver.resolve(source);
      const duplicate = await adapter.duplicate(source, source.workspaceId);
      const activeWorkspaceId =
        useWorkspaceStore.getState().activeWorkspaceId;

      if (duplicate.workspaceId === activeWorkspaceId) {
        useTabsStore.getState().addTab(duplicate);
        useSplitViewStore
          .getState()
          .addTabToSide(duplicate.id, isRightSide, undefined, tabId);
        const { setActiveLeftTab, setActiveRightTab } =
          useSplitViewStore.getState();
        if (isRightSide) {
          setActiveRightTab(duplicate.id);
        } else {
          setActiveLeftTab(duplicate.id);
        }
        broadcastManager.broadcastWorkspaceState(
          useSplitViewStore.getState().splitView.workspaceId,
          {
            tabs: useTabsStore.getState().tabs,
            splitView: useSplitViewStore.getState().splitView,
          },
        );
      } else {
        const splitView = await storage.getSplitViewByWorkspace(
          duplicate.workspaceId,
        );
        if (splitView) {
          splitView.leftTabs = [
            ...splitView.leftTabs.filter((id) => id !== duplicate.id),
            duplicate.id,
          ];
          splitView.activeLeftTabId = duplicate.id;
          splitView.leftTabHistory = [
            ...(splitView.leftTabHistory ?? []).filter(
              (id) => id !== duplicate.id,
            ),
            duplicate.id,
          ];
          splitView.lastModified = Date.now();
          await storage.saveSplitViewNow(splitView);
        }
        await useSidebarStore
          .getState()
          .refreshWorkspaceMetadata(duplicate.workspaceId);
        await _broadcastMetadataUpdate(duplicate.workspaceId);
      }

      incrementSetting("tabs.created.total").catch((err) =>
        console.error("Failed to increment tab counter:", err),
      );
      return duplicate.id;
    },
    duplicateAndSplitTab: async (tabId) => {
      const newTabId = await get().duplicateTab(tabId, true);
      if (!newTabId) return "";
      get().splitScreen(tabId, newTabId);
      broadcastManager.broadcastWorkspaceState(
        useSplitViewStore.getState().splitView.workspaceId,
        {
          tabs: useTabsStore.getState().tabs,
          splitView: useSplitViewStore.getState().splitView,
        },
      );
      return newTabId;
    },

    groupTabsByType: (isRightSide) => {
      // Logic might move to splitViewStore
      const { tabs } = useTabsStore.getState();
      const { splitView, setSplitView } = useSplitViewStore.getState();
      const currentTabList = isRightSide
        ? splitView.rightTabs
        : splitView.leftTabs;
      const groupedTabs = groupTabsByLanguage(tabs, currentTabList); // Use util

      if (isRightSide) {
        setSplitView({ rightTabs: groupedTabs });
      } else {
        setSplitView({ leftTabs: groupedTabs });
      }
    },

    // Tab limit checks (delegate)
    canAddNewTab: (toRightSide = false) => {
      const { tabs } = useTabsStore.getState();
      const { splitView } = useSplitViewStore.getState();
      if (!splitView) {
        return true;
      } else if (splitView.isSplit) {
        const targetList = toRightSide
          ? splitView.rightTabs
          : splitView.leftTabs;
        return (
          targetList.filter((id) => {
            const tab = tabs.find((t) => t.id === id);
            return tab && isTabEmpty(tab);
          }).length < 3
        );
      } else {
        return countEmptyTabs(tabs) < 3;
      }
    },

    compareFromClipboard: async (originalTabId, isRightSide) => {
      const { splitView } = useSplitViewStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();
      let clipboardContent = "";
      try {
        clipboardContent = await navigator.clipboard.readText();
      } catch (err) {
        console.error("Paste failed:", err);
        return;
      }
      const addNewTabToRight = !isRightSide;
      const language = detectFormat(clipboardContent);
      const shouldLock =
        language !== "plaintext" && !isAmbiguousFormat(clipboardContent);

      // Process clipboard content through content processing pipeline
      // This handles unstringifying JSON, formatting, etc. for all formats
      const { content: processedContent } = await contentProcessingService.processClipboardForComparison(
        clipboardContent,
        language
      );

      const newTabId = crypto.randomUUID();
      const now = Date.now();
      const newTab: Tab = {
        id: newTabId,
        title: "Clipboard Compare",
        content: processedContent, // Use processed content instead of raw clipboard
        language,
        languageLocked: shouldLock,
        cursorPosition: { lineNumber: 1, column: 1 },
        isTablet: false,
        dateCreated: now,
        lastModified: now,
        workspaceId: activeWorkspaceId || "",
      };
      if (!splitView.isSplit) {
        get().addTab(newTab, true);
        get().splitScreen(originalTabId, newTabId);
      } else {
        get().addTab(newTab, addNewTabToRight);
        if (isRightSide) {
          useSplitViewStore.getState().setActiveRightTab(originalTabId);
        } else {
          useSplitViewStore.getState().setActiveLeftTab(originalTabId);
        }
      }
    },

    reorderTabs: (side, newOrder) =>
      useSplitViewStore.getState().reorderTabs(side, newOrder),

    /**
     * Moves a tab from one workspace to another using the Copy-then-Delete pattern.
     *
     * @param tabId - ID of the tab to move
     * @param sourceWorkspaceId - Source workspace ID
     * @param targetWorkspaceId - Target workspace ID
     */
    moveTabBetweenWorkspaces: async (
      tabId: string,
      sourceWorkspaceId: string,
      targetWorkspaceId: string
    ) => {
      const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      const storage = StorageProviderFactory.getProvider();

      try {
        // Step 1: Get the full tab data
        let fullTab: Tab | undefined;

        if (sourceWorkspaceId === activeWorkspaceId) {
          // Source is active workspace - get from store
          fullTab = useTabsStore.getState().tabs.find(t => t.id === tabId);
        } else {
          // Source is inactive workspace - get from IndexedDB
          const tabs = await storage.getTabsByWorkspace(sourceWorkspaceId);
          fullTab = tabs.find(t => t.id === tabId);
        }

        if (!fullTab) {
          throw new Error(`Tab ${tabId} not found in source workspace`);
        }

        // Persist document ownership before changing in-memory workspace state.
        const adapter = await tabDocumentAdapterResolver.resolve(fullTab);
        const updatedTab = await adapter.move(fullTab, targetWorkspaceId);

        // Add to target workspace.
        if (targetWorkspaceId === activeWorkspaceId) {
          useTabsStore.getState().addTab(updatedTab);
          useSplitViewStore.getState().addTabToSide(updatedTab.id, false, updatedTab.id);

          broadcastManager.broadcastWorkspaceState(
            targetWorkspaceId,
            {
              tabs: useTabsStore.getState().tabs,
              splitView: useSplitViewStore.getState().splitView,
            }
          );
        } else {
          const targetSplitView = await storage.getSplitViewByWorkspace(targetWorkspaceId);
          if (targetSplitView) {
            targetSplitView.leftTabs = [
              ...targetSplitView.leftTabs.filter(id => id !== updatedTab.id),
              updatedTab.id,
            ];
            targetSplitView.rightTabs = targetSplitView.rightTabs.filter(id => id !== updatedTab.id);
            targetSplitView.activeLeftTabId = updatedTab.id;
            targetSplitView.activeSide = "left";
            targetSplitView.leftTabHistory = [
              ...(targetSplitView.leftTabHistory || []).filter(id => id !== updatedTab.id),
              updatedTab.id,
            ];
            targetSplitView.rightTabHistory = (targetSplitView.rightTabHistory || []).filter(
              id => id !== updatedTab.id
            );
            targetSplitView.lastModified = Date.now();
            await storage.saveSplitViewNow(targetSplitView);
          }

          await useSidebarStore.getState().refreshWorkspaceMetadata(targetWorkspaceId);
          await _broadcastMetadataUpdate(targetWorkspaceId);
        }

        // Remove the old workspace placement. The adapter has already updated
        // the single persisted tab record.
        if (sourceWorkspaceId === activeWorkspaceId) {
          if (getTabContentKind(fullTab) !== "canvas") {
            modelManager.dispose(tabId);
          }
          useQueryPanelStore.getState().removePanelState(tabId);
          useSplitViewStore.getState().removeTabFromSide(tabId);
          useTabsStore.getState().removeTab(tabId);

          broadcastManager.broadcastWorkspaceState(
            sourceWorkspaceId,
            {
              tabs: useTabsStore.getState().tabs,
              splitView: useSplitViewStore.getState().splitView,
            }
          );
        } else {
          const sourceSplitView = await storage.getSplitViewByWorkspace(sourceWorkspaceId);
          if (sourceSplitView) {
            sourceSplitView.leftTabs = sourceSplitView.leftTabs.filter(id => id !== tabId);
            sourceSplitView.rightTabs = sourceSplitView.rightTabs.filter(id => id !== tabId);
            sourceSplitView.lastModified = Date.now();

            if (sourceSplitView.activeLeftTabId === tabId) {
              sourceSplitView.activeLeftTabId = sourceSplitView.leftTabs[0] || null;
            }
            if (sourceSplitView.activeRightTabId === tabId) {
              sourceSplitView.activeRightTabId = sourceSplitView.rightTabs[0] || null;
            }

            await storage.saveSplitViewNow(sourceSplitView);
          }

          await useSidebarStore.getState().refreshWorkspaceMetadata(sourceWorkspaceId);
          await _broadcastMetadataUpdate(sourceWorkspaceId);
        }
      } catch (error) {
        console.error('Failed to move tab between workspaces:', error);
        throw error;
      }
    },

    /**
     * Reorders tabs within an inactive workspace.
     * For active workspace, use reorderTabs() instead.
     *
     * @param workspaceId - Workspace ID
     * @param newTabOrder - New order of tab IDs
     */
    reorderTabsInWorkspace: async (
      workspaceId: string,
      newTabOrder: string[]
    ) => {
      const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;

      // If this is the active workspace, use the existing reorderTabs
      if (workspaceId === activeWorkspaceId) {
        console.warn('Use reorderTabs() for active workspace reordering');
        return;
      }

      const storage = StorageProviderFactory.getProvider();

      try {
        // Get the splitView for this workspace
        const splitView = await storage.getSplitViewByWorkspace(workspaceId);

        if (splitView) {
          // Update the tab order in splitView
          // For inactive workspaces, we maintain the combined order in leftTabs
          splitView.leftTabs = newTabOrder;
          splitView.lastModified = Date.now();

          // Save the updated splitView
          await storage.saveSplitViewNow(splitView);

          // Refresh sidebar metadata
          await useSidebarStore.getState().refreshWorkspaceMetadata(workspaceId);
          // Broadcast metadata update for cross-window sync
          await _broadcastMetadataUpdate(workspaceId);
        }
      } catch (error) {
        console.error('Failed to reorder tabs in workspace:', error);
        throw error;
      }
    },

    saveTabDataById: (tabId) => {
      const { tabs } = useTabsStore.getState();
      if (!tabId) return;
      const tabToSave = tabs.find((tab) => tab.id === tabId);
      if (!tabToSave || tabToSave.isTablet) return;
      try {
        const detector = formatRegistry.getById(tabToSave.language);
        const extension = detector?.getFileExtension() || "txt";
        const blob = new Blob([tabToSave.content || ""], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tabToSave.title}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(`Save error Tab ID ${tabId}:`, error);
      }
    },

    setActiveView: (tabId, viewId) => {
      useTabsStore.getState().updateTabState(tabId, { activeViewId: viewId });
    },

    getActiveView: (tabId) => {
      const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
      return tab?.activeViewId || null;
    },

    // Navigation actions
    navigateBack: async () => {
      await navigationService.goBack();
    },

    navigateForward: async () => {
      await navigationService.goForward();
    },
  };
});
