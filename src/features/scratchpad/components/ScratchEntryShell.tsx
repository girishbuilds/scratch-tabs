import React from "react";
import { Check, Pin } from "lucide-react";
import type { ScratchListItem } from "../types";

const KIND_GLYPH: Record<ScratchListItem["kind"], string> = {
  secret: "[*]",
  command: "$",
  url: "->",
  note: "-",
  unreadable: "!",
};

interface ScratchEntryShellProps {
  kind: ScratchListItem["kind"];
  pinned: boolean;
  /** Shows a green tick in place of the kind glyph. */
  copied?: boolean;
  /** Makes the whole row a copy target. */
  onActivate?: () => void;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}

/** Clicks on controls, editors and links inside the row must not trigger a copy. */
const INTERACTIVE = "button, a, input, textarea, select, [role='menu']";

/**
 * The row frame: kind glyph (a tick right after a copy), content, a floating
 * toolbar, and a pin marker that is the only thing visible at rest. Clicking
 * the row copies, unless the user is selecting text or hit a control.
 */
export const ScratchEntryShell: React.FC<ScratchEntryShellProps> = ({
  kind,
  pinned,
  copied = false,
  onActivate,
  toolbar,
  children,
}) => {
  const handleClick = (event: React.MouseEvent) => {
    if (!onActivate) return;
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    if (window.getSelection()?.toString()) return;
    onActivate();
  };

  return (
    <li
      data-testid="scratch-entry"
      data-kind={kind}
      data-pinned={pinned}
      data-copied={copied}
      title={onActivate ? "Click to copy" : undefined}
      className={`group relative flex gap-2 border-b border-base px-3 py-2 text-sm hover:bg-element-hover/40 ${
        onActivate ? "cursor-pointer" : ""
      } ${pinned ? "pr-8" : ""}`}
      onClick={handleClick}
    >
      <span
        aria-hidden
        className="flex w-6 flex-none items-start pt-0.5 font-mono text-xs text-muted"
      >
        {copied ? (
          <Check size={14} data-testid="scratch-copied-tick" className="text-success" />
        ) : (
          KIND_GLYPH[kind]
        )}
      </span>
      {children}
      {pinned && (
        <Pin
          size={12}
          aria-hidden
          data-testid="scratch-pinned-marker"
          className="absolute right-2.5 top-2.5 text-muted group-hover:opacity-0 group-focus-within:opacity-0"
        />
      )}
      {toolbar}
    </li>
  );
};
