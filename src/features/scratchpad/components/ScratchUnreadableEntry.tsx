import React from "react";
import type { ScratchUnreadableView } from "../types";
import type { ScratchEntryActions } from "./entryActions";
import { ScratchEntryShell, type RowSelection } from "./ScratchEntryShell";
import { ScratchEntryToolbar, type RowMove } from "./ScratchEntryToolbar";

interface ScratchUnreadableEntryProps {
  item: ScratchUnreadableView;
  actions: ScratchEntryActions;
  selection?: RowSelection;
  move?: Omit<RowMove, "onMove">;
}

/** An entry this device can no longer decrypt. It can only be pinned or deleted. */
export const ScratchUnreadableEntry: React.FC<ScratchUnreadableEntryProps> = ({
  item,
  actions,
  selection,
  move,
}) => (
  <ScratchEntryShell
    kind="unreadable"
    pinned={item.pinned}
    selection={selection}
    toolbar={
      <ScratchEntryToolbar
        move={move && { ...move, onMove: (target) => actions.moveEntries([item.id], target) }}
        pinned={item.pinned}
        onTogglePin={() => actions.togglePin(item.id)}
        onDelete={() => actions.remove(item.id)}
      />
    }
  >
    <span className="flex-1 text-secondary">
      This entry can no longer be decrypted on this device.
    </span>
  </ScratchEntryShell>
);
