import { renderHook } from "@testing-library/react";
import { useEditorActions } from "../useEditorActions";
import { useCanvasSendStore } from "../../stores/canvasSendStore";
import { useDiffModalStore } from "../../stores/diffModalStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { downloadTab } from "../../utils/downloadTab";

jest.mock("../../stores/pipelineStore", () => ({
  usePipelineStore: jest.fn(() => ({ openModal: jest.fn() })),
}));

jest.mock("../../stores/aiStore", () => ({
  useAIStore: () => ({
    summarizeTextWithModal: jest.fn(),
    runCodegen: jest.fn(),
  }),
}));

jest.mock("../../stores/quickTransformStore", () => ({
  useQuickTransformStore: {
    getState: () => ({ openModal: jest.fn() }),
  },
}));

jest.mock("../../services/modelManager", () => ({
  modelManager: {
    getContent: jest.fn(() => "content"),
  },
}));

jest.mock("../../utils/downloadTab", () => ({
  downloadTab: jest.fn(),
}));

jest.mock("../../tablets/tabletMetadata", () => ({
  tabletMetadata: [],
}));

jest.mock("../../stores/tabsStore", () => ({
  useTabsStore: {
    getState: () => ({
      tabs: [{ id: "tab-1", title: "Tab 1", content: "content", language: "plaintext" }],
    }),
  },
}));

const createSelection = (text: string) => ({
  isEmpty: () => text.length === 0,
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: text.length + 1,
});

const createEditor = (options?: {
  selectionText?: string;
  content?: string;
}) => {
  const actions: Record<string, any> = {};
  const content = options?.content ?? "content";
  const selectionText = options?.selectionText ?? "";
  const runAction = jest.fn();

  return {
    actions,
    runAction,
    editor: {
      onContextMenu: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
      addAction: jest.fn((action: any) => {
        actions[action.id] = action;
        return { dispose: jest.fn() };
      }),
      addCommand: jest.fn(() => ({ dispose: jest.fn() })),
      createContextKey: jest.fn(() => ({ set: jest.fn(), dispose: jest.fn() })),
      getSelection: jest.fn(() => createSelection(selectionText)),
      getAction: jest.fn(() => ({ run: runAction })),
      trigger: jest.fn(),
      getModel: jest.fn(() => ({
        getValue: jest.fn(() => content),
        getValueInRange: jest.fn(() => selectionText),
        isDisposed: jest.fn(() => false),
      })),
    } as any,
  };
};

const monaco = {
  KeyMod: { CtrlCmd: 1 },
  KeyCode: { KeyK: 2 },
} as any;

const baseProps = (editor: any, side: "left" | "right" = "left") => ({
  editor,
  monaco,
  latestActiveTabRef: { current: { id: "tab-1", title: "Tab 1", content: "content" } } as any,
  side,
  isAiReady: false,
  isAiLoading: false,
  isCodegenReady: false,
  isCodegenGenerating: false,
});

describe("useEditorActions editor context menu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCanvasSendStore.getState().close();
    useDiffModalStore.setState({
      isOpen: false,
      leftTabId: null,
      rightTabId: null,
    });
    useSplitViewStore.setState({
      splitView: {
        ...useSplitViewStore.getState().splitView,
        isSplit: false,
        activeLeftTabId: "tab-1",
        activeRightTabId: null,
      },
    } as any);
  });

  it("registers the new context menu actions", () => {
    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    expect(actions["send-selection-to-canvas"].label).toBe(
      "Send Selection to Canvas...",
    );
    expect(actions["copy-all-content"].label).toBe("Copy All Content");
    expect(actions["download-tab"].label).toBe("Download");
    expect(actions["compare-with-other-side"].label).toBe(
      "Compare with other side",
    );
    expect(actions["compare-with-previous-tab"].label).toBe(
      "Compare with Previous Tab",
    );
    expect(actions["case-uppercase"].label).toBe("UPPERCASE");
    expect(actions["case-kebabcase"].label).toBe("kebab-case");
  });

  it("only shows selection based actions when a selection exists", () => {
    const { editor, actions } = createEditor({ selectionText: "hello" });
    renderHook(() => useEditorActions(baseProps(editor)));

    expect(actions["send-selection-to-canvas"].precondition).toBe(
      "editorHasSelection",
    );
    expect(actions["case-uppercase"].precondition).toBe("editorHasSelection");
  });

  it("sends the selected text to the canvas", () => {
    const { editor, actions } = createEditor({ selectionText: "hello" });
    renderHook(() => useEditorActions(baseProps(editor, "right")));

    actions["send-selection-to-canvas"].run(editor);

    expect(useCanvasSendStore.getState()).toMatchObject({
      source: { kind: "text", text: "hello" },
      side: "right",
    });
  });

  it("copies the whole document to the clipboard", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { editor, actions } = createEditor({ content: "full document" });
    renderHook(() => useEditorActions(baseProps(editor)));

    actions["copy-all-content"].run(editor);

    expect(writeText).toHaveBeenCalledWith("full document");
  });

  it("downloads the active tab with the live editor content", () => {
    const { editor, actions } = createEditor({ content: "live content" });
    renderHook(() => useEditorActions(baseProps(editor)));

    actions["download-tab"].run(editor);

    expect(downloadTab).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "tab-1",
        content: "live content",
      }),
    );
  });

  it("opens the diff modal for the tab on the other side", () => {
    useSplitViewStore.setState({
      splitView: {
        ...useSplitViewStore.getState().splitView,
        isSplit: true,
        activeLeftTabId: "tab-1",
        activeRightTabId: "tab-2",
      },
    } as any);

    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    actions["compare-with-other-side"].run(editor);

    expect(useDiffModalStore.getState()).toMatchObject({
      isOpen: true,
      leftTabId: "tab-1",
      rightTabId: "tab-2",
    });
  });

  it("does not open the diff modal when the view is not split", () => {
    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    actions["compare-with-other-side"].run(editor);

    expect(useDiffModalStore.getState().isOpen).toBe(false);
  });

  it("opens the diff modal for the previous tab on the same side", () => {
    useSplitViewStore.setState({
      splitView: {
        ...useSplitViewStore.getState().splitView,
        isSplit: false,
        activeLeftTabId: "tab-1",
        leftTabs: ["tab-0", "tab-1"],
        leftTabHistory: ["tab-0", "tab-1"],
      },
    } as any);

    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    actions["compare-with-previous-tab"].run(editor);

    expect(useDiffModalStore.getState()).toMatchObject({
      isOpen: true,
      leftTabId: "tab-0",
      rightTabId: "tab-1",
    });
  });

  it("does nothing when there is no previous tab", () => {
    useSplitViewStore.setState({
      splitView: {
        ...useSplitViewStore.getState().splitView,
        isSplit: false,
        activeLeftTabId: "tab-1",
        leftTabs: ["tab-1"],
        leftTabHistory: ["tab-1"],
      },
    } as any);

    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    actions["compare-with-previous-tab"].run(editor);

    expect(useDiffModalStore.getState().isOpen).toBe(false);
  });

  it("runs the matching monaco command for case transforms", () => {
    const { editor, actions, runAction } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    actions["case-uppercase"].run(editor);

    expect(runAction).toHaveBeenCalled();
    expect(editor.getAction).toHaveBeenCalledWith(
      "editor.action.transformToUppercase",
    );
  });

  it("does not add Generate Mock Content to the editor menu", () => {
    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    const labels = Object.values(actions).map((action: any) => action.label);

    expect(labels).not.toContain("Generate Mock Content");
  });

  it("disposes every registered menu entry on unmount", () => {
    const { editor } = createEditor();
    const { unmount } = renderHook(() => useEditorActions(baseProps(editor)));

    unmount();

    const disposers = editor.addAction.mock.results.map(
      (result: { value: { dispose: jest.Mock } }) => result.value.dispose,
    );
    expect(disposers.length).toBeGreaterThan(0);
    disposers.forEach((dispose: jest.Mock) =>
      expect(dispose).toHaveBeenCalledTimes(1),
    );
  });
});
