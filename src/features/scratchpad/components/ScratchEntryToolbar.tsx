import React, { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Pin,
  PinOff,
  TextSelect,
  Trash2,
} from "lucide-react";
import type { MoveTarget } from "../services/entryOrdering";
import { ScratchMoveMenu } from "./ScratchMoveMenu";
import { iconButton } from "./styles";

/** What a row needs to offer Move: which moves apply, and why it might be unavailable. */
export interface RowMove {
  canMove: (target: MoveTarget) => boolean;
  /** Set (e.g. while searching) to disable Move and say why. */
  disabledReason?: string;
  onMove: (target: MoveTarget) => void;
}

interface ScratchEntryToolbarProps {
  move?: RowMove;
  pinned: boolean;
  onTogglePin: () => void;
  onDelete: () => void;
  /** Absent for entries that can't be decrypted. */
  copy?: { label: string; onCopy: () => void };
  reveal?: { isRevealed: boolean; onToggle: () => void };
  onMaskText?: () => void;
  onEdit?: () => void;
  /** Absent while presenting, since the new tab would show plaintext. */
  onOpenInNewTab?: () => void;
}

/**
 * Hover/focus toolbar floating over the top-right of an entry. Every action
 * is a direct button; Delete needs a second click to confirm.
 */
export const ScratchEntryToolbar: React.FC<ScratchEntryToolbarProps> = ({
  move,
  pinned,
  onTogglePin,
  onDelete,
  copy,
  reveal,
  onMaskText,
  onEdit,
  onOpenInNewTab,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // An open menu keeps the toolbar visible even when the pointer wanders off the row.
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      data-testid="scratch-toolbar"
      className={`absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex items-center gap-0.5 rounded border border-base bg-surface-raised p-0.5 shadow transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
        menuOpen ? "opacity-100" : "opacity-0"
      }`}
      onMouseLeave={() => setConfirmingDelete(false)}
    >
      {copy && (
        <button
          type="button"
          data-testid="scratch-copy"
          aria-label={copy.label}
          title={copy.label}
          className={iconButton}
          onClick={copy.onCopy}
        >
          <Copy size={14} />
        </button>
      )}
      {reveal && (
        <button
          type="button"
          data-testid="scratch-reveal"
          aria-label={reveal.isRevealed ? "Hide secret" : "Reveal secret"}
          title={reveal.isRevealed ? "Hide" : "Reveal for 10 seconds"}
          className={iconButton}
          onClick={reveal.onToggle}
        >
          {reveal.isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          data-testid="scratch-edit"
          aria-label="Edit entry"
          title="Edit"
          className={iconButton}
          onClick={onEdit}
        >
          <Pencil size={14} />
        </button>
      )}
      {onOpenInNewTab && (
        <button
          type="button"
          data-testid="scratch-open-tab"
          aria-label="Open in new tab"
          title="Open in new tab"
          className={iconButton}
          onClick={onOpenInNewTab}
        >
          <ExternalLink size={14} />
        </button>
      )}
      {move && (
        <ScratchMoveMenu
          label="Move entry"
          testId="scratch-move"
          canMove={move.canMove}
          onMove={move.onMove}
          disabledReason={move.disabledReason}
          onOpenChange={setMenuOpen}
        />
      )}
      <button
        type="button"
        data-testid="scratch-pin"
        aria-label={pinned ? "Unpin entry" : "Pin entry"}
        aria-pressed={pinned}
        title={pinned ? "Unpin" : "Pin to top"}
        className={iconButton}
        onClick={onTogglePin}
      >
        {pinned ? <PinOff size={14} /> : <Pin size={14} />}
      </button>
      {onMaskText && (
        <button
          type="button"
          data-testid="scratch-mask-mode"
          aria-label="Mask text"
          title="Mask text..."
          className={iconButton}
          onClick={onMaskText}
        >
          <TextSelect size={14} />
        </button>
      )}
      <button
        type="button"
        data-testid="scratch-delete"
        aria-label={confirmingDelete ? "Confirm delete" : "Delete entry"}
        title={confirmingDelete ? "Click again to delete" : "Delete"}
        className={`${iconButton} ${confirmingDelete ? "!text-warning" : ""}`}
        onClick={() => {
          if (confirmingDelete) onDelete();
          else setConfirmingDelete(true);
        }}
        onBlur={() => setConfirmingDelete(false)}
      >
        {confirmingDelete ? <Check size={14} /> : <Trash2 size={14} />}
      </button>
    </div>
  );
};
