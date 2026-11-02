import React, { useCallback, useState } from "react";
import { Check, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import type { ScratchEntryView, ScratchListItem } from "../types";
import { useSecretReveal } from "../hooks/useSecretReveal";
import { useTransientFlag } from "../hooks/useTransientFlag";
import { copyToClipboard } from "../utils/copyToClipboard";
import { MaskedSegments } from "./MaskedSegments";

const KIND_GLYPH: Record<ScratchListItem["kind"], string> = {
  secret: "[*]",
  command: "$",
  url: "->",
  note: "-",
  unreadable: "!",
};

interface ScratchEntryRowProps {
  item: ScratchListItem;
  onRemove: (id: string) => void;
  loadSecrets: (id: string) => Promise<string[]>;
  loadCopyText: (id: string) => Promise<string>;
}

const iconButton =
  "p-1 rounded text-secondary hover:text-main hover:bg-element-hover transition-colors";

export const ScratchEntryRow: React.FC<ScratchEntryRowProps> = ({
  item,
  onRemove,
  loadSecrets,
  loadCopyText,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = () => {
    if (confirmingDelete) onRemove(item.id);
    else setConfirmingDelete(true);
  };

  return (
    <li
      data-testid="scratch-entry"
      data-kind={item.kind}
      className="group flex gap-2 border-b border-base px-3 py-2 text-sm"
    >
      <span aria-hidden className="w-6 flex-none pt-0.5 font-mono text-xs text-muted">
        {KIND_GLYPH[item.kind]}
      </span>

      {item.kind === "unreadable" ? (
        <span className="flex-1 text-secondary">
          This entry can no longer be decrypted on this device.
        </span>
      ) : (
        <EntryBody item={item} loadSecrets={loadSecrets} loadCopyText={loadCopyText} />
      )}

      <button
        type="button"
        data-testid="scratch-delete"
        aria-label={confirmingDelete ? "Confirm delete" : "Delete entry"}
        title={confirmingDelete ? "Click again to delete" : "Delete"}
        className={`${iconButton} flex-none self-start ${confirmingDelete ? "text-warning" : ""}`}
        onClick={handleDelete}
        onBlur={() => setConfirmingDelete(false)}
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
};

interface EntryBodyProps {
  item: ScratchEntryView;
  loadSecrets: (id: string) => Promise<string[]>;
  loadCopyText: (id: string) => Promise<string>;
}

const EntryBody: React.FC<EntryBodyProps> = ({ item, loadSecrets, loadCopyText }) => {
  const load = useCallback(() => loadSecrets(item.id), [loadSecrets, item.id]);
  const { values, isRevealed, toggle } = useSecretReveal(load);
  const [copied, flashCopied] = useTransientFlag();

  const handleCopy = async () => {
    if (await copyToClipboard(await loadCopyText(item.id))) flashCopied();
  };

  const copySecret = async (index: number) => {
    const value = (await loadSecrets(item.id))[index];
    return value !== undefined && (await copyToClipboard(value));
  };

  const copyLabel = item.copyTarget === "value" ? "Copy value" : "Copy entry";

  return (
    <>
      <div className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs text-main">
        <MaskedSegments segments={item.segments} revealed={values} onCopySecret={copySecret} />
      </div>
      <div className="flex flex-none items-start gap-0.5">
        <button
          type="button"
          data-testid="scratch-copy"
          aria-label={copyLabel}
          title={copyLabel}
          className={iconButton}
          onClick={() => void handleCopy()}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
        {item.secretCount > 0 && (
          <button
            type="button"
            data-testid="scratch-reveal"
            aria-label={isRevealed ? "Hide secret" : "Reveal secret"}
            title={isRevealed ? "Hide" : "Reveal for 10 seconds"}
            className={iconButton}
            onClick={() => void toggle()}
          >
            {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </>
  );
};
