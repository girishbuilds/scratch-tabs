import React from "react";
import type { ScratchEntryView } from "../types";
import { useEntryController } from "../hooks/useEntryController";
import type { ScratchEntryActions } from "./entryActions";
import { ScratchEntryContent } from "./ScratchEntryContent";
import { ScratchEntryShell, type RowSelection } from "./ScratchEntryShell";
import { ScratchEntryToolbar, type RowMove } from "./ScratchEntryToolbar";

interface ScratchReadableEntryProps {
  item: ScratchEntryView;
  actions: ScratchEntryActions;
  /** While presenting, plaintext can't be shown; Copy still works. */
  presenting: boolean;
  selection?: RowSelection;
  move?: Omit<RowMove, "onMove">;
}

export const ScratchReadableEntry: React.FC<ScratchReadableEntryProps> = ({
  item,
  actions,
  presenting,
  selection,
  move,
}) => {
  const entry = useEntryController(item, actions, presenting, selection?.active ?? false);
  // An open editor replaces the row's content, so the hover toolbar would only get in its way.
  const editing = entry.edit.text !== null || entry.editor.value !== null;

  return (
    <ScratchEntryShell
      kind={item.kind}
      pinned={item.pinned}
      copied={entry.copied}
      selection={selection}
      onActivate={entry.edit.isOpen ? undefined : () => void entry.copyEntry()}
      toolbar={
        editing ? null : (
          <ScratchEntryToolbar
            move={move && { ...move, onMove: (target) => actions.moveEntries([item.id], target) }}
            pinned={item.pinned}
            onTogglePin={() => actions.togglePin(item.id)}
            onDelete={() => actions.remove(item.id)}
            copy={{
              label: item.copyTarget === "value" ? "Copy value" : "Copy entry",
              onCopy: () => void entry.copyEntry(),
            }}
            reveal={
              !presenting && item.secretCount > 0
                ? { isRevealed: entry.reveal.isRevealed, onToggle: () => void entry.reveal.toggle() }
                : undefined
            }
            onMaskText={presenting ? undefined : () => void entry.startMasking()}
            onEdit={presenting ? undefined : () => void entry.startEdit()}
            onOpenInNewTab={presenting ? undefined : () => void actions.openInNewTab([item.id])}
          />
        )
      }
    >
      <ScratchEntryContent
        segments={item.segments}
        revealed={entry.reveal.values}
        editorText={entry.editor.value}
        editText={entry.edit.text}
        onCopySecret={entry.copySecret}
        onNotSecret={entry.markNotSecret}
        onMask={entry.maskSelection}
        onCloseEditor={entry.editor.hide}
        onSaveEdit={entry.saveEdit}
        onCancelEdit={entry.edit.close}
      />
    </ScratchEntryShell>
  );
};
