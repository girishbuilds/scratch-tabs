import React, { useEffect, useRef } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import type { SelectionState } from "../services/entrySelection";
import type { MoveTarget } from "../services/entryOrdering";
import { ScratchMoveMenu } from "./ScratchMoveMenu";
import { iconButton } from "./styles";

interface ScratchSelectionBarProps {
  count: number;
  /** Whether none, some or all of the shown entries are selected. */
  state: SelectionState;
  /** True when every selected entry is already pinned: the button then unpins. */
  allPinned: boolean;
  /** Which moves would change anything for the selected entries. */
  canMove: (target: MoveTarget) => boolean;
  onMove: (target: MoveTarget) => void;
  /** Set (e.g. while searching) to disable Move and say why. */
  moveDisabledReason?: string;
  onToggleAll: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onDone: () => void;
}

/**
 * Replaces the capture box while entries are being selected. Select-all is a
 * tri-state checkbox over the entries currently shown (so it respects search).
 */
export const ScratchSelectionBar: React.FC<ScratchSelectionBarProps> = ({
  count,
  state,
  allPinned,
  canMove,
  onMove,
  moveDisabledReason,
  onToggleAll,
  onTogglePin,
  onDelete,
  onDone,
}) => {
  const checkbox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = state === "some";
  }, [state]);

  const none = count === 0;

  return (
    <div
      data-testid="scratch-selection-bar"
      role="toolbar"
      aria-label="Selected entries"
      className="flex items-center gap-2 rounded border border-base bg-surface px-2 py-1.5 text-sm"
    >
      <input
        ref={checkbox}
        type="checkbox"
        data-testid="scratch-select-all"
        aria-label="Select all shown entries"
        checked={state === "all"}
        onChange={onToggleAll}
        className="h-3.5 w-3.5 cursor-pointer accent-[rgb(var(--color-border-focus))]"
      />
      <span data-testid="scratch-selected-count" aria-live="polite" className="flex-1 text-main">
        {none ? "Select entries" : `${count} selected`}
      </span>
      <ScratchMoveMenu
        label="Move selected"
        testId="scratch-bulk-move"
        canMove={canMove}
        onMove={onMove}
        disabledReason={none ? "Select entries to move" : moveDisabledReason}
      />
      <button
        type="button"
        data-testid="scratch-bulk-pin"
        aria-label={allPinned ? "Unpin selected" : "Pin selected"}
        title={allPinned ? "Unpin selected" : "Pin selected"}
        disabled={none}
        className={`${iconButton} disabled:opacity-40 disabled:hover:bg-transparent`}
        onClick={onTogglePin}
      >
        {allPinned ? <PinOff size={14} /> : <Pin size={14} />}
      </button>
      <button
        type="button"
        data-testid="scratch-bulk-delete"
        aria-label="Delete selected"
        title="Delete selected"
        disabled={none}
        className={`${iconButton} hover:!text-warning disabled:opacity-40 disabled:hover:bg-transparent`}
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        data-testid="scratch-select-done"
        className="rounded px-2 py-0.5 text-secondary hover:bg-element-hover hover:text-main"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
};
