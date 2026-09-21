import { useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useRootStore } from "../stores/rootStore";
import { useTabsStore } from "../stores/tabsStore";
import { useSplitViewStore } from "../stores/splitViewStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { Tab } from "../types";
import { formatRegistry } from "../formats/registry";
import { tabletMetadata } from "../tablets/tabletMetadata";
import { getTabContentKind } from "../utils/tabContentKind";

// Helper function to convert a label to URL identifier format
const labelToUrlIdentifier = (label: string): string => {
  return label.toLowerCase().replace(/[/\\]/g, "-").replace(/\s+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
};

/**
 * Generates a URL-friendly identifier from a tab title or uses the tab ID as a fallback.
 * Converts to lowercase, replaces problematic characters with hyphens, collapses multiple hyphens,
 * and trims leading/trailing hyphens.
 */
export const generateUrlIdentifier = (tab: Tab | undefined): string => {
  if (!tab) return "";
  if (getTabContentKind(tab) === "canvas") return "canvas";

  // For tablets, use the label converted to URL format
  if (tab.isTablet) {
    const tabletInfo = tabletMetadata.find(
      (t) => t.label.toLowerCase() === tab.title.toLowerCase(),
    );
    if (tabletInfo) {
      return labelToUrlIdentifier(tabletInfo.label);
    }
  }

  // For all other tabs (including language tabs), use a slugified version of the title
  return tab.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Custom hook to synchronize application tab state (active tabs, focused side)
 * with the browser URL using React Router. It listens to URL changes to update
 * the state and listens to state changes to update the URL.
 * It relies on an `activeSide: 'left' | 'right'` property in the global state
 * to determine which tab should primarily dictate the URL.
 */
export const useUrlTabHandler = () => {
  const { identifier: urlIdentifierParam } = useParams<{
    identifier?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { tabs } = useTabsStore();
  const { splitView } = useSplitViewStore();
  const {
    setActiveLeftTab,
    setActiveRightTab,
    setActiveSide,
    initialUrlProcessed,
    suppressUrlSync,
  } = useRootStore((state) => ({
    setActiveLeftTab: state.setActiveLeftTab,
    setActiveRightTab: state.setActiveRightTab,
    setActiveSide: state.setActiveSide,
    initialUrlProcessed: state.initialUrlProcessed,
    suppressUrlSync: state.suppressUrlSync,
  }));

  // Extract values from splitView
  const activeLeftTabId = splitView?.activeLeftTabId;
  const activeRightTabId = splitView?.activeRightTabId;
  const isSplit = splitView?.isSplit || false;
  const activeSide = splitView?.activeSide || "left";
  const { isLoading } = useWorkspaceStore();

  // Split view helpers
  const leftTabs = splitView?.leftTabs || [];
  const rightTabs = splitView?.rightTabs || [];

  // Refs for effect control
  const initialRender = useRef(true);
  const prevUrlIdentifierParamRef = useRef<string | undefined>(
    urlIdentifierParam,
  );
  const isProcessingUrlChange = useRef(false);
  const isUserNavigation = useRef(true); // True if user-initiated
  const stateUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Modularized helpers ---

  // 1. Find tab by URL identifier, prioritizing left, then right, only left if not split
  function findTabByUrlIdentifier(urlIdentifier: string | undefined): {
    tab: Tab | undefined;
    side: "left" | "right" | null;
  } {
    if (!urlIdentifier) return { tab: undefined, side: null };
    const normalizedParam = urlIdentifier.toLowerCase();

    // Check left tabs first
    const leftTab = tabs.find(
      (tab) =>
        leftTabs.includes(tab.id) &&
        (tab.title.toLowerCase() === normalizedParam ||
          generateUrlIdentifier(tab) === urlIdentifier ||
          tab.id === urlIdentifier),
    );
    if (leftTab) {
      return { tab: leftTab, side: "left" };
    }

    // If split, check right tabs
    if (isSplit) {
      const rightTab = tabs.find(
        (tab) =>
          rightTabs.includes(tab.id) &&
          (tab.title.toLowerCase() === normalizedParam ||
            generateUrlIdentifier(tab) === urlIdentifier ||
            tab.id === urlIdentifier),
      );
      if (rightTab) {
        return { tab: rightTab, side: "right" };
      }
    }

    // Not found
    return { tab: undefined, side: null };
  }

  // 4. Activate tab on correct side
  function activateTab(tab: Tab, side: "left" | "right" | null) {
    if (side === "left") {
      setActiveLeftTab(tab.id);
      setActiveSide("left");
    } else if (side === "right") {
      setActiveRightTab(tab.id);
      setActiveSide("right");
    } else {
      // Default to left
      setActiveLeftTab(tab.id);
      setActiveSide("left");
    }
  }

  // 5. Get target tab for URL update
  function getTargetTabId(): string | null {
    if (activeSide === "left") return activeLeftTabId;
    if (activeSide === "right" && isSplit) return activeRightTabId;
    if (activeSide === "right" && !isSplit) return activeLeftTabId;
    return activeLeftTabId;
  }

  // 6. Get target path for URL update
  function getTargetPath(): string {
    const targetTabId = getTargetTabId();
    const targetTab = targetTabId
      ? tabs.find((t) => t.id === targetTabId)
      : undefined;
    const targetUrlIdentifier = generateUrlIdentifier(targetTab);
    const targetPath = targetUrlIdentifier ? `/${targetUrlIdentifier}` : "/";
    return targetPath;
  }

  // --- Effects ---

  // Effect 1: Handles STATE changes, updates URL
  useEffect(() => {
    // Completely disable URL handler when workspace is loading OR when URL sync is suppressed
    if (isLoading || !initialUrlProcessed || suppressUrlSync) {
      return;
    }

    if (isProcessingUrlChange.current) {
      return; // Don't run if the other effect is actively processing a URL change
    }

    // Debounce state updates slightly to avoid rapid changes
    if (stateUpdateTimeout.current) clearTimeout(stateUpdateTimeout.current);

    stateUpdateTimeout.current = setTimeout(() => {
      const currentPath = location.pathname;
      const targetPath = getTargetPath(); // Calculates path based on current state (active tab or '/')

      if (targetPath !== currentPath) {
        isUserNavigation.current = false; // Mark as app navigation BEFORE navigating
        navigate(targetPath, { replace: true });
      }
      stateUpdateTimeout.current = null; // Clear timeout reference
    }, 150);
  }, [
    activeLeftTabId,
    activeRightTabId,
    isSplit,
    activeSide,
    tabs,
    isLoading,
    initialUrlProcessed,
    suppressUrlSync,
  ]); // Add suppressUrlSync to prevent URL updates during share processing

  // Effect 2: Handles URL changes, updates STATE
  useEffect(() => {
    // Wait for workspace/tabs to finish loading before processing initial URL
    if (isLoading || !initialUrlProcessed) {
      return;
    }

    // If it's the initial render, just update the ref and return
    if (initialRender.current) {
      initialRender.current = false;
      prevUrlIdentifierParamRef.current = urlIdentifierParam;
      return;
    }

    // If the URL param hasn't actually changed, do nothing
    if (urlIdentifierParam === prevUrlIdentifierParamRef.current) {
      return;
    }

    // If isUserNavigation is false, it means the state effect just caused the navigation.
    // We should only update the prev ref and reset the flag.
    if (!isUserNavigation.current) {
      prevUrlIdentifierParamRef.current = urlIdentifierParam;
      isUserNavigation.current = true; // Reset for next potential user navigation
      return; // DO NOT proceed to find/create tab
    }

    // --- If we reach here, it's a USER navigation to a NEW URL ---
    isProcessingUrlChange.current = true; // Prevent state effect from interfering
    if (stateUpdateTimeout.current) {
      clearTimeout(stateUpdateTimeout.current); // Cancel pending state updates
      stateUpdateTimeout.current = null;
    }

    const processUrlChange = async () => {
      try {
        // 1. Try to find existing tab matching the new URL
        const { tab, side } = findTabByUrlIdentifier(urlIdentifierParam);

        if (tab) {
          activateTab(tab, side);
          return;
        }
        if (!urlIdentifierParam) return;

        // No existing tab found, create a new one. URL entry points must also
        // work before the user has created their first workspace.
        const currentSplitView = useSplitViewStore.getState().splitView;
        const shouldAddToRight =
          currentSplitView?.isSplit &&
          currentSplitView?.activeSide === "right";

        if (urlIdentifierParam === "canvas") {
          await useRootStore
            .getState()
            .handleNewCanvas(!!shouldAddToRight);
          return;
        }

        const workspaceId = await getOrCreateActiveWorkspace();
        if (!workspaceId) return;

        const newTab = await createNewTabFromUrl(
          urlIdentifierParam,
          workspaceId,
        );
        const {
          addTab,
          setActiveLeftTab,
          setActiveRightTab,
          setActiveSide,
        } = useRootStore.getState();

        if (shouldAddToRight) {
          addTab(newTab, true);
          setActiveRightTab(newTab.id);
          setActiveSide("right");
        } else {
          addTab(newTab, false);
          setActiveLeftTab(newTab.id);
          setActiveSide("left");
        }
      } catch (error) {
        console.error("[useUrlTabHandler] Failed to process URL:", error);
      } finally {
        prevUrlIdentifierParamRef.current = urlIdentifierParam;
        // Keep state-to-URL synchronization locked until lazy tablet loading
        // and tab creation have actually finished.
        isProcessingUrlChange.current = false;
      }
    };

    void processUrlChange();
  }, [urlIdentifierParam, isLoading, initialUrlProcessed]); // Add the new flag to the dependency array.

  // Cleanup
  useEffect(() => {
    return () => {
      if (stateUpdateTimeout.current) {
        clearTimeout(stateUpdateTimeout.current);
      }
    };
  }, []);
};

const getOrCreateActiveWorkspace = async (): Promise<string | null> => {
  const { activeWorkspaceId, ensureWorkspace } = useWorkspaceStore.getState();
  return activeWorkspaceId ?? ensureWorkspace();
};

// Helper function to create a new tab from URL identifier
const createNewTabFromUrl = async (
  urlIdentifier: string,
  workspaceId: string,
): Promise<Tab> => {
  // Language
  const language = formatRegistry.getById(urlIdentifier);
  if (language) {
    return {
      id: crypto.randomUUID(),
      title: `New ${urlIdentifier} Tab`,
      content: language.sampleContent ? language.sampleContent() : "",
      language: urlIdentifier,
      languageLocked: true,
      lastModified: Date.now(),
      dateCreated: Date.now(),
      cursorPosition: { lineNumber: 1, column: 1 },
      isTablet: false,
      workspaceId: workspaceId || "",
    };
  }
  // Tablet - match against both ID and converted label
  const tabletInfo = tabletMetadata.find(
    (t) =>
      t.id === urlIdentifier || labelToUrlIdentifier(t.label) === urlIdentifier,
  );
  if (tabletInfo) {
    // Load the tablet implementation like the Tool Selector does
    const { dynamicTabletRegistry } = await import(
      "../tablets/dynamicRegistry"
    );
    const tablet = await dynamicTabletRegistry.getById(tabletInfo.id);
    if (tablet) {
      // Create proper initial state like the Tool Selector
      const state = tablet.createInitialState();
      const serializedState = tablet.serializeState
        ? tablet.serializeState(state)
        : JSON.stringify(state);

      return {
        id: crypto.randomUUID(),
        title: tablet.label,
        content: "",
        language: "plaintext",
        languageLocked: true,
        isTablet: true,
        tabletState: serializedState,
        lastModified: Date.now(),
        dateCreated: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        workspaceId: workspaceId || "",
      };
    }
  }
  // Plaintext fallback
  let title = urlIdentifier
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  if (!title || title.length > 50) title = "Untitled Tab";
  return {
    id: crypto.randomUUID(),
    title: title,
    content: "",
    language: "plaintext",
    languageLocked: false,
    lastModified: Date.now(),
    dateCreated: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
    isTablet: false,
    workspaceId: workspaceId || "",
  };
};

// Guard to prevent multiple executions
let handleInitialUrlExecuted = false;

export const openInitialUrlIdentifier = async (urlIdentifier: string) => {
  const { tabs } = useTabsStore.getState();
  const { splitView } = useSplitViewStore.getState();
  const {
    setActiveLeftTab,
    setActiveRightTab,
    setActiveSide,
    addTab,
  } = useRootStore.getState();

  const existingTab = tabs.find(
    (tab) => generateUrlIdentifier(tab) === urlIdentifier,
  );

  if (existingTab) {
    const isOnRightSide = splitView?.rightTabs.includes(existingTab.id);

    if (isOnRightSide) {
      setActiveRightTab(existingTab.id);
      setActiveSide("right");
    } else {
      setActiveLeftTab(existingTab.id);
      setActiveSide("left");
    }
    return;
  }

  if (urlIdentifier === "canvas") {
    await useRootStore.getState().handleNewCanvas(false);
    return;
  }

  const workspaceId = await getOrCreateActiveWorkspace();
  if (!workspaceId) return;

  const newTab = await createNewTabFromUrl(urlIdentifier, workspaceId);
  addTab(newTab, false);
  setActiveLeftTab(newTab.id);
  setActiveSide("left");
};

export const handleInitialUrl = async () => {
  const { setInitialUrlProcessed } = useRootStore.getState();

  // Prevent multiple executions
  if (handleInitialUrlExecuted) {
    return;
  }
  handleInitialUrlExecuted = true;

  const pathSegments = window.location.pathname.split("/").filter(Boolean);

  if (pathSegments.length > 0) {
    const urlIdentifier = pathSegments[0];
    await openInitialUrlIdentifier(urlIdentifier);

    setInitialUrlProcessed(true);
  } else {
    // If there's no URL param, we can immediately say we're done.
    useRootStore.getState().setInitialUrlProcessed(true);
  }
};
