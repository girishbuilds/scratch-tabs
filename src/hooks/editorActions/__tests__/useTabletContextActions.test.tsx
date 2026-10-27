import { act, renderHook } from "@testing-library/react";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import { modelManager } from "../../../services/modelManager";
import { tabletMetadata } from "../../../tablets/tabletMetadata";
import { collectTabletActions, useTabletContextActions } from "../useTabletContextActions";

const mockTabs: Record<string, unknown>[] = [];

jest.mock("../../../stores/tabsStore", () => ({
  useTabsStore: { getState: () => ({ tabs: mockTabs }) },
}));

jest.mock("../../../services/modelManager", () => ({
  modelManager: { getContent: jest.fn() },
}));

jest.mock("../../../tablets/tabletMetadata", () => ({
  tabletMetadata: [
    { id: "first", label: "First", keywords: [], getActionsForContext: jest.fn() },
    { id: "second", label: "Second", keywords: [], getActionsForContext: jest.fn() },
  ],
}));

const [firstTablet, secondTablet] = tabletMetadata.map((meta) => meta.getActionsForContext as jest.Mock);
const getStoredContent = modelManager.getContent as jest.Mock;

type Handler = () => void;

interface RegisteredEntry {
  label: string;
  contextMenuGroupId: string;
  contextMenuOrder: number;
  precondition: string;
  run: () => void;
  dispose: jest.Mock;
}

const createEditor = (initial: string | null) => {
  let content = initial;
  const registered: Record<string, RegisteredEntry> = {};
  const keys: Record<string, { value: boolean; set: jest.Mock }> = {};
  const handlers: { content?: Handler; model?: Handler; mouse?: (event: unknown) => void; key?: (event: unknown) => void } = {};
  const listener = (key: "content" | "model" | "mouse" | "key") =>
    jest.fn((handler: never) => {
      handlers[key] = handler;
      return { dispose: jest.fn() };
    });

  const editor = {
    getModel: () => (content === null ? null : { getValue: () => content, isDisposed: () => false }),
    createContextKey: jest.fn((name: string, initialValue: boolean) => {
      const key = { value: initialValue, set: jest.fn((next: boolean) => { key.value = next; }) };
      keys[name] = key;
      return key;
    }),
    addAction: jest.fn((action: Omit<RegisteredEntry, "dispose"> & { id: string }) => {
      const dispose = jest.fn();
      registered[action.id] = { ...action, dispose };
      return { dispose };
    }),
    onDidChangeModelContent: listener("content"),
    onDidChangeModel: listener("model"),
    onMouseDown: listener("mouse"),
    onKeyDown: listener("key"),
  };

  return {
    editor: editor as never,
    raw: editor,
    registered,
    /** Whether the menu would show this entry: registered and its key is on. */
    isShown: (id: string) => !!registered[id] && keys[registered[id].precondition]?.value === true,
    setContent: (next: string | null) => (content = next),
    fireContentChange: () => handlers.content?.(),
    fireModelChange: () => handlers.model?.(),
    mouseDown: (rightButton: boolean) => handlers.mouse?.({ event: { rightButton } }),
    keyDown: (key: string, shiftKey = false) => handlers.key?.({ browserEvent: { key, shiftKey } }),
  };
};

const tabletAction = (id = "x.open", action = jest.fn()) => ({ id, label: `Open ${id}`, action });

const setActiveLeftTab = (activeLeftTabId: string | null) =>
  act(() => {
    useSplitViewStore.setState({
      splitView: { ...useSplitViewStore.getState().splitView, activeLeftTabId },
    } as never);
  });

const resetTabs = () =>
  mockTabs.splice(0, mockTabs.length,
    { id: "tab-1", title: "One", content: "saved", language: "plaintext" },
    { id: "tab-2", title: "Two", content: "other", language: "plaintext" },
  );

beforeEach(() => {
  jest.clearAllMocks();
  firstTablet.mockReset().mockReturnValue([]);
  secondTablet.mockReset().mockReturnValue([]);
  getStoredContent.mockReset();
  resetTabs();
  useSplitViewStore.setState({
    splitView: { ...useSplitViewStore.getState().splitView, activeLeftTabId: "tab-1", activeRightTabId: null },
  } as never);
});

describe("collectTabletActions", () => {
  it("builds the context from the live editor content", () => {
    const { editor } = createEditor("live");

    collectTabletActions(editor, "left");

    expect(firstTablet).toHaveBeenCalledWith(
      expect.objectContaining({ source: "editor-tab", content: "live", side: "left", tab: expect.objectContaining({ id: "tab-1" }) }),
    );
  });

  it("falls back to the model manager, then the saved tab content", () => {
    getStoredContent.mockReturnValueOnce("from manager");
    collectTabletActions(createEditor(null).editor, "left");
    getStoredContent.mockReturnValueOnce(undefined);
    collectTabletActions(createEditor(null).editor, "left");

    expect(firstTablet.mock.calls.map(([context]) => context.content)).toEqual(["from manager", "saved"]);
  });

  it("collects the actions of every tablet in metadata order", () => {
    firstTablet.mockReturnValue([tabletAction("a")]);
    secondTablet.mockReturnValue([tabletAction("b")]);

    expect(collectTabletActions(createEditor("c").editor, "left").map((a) => a.id)).toEqual(["a", "b"]);
  });

  it.each([
    ["an unknown tab", "missing"],
    ["no tab", null],
  ])("returns nothing for %s", (_name, tabId) => {
    firstTablet.mockReturnValue([tabletAction()]);
    setActiveLeftTab(tabId);

    expect(collectTabletActions(createEditor("c").editor, "left")).toEqual([]);
  });

  it("follows the active tab of the requested side", () => {
    act(() => {
      useSplitViewStore.setState({
        splitView: { ...useSplitViewStore.getState().splitView, activeLeftTabId: "tab-1", activeRightTabId: "tab-2" },
      } as never);
    });

    collectTabletActions(createEditor("c").editor, "right");

    expect(firstTablet).toHaveBeenCalledWith(expect.objectContaining({ tab: expect.objectContaining({ id: "tab-2" }), side: "right" }));
  });

  it.each([["isTablet"], ["isRich"]])("returns nothing for a %s tab", (flag) => {
    mockTabs[0][flag] = true;
    firstTablet.mockReturnValue([tabletAction()]);

    expect(collectTabletActions(createEditor("c").editor, "left")).toEqual([]);
    expect(firstTablet).not.toHaveBeenCalled();
  });

  it("drops actions that opt out of the editor menu and keeps the rest", () => {
    firstTablet.mockReturnValue([
      tabletAction("keep"),
      { ...tabletAction("hide"), showInEditorMenu: false },
      { ...tabletAction("explicit"), showInEditorMenu: true },
    ]);

    const ids = collectTabletActions(createEditor("c").editor, "left").map((a) => a.id);

    expect(ids).toEqual(["keep", "explicit"]);
  });
});

describe("useTabletContextActions", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  describe("registration", () => {
    it("registers each qualifying action in the open-in group, shown through a context key", () => {
      firstTablet.mockReturnValue([tabletAction("a")]);
      const { editor, registered, isShown } = createEditor("c");

      renderHook(() => useTabletContextActions(editor, "left"));

      expect(registered["tablet-a"]).toMatchObject({ label: "Open a", contextMenuGroupId: "1_openin" });
      expect(registered["tablet-a"].precondition).toBe("tabletActionVisible.a");
      expect(isShown("tablet-a")).toBe(true);
    });

    it("builds a valid context key from ids containing dots and dashes", () => {
      firstTablet.mockReturnValue([tabletAction("datareconcile.reconcile-tab")]);
      const { editor, registered } = createEditor("c");

      renderHook(() => useTabletContextActions(editor, "left"));

      expect(registered["tablet-datareconcile.reconcile-tab"].precondition).toBe(
        "tabletActionVisible.datareconcile_reconcile_tab",
      );
    });

    it("keeps entries in tablet metadata order whenever they first qualify", () => {
      firstTablet.mockReturnValue([tabletAction("a1"), tabletAction("a2")]);
      secondTablet.mockReturnValue([tabletAction("b")]);
      const { editor, registered } = createEditor("c");

      renderHook(() => useTabletContextActions(editor, "left"));

      const orders = ["tablet-a1", "tablet-a2", "tablet-b"].map((id) => registered[id].contextMenuOrder);
      expect(orders).toEqual([...orders].sort((x, y) => x - y));
      expect(new Set(orders).size).toBe(3);
    });

    it("does nothing without an editor", () => {
      firstTablet.mockReturnValue([tabletAction()]);

      expect(() => renderHook(() => useTabletContextActions(null, "left"))).not.toThrow();
      expect(firstTablet).not.toHaveBeenCalled();
    });

    it("does not register the actions that opt out of the editor menu", () => {
      firstTablet.mockReturnValue([{ ...tabletAction("generate-content"), showInEditorMenu: false }]);
      const { editor, registered } = createEditor("c");

      renderHook(() => useTabletContextActions(editor, "left"));

      expect(registered).toEqual({});
    });

    it("works with an editor that exposes no change listeners", () => {
      firstTablet.mockReturnValue([tabletAction("a")]);
      const { raw, isShown } = createEditor("c");
      const bare = { getModel: raw.getModel, addAction: raw.addAction, createContextKey: raw.createContextKey } as never;

      expect(() => renderHook(() => useTabletContextActions(bare, "left"))).not.toThrow();
      expect(isShown("tablet-a")).toBe(true);
    });

    it("logs instead of throwing when the tablets cannot be evaluated", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const error = new Error("metadata broke");
      firstTablet.mockImplementation(() => { throw error; });
      const { editor } = createEditor("c");

      expect(() => renderHook(() => useTabletContextActions(editor, "left"))).not.toThrow();
      expect(warn).toHaveBeenCalledWith("[useEditorActions] Failed to sync tablet actions:", error);
      warn.mockRestore();
    });
  });

  describe("choosing an entry", () => {
    // Mirrors the Calculate Checksum entry: the payload is built from context.content
    const checksumLike = (handle: jest.Mock) => (context: { content?: string }) => [
      { id: "checksum", label: "Calculate Checksum", action: () => handle(context.content) },
    ];

    it("runs the chosen action", () => {
      const action = jest.fn();
      firstTablet.mockReturnValue([tabletAction("a", action)]);
      const { editor, registered } = createEditor("c");
      renderHook(() => useTabletContextActions(editor, "left"));

      registered["tablet-a"].run();

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("uses the content the editor holds at click time, not at registration", () => {
      const handle = jest.fn();
      firstTablet.mockImplementation(checksumLike(handle));
      // Registered while the editor still shows the previous (empty) model
      const { editor, registered, setContent } = createEditor("");
      renderHook(() => useTabletContextActions(editor, "left"));

      setContent("text to hash");
      registered["tablet-checksum"].run();

      expect(handle).toHaveBeenCalledWith("text to hash");
    });

    it("uses the new model's content after a tab switch without any edit", () => {
      const handle = jest.fn();
      firstTablet.mockImplementation(checksumLike(handle));
      const { editor, registered, setContent } = createEditor("old tab text");
      renderHook(() => useTabletContextActions(editor, "left"));

      setContent("new tab text");
      registered["tablet-checksum"].run();

      expect(handle).toHaveBeenCalledWith("new tab text");
    });

    it("does nothing when the content no longer qualifies", () => {
      const action = jest.fn();
      firstTablet.mockReturnValueOnce([tabletAction("a", action)]);
      const { editor, registered } = createEditor("c");
      renderHook(() => useTabletContextActions(editor, "left"));
      firstTablet.mockReturnValue([]);

      registered["tablet-a"].run();

      expect(action).not.toHaveBeenCalled();
    });

    it("runs the action of the tab that is active when it is chosen", () => {
      const forTab1 = jest.fn();
      const forTab2 = jest.fn();
      firstTablet.mockImplementation(({ tab }: { tab: { id: string } }) => [
        tabletAction("same-id", tab.id === "tab-1" ? forTab1 : forTab2),
      ]);
      const { editor, registered } = createEditor("c");
      renderHook(() => useTabletContextActions(editor, "left"));

      setActiveLeftTab("tab-2");
      registered["tablet-same-id"].run();

      expect(forTab1).not.toHaveBeenCalled();
      expect(forTab2).toHaveBeenCalledTimes(1);
    });

    it("logs instead of throwing when an action fails", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const error = new Error("tablet down");
      firstTablet.mockReturnValue([tabletAction("a", jest.fn(() => { throw error; }))]);
      const { editor, registered } = createEditor("c");
      renderHook(() => useTabletContextActions(editor, "left"));

      expect(() => registered["tablet-a"].run()).not.toThrow();
      expect(warn).toHaveBeenCalledWith("[useEditorActions] Failed to run tablet action:", error);
      warn.mockRestore();
    });
  });

  describe("keeping entries current", () => {
    const qualifiesWhenLong = ({ content }: { content: string }) => (content.length > 3 ? [tabletAction("late")] : []);

    it("shows an entry once typing settles, not on every keystroke", () => {
      firstTablet.mockImplementation(qualifiesWhenLong);
      const { editor, isShown, setContent, fireContentChange } = createEditor("ab");
      renderHook(() => useTabletContextActions(editor, "left"));
      expect(isShown("tablet-late")).toBe(false);

      setContent("abcdef");
      fireContentChange();
      act(() => { jest.advanceTimersByTime(399); });
      expect(isShown("tablet-late")).toBe(false);
      fireContentChange();
      act(() => { jest.advanceTimersByTime(400); });

      expect(isShown("tablet-late")).toBe(true);
    });

    it("re-evaluates immediately when the editor swaps models", () => {
      firstTablet.mockImplementation(({ content }: { content: string }) =>
        content === "webhook" ? [tabletAction("hook")] : [],
      );
      const { editor, isShown, setContent, fireModelChange } = createEditor("plain");
      renderHook(() => useTabletContextActions(editor, "left"));

      setContent("webhook");
      act(() => fireModelChange());

      expect(isShown("tablet-hook")).toBe(true);
    });

    describe("right before the context menu opens", () => {
      const setup = () => {
        firstTablet.mockImplementation(qualifiesWhenLong);
        const utils = createEditor("ab");
        renderHook(() => useTabletContextActions(utils.editor, "left"));
        utils.setContent("abcdef"); // typed, debounced refresh still pending
        utils.fireContentChange();
        return utils;
      };

      it("syncs at once on a right mouse button press, ahead of the debounce", () => {
        const { isShown, mouseDown } = setup();

        mouseDown(true);

        expect(isShown("tablet-late")).toBe(true);
      });

      it("ignores other mouse buttons", () => {
        const { isShown, mouseDown } = setup();

        mouseDown(false);

        expect(isShown("tablet-late")).toBe(false);
      });

      it.each([
        ["the ContextMenu key", "ContextMenu", false],
        ["Shift+F10", "F10", true],
      ])("syncs at once on %s", (_name, key, shiftKey) => {
        const { isShown, keyDown } = setup();

        keyDown(key, shiftKey);

        expect(isShown("tablet-late")).toBe(true);
      });

      it.each([
        ["an ordinary key", "a", false],
        ["F10 without Shift", "F10", false],
      ])("does not sync on %s", (_name, key, shiftKey) => {
        const { isShown, keyDown } = setup();

        keyDown(key, shiftKey);

        expect(isShown("tablet-late")).toBe(false);
      });

      it("cancels the pending debounced refresh so it does not run twice", () => {
        const { mouseDown } = setup();
        firstTablet.mockClear();

        mouseDown(true);
        const callsAfterSync = firstTablet.mock.calls.length;
        act(() => { jest.advanceTimersByTime(1000); });

        expect(firstTablet).toHaveBeenCalledTimes(callsAfterSync);
      });
    });

    it("re-evaluates for the newly active tab", () => {
      firstTablet.mockImplementation(({ tab }: { tab: { id: string } }) => [tabletAction(`for-${tab.id}`)]);
      const { editor, isShown } = createEditor("c");
      renderHook(() => useTabletContextActions(editor, "left"));

      setActiveLeftTab("tab-2");

      expect(isShown("tablet-for-tab-1")).toBe(false);
      expect(isShown("tablet-for-tab-2")).toBe(true);
    });

    it("hides every entry when the active tab becomes a tablet", () => {
      firstTablet.mockReturnValue([tabletAction("a")]);
      const { editor, isShown } = createEditor("c");
      renderHook(() => useTabletContextActions(editor, "left"));
      mockTabs[1].isTablet = true;

      setActiveLeftTab("tab-2");

      expect(isShown("tablet-a")).toBe(false);
    });

    it("never disposes an entry while the editor lives, so an open menu keeps working", () => {
      firstTablet.mockImplementation(qualifiesWhenLong);
      const { editor, raw, registered, isShown, setContent, fireModelChange } = createEditor("abcdef");
      renderHook(() => useTabletContextActions(editor, "left"));
      const entry = registered["tablet-late"];

      setContent("ab");
      act(() => fireModelChange());
      expect(isShown("tablet-late")).toBe(false);
      setContent("abcdef");
      act(() => fireModelChange());

      expect(isShown("tablet-late")).toBe(true);
      expect(entry.dispose).not.toHaveBeenCalled();
      expect(raw.addAction).toHaveBeenCalledTimes(1);
    });

    it("keeps an entry registered while its content change lands after the menu opened", () => {
      // Typing then right-clicking quickly: the entry set changes once the menu is open
      firstTablet.mockReturnValue([tabletAction("a")]);
      secondTablet.mockImplementation(({ content }: { content: string }) => (content ? [tabletAction("b")] : []));
      const { editor, registered, setContent, fireContentChange } = createEditor("");
      renderHook(() => useTabletContextActions(editor, "left"));
      const open = registered["tablet-a"];

      setContent("hello world");
      fireContentChange();
      act(() => { jest.advanceTimersByTime(500); });

      expect(open.dispose).not.toHaveBeenCalled();
      expect(registered["tablet-b"]).toBeDefined();
    });

    it("disposes entries and listeners and cancels a pending refresh on unmount", () => {
      firstTablet.mockReturnValue([tabletAction("a")]);
      const { editor, raw, registered, fireContentChange } = createEditor("c");
      const { unmount } = renderHook(() => useTabletContextActions(editor, "left"));
      fireContentChange();
      firstTablet.mockClear();

      unmount();
      act(() => { jest.advanceTimersByTime(1000); });

      expect(registered["tablet-a"].dispose).toHaveBeenCalledTimes(1);
      [raw.onDidChangeModelContent, raw.onDidChangeModel, raw.onMouseDown, raw.onKeyDown].forEach((fn) => {
        expect((fn.mock.results[0].value as { dispose: jest.Mock }).dispose).toHaveBeenCalled();
      });
      expect(firstTablet).not.toHaveBeenCalled();
    });

    it("registers fresh entries for a different side", () => {
      firstTablet.mockReturnValue([tabletAction("a")]);
      const { editor, raw } = createEditor("c");
      const { rerender } = renderHook(({ side }) => useTabletContextActions(editor, side), {
        initialProps: { side: "left" as "left" | "right" },
      });
      expect(raw.addAction).toHaveBeenCalledTimes(1);

      useSplitViewStore.setState({
        splitView: { ...useSplitViewStore.getState().splitView, activeRightTabId: "tab-2" },
      } as never);
      rerender({ side: "right" });

      expect(raw.addAction).toHaveBeenCalledTimes(2);
    });
  });
});
