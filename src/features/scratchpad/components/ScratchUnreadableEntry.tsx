import React from "react";
import type { ScratchUnreadableView } from "../types";
import type { ScratchEntryActions } from "./entryActions";
import { ScratchEntryShell } from "./ScratchEntryShell";
import { ScratchEntryToolbar } from "./ScratchEntryToolbar";

interface ScratchUnreadableEntryProps {
  item: ScratchUnreadableView;
  actions: ScratchEntryActions;
}

/** An entry this device can no longer decrypt. It can only be pinned or deleted. */
export const ScratchUnreadableEntry: React.FC<ScratchUnreadableEntryProps> = ({
  item,
  actions,
}) => (
  <ScratchEntryShell
    kind="unreadable"
    pinned={item.pinned}
    toolbar={
      <ScratchEntryToolbar
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
