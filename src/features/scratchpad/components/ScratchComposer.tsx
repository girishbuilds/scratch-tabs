import React, { useEffect, useRef, useState } from "react";

interface ScratchComposerProps {
  onSubmit: (text: string) => void;
}

/**
 * Capture box. Pasted text is submitted immediately and never lands in the
 * textarea, so a pasted secret is not shown even for a moment. Typed text is
 * submitted with Enter (Shift+Enter inserts a newline).
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
