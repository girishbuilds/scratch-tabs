import { act, renderHook } from "@testing-library/react";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import { useSplitViewContextKeys } from "../useSplitViewContextKeys";

const createEditor = () => {
  const keys: Record<string, { set: jest.Mock }> = {};
  const editor = {
    createContextKey: jest.fn((name: string) => (keys[name] = { set: jest.fn() })),
  };
  return { keys, editor: editor as never, createContextKey: editor.createContextKey };
};

const setSplitView = (overrides: Record<string, unknown>) =>
  act(() => {
    useSplitViewStore.setState({
      splitView: { ...useSplitViewStore.getState().splitView, ...overrides },
    } as never);
  });

describe("useSplitViewContextKeys", () => {
  beforeEach(() => {
    setSplitView({
      isSplit: false,
      activeLeftTabId: "tab-1",
      activeRightTabId: null,
      leftTabHistory: ["tab-1"],
      rightTabHistory: [],
    });
  });

  it("creates both keys from the current split view state", () => {
    setSplitView({ isSplit: true, leftTabHistory: ["tab-0", "tab-1"] });
    const { editor, createContextKey } = createEditor();

    renderHook(() => useSplitViewContextKeys(editor, "left"));

    expect(createContextKey).toHaveBeenCalledWith("splitViewActive", true);
    expect(createContextKey).toHaveBeenCalledWith("previousTabAvailable", true);
  });

  it("reports no previous tab when history only holds the current tab", () => {
    const { editor, createContextKey } = createEditor();

    renderHook(() => useSplitViewContextKeys(editor, "left"));

    expect(createContextKey).toHaveBeenCalledWith("splitViewActive", false);
    expect(createContextKey).toHaveBeenCalledWith("previousTabAvailable", false);
  });

  it("updates the keys without recreating them when the split view changes", () => {
    const { editor, keys, createContextKey } = createEditor();
    renderHook(() => useSplitViewContextKeys(editor, "left"));

    setSplitView({ isSplit: true, leftTabHistory: ["tab-0", "tab-1"] });

    expect(keys.splitViewActive.set).toHaveBeenLastCalledWith(true);
    expect(keys.previousTabAvailable.set).toHaveBeenLastCalledWith(true);
    expect(createContextKey).toHaveBeenCalledTimes(2);
  });

  it("tracks the history of the side it was given", () => {
    setSplitView({
      isSplit: true,
      activeRightTabId: "tab-9",
      rightTabHistory: ["tab-8", "tab-9"],
    });
    const { editor, createContextKey } = createEditor();

    renderHook(() => useSplitViewContextKeys(editor, "right"));

    expect(createContextKey).toHaveBeenCalledWith("previousTabAvailable", true);
  });

  it("does nothing without an editor", () => {
    expect(() => renderHook(() => useSplitViewContextKeys(null, "left"))).not.toThrow();
  });

  it("survives a failing context key service", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const editor = {
      createContextKey: () => {
        throw new Error("no keys");
      },
    } as never;

    expect(() => renderHook(() => useSplitViewContextKeys(editor, "left"))).not.toThrow();
    expect(warn).toHaveBeenCalledWith("[useEditorActions] Failed to create context keys:", expect.any(Error));
    warn.mockRestore();
  });
});
