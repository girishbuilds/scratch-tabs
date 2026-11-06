import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useRootStore } from "../../stores";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { ToolSelectorModal } from "../ToolSelector";
import { toolService, ToolItem } from "../../services/toolService";
import { TabContextMenu } from "./TabContextMenu";
import { TabActions } from "./TabActions";
import { TabTooltip } from "./TabTooltip";
import { Tab } from "../../types";
import { formatRegistry } from "../../formats";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { HamburgerMenu } from "./HamburgerMenu";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { KeyboardSensor } from "@dnd-kit/core";
import { SortableTabList } from "./SortableTabList";
import { NEW_TAB_PREFIX } from "../../constants";
import { getTabContentKind } from "../../utils/tabContentKind";

// Constants for scroll behavior
const SCROLL_SAVE_DEBOUNCE_MS = 300;
const AUTO_SCROLL_DELAY_MS = 50;
const DRAG_SCROLL_DELAY_MS = 100;
const KEYBOARD_SCROLL_AMOUNT_PX = 100;

interface TabBarProps {
  side?: "left" | "right";
  onOpenDiffModal: (
    fromHistory?: boolean,
    explicitSide?: "left" | "right",
    tabId?: string,
  ) => void;
  onOpenSummaryModal: (tabId: string) => void;
}

interface TooltipContent {
  title: string;
  documentType?: "Canvas";
  language?: string;
  lineCount?: number;
  dateCreated: number;
  lastModified: number;
}

export const TabBar: React.FC<TabBarProps> = ({
  side = "left",
  onOpenDiffModal,
  onOpenSummaryModal,
}) => {
  const { tabs } = useTabsStore();
  const { splitView, setLeftScrollPosition, setRightScrollPosition } = useSplitViewStore();
  const {
    removeTab,
    updateTabTitle,
    setActiveLeftTab,
    setActiveRightTab,
    addTab,
    canAddNewTab,
    reorderTabs,
  } = useRootStore();

  const { activeWorkspaceId } = useWorkspaceStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    tabId: string;
    x: number;
    y: number;
  } | null>(null);

  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [isMouseOverTabBar, setIsMouseOverTabBar] = useState(false);
  const [hasInitialDelayPassed, setHasInitialDelayPassed] = useState(false);
  const initialDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredTabIdRef = useRef<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<TooltipContent | null>(
    null,
  );
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const newTabButtonRef = useRef<HTMLButtonElement>(null);
  const tabsWrapperRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Setup DnD sensors
  const sensors = useSensors(
    // 1. Mouse/Pen: Drag after moving 5px (prevents accidental clicks becoming drags)
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    // 2. Keyboard: Standard keyboard controls
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
    // 3. Touch: Require a 250ms hold to start dragging. 
    // This allows immediate swipes to trigger native scrolling instead.
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5, // If they move finger >5px during the 250ms delay, cancel drag (allow scroll)
      },
    })
  );

  const isRightSide = side === "right";
  // Window-level controls (menu, Scratch toggle) live on the right pane when
  // split, otherwise on the only pane.
  const showWindowControls = isRightSide ? splitView.isSplit : !splitView.isSplit;
  const tabIds = isRightSide ? splitView.rightTabs : splitView.leftTabs;

  const tabsKey = tabIds.join("-");

  const activeSideTabId = isRightSide
    ? splitView.activeRightTabId
    : splitView.activeLeftTabId;

  const findTab = (tabId: string): Tab | undefined => {
    return tabs.find((tab) => tab.id === tabId);
  };

  const visibleTabs = tabIds
    .map((id) => findTab(id))
    .filter(Boolean) as typeof tabs;

  const getTabLineCount = (content: string | undefined): number => {
    if (!content) return 1; // Default to 1 line if content is undefined
    return content.split("\n").length;
  };

  const tabLineCounts = tabs
    .filter((tab) => getTabContentKind(tab) === "text")
    .map((tab) => getTabLineCount(tab.content));
  const maxLineCount = Math.max(...tabLineCounts, 1);

  // Check scroll position and update gradient visibility
  const updateScrollGradients = useCallback(() => {
    if (!tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    // Show left gradient if we've scrolled away from the start (with 1px threshold)
    setShowLeftGradient(scrollLeft > 1);

    // Show right gradient if there's more content to scroll to (with 1px threshold)
    setShowRightGradient(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Handle horizontal scrolling via mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!tabsContainerRef.current) return;

    // Only handle vertical scroll wheel events (deltaY)
    if (e.deltaY !== 0) {
      e.preventDefault();
      // Apply vertical scroll delta to horizontal scroll position
      tabsContainerRef.current.scrollLeft += e.deltaY;
      // Update gradients after scroll
      updateScrollGradients();
    }
  }, [updateScrollGradients]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!tabsContainerRef.current || editingTabId) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      tabsContainerRef.current.scrollLeft -= KEYBOARD_SCROLL_AMOUNT_PX;
      updateScrollGradients();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      tabsContainerRef.current.scrollLeft += KEYBOARD_SCROLL_AMOUNT_PX;
      updateScrollGradients();
    }
  }, [editingTabId, updateScrollGradients]);

  const [showToolSelector, setShowToolSelector] = useState(false);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  useEffect(() => {
    return () => {
      if (initialDelayTimerRef.current) {
        clearTimeout(initialDelayTimerRef.current);
      }
      if (hideTooltipTimerRef.current) {
        clearTimeout(hideTooltipTimerRef.current);
      }
    };
  }, []);

  // Restore scroll position on mount
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const savedPosition = isRightSide
      ? splitView.rightScrollPosition
      : splitView.leftScrollPosition;

    if (savedPosition !== undefined) {
      container.scrollLeft = savedPosition;
    }
  }, []); // Run once on mount

  // Auto-scroll to active tab when it changes
  useEffect(() => {
    if (!activeSideTabId || !tabsContainerRef.current) return;

    const timeoutId = setTimeout(() => {
      const activeTabElement = document.getElementById(`tab-${activeSideTabId}`);
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }, AUTO_SCROLL_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [activeSideTabId]);

  // Adjust scroll position when tabs are removed
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    // Check if we're scrolled past the end of content
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;

    // If scrolled past the end, adjust to show the rightmost content
    if (scrollLeft + clientWidth > scrollWidth) {
      const newScrollLeft = Math.max(0, scrollWidth - clientWidth);
      container.scrollLeft = newScrollLeft;
    }
  }, [visibleTabs.length]); // Run when number of tabs changes

  // Set up scroll and resize listeners to update gradients and save scroll position
  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    // Update gradients initially
    updateScrollGradients();

    let scrollSaveTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      updateScrollGradients();

      if (scrollSaveTimeout) {
        clearTimeout(scrollSaveTimeout);
      }
      scrollSaveTimeout = setTimeout(() => {
        const scrollLeft = container.scrollLeft;
        if (isRightSide) {
          setRightScrollPosition(scrollLeft);
        } else {
          setLeftScrollPosition(scrollLeft);
        }
      }, SCROLL_SAVE_DEBOUNCE_MS);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Listen to resize events
    const resizeObserver = new ResizeObserver(() => {
      updateScrollGradients();
    });

    resizeObserver.observe(container);

    return () => {
      if (scrollSaveTimeout) {
        clearTimeout(scrollSaveTimeout);
      }
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateScrollGradients, visibleTabs.length, isRightSide, setLeftScrollPosition, setRightScrollPosition]); // Re-run when tabs change

  const clearTooltipTimers = () => {
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
      initialDelayTimerRef.current = null;
    }
    if (hideTooltipTimerRef.current) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }
  };

  const showTooltip = useCallback((tab: Tab, element: HTMLElement) => {
    clearTooltipTimers();

    const rect = element.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    };

    const content: TooltipContent = {
      title: tab.title,
      dateCreated: tab.dateCreated || Date.now(),
      lastModified: tab.lastModified || Date.now(),
    };
    if (getTabContentKind(tab) === "canvas") {
      content.documentType = "Canvas";
    }

    if (getTabContentKind(tab) === "text") {
      content.lineCount = getTabLineCount(tab.content);

      try {
        const detector = formatRegistry.getById(tab.language);

        if (detector) {
          content.language =
            detector.id === tab.language
              ? detector.id
              : tab.language || "Unknown";
        } else {
          content.language = tab.language || "Unknown";
        }
      } catch (error) {
        content.language = tab.language || "Error";
        console.error("[TAB TOOLTIP] Error getting language info:", error);
      }
    }

    setTooltipPosition(position);
    setTooltipContent(content);
    setTooltipVisible(true);
  }, []);

  const handleTabMouseEnter = useCallback(
    (tab: Tab, element: HTMLElement) => {
      setHoveredTabId(tab.id);
      hoveredTabIdRef.current = tab.id;

      clearTooltipTimers();

      if (isMouseOverTabBar && hasInitialDelayPassed) {
        showTooltip(tab, element);
      } else {
        initialDelayTimerRef.current = setTimeout(() => {
          if (hoveredTabIdRef.current === tab.id) {
            showTooltip(tab, element);
            setHasInitialDelayPassed(true);
          }
          initialDelayTimerRef.current = null;
        }, 1000);
      }
    },
    [isMouseOverTabBar, hasInitialDelayPassed, showTooltip],
  );

  const handleTabMouseLeave = useCallback(
    (_tabId: string) => {
      if (initialDelayTimerRef.current) {
        clearTimeout(initialDelayTimerRef.current);
        initialDelayTimerRef.current = null;
      }

      hideTooltipTimerRef.current = setTimeout(() => {
        if (!isMouseOverTabBar) {
          setTooltipVisible(false);
          setHoveredTabId(null);
          hoveredTabIdRef.current = null;
        }
        hideTooltipTimerRef.current = null;
      }, 50);
    },
    [isMouseOverTabBar],
  );

  const handleTabBarMouseEnter = () => {
    setIsMouseOverTabBar(true);
  };

  const handleTabBarMouseLeave = () => {
    setIsMouseOverTabBar(false);
    setHasInitialDelayPassed(false);
    clearCommonTooltipState();
  };

  const clearCommonTooltipState = () => {
    clearTooltipTimers();
    setTooltipVisible(false);
    setHoveredTabId(null);
    hoveredTabIdRef.current = null;
  };

  // Handle drag end event from dnd-kit
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Find the indices of the tabs
    const oldIndex = tabIds.indexOf(active.id as string);
    const newIndex = tabIds.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    // Get the tab being dragged
    const draggedTab = findTab(active.id as string);

    // If pinned, don't allow drag
    if (draggedTab?.isPinned) {
      return;
    }

    // Check if we're trying to move past pinned tabs
    for (
      let i = Math.min(oldIndex, newIndex);
      i <= Math.max(oldIndex, newIndex);
      i++
    ) {
      const tabAtIndex = findTab(tabIds[i]);
      if (i === oldIndex) continue;

      if (tabAtIndex?.isPinned) {
        return; // Can't move past pinned tabs
      }
    }

    const newTabIds = arrayMove(tabIds, oldIndex, newIndex);
    reorderTabs(side, newTabIds);

    setTimeout(() => {
      const draggedTabElement = document.getElementById(`tab-${active.id}`);
      if (draggedTabElement) {
        draggedTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }, DRAG_SCROLL_DELAY_MS);

    clearCommonTooltipState();
  };

  // Add a drag start handler that will activate the tab
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active) {
      const tabId = active.id as string;
      handleTabClick(tabId);
    }
  };

  const startEditingTab = useCallback(
    (tabId: string) => {
      const tabToEdit = findTab(tabId);
      if (tabToEdit) {
        clearCommonTooltipState();
        setEditingTabId(tabId);
        setEditingTitle(tabToEdit.title);
      }
    },
    [findTab, clearCommonTooltipState, setEditingTabId, setEditingTitle],
  );

  const handleDoubleClick = (tab: Tab, e: React.MouseEvent<HTMLDivElement>) => {
    clearCommonTooltipState();
    const target = e.target as HTMLElement;
    if (target.tagName === "SPAN" || target.tagName === "DIV") {
      setEditingTabId(tab.id);
      setEditingTitle(tab.title);
    } else {
      handleCreateNewTab();
    }

    e.stopPropagation();
  };

  const handleStartRename = (tab: Tab) => {
    clearCommonTooltipState();
    setEditingTabId(tab.id);
    setEditingTitle(tab.title);
  };

  const handleCreateNewTab = () => {
    if (!canAddNewTab(isRightSide)) return;

    // Count tabs excluding the Welcome tab for proper numbering (same logic as handleNewTab)
    const currentTabs = tabs.filter((t) => t.workspaceId === activeWorkspaceId);
    const nonWelcomeTabs = currentTabs.filter(
      (tab) => tab.title !== "Welcome",
    );
    const defaultTitle = `${NEW_TAB_PREFIX} ${nonWelcomeTabs.length + 1}`;

    const newTabId = crypto.randomUUID();
    addTab(
      {
        id: newTabId,
        title: defaultTitle,
        content: "",
        language: "plaintext",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        workspaceId: activeWorkspaceId || "default",
        dateCreated: Date.now(),
        lastModified: Date.now(),
      },
      isRightSide,
    );
  };

  const handleInputBlur = () => {
    if (editingTabId && editingTitle.trim()) {
      updateTabTitle(editingTabId, editingTitle);
    }
    setEditingTabId(null);
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    tabId: string,
  ) => {
    clearCommonTooltipState();
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  const handleContextMenuClose = (payload?: {
    action: string;
    tabId?: string;
    side?: string;
  }) => {
    if (payload?.action === "compareSides") {
      onOpenDiffModal(false, undefined, payload.tabId);
    } else if (payload?.action === "compare") {
      onOpenDiffModal(
        true,
        (payload.side as "left" | "right") || side,
        payload.tabId,
      );
    } else if (payload?.action === "compareClipboard") {
      onOpenDiffModal(
        false,
        (payload.side as "left" | "right") || side,
        payload.tabId,
      );
    } else if (payload?.action === "summary" && payload.tabId) {
      onOpenSummaryModal(payload.tabId);
    }
    setContextMenu(null);
  };

  const handleTabClick = (tabId: string) => {
    clearCommonTooltipState();
    if (isRightSide) {
      setActiveRightTab(tabId);
    } else {
      setActiveLeftTab(tabId);
    }
  };

  const handleEmptyAreaDoubleClick = (e: React.MouseEvent) => {
    if (e.currentTarget === e.target) {
      handleCreateNewTab();
    }
  };

  const handleToolSelect = async (item: ToolItem) => {
    await toolService.executeTool(item, {
      side,
      activeWorkspaceId: activeWorkspaceId || "default",
      addTab: (tabData, isRight) => addTab(tabData, isRight),
      createCanvas: (isRight) =>
        useRootStore.getState().handleNewCanvas(isRight),
    });
    setShowToolSelector(false);
  };

  // Get lists of pinned and unpinned tabs
  const pinnedTabs = visibleTabs.filter((tab) => tab.isPinned);
  const unpinnedTabs = visibleTabs.filter((tab) => !tab.isPinned);

  const handleTabClose = async (tabId: string) => {
    await removeTab(tabId);

    if (hoveredTabId === tabId) {
      setTooltipVisible(false);
      clearTooltipTimers();
      setHoveredTabId(null);
    }
  };


  return (
    <>
      <div
        ref={tabBarRef}
        className="flex bg-surface-tab-bar text-main w-full h-8 overflow-hidden relative"
        onMouseEnter={handleTabBarMouseEnter}
        onMouseLeave={handleTabBarMouseLeave}
      >
        <div className="flex-1 relative min-w-0">
          <div
            ref={tabsContainerRef}
            className="w-full h-full flex overflow-x-auto overflow-y-hidden no-scrollbar min-w-0"
            onDoubleClick={handleEmptyAreaDoubleClick}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            data-testid="tab-bar-empty-area"
          >
            <div ref={tabsWrapperRef} className="flex h-full">
              <DndContext
                sensors={sensors}
                modifiers={[restrictToHorizontalAxis]}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
              >
                {/* Pinned tabs */}
                {pinnedTabs.length > 0 && (
                  <SortableTabList
                    tabs={visibleTabs}
                    activeTabId={activeSideTabId}
                    tabIds={tabIds}
                    editingTabId={editingTabId}
                    editingTitle={editingTitle}
                    maxLineCount={maxLineCount}
                    isPinned={true}
                    side={side}
                    onTabClick={handleTabClick}
                    onTabClose={handleTabClose}
                    onTabDoubleClick={handleDoubleClick}
                    onTabStartRename={handleStartRename}
                    onTabContextMenu={handleContextMenu}
                    onEditChange={setEditingTitle}
                    onEditSubmit={handleInputBlur}
                    onEditCancel={() => setEditingTabId(null)}
                    onMouseEnterTab={handleTabMouseEnter}
                    onMouseLeaveTab={handleTabMouseLeave}
                    onForceHideTooltip={clearCommonTooltipState}
                  />
                )}

                {/* Unpinned tabs */}
                {unpinnedTabs.length > 0 && (
                  <SortableTabList
                    tabs={visibleTabs}
                    activeTabId={activeSideTabId}
                    tabIds={tabIds}
                    editingTabId={editingTabId}
                    editingTitle={editingTitle}
                    maxLineCount={maxLineCount}
                    side={side}
                    onTabClick={handleTabClick}
                    onTabClose={handleTabClose}
                    onTabDoubleClick={handleDoubleClick}
                    onTabStartRename={handleStartRename}
                    onTabContextMenu={handleContextMenu}
                    onEditChange={setEditingTitle}
                    onEditSubmit={handleInputBlur}
                    onEditCancel={() => setEditingTabId(null)}
                    onMouseEnterTab={handleTabMouseEnter}
                    onMouseLeaveTab={handleTabMouseLeave}
                    onForceHideTooltip={clearCommonTooltipState}
                  />
                )}
              </DndContext>
            </div>
          </div>

          {/* Left gradient indicator - scoped to tab scroll area */}
          {showLeftGradient && (
            <div
              className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none z-10 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(to right, rgb(var(--color-surface-tab-bar)) 20%, transparent 100%)',
              }}
              aria-hidden="true"
              data-testid="tab-bar-left-gradient"
            />
          )}

          {/* Right gradient indicator - scoped to tab scroll area */}
          {showRightGradient && (
            <div
              className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none z-10 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(to left, rgb(var(--color-surface-tab-bar)) 20%, transparent 100%)',
              }}
              aria-hidden="true"
              data-testid="tab-bar-right-gradient"
            />
          )}
        </div>


        <div className="flex items-center space-x-1 pr-2">
          <TabActions
            side={side}
            showScratch={showWindowControls}
            onShowTabletSelector={() => setShowToolSelector(!showToolSelector)}
            newTabButtonRef={newTabButtonRef}
          />
          {/* Only show WorkspaceSwitcher and HamburgerMenu on the right side when split, or on the left when not split */}
          {showWindowControls && <HamburgerMenu />}
        </div>
      </div>

      {showToolSelector && (
        <ToolSelectorModal
          onSelect={handleToolSelect}
          onClose={() => setShowToolSelector(false)}
        />
      )}

      {contextMenu && (
        <TabContextMenu
          tabId={contextMenu.tabId}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleContextMenuClose}
          isRightSide={isRightSide}
          startEditingTab={startEditingTab}
        />
      )}

      <TabTooltip
        visible={tooltipVisible}
        content={tooltipContent}
        position={tooltipPosition}
      />

    </>
  );
};
