import React from "react";
import { ClipboardX, Presentation, ShieldCheck, Trash2, X } from "lucide-react";
import { ScratchMenu, ScratchMenuItem } from "./ScratchMenu";
import { iconButton } from "./styles";

interface ScratchHeaderProps {
  presenting: boolean;
  clipboardAutoClear: boolean;
  canClearAll: boolean;
  onTogglePresenting: () => void;
  onToggleClipboardAutoClear: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

const active = "bg-element text-main";

/** Presenting and Close stay visible; occasional actions live in the settings menu. */
export const ScratchHeader: React.FC<ScratchHeaderProps> = ({
  presenting,
  clipboardAutoClear,
  canClearAll,
  onTogglePresenting,
  onToggleClipboardAutoClear,
  onClearAll,
  onClose,
}) => (
  <header className="flex items-center justify-between border-b border-base bg-surface-raised px-3 py-2">
    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-main">
      Scratch
      <span title="Entries are encrypted before they are stored in this browser">
        <ShieldCheck size={14} className="text-secondary" aria-label="Encrypted" />
      </span>
    </h2>
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        data-testid="scratch-presenting"
        aria-label="Presenting mode"
        aria-pressed={presenting}
        title={presenting ? "Presenting: secrets can't be revealed" : "Presenting mode (for screen sharing)"}
        className={`${iconButton} ${presenting ? active : ""}`}
        onClick={onTogglePresenting}
      >
        <Presentation size={16} />
      </button>
      <ScratchMenu label="Scratch settings" testId="scratch-settings">
        {({ close }) => (
          <>
            <ScratchMenuItem
              testId="scratch-clipboard-clear"
              label="Clear clipboard after copying a secret"
              icon={<ClipboardX size={14} />}
              checked={clipboardAutoClear}
              onSelect={() => {
                onToggleClipboardAutoClear();
                close();
              }}
            />
            <ScratchMenuItem
              testId="scratch-clear-all"
              label="Clear all entries..."
              icon={<Trash2 size={14} />}
              danger
              disabled={!canClearAll}
              onSelect={() => {
                onClearAll();
                close();
              }}
            />
          </>
        )}
      </ScratchMenu>
      <button
        type="button"
        data-testid="scratch-close"
        aria-label="Close Scratch"
        className={iconButton}
        onClick={onClose}
      >
        <X size={16} />
      </button>
    </div>
  </header>
);
