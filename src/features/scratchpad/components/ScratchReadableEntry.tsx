import React from "react";
import type { ScratchEntryView } from "../types";
import { useEntryController } from "../hooks/useEntryController";
import type { ScratchEntryActions } from "./entryActions";
import { ScratchEntryContent } from "./ScratchEntryContent";
import { ScratchEntryShell } from "./ScratchEntryShell";
import { ScratchEntryToolbar } from "./ScratchEntryToolbar";

interface ScratchReadableEntryProps {
  item: ScratchEntryView;
  actions: ScratchEntryActions;
  /** While presenting, plaintext can't be shown; Copy still works. */
  presenting: boolean;
}

export const ScratchReadableEntry: React.FC<ScratchReadableEntryProps> = ({
  item,
  actions,
  presenting,
}) => {
  const entry = useEntryController(item, actions, presenting);

  return (
    <ScratchEntryShell
      kind={item.kind}
      pinned={item.pinned}
      copied={entry.copied}
      onActivate={() => void entry.copyEntry()}
      toolbar={
        <ScratchEntryToolbar
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
          onMaskText={presenting ? undefined : () => void entry.editor.show()}
        />
      }
    >
      <ScratchEntryContent
        segments={item.segments}
        revealed={entry.reveal.values}
        editorText={entry.editor.value}
        onCopySecret={entry.copySecret}
        onNotSecret={entry.markNotSecret}
        onMask={entry.maskSelection}
        onCloseEditor={entry.editor.hide}
      />
    </ScratchEntryShell>
  );
};
