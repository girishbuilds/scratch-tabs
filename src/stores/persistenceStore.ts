import { create } from "zustand";
import { StorageProviderFactory } from "../db";
import { useWorkspaceStore } from "./workspaceStore";
import { useTabsStore } from "./tabsStore";
import { useSplitViewStore } from "./splitViewStore";
import { modelManager } from "../services/modelManager";
import { waitForTabLifecycleActions } from "../services/tabLifecycleGate";

interface PersistenceStore {
  saveState: () => Promise<void>;
}

export const usePersistenceStore = create<PersistenceStore>((set, get) => {
  const storage = StorageProviderFactory.getProvider();

  return {
    saveState: async () => {
      try {
        // Snapshot only after in-flight close/move actions have finished
        // updating the stores, so they are not written back in their old state.
        await waitForTabLifecycleActions();

        const { activeWorkspaceId } = useWorkspaceStore.getState();
        if (!activeWorkspaceId) {
          return;
        }

        // Get the LATEST state from the stores
        const { tabs } = useTabsStore.getState();
        const { splitView } = useSplitViewStore.getState();

        // The tabs in tabsStore are the source of truth for persistence.
        // The ModelManager's listeners have already updated them.
        const workspaceTabs = tabs.filter(
          (tab) => tab.workspaceId === activeWorkspaceId,
        );

        // ARCHITECTURAL FIX: Get live content from ModelManager for any active models
        const tabsToSave = workspaceTabs.map((tab) => {
          const liveContent = modelManager.getContent(tab.id);

          if (liveContent !== undefined) {
            return { ...tab, content: liveContent };
          } else {
            return tab;
          }
        });

        if (tabsToSave.length > 0) {
          await storage.saveTabsNow(tabsToSave);
        }

        if (splitView && splitView.workspaceId === activeWorkspaceId) {
          await storage.saveSplitViewNow({
            ...splitView,
            lastModified: Date.now(),
          });
        }
      } catch (error) {
        console.error("[Persistence] Failed to save state:", error);
      }
    },
  };
});
