import { useNavigationStore, NavigationEntry } from "../stores/navigationStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useTabsStore } from "../stores/tabsStore";
import { useSplitViewStore } from "../stores/splitViewStore";
import { StorageProviderFactory } from "../db";

/**
 * Navigation Service
 *
 * Responsibilities (SRP):
 * - Validates navigation entries (checks if tab/workspace still exists)
 * - Performs workspace switches
 * - Performs tab activation
 * - Handles edge cases (deleted tabs/workspaces)
 *
 * Does NOT:
 * - Manage history state (that's navigationStore's job)
 * - Record navigation entries (that's rootStore's job)
 */
export class NavigationService {
  private isNavigating = false;

  /**
   * Navigate to a specific entry from history.
   * Handles workspace switching and tab activation.
   *
   * @returns true if navigation succeeded, false otherwise
   */
  async navigateTo(entry: NavigationEntry): Promise<boolean> {
    // Prevent recursion: if we're already navigating, skip
    if (this.isNavigating) {
      return false;
    }

    try {
      this.isNavigating = true;

      // Validate entry still exists
      if (!(await this.isValidEntry(entry))) {
        console.warn("Navigation entry no longer valid:", entry);
        return false;
      }

      const { activeWorkspaceId } = useWorkspaceStore.getState();
      const { splitView } = useSplitViewStore.getState();

      // Step 1: Switch workspace if needed
      if (entry.workspaceId !== activeWorkspaceId) {
        await useWorkspaceStore.getState().switchWorkspace(entry.workspaceId);
      }

      // Step 2: Activate the tab
      // Determine which side the tab is on
      const { splitView: updatedSplitView } = useSplitViewStore.getState();

      if (updatedSplitView.leftTabs.includes(entry.tabId)) {
        useSplitViewStore.getState().setActiveLeftTab(entry.tabId);
      } else if (updatedSplitView.rightTabs.includes(entry.tabId)) {
        useSplitViewStore.getState().setActiveRightTab(entry.tabId);
      } else if (useTabsStore.getState().tabs.some((tab) => tab.id === entry.tabId)) {
        // Tab exists in the loaded workspace but is not in either pane - activate it on left
        useSplitViewStore.getState().setActiveLeftTab(entry.tabId);
      } else {
        // The tab was deleted. Activating its id would leave the workspace with no matching
        // active tab (empty "Default Workspace" page), so report failure and let
        // goBack()/goForward() skip to the next valid entry.
        console.warn("Navigation entry points to a deleted tab:", entry);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Navigation failed:", error);
      return false;
    } finally {
      this.isNavigating = false;
    }
  }

  /**
   * Navigate backwards in history.
   * Finds the next valid entry and navigates to it.
   */
  async goBack(): Promise<boolean> {
    const navStore = useNavigationStore.getState();

    // Try to go back up to 10 times (skipping invalid entries)
    for (let i = 0; i < 10; i++) {
      const entry = navStore.goBack();
      if (!entry) {
        return false; // No more history
      }

      const success = await this.navigateTo(entry);
      if (success) {
        return true;
      }

      // Entry was invalid, try the next one
    }

    return false;
  }

  /**
   * Navigate forwards in history.
   * Finds the next valid entry and navigates to it.
   */
  async goForward(): Promise<boolean> {
    const navStore = useNavigationStore.getState();

    // Try to go forward up to 10 times (skipping invalid entries)
    for (let i = 0; i < 10; i++) {
      const entry = navStore.goForward();
      if (!entry) {
        return false; // No more forward history
      }

      const success = await this.navigateTo(entry);
      if (success) {
        return true;
      }

      // Entry was invalid, try the next one
    }

    return false;
  }

  /**
   * Check if a navigation entry is still valid.
   * An entry is valid if both the workspace and tab still exist.
   */
  private async isValidEntry(entry: NavigationEntry): Promise<boolean> {
    const { workspaces } = useWorkspaceStore.getState();
    const { tabs } = useTabsStore.getState();

    // Check workspace exists
    const workspaceExists = workspaces.some((ws) => ws.id === entry.workspaceId);
    if (!workspaceExists) {
      return false;
    }

    // Check tab exists
    // For active workspace, check in-memory tabs
    const { activeWorkspaceId } = useWorkspaceStore.getState();
    if (entry.workspaceId === activeWorkspaceId) {
      return tabs.some((tab) => tab.id === entry.tabId);
    }

    // For inactive workspaces, check the persisted tab metadata (no content is loaded).
    try {
      const storage = StorageProviderFactory.getProvider();
      const metadata = await storage.getTabsMetadataByWorkspace(entry.workspaceId);
      return metadata.some((tab) => tab.id === entry.tabId);
    } catch (error) {
      // If the lookup fails, don't block navigation; navigateTo re-checks after the switch.
      console.warn("Could not verify navigation entry in inactive workspace:", error);
      return true;
    }
  }

  /**
   * Check if we're currently in a navigation operation.
   * Used to prevent recording history during back/forward navigation.
   */
  isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }
}

// Singleton instance
export const navigationService = new NavigationService();
