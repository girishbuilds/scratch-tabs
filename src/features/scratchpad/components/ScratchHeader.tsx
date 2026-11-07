import React from "react";
import { ClipboardX, Presentation, Trash2, X } from "lucide-react";
import { ScratchInfoTip } from "./ScratchInfoTip";
import { ScratchMenu, ScratchMenuItem } from "./ScratchMenu";
import { iconButton } from "./styles";

interface ScratchHeaderProps {
  /** Entries stored. Shown beside the title when there is at least one. */
  count?: number;
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
  count = 0,
  presenting,
  clipboardAutoClear,
  canClearAll,
  onTogglePresenting,
  onToggleClipboardAutoClear,
  onClearAll,
  onClose,
}) => (
  <header className="relative flex items-center justify-between rounded-t-lg border-b border-base bg-surface-raised px-3 py-2">
    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-main">
      Global Scratchpad
      {count > 0 && (
        <span
          data-testid="scratch-count"
          aria-label={`${count} ${count === 1 ? "entry" : "entries"}`}
          className="rounded-full bg-element px-1.5 text-[11px] font-medium leading-4 text-secondary"
        >
          {count}
        </span>
      )}
      <ScratchInfoTip label="About the Global Scratchpad">
        <p className="mb-2">
          A place for things you reach for often: commands, links, notes and keys. It is
          there in every tab. Open it from the toolbar or with Cmd/Ctrl+Shift+Y.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Paste text and it is split into entries.</li>
          <li>Click an entry to copy it.</li>
          <li>Use Select, or Cmd/Ctrl+click, to pin, move or delete several at once.</li>
          <li>Use an entry's Move menu to put it where you want it.</li>
          <li>Keys, tokens and passwords are hidden and encrypted in this browser.</li>
          <li>Entries are not part of your tabs, search, exports or sharing.</li>
        </ul>
        <p className="mt-2">
          The encryption key is kept in this browser too. It stops casual viewing, but not
          someone who can open your browser profile.
        </p>
      </ScratchInfoTip>
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
        aria-label="Close Global Scratchpad"
        className={iconButton}
        onClick={onClose}
      >
        <X size={16} />
      </button>
    </div>
  </header>
);
