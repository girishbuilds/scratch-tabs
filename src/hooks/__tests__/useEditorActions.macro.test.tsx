import { renderHook } from "@testing-library/react";
import { useEditorActions } from "../useEditorActions";
import { useMacroStore } from "../../stores/macroStore";

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

const createEditor = () => {
  const actions: Record<string, any> = {};
  return {
    actions,
    editor: {
      onContextMenu: jest.fn(() => ({ dispose: jest.fn() })),
      onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
      addAction: jest.fn((action: any) => {
        actions[action.id] = action;
        return { dispose: jest.fn() };
      }),
      addCommand: jest.fn(() => ({ dispose: jest.fn() })),
      createContextKey: jest.fn(() => ({ set: jest.fn(), dispose: jest.fn() })),
      getSelection: jest.fn(() => null),
      getModel: jest.fn(() => ({
        getValue: jest.fn(() => "content"),
        getValueInRange: jest.fn(() => "selected"),
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
  latestActiveTabRef: { current: { id: "tab-1" } } as any,
  side,
  isAiReady: false,
  isAiLoading: false,
  isCodegenReady: false,
  isCodegenGenerating: false,
});

describe("useEditorActions Macro Recording action", () => {
  beforeEach(() => {
    useMacroStore.getState().setForceShowToolbar(false, null, null);
  });

  it("registers a macro-recording context menu action", () => {
    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor)));

    expect(actions["macro-recording"]).toBeDefined();
    expect(actions["macro-recording"].label).toBe("Macro Recording");
  });

  it("shows the macro toolbar for the active tab and side", () => {
    const { editor, actions } = createEditor();
    renderHook(() => useEditorActions(baseProps(editor, "right")));

    actions["macro-recording"].run(editor);

    expect(useMacroStore.getState()).toMatchObject({
      forceShowToolbar: true,
      targetTabId: "tab-1",
      targetSide: "right",
    });
  });

  it("does nothing when there is no active tab", () => {
    const { editor, actions } = createEditor();
    renderHook(() =>
      useEditorActions({
        ...baseProps(editor),
        latestActiveTabRef: { current: null } as any,
      }),
    );

    actions["macro-recording"].run(editor);

    expect(useMacroStore.getState().forceShowToolbar).toBe(false);
  });
});
