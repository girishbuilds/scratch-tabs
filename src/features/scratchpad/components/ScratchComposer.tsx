import React, { useEffect, useRef, useState } from "react";

interface ScratchComposerProps {
  onSubmit: (text: string) => void;
}

/**
 * Capture box. Pasting into an empty box submits immediately and never lands
 * in the textarea, so a pasted secret is not shown even for a moment. Pasting
 * into a box that already has text inserts it there like a normal field. Typed
 * text is submitted with Enter (Shift+Enter inserts a newline).
 */
export const ScratchComposer: React.FC<ScratchComposerProps> = ({ onSubmit }) => {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submitDraft = () => {
    if (!draft.trim()) return;
    onSubmit(draft);
    setDraft("");
  };

  return (
    <textarea
      ref={ref}
      value={draft}
      rows={2}
      data-testid="scratch-input"
      aria-label="Add to Scratch"
      placeholder="Paste or type here... (Enter to save)"
      className="w-full resize-none rounded border border-base bg-surface px-3 py-2 text-sm font-mono text-main placeholder-muted outline-none focus:border-focus"
      onChange={(e) => setDraft(e.target.value)}
      onPaste={(e) => {
        // Mid-typing (e.g. "My key: " then paste): let the browser insert the
        // text into the field. Only an empty box captures a paste straight away.
        if (draft.trim()) return;
        const text = e.clipboardData.getData("text/plain");
        if (!text.trim()) return;
        e.preventDefault();
        onSubmit(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          submitDraft();
        }
      }}
    />
  );
};
