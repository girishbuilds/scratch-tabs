import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ListChecks } from "lucide-react";
import { useDrawerResize } from "../hooks/useDrawerResize";
import { useEntrySelection } from "../hooks/useEntrySelection";
import { useScratchHotkey } from "../hooks/useScratchHotkey";
import { DRAWER_EDGE_MARGIN } from "../services/drawerWidth";
import { canMove } from "../services/entryOrdering";
import { selectionState } from "../services/entrySelection";
import { filterEntries } from "../services/searchEntries";
import { useScratchpadStore } from "../stores/useScratchpadStore";
import { useScratchSettingsStore } from "../stores/scratchSettingsStore";
import { ConfirmationDialog } from "../../../components/Tab/ConfirmationDialog";
import type { ScratchEntryActions } from "./entryActions";
import { ScratchComposer } from "./ScratchComposer";
import { ScratchEntryRow } from "./ScratchEntryRow";
import { ScratchHeader } from "./ScratchHeader";
import { ScratchResizeHandle } from "./ScratchResizeHandle";
import { ScratchSearch } from "./ScratchSearch";
import { ScratchSelectionBar } from "./ScratchSelectionBar";
import { iconButton } from "./styles";

/**
 * Restores focus to whatever had it (e.g. the editor) when the drawer closes.
 * Must be a layout effect: child effects (the composer's autofocus) run before
 * a parent's passive effect, by which time focus has already moved.
 */
function useRestoreFocus(isOpen: boolean) {
  const previous = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!isOpen) return;
    previous.current = document.activeElement as HTMLElement | null;
    return () => previous.current?.focus?.();
  }, [isOpen]);
}

export const ScratchDrawer: React.FC = () => {
  const { isOpen, status, items, notice, error, query, isPresenting } = useScratchpadStore();
  const { clipboardAutoClear, setClipboardAutoClear, drawerWidth, setDrawerWidth } =
    useScratchSettingsStore();
  const resize = useDrawerResize(drawerWidth, setDrawerWidth);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const selection = useEntrySelection();
  const { retain: retainSelection, exit: exitSelection } = selection;

  const store = useScratchpadStore.getState();
  const actions = useMemo<ScratchEntryActions>(() => {
    const s = useScratchpadStore.getState();
    return {
      remove: (id) => void s.remove(id),
      togglePin: (id) => void s.togglePin(id),
      moveEntries: (ids, target) => void s.moveEntries(ids, target),
      markNotSecret: s.markNotSecret,
      maskRange: s.maskRange,
      updateText: s.updateText,
      revealSecrets: s.revealSecrets,
      getSecretValue: s.getSecretValue,
      getEditableText: s.getEditableText,
      getCopyText: s.getCopyText,
    };
  }, []);

  const visibleItems = useMemo(() => filterEntries(items, query), [items, query]);

  // Moving inside a filtered view would be ambiguous, so it waits for the search to clear.
  const moveDisabledReason = query.trim().length > 0 ? "Clear the search to reorder" : undefined;
  const visibleIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);
  const selectedItems = useMemo(
    () => visibleItems.filter((item) => selection.selected.has(item.id)),
    [visibleItems, selection.selected],
  );
  const selectedIds = useMemo(() => selectedItems.map((item) => item.id), [selectedItems]);
  const allSelectedPinned = selectedItems.length > 0 && selectedItems.every((item) => item.pinned);

  // A selection only ever covers entries that are shown: filtering or deleting drops the rest.
  useEffect(() => retainSelection(visibleIds), [visibleIds, retainSelection]);
  // Leaving the drawer, or emptying it, ends selection mode.
  useEffect(() => {
    if (!isOpen || items.length === 0) exitSelection();
  }, [isOpen, items.length, exitSelection]);

  useScratchHotkey(() => void store.toggle());
  useRestoreFocus(isOpen);

  if (!isOpen) return null;

  const isSearching = query.trim().length > 0;

  return (
    <aside
      data-testid="scratch-drawer"
      role="complementary"
      aria-label="Global Scratchpad"
      style={{ width: resize.width, right: DRAWER_EDGE_MARGIN }}
      className={`fixed bottom-2 top-10 z-40 flex max-w-[calc(100vw-1rem)] flex-col rounded-lg border border-base bg-surface-secondary shadow-2xl max-md:top-14 ${
        resize.isDragging ? "select-none" : ""
      }`}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // Escape steps back out of selection mode before it closes the drawer.
        if (selection.active) selection.exit();
        else store.close();
      }}
    >
      <ScratchResizeHandle
        width={resize.width}
        isDragging={resize.isDragging}
        handleProps={resize.handleProps}
      />
      <ScratchHeader
        count={items.length}
        presenting={isPresenting}
        clipboardAutoClear={clipboardAutoClear}
        canClearAll={items.length > 0}
        onTogglePresenting={() => store.setPresenting(!isPresenting)}
        onToggleClipboardAutoClear={() => setClipboardAutoClear(!clipboardAutoClear)}
        onClearAll={() => setConfirmingClear(true)}
        onClose={store.close}
      />

      <div className="space-y-2 border-b border-base p-3">
        {selection.active ? (
          <ScratchSelectionBar
            count={selectedIds.length}
            state={selectionState(selectedIds.length, visibleIds.length)}
            allPinned={allSelectedPinned}
            canMove={(target) => canMove(items, selectedIds, target)}
            onMove={(target) => void store.moveEntries(selectedIds, target)}
            moveDisabledReason={moveDisabledReason}
            onToggleAll={() =>
              selectedIds.length === visibleIds.length
                ? selection.clear()
                : selection.selectAll(visibleIds)
            }
            onTogglePin={() => void store.setPinnedMany(selectedIds, !allSelectedPinned)}
            onDelete={() => setConfirmingDelete(true)}
            onDone={selection.exit}
          />
        ) : (
          <ScratchComposer onSubmit={(text) => void store.addFromText(text)} />
        )}
        {error && (
          <p role="alert" data-testid="scratch-error" className="text-xs text-warning">
            {error}
          </p>
        )}
        {notice && !selection.active && (
          <p data-testid="scratch-notice" className="flex items-center justify-between text-xs text-secondary">
            <span>
              {notice.addedIds.length} added
              {notice.maskedCount > 0 ? ` - ${notice.maskedCount} masked` : ""}
            </span>
            <button
              type="button"
              data-testid="scratch-undo"
              className="text-main underline"
              onClick={() => void store.undoLastAdd()}
            >
              Undo
            </button>
          </p>
        )}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5">
            <ScratchSearch query={query} onChange={store.setQuery} />
            <button
              type="button"
              data-testid="scratch-select-toggle"
              aria-label="Select entries"
              aria-pressed={selection.active}
              title="Select entries (or Cmd/Ctrl+click a row)"
              className={`${iconButton} flex-none ${selection.active ? "bg-element text-main" : ""}`}
              onClick={selection.active ? selection.exit : selection.start}
            >
              <ListChecks size={16} />
            </button>
          </div>
        )}
      </div>

      <ul className="custom-scrollbar flex-1 overflow-y-auto pb-16" data-testid="scratch-list">
        {visibleItems.map((item) => (
          <ScratchEntryRow
            key={item.id}
            item={item}
            actions={actions}
            presenting={isPresenting}
            move={{
              canMove: (target) => canMove(items, [item.id], target),
              disabledReason: moveDisabledReason,
            }}
            selection={{
              active: selection.active,
              selected: selection.selected.has(item.id),
              onSelect: (range) => selection.select(item.id, range, visibleIds),
            }}
          />
        ))}
        {status === "ready" && items.length === 0 && (
          <li data-testid="scratch-empty" className="px-4 py-8 text-center text-sm text-muted">
            Paste anything here. Keys, tokens and passwords are masked and
            encrypted automatically.
          </li>
        )}
        {isSearching && items.length > 0 && visibleItems.length === 0 && (
          <li data-testid="scratch-no-matches" className="px-4 py-8 text-center text-sm text-muted">
            No matches. Secret values are not searched.
          </li>
        )}
      </ul>

      <ConfirmationDialog
        isOpen={confirmingDelete}
        message={`Delete ${selectedIds.length} Scratch ${
          selectedIds.length === 1 ? "entry" : "entries"
        }? This cannot be undone.`}
        confirmButtonText="Delete"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          void store.removeMany(selectedIds);
        }}
      />
      <ConfirmationDialog
        isOpen={confirmingClear}
        message={`Delete all ${items.length} Scratch entries? This cannot be undone.`}
        confirmButtonText="Delete all"
        onCancel={() => setConfirmingClear(false)}
        onConfirm={() => {
          setConfirmingClear(false);
          void store.clearAll();
        }}
      />
    </aside>
  );
};
