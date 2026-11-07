import React from "react";
import { Check, Link2, LockKeyhole, Pin, StickyNote, SquareTerminal, KeyRound } from "lucide-react";
import type { ScratchListItem } from "../types";

const KIND_ICON: Record<ScratchListItem["kind"], React.ReactNode> = {
  secret: <KeyRound size={14} />,
  command: <SquareTerminal size={14} />,
  url: <Link2 size={14} />,
  note: <StickyNote size={14} />,
  unreadable: <LockKeyhole size={14} />,
};

/** How a row takes part in multi-select. Absent when the list has no selection support. */
export interface RowSelection {
  /** True while the list is in selection mode: clicking selects instead of copying. */
  active: boolean;
  selected: boolean;
  /** Called on a click in selection mode, or a Cmd/Ctrl+click outside it. */
  onSelect: (range: boolean) => void;
}

interface ScratchEntryShellProps {
  kind: ScratchListItem["kind"];
  pinned: boolean;
  /** Shows a green tick in place of the kind icon. */
  copied?: boolean;
  /** Makes the whole row a copy target. */
  onActivate?: () => void;
  selection?: RowSelection;
  /** Hover toolbar; null (e.g. while editing) shows none. */
  toolbar: React.ReactNode;
  children: React.ReactNode;
}

/** Clicks on controls, editors and links inside the row must not trigger a copy. */
const INTERACTIVE = "button, a, input, textarea, select, [role='menu']";

/**
 * The row frame: kind icon (a tick right after a copy, a checkbox in selection
 * mode), content, a floating toolbar, and a pin marker that is the only thing
 * visible at rest. Clicking the row copies, unless the user is selecting text
 * or hit a control. In selection mode a click toggles the row instead, and the
 * content and toolbar are inert so nothing can copy or edit by accident.
 */
export const ScratchEntryShell: React.FC<ScratchEntryShellProps> = ({
  kind,
  pinned,
  copied = false,
  onActivate,
  selection,
  toolbar,
  children,
}) => {
  const selecting = selection?.active ?? false;
  const selected = selecting && selection!.selected;

  const handleClick = (event: React.MouseEvent) => {
    if (selection && (selecting || event.metaKey || event.ctrlKey)) {
      selection.onSelect(event.shiftKey);
      return;
    }
    if (!onActivate) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    if (window.getSelection()?.toString()) return;
    onActivate();
  };

  const clickable = selecting || onActivate;

  return (
    <li
      data-testid="scratch-entry"
      data-kind={kind}
      data-pinned={pinned}
      data-copied={copied}
      data-selected={selecting ? selected : undefined}
      title={selecting ? undefined : onActivate ? "Click to copy" : undefined}
      className={`group relative flex gap-2.5 border-b border-base px-3 py-2 text-sm hover:bg-element-hover/40 ${
        clickable ? "cursor-pointer" : ""
      } ${pinned ? "pr-8" : ""} ${selecting ? "select-none" : ""} ${
        selected ? "bg-focus/10 shadow-[inset_2px_0_0_rgb(var(--color-border-focus))]" : ""
      }`}
      onClick={handleClick}
    >
      <span
        aria-hidden={!selecting}
        className="flex w-5 flex-none items-start pt-0.5 text-muted"
      >
        {selecting ? (
          <input
            type="checkbox"
            data-testid="scratch-select-entry"
            aria-label="Select entry"
            checked={selected}
            onChange={() => undefined}
            className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-[rgb(var(--color-border-focus))]"
          />
        ) : copied ? (
          <Check size={14} data-testid="scratch-copied-tick" className="text-success" />
        ) : (
          <span data-testid="scratch-kind-icon" data-kind={kind} className="flex">
            {KIND_ICON[kind]}
          </span>
        )}
      </span>
      {selecting ? (
        <div className="pointer-events-none contents" data-testid="scratch-row-content">
          {children}
        </div>
      ) : (
        children
      )}
      {pinned && (
        <Pin
          size={12}
          aria-hidden
          data-testid="scratch-pinned-marker"
          className={`absolute right-2.5 top-2.5 text-muted ${
            selecting || !toolbar ? "" : "group-hover:opacity-0 group-focus-within:opacity-0"
          }`}
        />
      )}
      {!selecting && toolbar}
    </li>
  );
};
