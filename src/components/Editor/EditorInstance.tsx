import React, { useRef, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Editor } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useRootStore } from "../../stores";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useEditorScrollManager } from "../../hooks/useEditorScrollManager";
import { useToolSelector } from "../../hooks/useToolSelector";
import { useEditorActions } from "../../hooks/useEditorActions";
import { useEditorAI } from "../../hooks/useEditorAI";
import { useImagePasteHandler } from "../../hooks/useImagePasteHandler";
import { useAutoFormatOnLoad } from "../../hooks/useAutoFormatOnLoad";
import { ToolSelectorModal } from "../ToolSelector";
import { toolService, ToolItem } from "../../services/toolService";
import { useAIStore } from "../../stores/aiStore";
import { modelManager } from "../../services/modelManager";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { useActiveEditorStore } from "../../stores/activeEditorStore";
import { UpgradeConfirmationModal } from "../RichText";
import { useClipboardStore } from "../../stores/clipboardStore";
import { useCalloutStore } from "../../stores/calloutStore";
import { SmartViewCalloutWidget } from "./SmartViewCalloutWidget";
import { useThemeStore } from "../../stores/themeStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { imageDataUriToFile } from "../../formats/image/utils/dataUri";

interface EditorInstanceProps {
  side: "left" | "right";
  activeTabId: string;
  onEditorReady?: (editor: Monaco.editor.IStandaloneCodeEditor | null) => void;
  onUpgradeToRich?: () => void;
}

// Global storage for view states (scroll position, etc.)
const tabViewStates = new Map<string, Monaco.editor.ICodeEditorViewState>();

// Time window (ms) to detect if a tab was just created from paste
const NEW_TAB_DETECTION_WINDOW_MS = 500;

export const EditorInstance: React.FC<EditorInstanceProps> = ({
  side,
  activeTabId,
  onEditorReady,
  onUpgradeToRich,
}) => {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const currentTabIdRef = useRef<string>(activeTabId);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // State to track mounted editor for hooks that need to react to editor availability
  const [mountedEditor, setMountedEditor] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const { setActiveEditor } = useActiveEditorStore();
  const {
    pendingImageData,
    setPendingImageData,
    setPendingImageCursorPosition,
  } = useClipboardStore();

  // Smart View Callout Widget refs
  const calloutWidgetRef = useRef<Monaco.editor.IOverlayWidget | null>(null);
  const calloutContainerRef = useRef<HTMLDivElement | null>(null);
  const calloutRootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  // Get active tab using standard Zustand approach (simplified since cursor position is no longer in state)
  const activeTab = useTabsStore((state) => {
    const tab = state.tabs.find((t) => t.id === activeTabId);
    return tab || null;
  });

  // This can now be simplified since cursor position is no longer in React state
  const activeTabWithoutCursor = activeTab;

  // Image paste detection is handled directly in useEffect below

  // Get actions from rootStore
  const {
    updateTabContent,
    setActiveLeftTab,
    setActiveRightTab,
    updateTabState,
  } = useRootStore.getState();

  // FIX: Use useStoreWithEqualityFn for activeEditorSide only
  const activeEditorSide = useStoreWithEqualityFn(
    useSplitViewStore,
    (state) => state.splitView?.activeSide,
    shallow,
  );

  // FIX: Use useStoreWithEqualityFn for AI store with specific properties
  const {
    isCodegenReady,
    codegenResult,
    activeCodegenTabId,
    isCodegenGenerating,
  } = useStoreWithEqualityFn(
    useAIStore,
    (state) => ({
      isCodegenReady: state.ai.isCodegenReady,
      codegenResult: state.ai.codegenResult,
      activeCodegenTabId: state.ai.activeCodegenTabId,
      isCodegenGenerating: state.ai.isCodegenGenerating,
    }),
    shallow,
  );

  const { isReady: isAiReady, isLoading: isAiLoading } = useStoreWithEqualityFn(
    useAIStore,
    (state) => ({
      isReady: state.ai.isReady,
      isLoading: state.ai.isLoading,
    }),
    shallow,
  );

  // Smart View Callout Store
  const { isVisible: isCalloutVisible, tabId: calloutTabId, view: calloutView, languageId: calloutLanguageId } = useCalloutStore();

  // Theme Store
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  // Sidebar Store (for focus management)
  const sidebarEditingId = useSidebarStore((state) => state.editingId);

  // --- Ref to hold the latest activeTab data ---
  const latestActiveTabRef = useRef(activeTab);
  useEffect(() => {
    latestActiveTabRef.current = activeTab;
  }, [activeTab]);

  // --- Custom Hooks ---
  const { restoreScrollPosition } = useEditorScrollManager(
    editorRef,
    activeTabId,
  );
  const {
    showToolSelector,
    toolQuery: tabletQuery,
    closeToolSelector,
  } = useToolSelector(
    activeTabId,
    updateTabContent,
  );

  // Editor Actions Hook
  useEditorActions({
    editor: editorRef.current,
    monaco: monacoRef.current,
    latestActiveTabRef,
    side,
    isAiReady,
    isAiLoading,
    isCodegenReady,
    isCodegenGenerating,
  });

  // Editor AI Hook
  useEditorAI({
    editor: editorRef.current,
    activeTabId,
    isCodegenGenerating,
    activeCodegenTabId,
    codegenResult,
  });

  // Auto-format hook - formats newly created tabs from paste/import
  useAutoFormatOnLoad({
    editor: mountedEditor,
    activeTab: activeTabWithoutCursor,
  });

  // Guard against the tab being removed while a render is queued
  if (!activeTabWithoutCursor) {
    return null;
  }

  // Don't render Monaco editor for rich text tabs
  if (activeTabWithoutCursor.isRich) {
    return null;
  }
  // SIMPLIFIED: This effect manages model switching with the corrected ModelManager
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !activeTabWithoutCursor) {
      return;
    }

    const editor = editorRef.current;
    const previousTabId = currentTabIdRef.current;

    // Skip if we're not actually switching tabs
    if (previousTabId === activeTabId) {
      return;
    }

    (async () => {
      try {
        // Save view state for the tab we are leaving
        const prevModel = editor.getModel();
        if (previousTabId && prevModel && !prevModel.isDisposed()) {
          const viewState = editor.saveViewState();
          if (viewState) {
            tabViewStates.set(previousTabId, viewState);
          }
        }

        // Get the model from ModelManager (this ensures it exists and is loaded)
        // Check if this is a new tab from paste (created recently with content)
        const now = Date.now();
        const isNewTabWithContent = activeTabWithoutCursor &&
          now - activeTabWithoutCursor.dateCreated < NEW_TAB_DETECTION_WINDOW_MS &&
          (activeTabWithoutCursor.content?.trim().length || 0) > 0;
        const newModel = await modelManager.get(activeTabWithoutCursor, {
          isNewTabFromPaste: isNewTabWithContent
        });

        // Set the model on the editor directly (following architecture)
        if (editor.getModel() !== newModel) {
          editor.setModel(newModel);
        }

        // Restore view state for the new tab
        const newViewState = tabViewStates.get(activeTabWithoutCursor.id);
        if (newViewState) {
          editor.restoreViewState(newViewState);
        }

        // Always check for and apply cursor position from database if available
        // This ensures that debounced cursor position updates are applied even when view state exists
        const dbCursorPos = activeTabWithoutCursor.cursorPosition;
        if (dbCursorPos && dbCursorPos.lineNumber > 0 && dbCursorPos.column > 0) {
          editor.setPosition({
            lineNumber: dbCursorPos.lineNumber,
            column: dbCursorPos.column,
          });
        }

        // Focus the editor only if sidebar is not in editing mode
        if (!useSidebarStore.getState().editingId) {
          editor.focus();
        }

        currentTabIdRef.current = activeTabWithoutCursor.id;
      } catch (error) {
        console.error(
          `[EditorInstance] Failed to switch model for tab ${activeTabWithoutCursor.id}:`,
          error,
        );
      }
    })();
  }, [activeTabId, activeTabWithoutCursor]);

  // Cleanup effect: detach model from editor before component unmounts
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor) {
        const currentModel = editor.getModel();
        if (currentModel && !currentModel.isDisposed()) {
          editor.setModel(null);
        }
        // Clear from active editor store if this was the active editor for this side
        const currentActive = useActiveEditorStore.getState();
        const activeEditorForSide = side === 'left' ? currentActive.activeLeftEditor : currentActive.activeRightEditor;
        if (activeEditorForSide === editor) {
          setActiveEditor(side, null);
        }
      }
    };
  }, []); // Empty dependency array since this should only run on mount/unmount

  // Focus effect - only focus if this editor instance's side matches the globally active editor side
  useEffect(() => {
    const { splitView } = useSplitViewStore.getState();
    const shouldFocus =
      activeEditorSide === side &&
      ((side === "left" && activeTabId === splitView.activeLeftTabId) ||
        (side === "right" && activeTabId === splitView.activeRightTabId));

    if (shouldFocus && !sidebarEditingId) {
      const timer = setTimeout(() => {
        try {
          const active = document.activeElement;
          const monacoTextarea = editorRef.current?.getDomNode()?.querySelector("textarea");
          const isUserInInput =
            active instanceof HTMLInputElement ||
            (active instanceof HTMLTextAreaElement && active !== monacoTextarea);
          if (editorRef.current && active !== monacoTextarea && !isUserInInput) {
            editorRef.current.focus();
          }
        } catch (error) {
          console.warn("[EditorInstance] Failed to focus editor:", error);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [side, activeTabId, activeEditorSide, sidebarEditingId]);


  // Image paste handler - extracted to custom hook
  useImagePasteHandler({
    containerRef: editorContainerRef,
    editorRef,
    activeTab,
    setPendingImageData,
    setPendingImageCursorPosition,
    onShowUpgradeModal: () => {
      if (onUpgradeToRich) {
        setShowUpgradeModal(true);
      }
    },
  });

  // Smart View Callout Widget Effect
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !monacoRef.current) return;

    const shouldShowHere = isCalloutVisible && calloutTabId === activeTabId && calloutView && calloutLanguageId;

    if (shouldShowHere) {
      // Create the widget if it doesn't exist
      if (!calloutWidgetRef.current) {
        // Create the container div for our React component
        calloutContainerRef.current = document.createElement('div');
        calloutRootRef.current = createRoot(calloutContainerRef.current);

        // Create the Monaco overlay widget
        calloutWidgetRef.current = {
          getId: () => 'smart-view-callout-widget',
          getDomNode: () => calloutContainerRef.current!,
          getPosition: () => ({
            preference: monacoRef.current!.editor.OverlayWidgetPositionPreference.TOP_RIGHT_CORNER,
          }),
        };

        editor.addOverlayWidget(calloutWidgetRef.current);
      }

      // Render/update the React component inside the container
      if (calloutRootRef.current && calloutContainerRef.current) {
        const { hideCallout } = useCalloutStore.getState();
        const { setActiveView } = useRootStore.getState();

        calloutRootRef.current.render(
          <SmartViewCalloutWidget
            view={calloutView}
            languageId={calloutLanguageId}
            onSwitch={() => {
              setActiveView(activeTabId, calloutView.id);
              useTabsStore.getState().updateTabState(activeTabId, { smartViewIndicatorDismissed: true });
              // Defer state update to avoid synchronous unmount during render
              setTimeout(() => hideCallout(), 0);
            }}
            onDismiss={() => {
              useTabsStore.getState().updateTabState(activeTabId, { smartViewIndicatorDismissed: true });
              // Defer state update to avoid synchronous unmount during render
              setTimeout(() => hideCallout(), 0);
            }}
          />
        );
      }
    } else if (calloutWidgetRef.current) {
      // Hide and clean up the widget (deferred to avoid race condition)
      const widgetToRemove = calloutWidgetRef.current;
      const rootToUnmount = calloutRootRef.current;

      // Clear refs immediately
      calloutWidgetRef.current = null;
      calloutContainerRef.current = null;
      calloutRootRef.current = null;

      // Defer cleanup to next tick to avoid synchronous unmount during render
      setTimeout(() => {
        try {
          editor.removeOverlayWidget(widgetToRemove);
        } catch (e) {
          // Widget might already be removed, ignore error
        }
        if (rootToUnmount) {
          rootToUnmount.unmount();
        }
      }, 0);
    }

    // Cleanup on unmount
    return () => {
      if (calloutWidgetRef.current) {
        const widgetToRemove = calloutWidgetRef.current;
        const rootToUnmount = calloutRootRef.current;

        calloutWidgetRef.current = null;
        calloutContainerRef.current = null;
        calloutRootRef.current = null;

        // Defer cleanup
        setTimeout(() => {
          try {
            editor.removeOverlayWidget(widgetToRemove);
          } catch (e) {
            // Editor might be disposed, ignore errors on cleanup
          }
          if (rootToUnmount) {
            rootToUnmount.unmount();
          }
        }, 0);
      }
    };
  }, [editorRef.current, isCalloutVisible, calloutTabId, calloutView, calloutLanguageId, activeTabId]);



  const handleEditorDidMount = (
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco,
  ) => {
    try {
      editorRef.current = editor;
      monacoRef.current = monaco;
      onEditorReady?.(editor);
      setActiveEditor(side, editor);

      // Disable EditContext API (Monaco 0.54+) - it breaks context menu copy/paste because the
      // copy event fires on the focused context menu element instead of the EditContext DOM node,
      // so Monaco's _ensureClipboardGetsEditorSelection handler never runs. The traditional
      // textarea-based approach focuses/selects text before execCommand('copy') and works correctly.
      editor.updateOptions({ editContext: false });

      // Workaround for Monaco 0.54 regression: context menus render inside a shadow DOM.
      // Clicking "Paste" shifts focus to the shadow DOM element so hasTextFocus() returns
      // false and the built-in paste handler silently does nothing. Standard override paths
      // (CommandsRegistry, PasteAction.addImplementation) don't work because Vite's module
      // pre-bundling creates a separate module instance from Monaco's internal bundle.
      // Instead: add a capture-phase document click listener each time the context menu opens.
      // composedPath() sees inside the open shadow root to identify the Paste click, and
      // stopImmediatePropagation() prevents the built-in handler from running before ours.
      editor.onContextMenu(() => {
        let cleanupTimer: ReturnType<typeof setTimeout>;
        const onPasteClick = async (e: MouseEvent) => {
          document.removeEventListener('click', onPasteClick, true);
          clearTimeout(cleanupTimer);
          const isPaste = e.composedPath().some(
            (el): el is HTMLElement =>
              el instanceof HTMLElement &&
              typeof el.className === 'string' &&
              el.className.includes('action-label') &&
              el.textContent?.trim() === 'Paste'
          );
          if (!isPaste) return;
          e.stopImmediatePropagation();
          e.preventDefault();
          const text = await navigator.clipboard.readText();
          if (text) editor.trigger('keyboard', 'paste', { text });
        };
        document.addEventListener('click', onPasteClick, true);
        cleanupTimer = setTimeout(
          () => document.removeEventListener('click', onPasteClick, true),
          5000
        );
      });

      // Add focus listener to update active editor
      editor.onDidFocusEditorWidget(() => {
        setActiveEditor(side, editor);
      });

      // Initialize the ModelManager with Monaco
      modelManager.initialize(monaco);

      // Set up the initial model asynchronously
      const setupInitialModel = async () => {
        if (activeTab) {
          try {
            // Get the model from ModelManager (this ensures it exists and is loaded)
            // Check if this is a new tab from paste (created recently with content)
            const now = Date.now();
            const isNewTabWithContent = now - activeTab.dateCreated < NEW_TAB_DETECTION_WINDOW_MS &&
              (activeTab.content?.trim().length || 0) > 0;
            const initialModel = await modelManager.get(activeTab, {
              isNewTabFromPaste: isNewTabWithContent
            });

            // Set the model on the editor directly
            if (editor.getModel() !== initialModel) {
              editor.setModel(initialModel);
            }

            // Restore view state if it exists (this is safe during initial setup)
            const initialViewState = tabViewStates.get(activeTab.id);
            if (initialViewState) {
              editor.restoreViewState(initialViewState);
            } else {
              // No view state found - restore cursor position from database
              const dbCursorPos = activeTab.cursorPosition;
              if (dbCursorPos && dbCursorPos.lineNumber > 0 && dbCursorPos.column > 0) {
                editor.setPosition({
                  lineNumber: dbCursorPos.lineNumber,
                  column: dbCursorPos.column,
                });
              }
            }
          } catch (error) {
            console.error(
              `[EditorInstance] Failed to set up initial model for tab ${activeTab.id}:`,
              error,
            );
          }
        }
      };

      setupInitialModel();

      restoreScrollPosition(activeTabId);

      // Signal to useAutoFormatOnLoad hook that editor is ready
      setMountedEditor(editor);

      // Cursor Position Listener - NOW MANAGED BY MODELMANAGER
      if (activeTab) {
        modelManager.registerCursorPositionListener(activeTab.id, editor);
      }

      // Paste Detection Listener - Use keyboard event to catch paste BEFORE content changes
      editor.onKeyDown((e) => {
        try {

          // Detect Ctrl+V (Windows/Linux) or Cmd+V (Mac)
          // Try multiple ways to detect V key
          const isPasteShortcut = (e.ctrlKey || e.metaKey) && (
            e.keyCode === 86 || // KeyCode for 'V'
            e.browserEvent?.key === 'v' ||
            e.browserEvent?.key === 'V' ||
            e.browserEvent?.code === 'KeyV'
          );

          if (isPasteShortcut) {
            const currentTab = latestActiveTabRef.current;
            if (currentTab) {
              modelManager.markNextChangeAsPaste(currentTab.id);
            }
          }
        } catch (error) {
          console.warn(
            "[EditorInstance] Failed to handle paste detection:",
            error,
          );
        }
      });

      // Keep the original onDidPaste as backup (though it fires too late)
      editor.onDidPaste((_e) => {
        try {
          const currentTab = latestActiveTabRef.current;
          if (currentTab) {
            modelManager.markNextChangeAsPaste(currentTab.id);
          }
        } catch (error) {
          console.warn(
            "[EditorInstance] Failed to handle paste detection:",
            error,
          );
        }
      });
    } catch (error) {
      console.error("[EditorInstance] Failed to mount editor:", error);
    }
  };

  const handleEditorFocus = () => {
    try {
      if (side === "left") {
        setActiveLeftTab(activeTabId);
      } else {
        setActiveRightTab(activeTabId);
      }
    } catch (error) {
      console.warn("[EditorInstance] Failed to handle editor focus:", error);
    }
  };

  const handleToolSelect = async (item: ToolItem) => {
    try {
      await toolService.executeTool(item, {
        side,
        activeWorkspaceId: activeTab?.workspaceId || "default",
        addTab: (tabData, isRight) => useRootStore.getState().addTab(tabData, isRight),
        createCanvas: (isRight) =>
          useRootStore.getState().handleNewCanvas(isRight),
        updateTab: updateTabState,
        activeTabId: activeTabId
      });
      closeToolSelector(true);
    } catch (error) {
      console.warn("[EditorInstance] Failed to handle tool select:", error);
    }
  };

  const handleToolSelectorClose = () => {
    if (showToolSelector) {
      closeToolSelector(true);
    }
  };



  const clearPendingImage = () => {
    const {
      setPendingImageData,
      setPendingImageCursorPosition,
      setPendingImageCursorOffset,
    } = useClipboardStore.getState();
    setPendingImageData(null);
    setPendingImageCursorPosition(null);
    setPendingImageCursorOffset(null);
  };

  const closeImagePasteOptions = () => {
    clearPendingImage();
    setShowUpgradeModal(false);
  };

  const handlePasteInRichText = () => {
    setShowUpgradeModal(false);
    if (onUpgradeToRich) {
      onUpgradeToRich();
    }
  };

  const isCurrentTabEmpty =
    (modelManager.getContent(activeTabId) ?? activeTab?.content ?? "").trim() ===
    "";

  const handlePasteAsDataUrl = async () => {
    const { pendingImageData } = useClipboardStore.getState();
    if (!pendingImageData || !activeTab) return;

    if (isCurrentTabEmpty) {
      updateTabState(activeTab.id, {
        content: pendingImageData,
        language: "image",
        languageLocked: true,
        activeViewId: null,
        lastModified: Date.now(),
      });
      modelManager.replaceModelContentWithUndo(activeTab.id, pendingImageData);
      modelManager.updateModelLanguage(activeTab.id, "image");
    } else {
      await useRootStore.getState().handleNewPopulatedTab(
        {
          id: crypto.randomUUID(),
          title: "Pasted image data",
          content: pendingImageData,
          language: "image",
          languageLocked: true,
          cursorPosition: { lineNumber: 1, column: 1 },
          dateCreated: Date.now(),
          lastModified: Date.now(),
          workspaceId: activeTab.workspaceId,
        },
        side === "right",
      );
    }

    clearPendingImage();
    setShowUpgradeModal(false);
  };

  const handlePasteInCanvas = async () => {
    const { pendingImageData } = useClipboardStore.getState();
    if (!pendingImageData || !activeTab) return;

    const imageFile = imageDataUriToFile(pendingImageData);
    if (!imageFile) {
      throw new Error("The pasted image data is invalid.");
    }

    const { canvasActionService } = await import(
      "../../features/canvas/services/CanvasActionService"
    );
    await canvasActionService.send(
      activeTab.workspaceId,
      [{ kind: "file", file: imageFile }],
      { kind: "new", side },
    );
    clearPendingImage();
    setShowUpgradeModal(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface">
      <div
        className="flex-grow relative overflow-hidden border-l border-base"
        ref={editorContainerRef}
        data-testid="monaco-editor-container"
      >
        <div
          className="w-full h-full absolute inset-0"
          onClick={handleEditorFocus}
        >
          <Editor
            height="100%"
            width="100%"
            theme={isDarkMode ? "vs-dark" : "vs"}
            onMount={handleEditorDidMount}
            key={side} // Key by side to ensure we have two distinct editor instances
            options={{
              minimap: { enabled: false },
              fontSize: activeTab?.fontSize || 14,
              wordWrap: "on",
              automaticLayout: true,
              copyWithSyntaxHighlighting: false,
              scrollBeyondLastLine: true,
              formatOnPaste: true,
              formatOnType: true,
              editContext: false,
              find: {
                addExtraSpaceOnTop: false,
              },
            }}
          // NO `value`, `defaultValue`, `language`, or `onChange` props!
          // The model manager now controls everything imperatively.
          />
          {showToolSelector && (
            <ToolSelectorModal
              initialSearch={tabletQuery}
              onSelect={handleToolSelect}
              onClose={handleToolSelectorClose}
            />
          )}
        </div>
      </div>
      <UpgradeConfirmationModal
        isOpen={showUpgradeModal}
        isCurrentTabEmpty={isCurrentTabEmpty}
        imageDataUrl={pendingImageData}
        onPasteAsDataUrl={handlePasteAsDataUrl}
        onPasteInRichText={handlePasteInRichText}
        onPasteInCanvas={handlePasteInCanvas}
        onCancel={closeImagePasteOptions}
      />
    </div>
  );
};
