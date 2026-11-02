import React, { useState } from "react";

interface ScratchMaskEditorProps {
  /** Decrypted entry text. Shown only while the editor is open. */
  text: string;
  onMask: (start: number, end: number) => void;
  onDone: () => void;
}

/**
 * Select-to-mask: shows the raw text read-only so the user can select what the
 * detectors missed and mask it. The text itself is never edited.
 */
export const ScratchMaskEditor: React.FC<ScratchMaskEditorProps> = ({
  text,
  onMask,
  onDone,
}) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const hasSelection = text.slice(selection.start, selection.end).trim().length > 0;

  return (
    <div className="min-w-0 flex-1 space-y-1" data-testid="scratch-mask-editor">
      <textarea
        readOnly
        value={text}
        rows={Math.min(8, text.split("\n").length + 1)}
        aria-label="Select the text to mask"
        data-testid="scratch-mask-text"
        className="w-full resize-none rounded border border-base bg-surface px-2 py-1 font-mono text-xs text-main outline-none focus:border-focus"
        onSelect={(e) =>
          setSelection({
            start: e.currentTarget.selectionStart,
            end: e.currentTarget.selectionEnd,
          })
        }
      />
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          data-testid="scratch-mask-selection"
          disabled={!hasSelection}
          className="rounded bg-element px-2 py-0.5 text-main hover:bg-element-hover disabled:opacity-40"
          onClick={() => onMask(selection.start, selection.end)}
        >
          Mask selection
        </button>
        <button
          type="button"
          data-testid="scratch-mask-done"
          className="text-secondary underline hover:text-main"
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </div>
  );
};
