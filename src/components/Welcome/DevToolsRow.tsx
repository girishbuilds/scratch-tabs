import React from "react";
import { ArrowRight, MoreHorizontal, Wrench } from "../Icons";
import type { ToolItem } from "../../services/toolService";
import { FEATURED_TOOLS } from "./utils/welcomeUtils";

interface DevToolsRowProps {
  /** Opens the full tool selector */
  onBrowseAll: () => void;
  /** Opens a single featured tool directly */
  onSelectTool: (tool: ToolItem) => void;
}

/**
 * DevToolsRow
 *
 * Full-width entry point to the dev tools catalogue, with one-click chips
 * for the most common tools, ending in a "more" chip that opens the full
 * selector. The chips sit beside the browse button rather than inside it so
 * no interactive element is nested in another.
 */
export const DevToolsRow: React.FC<DevToolsRowProps> = ({ onBrowseAll, onSelectTool }) => (
  <section
    data-testid="dev-tools-row"
    className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 bg-surface border border-base rounded-sm"
  >
    <button
      onClick={onBrowseAll}
      className="group flex items-center gap-3 text-left"
    >
      <div className="p-2 bg-element group-hover:bg-element-hover rounded-sm transition-colors">
        <Wrench size={18} className="text-secondary" />
      </div>
      <div>
        <div className="text-main font-semibold text-sm md:text-lg">40+ Dev Tools</div>
        <p className="text-muted text-xs md:text-sm">Offline utilities for everyday tasks</p>
      </div>
      <ArrowRight size={16} className="ml-1 text-muted group-hover:text-main transition-colors" />
    </button>

    <ul className="flex flex-wrap gap-2">
      {FEATURED_TOOLS.map((tool) => (
        <li key={tool.id}>
          <button
            onClick={() => onSelectTool(tool)}
            className="px-2.5 py-1 text-xs font-mono text-secondary bg-element border border-base rounded-sm
              hover:text-main hover:border-primary/30 transition-colors"
          >
            {tool.label}
          </button>
        </li>
      ))}
      <li>
        <button
          onClick={onBrowseAll}
          aria-label="Browse all tools"
          title="Browse all tools"
          data-testid="dev-tools-more"
          className="flex items-center px-2.5 py-1.5 text-secondary bg-element border border-base rounded-sm
            hover:text-main hover:border-primary/30 transition-colors"
        >
          <MoreHorizontal size={14} />
        </button>
      </li>
    </ul>
  </section>
);
