import React from "react";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTab } from "./SortableTab";
import { Tab } from "../../types";

interface SortableTabListProps {
  tabs: Tab[];
  activeTabId: string | null;
  tabIds: string[];
  editingTabId: string | null;
  editingTitle: string;
  maxLineCount: number;
  isPinned?: boolean;
  side?: "left" | "right";
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabDoubleClick: (tab: Tab, e: React.MouseEvent<HTMLDivElement>) => void;
  onTabStartRename?: (tab: Tab) => void;
  onTabContextMenu: (
    e: React.MouseEvent<HTMLDivElement>,
    tabId: string,
  ) => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onMouseEnterTab: (tab: Tab, element: HTMLElement) => void;
  onMouseLeaveTab: (tabId: string) => void;
  onForceHideTooltip?: () => void;
}

export const SortableTabList: React.FC<SortableTabListProps> = ({
  tabs,
  activeTabId,
  tabIds,
  editingTabId,
  editingTitle,
  maxLineCount,
  isPinned = false,
  side = "left",
  onTabClick,
  onTabClose,
  onTabDoubleClick,
  onTabStartRename,
  onTabContextMenu,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onMouseEnterTab,
  onMouseLeaveTab,
  onForceHideTooltip,
}) => {
  // Only tabs that match the pinned state are shown
  const filteredTabs = tabs.filter((tab) => !!tab.isPinned === isPinned);
  const filteredIds = tabIds.filter((id) => {
    const tab = tabs.find((t) => t.id === id);
    return tab && !!tab.isPinned === isPinned;
  });

  return (
    <SortableContext
      items={filteredIds}
      strategy={horizontalListSortingStrategy}
    >
      <div className="flex">
        {filteredTabs.map((tab) => (
          <SortableTab
            key={tab.id}
            tab={tab}
            isActive={activeTabId === tab.id}
            isEditing={editingTabId === tab.id}
            editingTitle={editingTitle}
            maxLineCount={maxLineCount}
            side={side}
            onClick={() => onTabClick(tab.id)}
            onClose={(e) => {
              if (tab.id) {
                onTabClose(tab.id);
              }
            }}
            onDoubleClick={(e) => onTabDoubleClick(tab, e)}
            onStartRename={onTabStartRename ? () => onTabStartRename(tab) : undefined}
            onContextMenu={(e) => onTabContextMenu(e, tab.id)}
            onEditChange={onEditChange}
            onEditSubmit={onEditSubmit}
            onEditCancel={onEditCancel}
            onMouseEnterTab={onMouseEnterTab}
            onMouseLeaveTab={onMouseLeaveTab}
            onForceHideTooltip={onForceHideTooltip}
          />
        ))}
      </div>
    </SortableContext>
  );
};
