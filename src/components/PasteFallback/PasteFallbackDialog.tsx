import React, { useEffect, useRef, useState } from "react";
import { BaseModal } from "../Modals/BaseModal";
import { usePasteFallbackStore } from "../../stores/pasteFallbackStore";
import { useRootStore } from "../../stores";

/**
 * Shown when "Import from Paste" cannot read the clipboard (permission denied,
 * insecure context, unsupported browser). Explains what happened and offers a
 * box to paste into, since a manual Ctrl/Cmd+V does not need clipboard permission.
 */
export const PasteFallbackDialog: React.FC = () => {
  const request = usePasteFallbackStore((s) => s.request);
  const dismiss = usePasteFallbackStore((s) => s.dismissPasteFallback);
  const handleNewTab = useRootStore((s) => s.handleNewTab);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (request) {
      setText("");
      textareaRef.current?.focus();
    }
  }, [request]);

  if (!request) return null;

  const handleCreate = () => {
    const isRightSide = request.isRightSide;
    dismiss();
    void handleNewTab(isRightSide, text);
  };

  return (
    <BaseModal
      title="Paste content"
      onClose={dismiss}
      maxWidthClass="max-w-lg"
    >
      <div className="p-4 space-y-3" data-testid="paste-fallback-dialog">
        <p
          className="text-sm text-warning bg-warning-subtle border border-warning rounded px-3 py-2"
          role="alert"
          data-testid="paste-fallback-message"
        >
          Could not read your clipboard. {request.reason}. Paste your content
          below instead.
        </p>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Press Ctrl/Cmd+V to paste here"
          rows={8}
          spellCheck={false}
          className="w-full px-3 py-2 bg-element text-main border border-base rounded text-sm font-mono focus:outline-none focus:ring-2 focus:border-focus"
          data-testid="paste-fallback-input"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={dismiss}
            className="px-3 py-1.5 text-sm text-secondary hover:bg-element-hover rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!text}
            className="px-3 py-1.5 text-sm bg-primary text-main rounded hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="paste-fallback-create"
          >
            Create tab
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
