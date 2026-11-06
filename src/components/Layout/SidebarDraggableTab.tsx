import React, { useCallback, useRef, useEffect } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pin, Calculator, Type, File, FileCode, FileText, Edit, Layers } from "../Icons";
import { clsx } from "clsx";
import { useSidebarStore } from "../../stores/sidebarStore";
import { useRootStore } from "../../stores/rootStore";
import type { TabContentKind } from "../../types";

export interface SidebarDraggableTabProps {
  id: string;
  title: string;
  language: string;
  workspaceId: string;
  isActive: boolean;
  isPinned?: boolean;
  isTablet?: boolean;
  isRich?: boolean;
  contentKind?: TabContentKind;
  style?: React.CSSProperties;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const SidebarDraggableTab: React.FC<SidebarDraggableTabProps> = ({
  id,
  title,
  language,
  workspaceId,
  isActive,
  isPinned,
  isTablet,
  isRich,
  contentKind,
  style: externalStyle,
  onClick,
  onContextMenu,
  disabled = false
}) => {
  const editingId = useSidebarStore(s => s.editingId);
  const editingValue = useSidebarStore(s => s.editingValue);
  const setEditingId = useSidebarStore(s => s.setEditingId);
  const setEditingValue = useSidebarStore(s => s.setEditingValue);
  const { updateTabTitle } = useRootStore();
  const isEditing = editingId === id;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRenameSave = useCallback(() => {
    if (editingValue.trim() && editingValue.trim() !== title) {
      updateTabTitle(id, editingValue.trim());
    }
    setEditingId(null);
  }, [editingValue, title, updateTabTitle, id, setEditingId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSave();
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  }, [handleRenameSave, setEditingId]);

  const startRename = useCallback(() => {
    setEditingId(id, title);
  }, [setEditingId, id, title]);

  // Setup draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `tab-${id}`,
    disabled: disabled || isPinned || isEditing,
    data: {
      type: "tab",
      tabId: id,
      workspaceId,
      isPinned,
    },
  });

  // Setup droppable (for reordering)
  const { setNodeRef: setDroppableNodeRef, isOver: isDropTargetOver } =
    useDroppable({
      id: `tab-drop-${id}`,
      data: {
        type: "tab",
        tabId: id,
        workspaceId,
      },
    });

  // Combine refs
  const combinedNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
    },
    [setDraggableNodeRef, setDroppableNodeRef]
  );

  // Combine styles
  const transformStyle = transform
    ? {
      transform: CSS.Transform.toString(transform),
      transition: "none", // Disable transition during drag
    }
    : {};

  const combinedStyle: React.CSSProperties = {
    ...externalStyle,
    ...transformStyle,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled || isPinned ? "pointer" : isEditing ? "text" : "grab",
  };

  return (
    <div
      ref={combinedNodeRef}
      style={combinedStyle}
      {...(!isEditing ? attributes : {})}
      {...(!isEditing ? listeners : {})}
      className={clsx(
        "flex items-center px-6 py-0.5 cursor-pointer hover:bg-element-hover group select-none",
        isActive ? "bg-primary-subtle border-r-2 border-primary" : "text-secondary",
        isDropTargetOver && !isDragging && "ring-1 ring-inset ring-blue-400 bg-primary/5",
        isDragging && "opacity-50 scale-105"
      )}
      onClick={!isEditing ? onClick : undefined}
      onDoubleClick={!isEditing ? startRename : undefined}
      onKeyDown={(e) => {
        if (isEditing) return;
        if (e.key === "F2" && e.target === e.currentTarget) {
          e.preventDefault();
          startRename();
          return;
        }
        listeners?.onKeyDown?.(e);
      }}
      onContextMenu={!isEditing ? onContextMenu : undefined}
      data-testid={`sidebar-tab-${id}`}
      aria-selected={isActive}
    >
      <span className="mr-1.5 opacity-70 pointer-events-none">
        <TabIcon language={language} isTablet={isTablet} contentKind={contentKind} />
      </span>
      <div className="flex-1 flex items-center min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-canvas border border-primary px-1 text-[12px] rounded focus:outline-none"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            data-testid="tab-rename-input"
          />
        ) : (
          <span className={clsx("truncate text-[12px] pointer-events-none", isActive && "text-main font-semibold")}>
            {title}
          </span>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1 ml-auto">
          <div className="hidden group-hover:flex items-center gap-1 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                startRename();
              }}
              className="p-0.5 hover:bg-surface-raised rounded text-secondary hover:text-main"
              title="Rename tab"
            >
              <Edit size={12} />
            </button>
          </div>
          <div className="flex items-center">
            {isPinned && <Pin size={10} className="ml-1 opacity-50 pointer-events-none" />}
            {isRich && <Type size={10} className="ml-1 opacity-50 pointer-events-none" />}
          </div>
        </div>
      )}
    </div>
  );
};

// TabIcon component (same as in Sidebar.tsx)
const TabIcon: React.FC<{ language: string; isTablet?: boolean; contentKind?: TabContentKind }> = ({ language, isTablet, contentKind }) => {
  if (contentKind === "canvas") return <Layers size={12} />;
  if (isTablet) return <Calculator size={12} />;

  switch (language.toLowerCase()) {
    case "typescript":
    case "javascript":
    case "json":
      return <FileCode size={12} />;
    case "markdown":
    case "plaintext":
      return <FileText size={12} />;
    default:
      return <File size={12} />;
  }
};
