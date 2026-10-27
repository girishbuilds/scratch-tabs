import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useRootStore } from "../../stores/rootStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { usePersistenceStore } from "../../stores/persistenceStore";
import { useSplitViewResizer } from "../../hooks/useSplitViewResizer";
import {
  useUrlTabHandler,
  handleInitialUrl,
} from "../../hooks/useUrlTabHandler";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useAppHotkeys } from "../../hooks/useAppHotkeys";
import { useSearchStore } from "../../stores/searchStore";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { WelcomeScreen } from "../Welcome/WelcomeScreen";
import { TabBar } from "../Tab/TabBar";
import { EditorPaneWrapper } from "../Editor/EditorPaneWrapper";
import { SplitViewDivider } from "../SplitView/SplitViewDivider";
import { DiffModal } from "../DiffModal";
import { SummarizeModal } from "../AI/SummarizeModal";
import { SearchModal } from "../Search/SearchModal";
import { AIModelManagementModal } from "../AI/AIModelManagementModal";
import { AboutModal, ChangelogModal } from "../Modals";
import { ConfirmationDialog } from "../Tab/ConfirmationDialog";
import { TestFields } from "../TestFields/TestFields";
import { MilestoneToast, MilestoneModal } from "../MilestoneCelebration";
import { useAIStore } from "../../stores/aiStore";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { getTabsInVisualOrder } from "../../utils/diffModalHelpers";
import { Sidebar } from "./Sidebar";
import { Menu } from "../Icons";
import { useSidebarStore } from "../../stores/sidebarStore";
import { useCanvasLifecycleFlush } from "../../hooks/useCanvasLifecycleFlush";
import { useCanvasSendStore } from "../../stores/canvasSendStore";
import { useDiffModalStore } from "../../stores/diffModalStore";
import { SendToCanvasDialog } from "../../features/canvas/components/SendToCanvasDialog";


const MainLayout: React.FC = () => {
  // Update document title with workspace name
  useDocumentTitle();

  const location = useLocation();
  const hasHandledPendingShare = useRef(false);

  // FIX: Use selective subscription for tab count only
  const tabCount = useTabsStore((state) => state.tabs.length);

  // FIX: Use useStoreWithEqualityFn for split view with shallow comparison
  const { splitView } = useStoreWithEqualityFn(
    useSplitViewStore,
    (state) => ({ splitView: state.splitView }),
    shallow,
  );

  // Pending "send to canvas" request (shared by tab menu and editor menu)
  const canvasSendSource = useCanvasSendStore((state) => state.source);
  const canvasSendSide = useCanvasSendStore((state) => state.side);

  // Tab-based diff request (e.g. "Compare with other side" from the editor menu)
  const storeDiffIsOpen = useDiffModalStore((state) => state.isOpen);
  const storeDiffLeftTabId = useDiffModalStore((state) => state.leftTabId);
  const storeDiffRightTabId = useDiffModalStore((state) => state.rightTabId);

  // FIX: Use useStoreWithEqualityFn for root store actions
  const { setSplitRatio, handleNewPopulatedTab } = useStoreWithEqualityFn(
    useRootStore,
    (state) => ({
      setSplitRatio: state.setSplitRatio,
      handleNewPopulatedTab: state.handleNewPopulatedTab,
    }),
    shallow,
  );

  // FIX: Use useStoreWithEqualityFn for workspace store
  const { loadWorkspaces, workspaces } = useStoreWithEqualityFn(
    useWorkspaceStore,
    (state) => ({
      loadWorkspaces: state.loadWorkspaces,
      workspaces: state.workspaces,
    }),
    shallow,
  );

  // FIX: Use useStoreWithEqualityFn for persistence store
  const { saveState } = useStoreWithEqualityFn(
    usePersistenceStore,
    (state) => ({ saveState: state.saveState }),
    shallow,
  );

  const [isAppInitialized, setIsAppInitialized] = useState(false);

  // Set up periodic auto-save (extracted to hook)
  useAutoSave();
  useCanvasLifecycleFlush();

  // Set up keyboard shortcuts with close confirmation (extracted to hook)
  const {
    keyboardCloseConfirmation,
    handleKeyboardCloseConfirm,
    handleKeyboardCloseCancel,
  } = useAppHotkeys();

  // FIX: Use useStoreWithEqualityFn for AI store
  const { setSummaryModalCallback } = useStoreWithEqualityFn(
    useAIStore,
    (state) => ({ setSummaryModalCallback: state.setSummaryModalCallback }),
    shallow,
  );

  function setRealHeight() {
    document.documentElement.style.setProperty(
      "--real-vh",
      `${window.innerHeight * 0.01}px`,
    );
  }
  window.addEventListener("resize", setRealHeight);
  setRealHeight();

  // Initialize workspace store
  useEffect(() => {
    loadWorkspaces()
      .then(async () => {
        await handleInitialUrl();
        setIsAppInitialized(true);
      })
      .catch((error) => {
        console.error(
          "[MainLayout] Failed to initialize workspace store:",
          error,
        );
        setIsAppInitialized(true);
      });
  }, [loadWorkspaces]);

  // Handle pending shared content from ShareURLHandler
  useEffect(() => {
    if (!isAppInitialized) {
      return;
    }

    if (hasHandledPendingShare.current) {
      return;
    }

    const state = location.state as any;
    if (state?.pendingShare) {
      hasHandledPendingShare.current = true;

      const createSharedTab = async () => {
        try {
          const { setSuppressUrlSync, setActiveTab } = useRootStore.getState();
          setSuppressUrlSync(true);

          // Prevent FULL_SYNC_RESPONSE from overwriting our new tab
          const { broadcastManager } = await import('../../stores/broadcastStore');
          broadcastManager.setSkipFullSyncResponse(true);

          const tabId = await handleNewPopulatedTab(state.pendingShare, false);

          if (tabId) {
            setActiveTab(tabId);

            // Force immediate save to IndexedDB to prevent tab loss on workspace reload
            await saveState();
          }

          // Re-enable URL sync and FULL_SYNC_RESPONSE after a short delay
          setTimeout(async () => {
            setSuppressUrlSync(false);
            const { broadcastManager } = await import('../../stores/broadcastStore');
            broadcastManager.setSkipFullSyncResponse(false);
          }, 300);
        } catch (error) {
          console.error("Error creating shared tab:", error);
          useRootStore.getState().setSuppressUrlSync(false);
          const { broadcastManager } = await import('../../stores/broadcastStore');
          broadcastManager.setSkipFullSyncResponse(false);
        }
      };

      createSharedTab();
    }
  }, [isAppInitialized, location.state, handleNewPopulatedTab, saveState]);

  // Set up AI summary modal callback
  useEffect(() => {
    setSummaryModalCallback(handleOpenSummarizeModal);
    return () => {
      setSummaryModalCallback(null);
    };
  }, [setSummaryModalCallback]);


  const [diffModal, setDiffModal] = React.useState<{
    leftTabId: string | null;
    rightTabId: string | null;
    fromHistory?: boolean;
  } | null>(null);

  const [summarizeModal, setSummarizeModal] = React.useState<{
    content: string;
    tabId: string;
  } | null>(null);

  // Encapsulate resizing logic within the hook
  const {
    containerRef,
    dividerProps,
    leftPaneStyle,
    rightPaneStyle,
    isDragging,
  } = useSplitViewResizer(
    splitView?.isSplit,
    splitView?.splitRatio,
    setSplitRatio,
  );

  const { isOpen: isSearchOpen } = useSearchStore();

  const handleOpenDiffModal = (
    fromHistory?: boolean,
    explicitSide?: "left" | "right",
    explicitTabId?: string,
  ) => {
    const currentSplitView = useSplitViewStore.getState().splitView;

    if (fromHistory) {
      // Determine which side we're on based on explicit side or current state
      const isRightSide = explicitSide
        ? explicitSide === "right"
        : currentSplitView.rightTabs.includes(
          currentSplitView.activeRightTabId || "",
        );
      const history = isRightSide
        ? (currentSplitView as any).rightTabHistory
        : (currentSplitView as any).leftTabHistory;

      // Always use the explicit tab ID when provided
      const currentTabId =
        explicitTabId ||
        (isRightSide
          ? currentSplitView.activeRightTabId
          : currentSplitView.activeLeftTabId);

      if (history && history.length >= 2 && currentTabId) {
        // Get the previous tab from history that isn't the current tab
        let previousTabId = null;
        for (let i = 0; i < history.length; i++) {
          if (history[i] !== currentTabId) {
            previousTabId = history[i];
            break;
          }
        }

        if (previousTabId) {
          const tabList = isRightSide ? currentSplitView.rightTabs : currentSplitView.leftTabs;
          const { leftTabId, rightTabId } = getTabsInVisualOrder(tabList, currentTabId, previousTabId);

          setDiffModal({
            leftTabId,
            rightTabId,
            fromHistory: true,
          });
        }
      }
    } else {
      // If we have an explicit tab ID, use it on the appropriate side
      let leftTabId = currentSplitView.activeLeftTabId;
      let rightTabId = currentSplitView.activeRightTabId;

      if (explicitTabId) {
        // If explicit side provided, use it on that side
        if (explicitSide === "left") {
          leftTabId = explicitTabId;
        } else if (explicitSide === "right") {
          rightTabId = explicitTabId;
        } else {
          // No side specified - determine based on which side contains the tab
          const isInLeftSide =
            currentSplitView.leftTabs.includes(explicitTabId);
          const isInRightSide =
            currentSplitView.rightTabs.includes(explicitTabId);

          if (isInLeftSide) {
            leftTabId = explicitTabId;
          } else if (isInRightSide) {
            rightTabId = explicitTabId;
          }
        }
      }

      setDiffModal({
        leftTabId: leftTabId,
        rightTabId: rightTabId,
        fromHistory: false,
      });
    }
  };

  const handleCloseDiffModal = () => {
    setDiffModal(null);
  };

  const handleCloseStoreDiffModal = () => {
    useDiffModalStore.getState().closeDiffModal();
  };

  const handleOpenSummarizeModal = (tabId: string) => {
    // This find should be fast unless 'tabs' is gigantic
    const tab = useTabsStore.getState().tabs.find((t) => t.id === tabId);
    if (tab && tab.content) {
      setSummarizeModal({ content: tab.content, tabId: tabId }); // This should trigger re-render quickly
    } else {
      // Optionally show a user notification here
    }
  };

  const handleCloseSummarizeModal = () => {
    setSummarizeModal(null);
  };

  // URL tab handler
  useUrlTabHandler();

  if (!isAppInitialized) {
    return (
      <div className="app-loading-container">
        <div className="app-loading-spinner"></div>
        <p>Loading tabs...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-canvas text-main transition-colors duration-200">
      <div className="flex w-full h-full min-w-0 overflow-hidden">
        {tabCount === 0 && workspaces.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <>
            <Sidebar />
          <div className="flex flex-1 h-full min-w-0 overflow-hidden flex-col">
            {/* Mobile header with menu trigger */}
            <div className="md:hidden flex items-center px-3 py-2 border-b border-base bg-surface-secondary">
              <button
                onClick={() => useSidebarStore.getState().setMobileOpen(true)}
                className="p-1 -ml-1 mr-2 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>
              <span className="font-semibold text-sm text-main">Scratch Tabs</span>
            </div>

            {/* Main content area */}
            <div
              ref={containerRef}
              className="flex flex-1 h-full min-w-0 overflow-hidden"
            >
            <div
              className="flex flex-col h-full overflow-hidden min-w-0"
              style={leftPaneStyle}
            >
              <div className="w-full flex-shrink-0">
                <TabBar
                  side="left"
                  onOpenDiffModal={handleOpenDiffModal}
                  onOpenSummaryModal={handleOpenSummarizeModal}
                />
              </div>
              <div className="w-full h-full flex-grow overflow-hidden">
                <EditorPaneWrapper side="left" />
              </div>
            </div>

            {splitView.isSplit && (
              <>
                <SplitViewDivider
                  dividerProps={dividerProps}
                  isDragging={isDragging}
                  isSplitEnabled={splitView.isSplit}
                />

                <div
                  className="flex flex-col h-full overflow-hidden min-w-0"
                  style={rightPaneStyle}
                >
                  <div className="w-full flex-shrink-0">
                    <TabBar
                      side="right"
                      onOpenDiffModal={handleOpenDiffModal}
                      onOpenSummaryModal={handleOpenSummarizeModal}
                    />
                  </div>
                  <div className="w-full h-full flex-grow overflow-hidden">
                    <EditorPaneWrapper side="right" />
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
          </>
        )}
      </div>

      {diffModal && (
        <DiffModal
          leftTabId={diffModal.leftTabId || ""}
          rightTabId={diffModal.rightTabId || ""}
          onClose={handleCloseDiffModal}
        />
      )}
      {storeDiffIsOpen && storeDiffLeftTabId && storeDiffRightTabId && (
        <DiffModal
          leftTabId={storeDiffLeftTabId}
          rightTabId={storeDiffRightTabId}
          onClose={handleCloseStoreDiffModal}
        />
      )}
      {canvasSendSource && (
        <SendToCanvasDialog
          source={canvasSendSource}
          side={canvasSendSide}
          onClose={() => useCanvasSendStore.getState().close()}
        />
      )}
      {summarizeModal && (
        <>
          <SummarizeModal
            content={summarizeModal.content}
            onClose={handleCloseSummarizeModal}
          />
        </>
      )}
      {isSearchOpen && <SearchModal />}
      <AIModelManagementModal />
      <AboutModal />
      <ChangelogModal />

      {keyboardCloseConfirmation && (
        <ConfirmationDialog
          isOpen={keyboardCloseConfirmation.isOpen}
          onConfirm={handleKeyboardCloseConfirm}
          onCancel={handleKeyboardCloseCancel}
          message={`Tab "${keyboardCloseConfirmation.tabTitle}" contains content that cannot be recovered once closed. Are you sure you want to close this tab?`}
          position={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
          positionType="above"
        />
      )}

      <TestFields />

      {/* Milestone Celebration Components */}
      <MilestoneToast />
      <MilestoneModal />
    </div>
  );
};

export default MainLayout;
