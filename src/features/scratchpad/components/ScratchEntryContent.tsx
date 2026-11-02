import React from "react";
import type { ScratchSegment } from "../types";
import { MaskedSegments } from "./MaskedSegments";
import { ScratchMaskEditor } from "./ScratchMaskEditor";

interface ScratchEntryContentProps {
  segments: ScratchSegment[];
  /** Decrypted secrets while revealed. */
  revealed: string[] | null;
  /** Raw text while the select-to-mask editor is open. */
  editorText: string | null;
  onCopySecret: (index: number) => Promise<boolean>;
  onNotSecret: (index: number) => void;
  onMask: (start: number, end: number) => void;
  onCloseEditor: () => void;
}

/** The entry's text: masked segments, or the select-to-mask editor. */
export const ScratchEntryContent: React.FC<ScratchEntryContentProps> = ({
  segments,
  revealed,
  editorText,
  onCopySecret,
  onNotSecret,
  onMask,
  onCloseEditor,
}) =>
  editorText !== null ? (
    <ScratchMaskEditor text={editorText} onMask={onMask} onDone={onCloseEditor} />
  ) : (
    <div className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs text-main">
      <MaskedSegments
        segments={segments}
        revealed={revealed}
        onCopySecret={onCopySecret}
        onNotSecret={onNotSecret}
      />
    </div>
  );
