import React, { useState } from "react";
import { Check, Copy, Eye, EyeOff, Pencil, Pin, PinOff, TextSelect, Trash2 } from "lucide-react";
import { iconButton } from "./styles";

interface ScratchEntryToolbarProps {
  pinned: boolean;
  onTogglePin: () => void;
  onDelete: () => void;
  /** Absent for entries that can't be decrypted. */
  copy?: { label: string; onCopy: () => void };
  reveal?: { isRevealed: boolean; onToggle: () => void };
  onMaskText?: () => void;
  onEdit?: () => void;
}

/**
 * Hover/focus toolbar floating over the top-right of an entry. Every action
 * is a direct button; Delete needs a second click to confirm.
 */
export const ScratchEntryToolbar: React.FC<ScratchEntryToolbarProps> = ({
  pinned,
  onTogglePin,
  onDelete,
  copy,
  reveal,
  onMaskText,
  onEdit,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div
      data-testid="scratch-toolbar"
      className="absolute right-1.5 top-1 z-10 flex items-center gap-0.5 rounded border border-base bg-surface-raised p-0.5 shadow transition-opacity focus-within:opacity-100 group-hover:opacity-100 opacity-0 [@media(hover:none)]:opacity-100"
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
