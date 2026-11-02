import React from "react";
import type { ScratchListItem } from "../types";
import type { ScratchEntryActions } from "./entryActions";
import { ScratchReadableEntry } from "./ScratchReadableEntry";
import { ScratchUnreadableEntry } from "./ScratchUnreadableEntry";

interface ScratchEntryRowProps {
  item: ScratchListItem;
  actions: ScratchEntryActions;
  presenting: boolean;
}

export const ScratchEntryRow: React.FC<ScratchEntryRowProps> = ({
  item,
  actions,
  presenting,
}) =>
  item.kind === "unreadable" ? (
    <ScratchUnreadableEntry item={item} actions={actions} />
  ) : (
    <ScratchReadableEntry item={item} actions={actions} presenting={presenting} />
  );
