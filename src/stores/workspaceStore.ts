import { create } from "zustand";
import { StorageProviderFactory, db } from "../db";
import { Workspace, Tab, SplitViewState, SplitViewRecord } from "../types";
import { useTabsStore } from "./tabsStore";
import { useSplitViewStore } from "./splitViewStore";
import { usePersistenceStore } from "./persistenceStore";
import { useCacheStore } from "./cacheStore";
import { incrementSetting } from "../db";
import { WELCOME_TAB_CONTENT, NEW_TAB_PREFIX } from "../constants";
import { modelManager } from "../services/modelManager";
import { broadcastManager } from "./broadcastStore";
import { canvasLifecycleCoordinator } from "../services/canvasLifecycleCoordinator";
import { reconcileSplitViewWithTabs } from "../utils/splitViewUtils";

// Helper function to sort workspaces by displayOrder (primary) or lastAccessed (fallback)
const sortWorkspaces = (workspaces: Workspace[]): Workspace[] => {
  return [...workspaces].sort((a, b) => {
    // Primary: Use displayOrder if both have it
    if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
      return a.displayOrder - b.displayOrder;
    }
    // If only one has displayOrder, it comes first
    if (a.displayOrder !== undefined) return -1;
    if (b.displayOrder !== undefined) return 1;
    // Fallback: Use lastAccessed (most recent first)
    return b.lastAccessed - a.lastAccessed;
  });
};

// Helper function to safely convert activeSide string to union type
const parseActiveSide = (side: string | null): "left" | "right" | null => {
  if (side === "left" || side === "right") {
    return side;
  }
  return null;
};

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;

  loadWorkspaces: () => Promise<void>;
  ensureWorkspace: () => Promise<string | null>;
  createWorkspace: (name: string) => Promise<string | null>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  updateWorkspaceNotes: (workspaceId: string, notes: string) => Promise<void>;
  addWorkspaceLink: (
    workspaceId: string,
    url: string,
    title?: string,
  ) => Promise<void>;
  removeWorkspaceLink: (workspaceId: string, linkId: string) => Promise<void>;
  getActiveWorkspace: () => Workspace | undefined;
  reorderWorkspaces: (workspaceIds: string[]) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const storage = StorageProviderFactory.getProvider();

  return {
    workspaces: [],
    activeWorkspaceId: null,
    isLoading: false,
    error: null,

    loadWorkspaces: async () => {
      const { activeWorkspaceId: currentActiveWsId } = get();
      set({ isLoading: true, error: null });

      try {
        const workspaces = await storage.getWorkspaces();

        // Sort workspaces by displayOrder (primary) or lastAccessed (fallback)
        const sortedWorkspaces = sortWorkspaces(workspaces);

        // Determine which workspace to activate
        let workspaceToActivate: Workspace | null = null;

        if (sortedWorkspaces.length > 0) {
          // If we have a current active workspace, try to keep it
          if (
            currentActiveWsId &&
            sortedWorkspaces.some((w) => w.id === currentActiveWsId)
          ) {
            workspaceToActivate =
              sortedWorkspaces.find((w) => w.id === currentActiveWsId) || null;
          } else {
            // Otherwise, activate the most recently accessed workspace
            // Note: sortedWorkspaces is sorted by displayOrder, not lastAccessed
            // So we need to find the workspace with the highest lastAccessed timestamp
            workspaceToActivate = sortedWorkspaces.reduce((latest, current) => {
              return current.lastAccessed > latest.lastAccessed ? current : latest;
            }, sortedWorkspaces[0]);
          }
        }

        // Update the workspace list
        set((state) => ({
          workspaces: sortedWorkspaces,
          activeWorkspaceId: workspaceToActivate?.id || null,
        }));

        // Load data for the active workspace
        if (workspaceToActivate) {
          const [tabs, splitView] = await Promise.all([
            storage.getTabsByWorkspace(workspaceToActivate.id),
            storage.getSplitViewByWorkspace(workspaceToActivate.id),
          ]);

          // Always replace existing tabs when loading a workspace
          useTabsStore.setState({ tabs });

          if (splitView) {
            // The persisted split view can lag behind the tab rows (a tab was
            // closed or duplicated right before a reload), so reconcile it.
            const finalSplitViewState = reconcileSplitViewWithTabs<SplitViewState>(
              {
                id: splitView.id,
                isSplit: splitView.isSplit,
                leftTabs: splitView.leftTabs || [],
                rightTabs: splitView.rightTabs || [],
                activeLeftTabId: splitView.activeLeftTabId,
                activeRightTabId: splitView.activeRightTabId,
                activeSide: parseActiveSide(splitView.activeSide),
                splitRatio: splitView.splitRatio,
                workspaceId: splitView.workspaceId,
                leftTabHistory: splitView.leftTabHistory || [],
                rightTabHistory: splitView.rightTabHistory || [],
              },
              tabs.map((t) => t.id),
            ).value;
            useSplitViewStore.setState({ splitView: finalSplitViewState });
          } else {
            useSplitViewStore.setState({ splitView: undefined });
          }
        } else {
          // Clear all data if no workspace to activate
          useTabsStore.setState({ tabs: [] });
          useSplitViewStore.setState({ splitView: undefined });
        }
      } catch (error) {
        console.error("Error loading workspaces:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load workspaces",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    ensureWorkspace: async (): Promise<string | null> => {
      try {
        const currentWorkspaces = get().workspaces;
        const currentActiveId = get().activeWorkspaceId;

        if (currentWorkspaces.length === 0 || !currentActiveId) {
          const defaultWorkspace: Workspace = {
            id: crypto.randomUUID(),
            name: "Default Workspace",
            links: [],
            createdAt: Date.now(),
            lastAccessed: Date.now(),
          };

          // Create a comprehensive Welcome tab for new users
          const welcomeTab: Tab = {
            id: crypto.randomUUID(),
            title: "Welcome",
            content: WELCOME_TAB_CONTENT,
            language: "markdown",
            languageLocked: true,
            workspaceId: defaultWorkspace.id,
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
            previewMode: true, // Show markdown preview by default
          };

          const initialSplitViewState: SplitViewState = useSplitViewStore
            .getState()
            .createDefaultSplitViewState(defaultWorkspace.id);
          initialSplitViewState.leftTabs = [welcomeTab.id];
          initialSplitViewState.activeLeftTabId = welcomeTab.id;
          initialSplitViewState.leftTabHistory = [welcomeTab.id];

          const initialSplitViewRecord: SplitViewRecord = {
            id: initialSplitViewState.id,
            isSplit: initialSplitViewState.isSplit,
            leftTabs: initialSplitViewState.leftTabs,
            rightTabs: initialSplitViewState.rightTabs,
            activeLeftTabId: initialSplitViewState.activeLeftTabId,
            activeRightTabId: initialSplitViewState.activeRightTabId,
            activeSide: parseActiveSide(initialSplitViewState.activeSide),
            splitRatio: initialSplitViewState.splitRatio,
            workspaceId: initialSplitViewState.workspaceId,
            lastModified: Date.now(),
            leftTabHistory: initialSplitViewState.leftTabHistory,
            rightTabHistory: initialSplitViewState.rightTabHistory,
          };

          await db.transaction(
            "rw",
            db.workspaces,
            db.tabs,
            db.splitView,
            async () => {
              await storage.saveWorkspace(defaultWorkspace);
              await storage.saveTabNow(welcomeTab);
              await storage.saveSplitViewNow(initialSplitViewRecord);
            },
          );

          // Increment the total tabs created counter
          incrementSetting("tabs.created.total").catch((err) =>
            console.error("Failed to increment tab counter:", err),
          );

          set({
            workspaces: [defaultWorkspace],
            activeWorkspaceId: defaultWorkspace.id,
          });
          useTabsStore.setState({
            tabs: [welcomeTab],
            activeTabId: welcomeTab.id,
          });
          useSplitViewStore.setState({ splitView: initialSplitViewState });
          return defaultWorkspace.id;
        }
        return currentActiveId;
      } catch (error) {
        console.error("Error ensuring workspace:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to ensure workspace",
        });
        return null;
      }
    },

    switchWorkspace: async (workspaceId: string) => {
      const { workspaces, activeWorkspaceId: currentActiveWsId } = get();
      const { saveState: persistCurrentState } = usePersistenceStore.getState();

      // Only prevent switching if we're already on the target workspace
      if (workspaceId === currentActiveWsId) {
        return;
      }

      const targetWorkspace = workspaces.find((w) => w.id === workspaceId);
      if (!targetWorkspace) {
        console.error(
          `[WorkspaceStore] Target workspace ${workspaceId} not found.`,
        );
        set({ error: `Workspace with ID ${workspaceId} not found.` });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        await canvasLifecycleCoordinator.flushActiveDocuments();

        // 1. Save content from all active models BEFORE persisting state
        const { tabs } = useTabsStore.getState();
        const currentWorkspaceTabs = tabs.filter(
          (tab) => tab.workspaceId === currentActiveWsId,
        );

        // Save content from all models that might not have been saved yet
        currentWorkspaceTabs.forEach((tab) => {
          const liveContent = modelManager.getContent(tab.id);
          if (liveContent !== undefined && liveContent !== tab.content) {
            useTabsStore.getState().updateTabContent(tab.id, liveContent);
          }
        });

        // 2. Persist the state of the current workspace before switching (only if we have an active workspace)
        if (currentActiveWsId) {
          await persistCurrentState();
        }

        // 3. Clear model cache when switching workspaces to prevent memory leaks
        modelManager.disposeAll();

        // 4. Load data for the target workspace
        const cachedData = useCacheStore.getState().cachedSplitView;
        let splitViewToLoad: SplitViewRecord | null = null;

        if (cachedData && cachedData.workspaceId === workspaceId) {
          splitViewToLoad = cachedData.splitView;
          useCacheStore.getState().clearCachedSplitView();
        } else {
          splitViewToLoad = await storage.getSplitViewByWorkspace(workspaceId);
        }

        const tabsToLoad = await storage.getTabsByWorkspace(workspaceId);

        if (!splitViewToLoad) {
          console.error(`No split view found for workspace ${workspaceId}`);
          return;
        }

        // 5. Update lastAccessed timestamp for the target workspace
        const updatedTargetWorkspace = {
          ...targetWorkspace,
          lastAccessed: Date.now(),
        };
        await storage.saveWorkspace(updatedTargetWorkspace);

        // 6. Update Zustand stores
        set((state) => ({
          workspaces: sortWorkspaces(
            state.workspaces.map((w) => (w.id === workspaceId ? updatedTargetWorkspace : w))
          ),
          activeWorkspaceId: workspaceId,
        }));

        useTabsStore.setState({ tabs: tabsToLoad });
        // Convert record to state, reconciled with the tab rows that exist
        const finalSplitViewState = reconcileSplitViewWithTabs<SplitViewState>(
          {
            id: splitViewToLoad.id,
            isSplit: splitViewToLoad.isSplit,
            leftTabs: splitViewToLoad.leftTabs || [],
            rightTabs: splitViewToLoad.rightTabs || [],
            activeLeftTabId: splitViewToLoad.activeLeftTabId,
            activeRightTabId: splitViewToLoad.activeRightTabId,
            activeSide: parseActiveSide(splitViewToLoad.activeSide),
            splitRatio: splitViewToLoad.splitRatio,
            workspaceId: splitViewToLoad.workspaceId,
            leftTabHistory: splitViewToLoad.leftTabHistory || [],
            rightTabHistory: splitViewToLoad.rightTabHistory || [],
          },
          tabsToLoad.map((t) => t.id),
        ).value;
        useSplitViewStore.setState({ splitView: finalSplitViewState });

        // Update the active tab ID based on the loaded split view state
        const newActiveTabId =
          finalSplitViewState.activeSide === "right"
            ? finalSplitViewState.activeRightTabId
            : finalSplitViewState.activeLeftTabId;
        useTabsStore.setState({ activeTabId: newActiveTabId });
      } catch (error) {
        console.error(`Error switching workspace:`, error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to switch workspace",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    renameWorkspace: async (workspaceId: string, newName: string) => {
      try {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
          const updatedWorkspace = { ...workspace, name: newName };
          await storage.saveWorkspace(updatedWorkspace);
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === workspaceId ? updatedWorkspace : w,
            ),
          }));

          // Broadcast workspace rename
          broadcastManager.broadcastWorkspaceList(
            get().workspaces,
            workspaceId,
          );
        }
      } catch (error) {
        console.error("Failed to rename workspace:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to rename workspace",
        });
      }
    },

    deleteWorkspace: async (workspaceId: string) => {
      const { workspaces, activeWorkspaceId, switchWorkspace } = get();

      set({ isLoading: true });
      try {
        if (activeWorkspaceId === workspaceId) {
          await canvasLifecycleCoordinator.flushActiveDocuments();
        }
        await storage.deleteWorkspace(workspaceId);

        // If the deleted workspace was active, switch to another one
        if (activeWorkspaceId === workspaceId) {
          const remainingWorkspaces = sortWorkspaces(
            workspaces.filter((w) => w.id !== workspaceId)
          );

          if (remainingWorkspaces.length > 0) {
            await switchWorkspace(remainingWorkspaces[0].id);
          } else {
            // No workspaces left, clear all state to show welcome screen
            set({
              workspaces: [],
              activeWorkspaceId: null,
            });
            useTabsStore.setState({ tabs: [] });
            useSplitViewStore.setState({
              splitView: useSplitViewStore
                .getState()
                .createDefaultSplitViewState(),
            });
          }
        }

        // Update the workspaces list in the state
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
        }));

        // Broadcast workspace deletion
        broadcastManager.broadcastWorkspaceDeletion(workspaceId);
      } catch (error) {
        console.error("Failed to delete workspace:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete workspace",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    updateWorkspaceNotes: async (workspaceId: string, notes: string) => {
      try {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
          const updatedWorkspace = { ...workspace, notes };
          await storage.saveWorkspace(updatedWorkspace);
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === workspaceId ? updatedWorkspace : w,
            ),
          }));
        }
      } catch (error) {
        console.error("Failed to update workspace notes:", error);
        set({
          error:
            error instanceof Error ? error.message : "Failed to update notes",
        });
      }
    },

    addWorkspaceLink: async (
      workspaceId: string,
      url: string,
      title?: string,
    ) => {
      try {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (workspace) {
          const newLink = { id: crypto.randomUUID(), url, title: title || url };
          const updatedWorkspace = {
            ...workspace,
            links: [...(workspace.links || []), newLink],
          };
          await storage.saveWorkspace(updatedWorkspace);
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === workspaceId ? updatedWorkspace : w,
            ),
          }));
        }
      } catch (error) {
        console.error("Failed to add workspace link:", error);
        set({
          error: error instanceof Error ? error.message : "Failed to add link",
        });
      }
    },

    removeWorkspaceLink: async (workspaceId: string, linkId: string) => {
      try {
        const workspace = get().workspaces.find((w) => w.id === workspaceId);
        if (workspace && workspace.links) {
          const updatedWorkspace = {
            ...workspace,
            links: workspace.links.filter((link) => link.id !== linkId),
          };
          await storage.saveWorkspace(updatedWorkspace);
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === workspaceId ? updatedWorkspace : w,
            ),
          }));
        }
      } catch (error) {
        console.error("Failed to remove workspace link:", error);
        set({
          error:
            error instanceof Error ? error.message : "Failed to remove link",
        });
      }
    },

    createWorkspace: async (name: string): Promise<string | null> => {
      set({ isLoading: true });
      try {
        // Calculate displayOrder for new workspace (max + 1, appears at bottom)
        const existingWorkspaces = get().workspaces;
        const maxDisplayOrder = existingWorkspaces.reduce((max, ws) => {
          return ws.displayOrder !== undefined && ws.displayOrder > max ? ws.displayOrder : max;
        }, -1);

        const newWorkspace: Workspace = {
          id: crypto.randomUUID(),
          name,
          links: [],
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          displayOrder: maxDisplayOrder + 1,
        };

        // Create a welcome tab for new workspaces
        const welcomeTab: Tab = {
          id: crypto.randomUUID(),
          title: "Welcome",
          content: WELCOME_TAB_CONTENT,
          language: "markdown",
          languageLocked: true,
          workspaceId: newWorkspace.id,
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
          previewMode: true, // Show markdown preview by default
        };

        // Create a scratch tab
        const scratchTab: Tab = {
          id: crypto.randomUUID(),
          title: `${NEW_TAB_PREFIX} 1`,
          content: "",
          language: "plaintext",
          languageLocked: false,
          workspaceId: newWorkspace.id,
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
        };

        const newSplitView = useSplitViewStore
          .getState()
          .createDefaultSplitViewState(newWorkspace.id);
        newSplitView.leftTabs = [welcomeTab.id, scratchTab.id];
        newSplitView.activeLeftTabId = scratchTab.id; // Make the scratch tab active
        newSplitView.leftTabHistory = [welcomeTab.id, scratchTab.id];

        await db.transaction(
          "rw",
          db.workspaces,
          db.tabs,
          db.splitView,
          async () => {
            await storage.saveWorkspace(newWorkspace);
            await storage.saveTabNow(welcomeTab);
            await storage.saveTabNow(scratchTab);
            await storage.saveSplitViewNow(newSplitView as SplitViewRecord);
          },
        );

        // Update the state with the new workspace
        set((state) => ({
          workspaces: sortWorkspaces([...state.workspaces, newWorkspace]),
        }));

        // Broadcast workspace creation with the updated workspace list
        const currentState = get();
        broadcastManager.broadcastWorkspaceList(
          currentState.workspaces,
          newWorkspace.id,
        );

        // Switch to the new workspace
        await get().switchWorkspace(newWorkspace.id);

        return newWorkspace.id;
      } catch (error) {
        console.error("Failed to create new workspace:", error);
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to create workspace",
        });
        return null;
      } finally {
        set({ isLoading: false });
      }
    },

    getActiveWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find((w) => w.id === activeWorkspaceId);
    },

    reorderWorkspaces: async (workspaceIds: string[]) => {
      try {
        const { workspaces } = get();

        // Create a new list of workspaces with updated displayOrder
        const updatedWorkspaces = workspaces.map(ws => {
          const newIndex = workspaceIds.indexOf(ws.id);
          if (newIndex !== -1) {
            return { ...ws, displayOrder: newIndex };
          }
          return ws;
        });

        // Sort them for the local state
        const sortedWorkspaces = sortWorkspaces(updatedWorkspaces);

        // Persist to IndexedDB
        await Promise.all(
          sortedWorkspaces.map(ws => storage.saveWorkspace(ws))
        );

        // Update local state
        set({ workspaces: sortedWorkspaces });

        // Broadcast the update
        broadcastManager.broadcastWorkspaceList(sortedWorkspaces);
      } catch (error) {
        console.error("Failed to reorder workspaces:", error);
        set({
          error: error instanceof Error ? error.message : "Failed to reorder workspaces",
        });
      }
    },
  };
});
