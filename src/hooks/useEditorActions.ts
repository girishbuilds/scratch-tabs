import { useRef, useEffect } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { EditorRange } from "../types";
import { useAIStore } from "../stores/aiStore";
import { usePipelineStore } from "../stores/pipelineStore";
import { useQuickTransformStore } from "../stores/quickTransformStore";
import { createCaseTransformActions } from "./editorActions/caseTransforms";
import { createEditorMenuActions } from "./editorActions/menuActions";
import { useSplitViewContextKeys } from "./editorActions/useSplitViewContextKeys";
import { useTabletContextActions } from "./editorActions/useTabletContextActions";

interface UseEditorActionsProps {
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  monaco: typeof Monaco | null;
  latestActiveTabRef: React.RefObject<any>;
  side: "left" | "right";
  isAiReady: boolean;
  isAiLoading: boolean;
  isCodegenReady: boolean;
  isCodegenGenerating: boolean;
}

interface TransformationsModalArgs {
  content: string;
  selectedText: string;
  selectionRange: EditorRange | null;
}

interface SelectionLike {
  isEmpty(): boolean;
}

export const buildTransformationsModalArgs = <TSelection extends SelectionLike>(
  fullContent: string,
  selection: TSelection | null | undefined,
  getValueInRange: (selection: TSelection) => string,
): TransformationsModalArgs => {
  const hasSelection = !!selection && !selection.isEmpty();
  return {
    content: fullContent,
    selectedText: hasSelection ? getValueInRange(selection as TSelection) : "",
    selectionRange: hasSelection
      ? (selection as unknown as EditorRange)
      : null,
  };
};

export const useEditorActions = ({
  editor,
  monaco,
  latestActiveTabRef,
  side,
  isAiReady,
  isAiLoading,
  isCodegenReady,
  isCodegenGenerating,
}: UseEditorActionsProps) => {
  const transformationsDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const quickTransformDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const quickTransformContextMenuRef = useRef<Monaco.IDisposable | null>(null);
  const aiSummarizeDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const aiCodegenDisposableRef = useRef<Monaco.IDisposable | null>(null);
  const aiReadyContextKeyRef =
    useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const codegenReadyContextKeyRef =
    useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const { openModal: openPipelineModal } = usePipelineStore();
  const { summarizeTextWithModal, runCodegen } = useAIStore();

  // Register actions only when editor or monaco changes
  useEffect(() => {
    if (!editor || !monaco) return;

    // Clean up previous actions if they exist
    if (transformationsDisposableRef.current) {
      transformationsDisposableRef.current.dispose();
    }
    if (quickTransformDisposableRef.current) {
      quickTransformDisposableRef.current.dispose();
    }
    if (quickTransformContextMenuRef.current) {
      quickTransformContextMenuRef.current.dispose();
    }
    if (aiSummarizeDisposableRef.current) {
      aiSummarizeDisposableRef.current.dispose();
    }
    if (aiCodegenDisposableRef.current) {
      aiCodegenDisposableRef.current.dispose();
    }

    // Track mouse position when context menu opens so the Quick Transform
    // modal can be anchored near the right-click point
    quickTransformContextMenuRef.current = editor.onContextMenu((e) => {
      mousePositionRef.current = {
        x: e.event.browserEvent.clientX,
        y: e.event.browserEvent.clientY,
      };
    });

    // Macro, canvas, copy, download, compare and case transform entries
    const menuDisposables = [
      ...createEditorMenuActions({ side, latestActiveTabRef }),
      ...createCaseTransformActions(),
    ].map((descriptor) => editor.addAction(descriptor));

    // Add Quick Transform context menu action
    quickTransformDisposableRef.current = editor.addAction({
      id: "quick-transform",
      label: "Quick Transform",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 2.0,
      run: (ed) => {
        try {
          const model = ed.getModel();
          if (!model || model.isDisposed()) return;

          const selection = ed.getSelection();
          const isSelection = !!selection && !selection.isEmpty();
          const text = isSelection
            ? model.getValueInRange(selection!)
            : model.getValue();
          const activeTabId = latestActiveTabRef.current?.id ?? "";

          useQuickTransformStore.getState().openModal(mousePositionRef.current, {
            text,
            isSelection,
            selectionRange: isSelection ? selection : null,
            activeTabId,
          });
        } catch (error) {
          console.warn(
            "[useEditorActions] Failed to open Quick Transform:",
            error,
          );
        }
      },
    });

    // Add Transformations context menu action
    transformationsDisposableRef.current = editor.addAction({
      id: "transformations-pipeline",
      label: "Transformations",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 2.5,
      run: (ed) => {
        try {
          const model = ed.getModel();
          if (!model || model.isDisposed()) return;

          const selection = ed.getSelection();
          const fullContent = model.getValue();
          const args = buildTransformationsModalArgs(fullContent, selection, (
            range,
          ) => model.getValueInRange(range));

          openPipelineModal(
            args.content,
            args.selectedText,
            args.selectionRange,
          );
        } catch (error) {
          console.warn(
            "[useEditorActions] Failed to open transformations pipeline:",
            error,
          );
        }
      },
    });

    // Create context keys for AI actions
    try {
      aiReadyContextKeyRef.current = editor.createContextKey(
        "aiReady",
        isAiReady && !isAiLoading,
      );
      codegenReadyContextKeyRef.current = editor.createContextKey(
        "codegenReady",
        isCodegenReady && !isCodegenGenerating,
      );
    } catch (error) {
      console.warn("[useEditorActions] Failed to create context keys:", error);
    }

    // Add AI actions
    aiSummarizeDisposableRef.current = editor.addAction({
      id: "ai-summarize",
      label: "Summarize",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.0,
      precondition: "aiReady",
      run: (ed) => {
        try {
          const freshAIState = useAIStore.getState().ai;
          if (aiReadyContextKeyRef.current) {
            const freshAiReady =
              freshAIState.isReady && !freshAIState.isLoading;
            aiReadyContextKeyRef.current.set(freshAiReady);
          }

          const model = ed.getModel();
          const content = model && !model.isDisposed() ? model.getValue() : "";
          const currentTab = latestActiveTabRef.current;
          if (!currentTab) return;

          const shouldProceed =
            freshAIState.isReady &&
            !freshAIState.isLoading &&
            !currentTab.isTablet &&
            content.trim().length > 0;

          if (shouldProceed) {
            summarizeTextWithModal(content, currentTab.id);
          }
        } catch (error) {
          console.warn(
            "[useEditorActions] Failed to run summarize action:",
            error,
          );
        }
      },
    });

    aiCodegenDisposableRef.current = editor.addAction({
      id: "ai-generate-code",
      label: "Generate Code",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      precondition: "codegenReady",
      run: (ed) => {
        try {
          const model = ed.getModel();
          const originalValue =
            model && !model.isDisposed() ? model.getValue() : "";
          if (!isCodegenReady || isCodegenGenerating) return;
          const currentTab = latestActiveTabRef.current;
          if (!currentTab) return;

          runCodegen({
            tabId: currentTab.id,
            text: originalValue,
            max_new_tokens: 128,
            temperature: 0.5,
            top_k: 5,
            do_sample: false,
          });
        } catch (error) {
          console.warn(
            "[useEditorActions] Failed to run codegen action:",
            error,
          );
        }
      },
    });

    // Add Ctrl+K (Format) command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      try {
        if (!editor.hasTextFocus()) {
          return;
        }
        const formatAction = editor.getAction("editor.action.formatDocument");
        if (formatAction) {
          formatAction.run();
        }
      } catch (error) {
        console.warn(
          "[useEditorActions] Failed to format document via Ctrl+K:",
          error,
        );
      }
    });

    // Cleanup function
    return () => {
      menuDisposables.forEach((disposable) => disposable.dispose());
      if (transformationsDisposableRef.current) {
        transformationsDisposableRef.current.dispose();
        transformationsDisposableRef.current = null;
      }
      if (quickTransformDisposableRef.current) {
        quickTransformDisposableRef.current.dispose();
        quickTransformDisposableRef.current = null;
      }
      if (quickTransformContextMenuRef.current) {
        quickTransformContextMenuRef.current.dispose();
        quickTransformContextMenuRef.current = null;
      }
      if (aiSummarizeDisposableRef.current) {
        aiSummarizeDisposableRef.current.dispose();
        aiSummarizeDisposableRef.current = null;
      }
      if (aiCodegenDisposableRef.current) {
        aiCodegenDisposableRef.current.dispose();
        aiCodegenDisposableRef.current = null;
      }
    };
  }, [editor, monaco, side]);

  useSplitViewContextKeys(editor, side);
  useTabletContextActions(editor, side);

  // Update context keys when AI state changes
  useEffect(() => {
    if (aiReadyContextKeyRef.current) {
      aiReadyContextKeyRef.current.set(isAiReady && !isAiLoading);
    }
    if (codegenReadyContextKeyRef.current) {
      codegenReadyContextKeyRef.current.set(
        isCodegenReady && !isCodegenGenerating,
      );
    }
  }, [isAiReady, isAiLoading, isCodegenReady, isCodegenGenerating]);

  return {
    // Expose refs if needed for external access
    aiReadyContextKeyRef,
    codegenReadyContextKeyRef,
  };
};
