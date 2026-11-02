import React, { useLayoutEffect, useRef } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useScratchHotkey } from "../hooks/useScratchHotkey";
import { useScratchpadStore } from "../stores/useScratchpadStore";
import { ScratchComposer } from "./ScratchComposer";
import { ScratchEntryRow } from "./ScratchEntryRow";

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
  const { isOpen, status, items, notice, error } = useScratchpadStore();
  const { toggle, close, addFromText, undoLastAdd, remove, revealSecrets, getCopyText } =
    useScratchpadStore.getState();

  useScratchHotkey(() => void toggle());
  useRestoreFocus(isOpen);

  if (!isOpen) return null;

  return (
    <aside
      data-testid="scratch-drawer"
      role="complementary"
      aria-label="Scratch"
      className="fixed bottom-0 right-0 top-8 z-40 flex w-[380px] max-w-full flex-col border-l border-base bg-surface-secondary shadow-xl"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <header className="flex items-center justify-between border-b border-base bg-surface-raised px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-main">
          Scratch
          <span title="Entries are encrypted before they are stored in this browser">
            <ShieldCheck size={14} className="text-secondary" aria-label="Encrypted" />
          </span>
        </h2>
        <button
          type="button"
          data-testid="scratch-close"
          aria-label="Close Scratch"
          className="rounded p-1 text-secondary transition-colors hover:bg-element-hover hover:text-main"
          onClick={close}
        >
          <X size={16} />
        </button>
      </header>

      <div className="space-y-2 border-b border-base p-3">
        <ScratchComposer onSubmit={(text) => void addFromText(text)} />
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
              onClick={() => void undoLastAdd()}
            >
              Undo
            </button>
          </p>
        )}
      </div>

      <ul className="custom-scrollbar flex-1 overflow-y-auto" data-testid="scratch-list">
        {items.map((item) => (
          <ScratchEntryRow
            key={item.id}
            item={item}
            onRemove={(id) => void remove(id)}
            loadSecrets={revealSecrets}
            loadCopyText={getCopyText}
          />
        ))}
        {status === "ready" && items.length === 0 && (
          <li data-testid="scratch-empty" className="px-4 py-8 text-center text-sm text-muted">
            Paste anything here. Keys, tokens and passwords are masked and
            encrypted automatically.
          </li>
        )}
      </ul>
    </aside>
  );
};
