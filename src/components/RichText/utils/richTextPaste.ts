import type { Editor } from "@tiptap/core";
import { classifyClipboardPaste } from "../../../utils/clipboardPaste";

type EditorView = Editor["view"];

const readFileAsDataUrl = (file: File, onLoad: (dataUrl: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => onLoad(e.target?.result as string);
  reader.readAsDataURL(file);
};

export const insertImageAtSelection = (view: EditorView, src: string): void => {
  const { state, dispatch } = view;
  const imageType = state.schema.nodes.resizableImage ?? state.schema.nodes.image;
  if (!imageType) return;

  try {
    const imageNode = imageType.create({ src, alt: "", title: "" });
    dispatch(state.tr.replaceSelectionWith(imageNode));
  } catch {
    // Image insertion failed - the paste is dropped silently
  }
};

/**
 * Embeds a pasted image-only clipboard; anything carrying text (including
 * spreadsheet cells with an image render) is left to the editor's native paste.
 */
export const handleRichTextPaste = (
  view: EditorView,
  event: ClipboardEvent,
): boolean => {
  if (!event.clipboardData) return false;

  const content = classifyClipboardPaste(event.clipboardData);
  if (content.kind !== "image-file") return false;

  readFileAsDataUrl(content.file, (src) => insertImageAtSelection(view, src));
  return true;
};
