import type { Tab } from "../../../types";
import { useCanvasSendStore } from "../../../stores/canvasSendStore";
import { useDiffModalStore } from "../../../stores/diffModalStore";
import { useMacroStore } from "../../../stores/macroStore";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import { downloadTab } from "../../../utils/downloadTab";
import { createEditorMenuActions } from "../menuActions";

jest.mock("../../../utils/downloadTab", () => ({ downloadTab: jest.fn() }));

type Side = "left" | "right";

const tab = (overrides: Partial<Tab> = {}) =>
  ({ id: "tab-1", title: "Tab 1", content: "saved", ...overrides }) as Tab;

const createEditor = (options: {
  content?: string;
  selected?: string;
  disposed?: boolean;
  noModel?: boolean;
} = {}) => {
  const { content = "live", selected = "", disposed = false, noModel } = options;
  const model = {
    getValue: () => content,
    getValueInRange: () => selected,
    isDisposed: () => disposed,
  };
  return {
    getModel: () => (noModel ? null : model),
    getSelection: () => ({ isEmpty: () => selected.length === 0 }),
  } as never;
};

const setup = (side: Side = "left", activeTab: Tab | null = tab()) => {
  const actions = createEditorMenuActions({
    side,
    latestActiveTabRef: { current: activeTab },
  });
  const byId = (id: string) => actions.find((action) => action.id === id)!;
  return { actions, byId };
};

const setSplitView = (overrides: Record<string, unknown>) =>
  useSplitViewStore.setState({
    splitView: { ...useSplitViewStore.getState().splitView, ...overrides },
  } as never);

describe("createEditorMenuActions", () => {
  beforeEach(() => {
    useMacroStore.getState().setForceShowToolbar(false, null, null);
    useCanvasSendStore.getState().close();
    useDiffModalStore.setState({ isOpen: false, leftTabId: null, rightTabId: null });
    setSplitView({
      isSplit: false,
      activeLeftTabId: "tab-1",
      activeRightTabId: null,
      leftTabs: ["tab-1"],
      rightTabs: [],
      leftTabHistory: [],
      rightTabHistory: [],
    });
    jest.clearAllMocks();
  });

  it("registers the entries in the navigation group with their gating", () => {
    const { actions } = setup();

    expect(
      actions.map(({ id, label, contextMenuGroupId, contextMenuOrder, precondition }) => ({
        id, label, contextMenuGroupId, contextMenuOrder, precondition,
      })),
    ).toEqual([
      { id: "macro-recording", label: "Macro Recording", contextMenuGroupId: "navigation", contextMenuOrder: 2.6, precondition: undefined },
      { id: "send-selection-to-canvas", label: "Send Selection to Canvas...", contextMenuGroupId: "navigation", contextMenuOrder: 3.0, precondition: "editorHasSelection" },
      { id: "copy-all-content", label: "Copy All Content", contextMenuGroupId: "navigation", contextMenuOrder: 3.1, precondition: undefined },
      { id: "download-tab", label: "Download", contextMenuGroupId: "navigation", contextMenuOrder: 3.2, precondition: undefined },
      { id: "compare-with-other-side", label: "Compare with other side", contextMenuGroupId: "navigation", contextMenuOrder: 3.3, precondition: "splitViewActive" },
      { id: "compare-with-previous-tab", label: "Compare with Previous Tab", contextMenuGroupId: "navigation", contextMenuOrder: 3.4, precondition: "previousTabAvailable" },
    ]);
  });

  it("does not offer Generate Mock Content", () => {
    const { actions } = setup();

    expect(actions.map((action) => action.label)).not.toContain("Generate Mock Content");
  });

  describe("macro-recording", () => {
    it("shows the macro toolbar for this tab and side", () => {
      setup("right").byId("macro-recording").run(createEditor());

      expect(useMacroStore.getState()).toMatchObject({
        forceShowToolbar: true,
        targetTabId: "tab-1",
        targetSide: "right",
      });
    });

    it("does nothing without an active tab", () => {
      setup("left", null).byId("macro-recording").run(createEditor());

      expect(useMacroStore.getState().forceShowToolbar).toBe(false);
    });
  });

  describe("send-selection-to-canvas", () => {
    it("opens the canvas dialog with the selected text", () => {
      setup("right").byId("send-selection-to-canvas").run(createEditor({ selected: "picked" }));

      expect(useCanvasSendStore.getState()).toMatchObject({
        source: { kind: "text", text: "picked" },
        side: "right",
      });
    });

    it("does nothing for an empty selection", () => {
      setup().byId("send-selection-to-canvas").run(createEditor({ selected: "" }));

      expect(useCanvasSendStore.getState().source).toBeNull();
    });

    it("does nothing when the model is gone", () => {
      setup().byId("send-selection-to-canvas").run(createEditor({ selected: "x", noModel: true }));

      expect(useCanvasSendStore.getState().source).toBeNull();
    });
  });

  describe("copy-all-content", () => {
    const stubClipboard = (writeText: jest.Mock) =>
      Object.assign(navigator, { clipboard: { writeText } });

    it("copies the whole document", () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);

      setup().byId("copy-all-content").run(createEditor({ content: "everything" }));

      expect(writeText).toHaveBeenCalledWith("everything");
    });

    it("copies nothing when the model is disposed", () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);

      setup().byId("copy-all-content").run(createEditor({ disposed: true }));

      expect(writeText).not.toHaveBeenCalled();
    });

    it("logs a rejected clipboard write instead of throwing", async () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const error = new Error("denied");
      stubClipboard(jest.fn().mockRejectedValue(error));

      setup().byId("copy-all-content").run(createEditor());
      await Promise.resolve();

      expect(warn).toHaveBeenCalledWith("[useEditorActions] Failed to copy all content:", error);
      warn.mockRestore();
    });
  });

  describe("download-tab", () => {
    it("downloads the tab with the live editor content", () => {
      setup().byId("download-tab").run(createEditor({ content: "live text" }));

      expect(downloadTab).toHaveBeenCalledWith(expect.objectContaining({ id: "tab-1", content: "live text" }));
    });

    it("falls back to the saved content without a live model", () => {
      setup().byId("download-tab").run(createEditor({ noModel: true }));

      expect(downloadTab).toHaveBeenCalledWith(expect.objectContaining({ content: "saved" }));
    });

    it("does nothing without an active tab", () => {
      setup("left", null).byId("download-tab").run(createEditor());

      expect(downloadTab).not.toHaveBeenCalled();
    });
  });

  describe("compare-with-other-side", () => {
    const split = (activeLeftTabId: string, activeRightTabId: string) =>
      setSplitView({ isSplit: true, activeLeftTabId, activeRightTabId });

    it("keeps the left tab on the left when invoked from the left side", () => {
      split("tab-1", "tab-2");

      setup("left").byId("compare-with-other-side").run(createEditor());

      expect(useDiffModalStore.getState()).toMatchObject({ isOpen: true, leftTabId: "tab-1", rightTabId: "tab-2" });
    });

    it("keeps the right tab on the right when invoked from the right side", () => {
      split("tab-2", "tab-1");

      setup("right").byId("compare-with-other-side").run(createEditor());

      expect(useDiffModalStore.getState()).toMatchObject({ isOpen: true, leftTabId: "tab-2", rightTabId: "tab-1" });
    });

    it("does nothing when the view is not split", () => {
      setSplitView({ isSplit: false, activeRightTabId: "tab-2" });

      setup().byId("compare-with-other-side").run(createEditor());

      expect(useDiffModalStore.getState().isOpen).toBe(false);
    });

    it("does nothing when the other side has no tab or shows the same tab", () => {
      split("tab-1", "tab-1");
      setup().byId("compare-with-other-side").run(createEditor());
      setSplitView({ activeRightTabId: null });
      setup().byId("compare-with-other-side").run(createEditor());

      expect(useDiffModalStore.getState().isOpen).toBe(false);
    });
  });

  describe("compare-with-previous-tab", () => {
    it("orders the pair by their position in the tab bar", () => {
      setSplitView({ leftTabs: ["tab-0", "tab-1"], leftTabHistory: ["tab-0", "tab-1"] });

      setup().byId("compare-with-previous-tab").run(createEditor());

      expect(useDiffModalStore.getState()).toMatchObject({ isOpen: true, leftTabId: "tab-0", rightTabId: "tab-1" });
    });

    it("uses the right side's own tabs and history", () => {
      setSplitView({
        isSplit: true,
        activeRightTabId: "tab-1",
        rightTabs: ["tab-1", "tab-9"],
        rightTabHistory: ["tab-9", "tab-1"],
      });

      setup("right").byId("compare-with-previous-tab").run(createEditor());

      expect(useDiffModalStore.getState()).toMatchObject({ isOpen: true, leftTabId: "tab-1", rightTabId: "tab-9" });
    });

    it("does nothing when there is no previous tab", () => {
      setSplitView({ leftTabHistory: ["tab-1"] });

      setup().byId("compare-with-previous-tab").run(createEditor());

      expect(useDiffModalStore.getState().isOpen).toBe(false);
    });

    it("does nothing without an active tab", () => {
      setSplitView({ leftTabHistory: ["tab-0", "tab-1"] });

      setup("left", null).byId("compare-with-previous-tab").run(createEditor());

      expect(useDiffModalStore.getState().isOpen).toBe(false);
    });
  });
});
