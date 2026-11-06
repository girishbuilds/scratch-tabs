import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/** Lines shown while an entry is collapsed. Each line is 1rem (text-xs). */
export const COLLAPSED_LINES = 5;

/** Collapsing must hide at least this many lines, or the toggle isn't worth it. */
const MIN_HIDDEN_LINES = 2;

interface CollapsibleTextProps {
  /** Number of lines the content spans (explicit newlines). */
  lineCount: number;
  children: React.ReactNode;
}

/**
 * Clamps tall content to a few lines with a fade and a Show more / Show less
 * toggle. Short content renders untouched. The toggle is a button, so clicking
 * it never triggers the row's click-to-copy.
 */
export const CollapsibleText: React.FC<CollapsibleTextProps> = ({ lineCount, children }) => {
  const [expanded, setExpanded] = useState(false);
  const hidden = lineCount - COLLAPSED_LINES;

  if (hidden < MIN_HIDDEN_LINES) return <>{children}</>;

  const collapsed = !expanded;
  return (
    <div className="min-w-0 flex-1">
      <div
        data-testid="scratch-content"
        data-collapsed={collapsed}
        className={`relative overflow-hidden ${collapsed ? "max-h-[5rem]" : ""}`}
      >
        {children}
        {collapsed && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface-secondary to-transparent"
          />
        )}
      </div>
      <button
        type="button"
        data-testid="scratch-expand"
        aria-expanded={expanded}
        className="mt-0.5 flex items-center gap-1 text-xs text-secondary hover:text-main"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? "Show less" : `Show ${hidden} more ${hidden === 1 ? "line" : "lines"}`}
      </button>
    </div>
  );
};
