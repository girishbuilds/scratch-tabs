import { useEffect, RefObject } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import type { Tab } from "../types";
import { classifyClipboardPaste } from "../utils/clipboardPaste";

interface UseImagePasteHandlerParams {
  /** Reference to the container element to attach paste listener */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Reference to the Monaco editor instance */
  editorRef: RefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  /** The active tab (null if no tab or if tab is rich text) */
  activeTab: Tab | null;
  /** Callback to set pending image data URL */
  setPendingImageData: (dataUrl: string | null) => void;
  /** Callback to set cursor position at paste time */
  setPendingImageCursorPosition: (
    position: Monaco.IPosition | null
  ) => void;
  /** Callback to show the image paste options */
  onShowUpgradeModal: () => void;
}

/**
 * Hook that handles image paste detection in the Monaco editor container.
 * When an image-only clipboard is pasted (text on the clipboard always wins):
 * 1. Prevents default paste behavior
 * 2. Captures cursor position
 * 3. Converts image to data URL
 * 4. Shows the Monaco image paste options
 *
 * @param params - Configuration for the paste handler
 */
export function useImagePasteHandler({
  containerRef,
  editorRef,
  activeTab,
  setPendingImageData,
  setPendingImageCursorPosition,
  onShowUpgradeModal,
}: UseImagePasteHandlerParams): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !activeTab || activeTab.isRich) return;

    const handlePaste = (event: ClipboardEvent) => {
      if (!event.clipboardData) return;

      // Text (even with an incidental image, e.g. Excel cells) is left to Monaco
      const content = classifyClipboardPaste(event.clipboardData);
      if (content.kind !== "image-file" && content.kind !== "image-data-url") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const cursorPosition = editorRef.current?.getPosition() ?? null;
      const triggerImageModal = (dataUrl: string) => {
        setPendingImageData(dataUrl);
        if (cursorPosition) {
          setPendingImageCursorPosition(cursorPosition);
        }
        onShowUpgradeModal();
      };

      if (content.kind === "image-data-url") {
        triggerImageModal(content.dataUrl);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => triggerImageModal(e.target?.result as string);
      reader.readAsDataURL(content.file);
    };

    container.addEventListener("paste", handlePaste, true);

    return () => {
      container.removeEventListener("paste", handlePaste, true);
    };
  }, [
    activeTab,
    containerRef,
    editorRef,
    setPendingImageData,
    setPendingImageCursorPosition,
    onShowUpgradeModal,
  ]);
}
