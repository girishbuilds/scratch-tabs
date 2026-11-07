import React from "react";
import type { ScratchListItem } from "../types";
import type { ScratchEntryActions } from "./entryActions";
import type { RowSelection } from "./ScratchEntryShell";
import type { RowMove } from "./ScratchEntryToolbar";
import { ScratchReadableEntry } from "./ScratchReadableEntry";
import { ScratchUnreadableEntry } from "./ScratchUnreadableEntry";

interface ScratchEntryRowProps {
  item: ScratchListItem;
  actions: ScratchEntryActions;
  presenting: boolean;
  selection?: RowSelection;
  /** Move availability for this row. The row supplies its own id when moving. */
  move?: Omit<RowMove, "onMove">;
}

export const ScratchEntryRow: React.FC<ScratchEntryRowProps> = ({
  item,
  actions,
  presenting,
  selection,
  move,
}) =>
  item.kind === "unreadable" ? (
    <ScratchUnreadableEntry item={item} actions={actions} selection={selection} move={move} />
  ) : (
    <ScratchReadableEntry
      item={item}
      actions={actions}
      presenting={presenting}
      selection={selection}
      move={move}
    />
  );
