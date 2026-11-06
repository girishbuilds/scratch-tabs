import React, { useEffect, useRef, useState } from "react";

interface ScratchTextEditorProps {
  /** Decrypted entry text the draft starts from. */
  initialText: string;
  /** Rejects with a user-facing message when the text can't be saved. */
  onSave: (text: string) => Promise<void>;
  onCancel: () => void;
}

const MAX_ROWS = 12;

/**
 * Edits an entry's text. Cmd/Ctrl+Enter saves, Escape cancels. A failed save
 * keeps the draft open with the reason shown, so nothing typed is lost.
 */
export const ScratchTextEditor: React.FC<ScratchTextEditorProps> = ({
  initialText,
  onSave,
  onCancel,
}) => {
  const [draft, setDraft] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSave = draft.trim().length > 0 && !saving;

  useEffect(() => {
    const field = ref.current;
    field?.focus();
    field?.setSelectionRange(field.value.length, field.value.length);
  }, []);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 flex-1 space-y-1" data-testid="scratch-text-editor">
      <textarea
        ref={ref}
        value={draft}
        rows={Math.min(MAX_ROWS, draft.split("\n").length + 1)}
        aria-label="Edit entry text"
        data-testid="scratch-edit-text"
        className="w-full resize-none rounded border border-base bg-surface px-2 py-1 font-mono text-xs text-main outline-none focus:border-focus"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void save();
          }
        }}
      />
      {error && (
        <p role="alert" data-testid="scratch-edit-error" className="text-xs text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          data-testid="scratch-edit-save"
          disabled={!canSave}
          className="rounded bg-element px-2 py-0.5 text-main hover:bg-element-hover disabled:opacity-40"
          onClick={() => void save()}
        >
          Save
        </button>
        <button
          type="button"
          data-testid="scratch-edit-cancel"
          className="text-secondary underline hover:text-main"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
