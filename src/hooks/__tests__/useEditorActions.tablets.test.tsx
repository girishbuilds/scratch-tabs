import { act, renderHook } from "@testing-library/react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useEditorActions } from "../useEditorActions";
import { tabletMetadata } from "../../tablets/tabletMetadata";
import { useSplitViewStore } from "../../stores/splitViewStore";

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

jest.mock("../../stores/tabsStore", () => ({
  useTabsStore: {
    getState: () => ({
      tabs: [
        {
          id: "tab-1",
          title: "Tab 1",
          content: "content",
          language: "plaintext",
        },
      ],
    }),
  },
}));

jest.mock("../../tablets/tabletMetadata", () => ({
  tabletMetadata: [
    {
      id: "testtablet",
      label: "Test Tablet",
      keywords: [],
      getActionsForContext: jest.fn(),
    },
  ],
}));

interface TabletActionContextLike {
  content?: string;
}

const getActionsForContext = tabletMetadata[0]
  .getActionsForContext as jest.Mock<
  (context: TabletActionContextLike) => unknown[]
>;

const LONG_CONTENT = "a".repeat(60);

interface RegisteredAction {
  label: string;
  run: (editor: Monaco.editor.IStandaloneCodeEditor) => void;
}

const createEditor = (initialContent: string) => {
  const actions: Record<string, RegisteredAction> = {};
  let content = initialContent;
  let contentChangeHandler: (() => void) | undefined;

  const editor = {
    onContextMenu: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeModelContent: jest.fn((handler: () => void) => {
      contentChangeHandler = handler;
      return { dispose: jest.fn() };
    }),
    addAction: jest.fn((action: RegisteredAction & { id: string }) => {
      actions[action.id] = action;
      return { dispose: jest.fn() };
    }),
    addCommand: jest.fn(() => ({ dispose: jest.fn() })),
    createContextKey: jest.fn(() => ({ set: jest.fn(), dispose: jest.fn() })),
    getSelection: jest.fn(() => null),
    getModel: jest.fn(() => ({
      getValue: jest.fn(() => content),
      getValueInRange: jest.fn(() => content),
      isDisposed: jest.fn(() => false),
    })),
  };

  return {
    actions,
    setContent: (next: string) => {
      content = next;
    },
    simulateContentChange: () => contentChangeHandler?.(),
    editor: editor as unknown as Monaco.editor.IStandaloneCodeEditor,
  };
};

const monaco = {
  KeyMod: { CtrlCmd: 1 },
  KeyCode: { KeyK: 2 },
} as unknown as typeof Monaco;

const baseProps = (editor: Monaco.editor.IStandaloneCodeEditor) => ({
  editor,
  monaco,
  latestActiveTabRef: {
    current: { id: "tab-1", title: "Tab 1", content: "content" },
  } as unknown as React.RefObject<never>,
  side: "left" as const,
  isAiReady: false,
  isAiLoading: false,
  isCodegenReady: false,
  isCodegenGenerating: false,
});

describe("useEditorActions tablet context actions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getActionsForContext.mockReset();
    useSplitViewStore.setState({
      splitView: {
        ...useSplitViewStore.getState().splitView,
        isSplit: false,
        activeLeftTabId: "tab-1",
        activeRightTabId: null,
        leftTabs: ["tab-1"],
        rightTabs: [],
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("registers a tablet action when the live content qualifies", () => {
    getActionsForContext.mockImplementation((context) =>
      (context.content || "").length > 50
        ? [
            {
              id: "test.action",
              label: "Test Tablet Action",
              action: jest.fn(),
            },
          ]
        : [],
    );

    const { editor, actions } = createEditor("short");
    renderHook(() => useEditorActions(baseProps(editor)));

    expect(actions["tablet-test.action"]).toBeUndefined();
  });

  it("re-registers the tablet actions once the content changes", async () => {
    getActionsForContext.mockImplementation((context) =>
      (context.content || "").length > 50
        ? [
            {
              id: "test.action",
              label: "Test Tablet Action",
              action: jest.fn(),
            },
          ]
        : [],
    );

    const { editor, actions, setContent, simulateContentChange } =
      createEditor("short");
    renderHook(() => useEditorActions(baseProps(editor)));

    expect(actions["tablet-test.action"]).toBeUndefined();

    setContent(LONG_CONTENT);
    simulateContentChange();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(actions["tablet-test.action"]).toBeDefined();
    expect(actions["tablet-test.action"].label).toBe("Test Tablet Action");
  });

  it("passes the live editor content to the tablet actions", () => {
    getActionsForContext.mockImplementation(() => []);

    const { editor } = createEditor("short");
    renderHook(() => useEditorActions(baseProps(editor)));

    expect(getActionsForContext).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "editor-tab",
        content: "short",
        side: "left",
      }),
    );
  });
});
