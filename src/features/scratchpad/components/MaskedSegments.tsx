import React, { useState } from "react";
import { useTransientFlag } from "../hooks/useTransientFlag";
import type { ScratchSegment } from "../types";

/** Fixed width on purpose: the mask must not reveal the secret's length. */
export const MASK_TEXT = "••••••••••••";

interface MaskedSegmentsProps {
  segments: ScratchSegment[];
  /** Decrypted values by secret index, present only while revealed. */
  revealed?: string[] | null;
  /** If provided, each mask is a button that copies that one secret. */
  onCopySecret?: (index: number) => Promise<boolean>;
}

/**
 * Renders entry text with secrets replaced by a mask. When masked, the secret
 * is not in the DOM at all (not blurred, not hidden): there is nothing to
 * select, search or inspect.
 */
export const MaskedSegments: React.FC<MaskedSegmentsProps> = ({
  segments,
  revealed,
  onCopySecret,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCopied, flashCopied] = useTransientFlag();

  const copy = async (index: number) => {
    if (await onCopySecret?.(index)) {
      setCopiedIndex(index);
      flashCopied();
    }
  };

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === "text") return <span key={i}>{segment.text}</span>;

        const value = revealed?.[segment.index];
        if (value !== undefined) {
          return (
            <span key={i} data-testid="scratch-secret-revealed" className="text-warning">
              {value}
            </span>
          );
        }

        if (!onCopySecret) {
          return (
            <span key={i} data-testid="scratch-mask" aria-label="Hidden secret" className="select-none text-muted">
              {MASK_TEXT}
            </span>
          );
        }

        const justCopied = showCopied && copiedIndex === segment.index;
        return (
          <button
            key={i}
            type="button"
            data-testid="scratch-mask"
            aria-label="Copy hidden secret"
            title="Click to copy this secret"
            className="select-none rounded px-0.5 text-muted hover:bg-element-hover hover:text-main"
            onClick={() => void copy(segment.index)}
          >
            {justCopied ? "copied" : MASK_TEXT}
          </button>
        );
      })}
    </>
  );
};
