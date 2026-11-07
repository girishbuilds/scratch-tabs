import React from "react";
import type { ScratchSegment } from "../types";
import { CollapsibleText } from "./CollapsibleText";
import { MaskedSegments } from "./MaskedSegments";
import { ScratchMaskEditor } from "./ScratchMaskEditor";
import { ScratchTextEditor } from "./ScratchTextEditor";

interface ScratchEntryContentProps {
  segments: ScratchSegment[];
  /** Decrypted secrets while revealed. */
  revealed: string[] | null;
  /** Raw text while the select-to-mask editor is open. */
  editorText: string | null;
  /** Raw text while the edit-text editor is open. Takes precedence over the mask editor. */
  editText: string | null;
  onCopySecret: (index: number) => Promise<boolean>;
  onNotSecret: (index: number) => void;
  onMask: (start: number, end: number) => void;
  onCloseEditor: () => void;
  onSaveEdit: (text: string) => Promise<void>;
  onCancelEdit: () => void;
}

const countLines = (segments: ScratchSegment[]) =>
  segments.reduce(
    (lines, segment) => (segment.type === "text" ? lines + segment.text.split("\n").length - 1 : lines),
    1,
  );

/** The entry's text: masked segments, the text editor, or the select-to-mask editor. */
export const ScratchEntryContent: React.FC<ScratchEntryContentProps> = ({
  segments,
  revealed,
  editorText,
  editText,
  onCopySecret,
  onNotSecret,
  onMask,
  onCloseEditor,
  onSaveEdit,
  onCancelEdit,
}) =>
  editText !== null ? (
    <ScratchTextEditor initialText={editText} onSave={onSaveEdit} onCancel={onCancelEdit} />
  ) : editorText !== null ? (
    <ScratchMaskEditor text={editorText} onMask={onMask} onDone={onCloseEditor} />
  ) : (
    <CollapsibleText lineCount={countLines(segments)}>
      <div className="min-w-0 flex-1 whitespace-pre-wrap font-mono [overflow-wrap:anywhere] text-xs text-main">
        <MaskedSegments
          segments={segments}
          revealed={revealed}
          onCopySecret={onCopySecret}
          onNotSecret={onNotSecret}
        />
      </div>
    </CollapsibleText>
  );
