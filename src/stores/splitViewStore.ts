import { create } from "zustand";
import { SplitViewState } from "../types";
import {
  updateTabHistory,
  getPreviousActiveTab,
  removeTabFromHistory,
  createDefaultSplitViewState,
  removeTabFromSplitView,
} from "../utils";

interface SplitViewStore {
  splitView: SplitViewState;
  setSplitView: (splitView: Partial<SplitViewState>) => void;
  splitScreen: (leftTabIds: string[], rightTabId: string) => void;
  unsplitScreen: (tabId?: string) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setActiveSide: (side: "left" | "right") => void;
  setSplitRatio: (ratio: number) => void;
  setLeftScrollPosition: (position: number) => void;
  setRightScrollPosition: (position: number) => void;
  addTabToSide: (
    tabId: string,
    toRightSide: boolean,
    activeTabId?: string,
    insertAfterId?: string,
  ) => void;
  removeTabFromSide: (tabId: string) => void;
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  // Pinned-tab-aware close operations
  closeAllExceptRespectingPins: (tabId: string, isRightSide: boolean, isPinnedTab: (id: string) => boolean) => void;
  closeTabsToLeftRespectingPins: (tabId: string, isRightSide: boolean, isPinnedTab: (id: string) => boolean) => void;
  closeTabsToRightRespectingPins: (tabId: string, isRightSide: boolean, isPinnedTab: (id: string) => boolean) => void;
  groupTabsByType: (isRightSide: boolean) => void;
  updateTabOrder: (newLeftTabs: string[], newRightTabs: string[]) => void;
  reorderTabs: (side: "left" | "right", newOrder: string[]) => void;
  getTabsToLeft: (tabId: string, isRightSide: boolean) => string[];
  getTabsToRight: (tabId: string, isRightSide: boolean) => string[];
  getAllExcept: (tabId: string, isRightSide: boolean) => string[];
  createDefaultSplitViewState: (workspaceId?: string) => SplitViewState;
  clearSplitViewForWorkspace: (workspaceId: string) => void;
}

export const useSplitViewStore = create<SplitViewStore>((set, get) => ({
  splitView: createDefaultSplitViewState(),

  createDefaultSplitViewState: (workspaceId?: string) =>
    createDefaultSplitViewState(workspaceId),

  setSplitView: (newSplitView) =>
    set((state) => {
      const leftTabHistory =
        newSplitView.leftTabHistory || state.splitView.leftTabHistory || [];
      const rightTabHistory =
        newSplitView.rightTabHistory || state.splitView.rightTabHistory || [];
      return {
        splitView: {
          ...state.splitView,
          ...newSplitView,
          leftTabHistory,
          rightTabHistory,
        },
      };
    }),

  splitScreen: (leftTabIds, rightTabId) =>
    set((state) => {
      if (state.splitView.isSplit) return state;

      // Use the existing tab history to determine which tab should be active on the left side
      // Filter the current history to only include tabs that will be on the left side
      const filteredHistory = (state.splitView.leftTabHistory || []).filter(
        (id) => leftTabIds.includes(id),
      );

      const newActiveLeftTabId = getPreviousActiveTab(
        filteredHistory,
        leftTabIds,
      );

      return {
        splitView: {
          ...state.splitView,
          isSplit: true,
          leftTabs: leftTabIds,
          rightTabs: [rightTabId],
          activeLeftTabId: newActiveLeftTabId,
          activeRightTabId: rightTabId,
          activeSide: "right",
          splitRatio: 0.5,
          leftTabHistory: newActiveLeftTabId ? [newActiveLeftTabId] : [],
          rightTabHistory: [rightTabId],
        },
      };
    }),

  unsplitScreen: (tabId?: string) =>
    set((state) => {
      if (!state.splitView.isSplit) return state;
      const allTabs = [
        ...state.splitView.leftTabs,
        ...state.splitView.rightTabs,
      ];

      // FIX: Use the provided tabId as the active tab if it's valid, otherwise fallback to current logic
      let finalActiveId: string | null = null;
      if (tabId && allTabs.includes(tabId)) {
        finalActiveId = tabId;
      } else {
        finalActiveId = state.splitView.activeLeftTabId || allTabs[0] || null;
      }

      return {
        splitView: {
          ...state.splitView,
          isSplit: false,
          leftTabs: allTabs,
          rightTabs: [],
          activeLeftTabId: finalActiveId,
          activeRightTabId: null,
          activeSide: "left",
          splitRatio: 0.5,
          leftTabHistory: finalActiveId ? [finalActiveId] : [],
          rightTabHistory: [],
        },
      };
    }),

  moveTabToRight: (tabId) =>
    set((state) => {
      if (!state.splitView.isSplit || !state.splitView.leftTabs.includes(tabId))
        return state;
      const newLeftTabs = state.splitView.leftTabs.filter((id) => id !== tabId);
      if (newLeftTabs.length === 0 && state.splitView.rightTabs.length === 0)
        return state; // Prevent moving last tab
      if (newLeftTabs.length === 0 && state.splitView.rightTabs.length > 0) {
        // If left becomes empty, unsplit to right
        const allTabs = [...state.splitView.rightTabs, tabId];
        const activeTab = tabId; // Make the moved tab active
        return {
          splitView: {
            ...state.splitView,
            isSplit: false,
            leftTabs: allTabs,
            rightTabs: [],
            activeLeftTabId: activeTab,
            activeRightTabId: null,
            activeSide: "left",
            leftTabHistory: updateTabHistory(
              state.splitView.rightTabHistory,
              tabId,
            ), // Use right history as base
            rightTabHistory: [],
          },
        };
      }
      const newRightTabs = [...state.splitView.rightTabs, tabId];
      const newActiveLeftTabId =
        state.splitView.activeLeftTabId === tabId
          ? getPreviousActiveTab(state.splitView.leftTabHistory, newLeftTabs)
          : state.splitView.activeLeftTabId;
      return {
        splitView: {
          ...state.splitView,
          leftTabs: newLeftTabs,
          rightTabs: newRightTabs,
          activeLeftTabId: newActiveLeftTabId,
          activeRightTabId: tabId,
          activeSide: "right",
          leftTabHistory: removeTabFromHistory(
            state.splitView.leftTabHistory,
            tabId,
          ),
          rightTabHistory: updateTabHistory(
            state.splitView.rightTabHistory,
            tabId,
          ),
        },
      };
    }),

  moveTabToLeft: (tabId) =>
    set((state) => {
      if (
        !state.splitView.isSplit ||
        !state.splitView.rightTabs.includes(tabId)
      )
        return state;
      const newRightTabs = state.splitView.rightTabs.filter(
        (id) => id !== tabId,
      );
      if (newRightTabs.length === 0 && state.splitView.leftTabs.length === 0)
        return state; // Prevent moving last tab
      if (newRightTabs.length === 0 && state.splitView.leftTabs.length > 0) {
        // If right becomes empty, unsplit to left
        const allTabs = [...state.splitView.leftTabs, tabId];
        const activeTab = tabId;
        return {
          splitView: {
            ...state.splitView,
            isSplit: false,
            leftTabs: allTabs,
            rightTabs: [],
            activeLeftTabId: activeTab,
            activeRightTabId: null,
            activeSide: "left",
            leftTabHistory: updateTabHistory(
              state.splitView.leftTabHistory,
              tabId,
            ), // Use left history
            rightTabHistory: [],
          },
        };
      }
      const newLeftTabs = [...state.splitView.leftTabs, tabId];
      const newActiveRightTabId =
        state.splitView.activeRightTabId === tabId
          ? getPreviousActiveTab(state.splitView.rightTabHistory, newRightTabs)
          : state.splitView.activeRightTabId;
      return {
        splitView: {
          ...state.splitView,
          leftTabs: newLeftTabs,
          rightTabs: newRightTabs,
          activeRightTabId: newActiveRightTabId,
          activeLeftTabId: tabId,
          activeSide: "left",
          rightTabHistory: removeTabFromHistory(
            state.splitView.rightTabHistory,
            tabId,
          ),
          leftTabHistory: updateTabHistory(
            state.splitView.leftTabHistory,
            tabId,
          ),
        },
      };
    }),

  setActiveLeftTab: (id) =>
    set((state) => ({
      splitView: {
        ...state.splitView,
        activeLeftTabId: id,
        activeSide: "left",
        leftTabHistory: updateTabHistory(
          state.splitView.leftTabHistory || [],
          id,
        ),
      },
    })),

  setActiveRightTab: (id) =>
    set((state) => ({
      splitView: {
        ...state.splitView,
        activeRightTabId: id,
        activeSide: "right",
        rightTabHistory: updateTabHistory(
          state.splitView.rightTabHistory || [],
          id,
        ),
      },
    })),

  setActiveSide: (side) =>
    set((state) => ({
      splitView: { ...state.splitView, activeSide: side },
    })),

  setSplitRatio: (ratio) =>
    set((state) => ({
      splitView: { ...state.splitView, splitRatio: ratio },
    })),

  setLeftScrollPosition: (position) =>
    set((state) => ({
      splitView: { ...state.splitView, leftScrollPosition: position },
    })),

  setRightScrollPosition: (position) =>
    set((state) => ({
      splitView: { ...state.splitView, rightScrollPosition: position },
    })),

  addTabToSide: (tabId, toRightSide, activeTabIdFromCaller, insertAfterId) =>
    set((state) => {
      const targetActiveTabId = activeTabIdFromCaller || tabId;

      const insertAfter = (list: string[], newId: string, afterId?: string): string[] => {
        if (!afterId) return [...list, newId];
        const idx = list.indexOf(afterId);
        if (idx === -1) return [...list, newId];
        const result = [...list];
        result.splice(idx + 1, 0, newId);
        return result;
      };

      if (toRightSide) {
        return {
          splitView: {
            ...state.splitView,
            rightTabs: insertAfter(state.splitView.rightTabs || [], tabId, insertAfterId),
            activeRightTabId: targetActiveTabId,
            activeSide: "right",
            rightTabHistory: updateTabHistory(
              state.splitView.rightTabHistory || [],
              targetActiveTabId,
            ),
          },
        };
      } else {
        return {
          splitView: {
            ...state.splitView,
            leftTabs: insertAfter(state.splitView.leftTabs || [], tabId, insertAfterId),
            activeLeftTabId: targetActiveTabId,
            activeSide: "left",
            leftTabHistory: updateTabHistory(
              state.splitView.leftTabHistory || [],
              targetActiveTabId,
            ),
          },
        };
      }
    }),

  removeTabFromSide: (tabId) =>
    set((state) => ({
      splitView: removeTabFromSplitView(state.splitView, tabId),
    })),

  closeTabsToLeft: (tabId, isRightSide) =>
    set((state) => {
      const currentTabList = isRightSide
        ? state.splitView.rightTabs
        : state.splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);
      if (tabIndex <= 0) return state;
      const tabsToKeep = currentTabList.slice(tabIndex);
      const newSplitView = { ...state.splitView };
      if (isRightSide) {
        newSplitView.rightTabs = tabsToKeep;
        newSplitView.rightTabHistory = (
          newSplitView.rightTabHistory || []
        ).filter((id) => tabsToKeep.includes(id) || id === tabId);
        if (!tabsToKeep.includes(newSplitView.activeRightTabId!))
          newSplitView.activeRightTabId = tabId;
      } else {
        newSplitView.leftTabs = tabsToKeep;
        newSplitView.leftTabHistory = (
          newSplitView.leftTabHistory || []
        ).filter((id) => tabsToKeep.includes(id) || id === tabId);
        if (!tabsToKeep.includes(newSplitView.activeLeftTabId!))
          newSplitView.activeLeftTabId = tabId;
      }
      return { splitView: newSplitView };
    }),

  closeTabsToRight: (tabId, isRightSide) =>
    set((state) => {
      const currentTabList = isRightSide
        ? state.splitView.rightTabs
        : state.splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);
      if (tabIndex === -1 || tabIndex >= currentTabList.length - 1)
        return state;
      const tabsToKeep = currentTabList.slice(0, tabIndex + 1);
      const newSplitView = { ...state.splitView };
      if (isRightSide) {
        newSplitView.rightTabs = tabsToKeep;
        newSplitView.rightTabHistory = (
          newSplitView.rightTabHistory || []
        ).filter((id) => tabsToKeep.includes(id));
        if (!tabsToKeep.includes(newSplitView.activeRightTabId!))
          newSplitView.activeRightTabId = tabId;
      } else {
        newSplitView.leftTabs = tabsToKeep;
        newSplitView.leftTabHistory = (
          newSplitView.leftTabHistory || []
        ).filter((id) => tabsToKeep.includes(id));
        if (!tabsToKeep.includes(newSplitView.activeLeftTabId!))
          newSplitView.activeLeftTabId = tabId;
      }
      return { splitView: newSplitView };
    }),

  closeAllExcept: (tabId, isRightSide) =>
    set((state) => {
      const newSplitView = { ...state.splitView };
      if (isRightSide) {
        newSplitView.rightTabs = [tabId];
        newSplitView.activeRightTabId = tabId;
        newSplitView.rightTabHistory = [tabId];
      } else {
        newSplitView.leftTabs = [tabId];
        newSplitView.activeLeftTabId = tabId;
        newSplitView.leftTabHistory = [tabId];
      }
      return { splitView: newSplitView };
    }),

  // Pinned-tab-aware close operations
  closeAllExceptRespectingPins: (tabId, isRightSide, isPinnedTab) =>
    set((state) => {
      const newSplitView = { ...state.splitView };
      const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
      
      // Keep current tab and pinned tabs
      const tabsToKeep = currentTabList.filter((id) => 
        id === tabId || isPinnedTab(id)
      );
      
      if (isRightSide) {
        newSplitView.rightTabs = tabsToKeep;
        newSplitView.activeRightTabId = tabId;
        newSplitView.rightTabHistory = (newSplitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id));
      } else {
        newSplitView.leftTabs = tabsToKeep;
        newSplitView.activeLeftTabId = tabId;
        newSplitView.leftTabHistory = (newSplitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id));
      }
      return { splitView: newSplitView };
    }),

  closeTabsToLeftRespectingPins: (tabId, isRightSide, isPinnedTab) =>
    set((state) => {
      const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
      const currentActiveTabId = isRightSide ? state.splitView.activeRightTabId : state.splitView.activeLeftTabId;
      
      const tabIndex = currentTabList.indexOf(tabId);
      if (tabIndex <= 0) return state;
      
      // Keep pinned tabs to the left, plus all tabs from current position onwards
      const tabsToTheLeft = currentTabList.slice(0, tabIndex);
      const pinnedTabsToTheLeft = tabsToTheLeft.filter(isPinnedTab);
      const tabsFromCurrentOnwards = currentTabList.slice(tabIndex);
      const tabsToKeep = [...pinnedTabsToTheLeft, ...tabsFromCurrentOnwards];
      
      const newSplitView = { ...state.splitView };
      if (isRightSide) {
        newSplitView.rightTabs = tabsToKeep;
        newSplitView.rightTabHistory = (newSplitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id));
        // Check if active tab still exists, if not set to the clicked tab
        if (!tabsToKeep.includes(currentActiveTabId)) {
          newSplitView.activeRightTabId = tabId;
        }
      } else {
        newSplitView.leftTabs = tabsToKeep;
        newSplitView.leftTabHistory = (newSplitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id));
        // Check if active tab still exists, if not set to the clicked tab
        if (!tabsToKeep.includes(currentActiveTabId)) {
          newSplitView.activeLeftTabId = tabId;
        }
      }
      return { splitView: newSplitView };
    }),

  closeTabsToRightRespectingPins: (tabId, isRightSide, isPinnedTab) =>
    set((state) => {
      const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
      const currentActiveTabId = isRightSide ? state.splitView.activeRightTabId : state.splitView.activeLeftTabId;
      
      const tabIndex = currentTabList.indexOf(tabId);
      if (tabIndex === -1 || tabIndex >= currentTabList.length - 1) return state;
      
      // Keep all tabs up to and including current tab, plus pinned tabs to the right
      const tabsUpToCurrent = currentTabList.slice(0, tabIndex + 1);
      const tabsToTheRight = currentTabList.slice(tabIndex + 1);
      const pinnedTabsToTheRight = tabsToTheRight.filter(isPinnedTab);
      const tabsToKeep = [...tabsUpToCurrent, ...pinnedTabsToTheRight];
      
      const newSplitView = { ...state.splitView };
      if (isRightSide) {
        newSplitView.rightTabs = tabsToKeep;
        newSplitView.rightTabHistory = (newSplitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id));
        // Check if active tab still exists, if not set to the clicked tab
        if (!tabsToKeep.includes(currentActiveTabId)) {
          newSplitView.activeRightTabId = tabId;
        }
      } else {
        newSplitView.leftTabs = tabsToKeep;
        newSplitView.leftTabHistory = (newSplitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id));
        // Check if active tab still exists, if not set to the clicked tab
        if (!tabsToKeep.includes(currentActiveTabId)) {
          newSplitView.activeLeftTabId = tabId;
        }
      }
      return { splitView: newSplitView };
    }),

  groupTabsByType: (_isRightSide) => set((state) => state), // No-op as grouping logic is in rootStore

  updateTabOrder: (newLeftTabs, newRightTabs) =>
    set((state) => {
      // This function assumes rootStore has already filtered histories if needed.
      // It directly sets the new tab orders and ensures active tabs are valid.
      const currentSplitView = state.splitView;
      return {
        splitView: {
          ...currentSplitView,
          leftTabs: newLeftTabs,
          rightTabs: newRightTabs,
          activeLeftTabId: newLeftTabs.includes(
            currentSplitView.activeLeftTabId!,
          )
            ? currentSplitView.activeLeftTabId
            : newLeftTabs[0] || null,
          activeRightTabId: newRightTabs.includes(
            currentSplitView.activeRightTabId!,
          )
            ? currentSplitView.activeRightTabId
            : newRightTabs[0] || null,
          // Consider if history should be fully re-evaluated here or if rootStore manages it
          leftTabHistory: (currentSplitView.leftTabHistory || []).filter((id) =>
            newLeftTabs.includes(id),
          ),
          rightTabHistory: (currentSplitView.rightTabHistory || []).filter(
            (id) => newRightTabs.includes(id),
          ),
        },
      };
    }),

  reorderTabs: (side, newOrder) =>
    set((state) => {
      // This is a more specific reorder if rootStore uses this name.
      // It's similar to updateTabOrder but for a single side.
      const currentSplitView = state.splitView;
      if (side === "left") {
        return {
          splitView: {
            ...currentSplitView,
            leftTabs: newOrder,
            activeLeftTabId: newOrder.includes(
              currentSplitView.activeLeftTabId!,
            )
              ? currentSplitView.activeLeftTabId
              : newOrder[0] || null,
            leftTabHistory: (currentSplitView.leftTabHistory || []).filter(
              (id) => newOrder.includes(id),
            ),
          },
        };
      } else {
        // side === 'right'
        return {
          splitView: {
            ...currentSplitView,
            rightTabs: newOrder,
            activeRightTabId: newOrder.includes(
              currentSplitView.activeRightTabId!,
            )
              ? currentSplitView.activeRightTabId
              : newOrder[0] || null,
            rightTabHistory: (currentSplitView.rightTabHistory || []).filter(
              (id) => newOrder.includes(id),
            ),
          },
        };
      }
    }),

  getTabsToLeft: (tabId, isRightSide) => {
    const { splitView } = get(); // Use get() to access current state
    const currentTabList = isRightSide
      ? splitView.rightTabs
      : splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);
    if (tabIndex <= 0) return [];
    return currentTabList.slice(0, tabIndex);
  },

  getTabsToRight: (tabId, isRightSide) => {
    const { splitView } = get();
    const currentTabList = isRightSide
      ? splitView.rightTabs
      : splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);
    if (tabIndex === -1 || tabIndex >= currentTabList.length - 1) return [];
    return currentTabList.slice(tabIndex + 1);
  },

  getAllExcept: (tabId, isRightSide) => {
    const { splitView } = get();
    const currentTabList = isRightSide
      ? splitView.rightTabs
      : splitView.leftTabs;
    if (currentTabList.length <= 1 && currentTabList.includes(tabId)) return [];
    return currentTabList.filter((id) => id !== tabId);
  },

  clearSplitViewForWorkspace: (workspaceId) =>
    set((state) => {
      // This is a more specific reorder if rootStore uses this name.
      // It's similar to updateTabOrder but for a single side.
      const currentSplitView = state.splitView;
      if (currentSplitView && currentSplitView.workspaceId === workspaceId) {
        return {
          splitView: undefined,
        };
      }
      return {};
    }),
}));
