import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDrawerResize } from "../hooks/useDrawerResize";
import { useScratchHotkey } from "../hooks/useScratchHotkey";
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

  const store = useScratchpadStore.getState();
  const actions = useMemo<ScratchEntryActions>(() => {
    const s = useScratchpadStore.getState();
    return {
      remove: (id) => void s.remove(id),
      togglePin: (id) => void s.togglePin(id),
      markNotSecret: s.markNotSecret,
      maskRange: s.maskRange,
      revealSecrets: s.revealSecrets,
      getSecretValue: s.getSecretValue,
      getEditableText: s.getEditableText,
      getCopyText: s.getCopyText,
    };
  }, []);

  const visibleItems = useMemo(() => filterEntries(items, query), [items, query]);

  useScratchHotkey(() => void store.toggle());
  useRestoreFocus(isOpen);

  if (!isOpen) return null;

  const isSearching = query.trim().length > 0;

  return (
    <aside
      data-testid="scratch-drawer"
      role="complementary"
      aria-label="Global Scratchpad"
      style={{ width: resize.width }}
      className={`fixed bottom-0 right-0 top-8 z-40 flex max-w-full flex-col border-l border-base bg-surface-secondary shadow-xl ${
        resize.isDragging ? "select-none" : ""
      }`}
      onKeyDown={(e) => {
        if (e.key === "Escape") store.close();
      }}
    >
      <ScratchResizeHandle
        width={resize.width}
        isDragging={resize.isDragging}
        handleProps={resize.handleProps}
      />
      <ScratchHeader
        presenting={isPresenting}
        clipboardAutoClear={clipboardAutoClear}
        canClearAll={items.length > 0}
        onTogglePresenting={() => store.setPresenting(!isPresenting)}
        onToggleClipboardAutoClear={() => setClipboardAutoClear(!clipboardAutoClear)}
        onClearAll={() => setConfirmingClear(true)}
        onClose={store.close}
      />

      <div className="space-y-2 border-b border-base p-3">
        <ScratchComposer onSubmit={(text) => void store.addFromText(text)} />
        {error && (
          <p role="alert" data-testid="scratch-error" className="text-xs text-warning">
            {error}
          </p>
        )}
        {notice && (
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
        {items.length > 0 && <ScratchSearch query={query} onChange={store.setQuery} />}
      </div>

      <ul className="custom-scrollbar flex-1 overflow-y-auto pb-16" data-testid="scratch-list">
        {visibleItems.map((item) => (
          <ScratchEntryRow key={item.id} item={item} actions={actions} presenting={isPresenting} />
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
