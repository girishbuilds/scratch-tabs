import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import type { Tab } from "../../types";
import { useMacroStore } from "../../stores/macroStore";
import { useCanvasSendStore } from "../../stores/canvasSendStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useDiffModalStore } from "../../stores/diffModalStore";
import { downloadTab } from "../../utils/downloadTab";
import { getTabsInVisualOrder } from "../../utils/diffModalHelpers";
import { guarded, getLiveModel } from "./guard";
import {
  findPreviousTabId,
  getSideView,
  type EditorSide,
} from "./splitViewSide";

interface MenuActionDeps {
  side: EditorSide;
  latestActiveTabRef: React.RefObject<Tab | null | undefined>;
}

type Editor = Monaco.editor.ICodeEditor;

/**
 * Editor right-click actions that are not tied to AI, quick transform or the
 * transformations pipeline. Each entry is a plain descriptor so the hook only
 * has to register and dispose them.
 */
export const createEditorMenuActions = ({
  side,
  latestActiveTabRef,
}: MenuActionDeps): Monaco.editor.IActionDescriptor[] => [
  {
    id: "macro-recording",
    label: "Macro Recording",
    contextMenuGroupId: "navigation",
    contextMenuOrder: 2.6,
    run: guarded("open macro recording", () => {
      const tabId = latestActiveTabRef.current?.id;
      if (!tabId) return;

      // Show the floating macro toolbar for THIS tab + side
      useMacroStore.getState().setForceShowToolbar(true, tabId, side);
    }),
  },
  {
    id: "send-selection-to-canvas",
    label: "Send Selection to Canvas...",
    contextMenuGroupId: "navigation",
    contextMenuOrder: 3.0,
    precondition: "editorHasSelection",
    run: guarded("send selection to canvas", (ed: Editor) => {
      const model = getLiveModel(ed);
      const selection = ed.getSelection();
      if (!model || !selection || selection.isEmpty()) return;

      const text = model.getValueInRange(selection);
      if (!text) return;

      useCanvasSendStore.getState().open({ kind: "text", text }, side);
    }),
  },
  {
    id: "copy-all-content",
    label: "Copy All Content",
    contextMenuGroupId: "navigation",
    contextMenuOrder: 3.1,
    run: guarded("copy all content", (ed: Editor) => {
      const model = getLiveModel(ed);
      if (!model) return;

      navigator.clipboard.writeText(model.getValue()).catch((error) => {
        console.warn("[useEditorActions] Failed to copy all content:", error);
      });
    }),
  },
  {
    id: "download-tab",
    label: "Download",
    contextMenuGroupId: "navigation",
    contextMenuOrder: 3.2,
    run: guarded("download tab", (ed: Editor) => {
      const tab = latestActiveTabRef.current;
      if (!tab) return;

      const content = getLiveModel(ed)?.getValue() ?? tab.content;
      downloadTab({ ...tab, content });
    }),
  },
  {
    id: "compare-with-other-side",
    label: "Compare with other side",
    contextMenuGroupId: "navigation",
    contextMenuOrder: 3.3,
    precondition: "splitViewActive",
    run: guarded("compare with other side", () => {
      const currentTabId = latestActiveTabRef.current?.id;
      const { splitView } = useSplitViewStore.getState();
      if (!currentTabId || !splitView.isSplit) return;

      const { otherActiveTabId } = getSideView(splitView, side);
      if (!otherActiveTabId || otherActiveTabId === currentTabId) return;

      const [leftTabId, rightTabId] =
        side === "left"
          ? [currentTabId, otherActiveTabId]
          : [otherActiveTabId, currentTabId];
      useDiffModalStore.getState().openDiffModal(leftTabId, rightTabId);
    }),
  },
  {
    id: "compare-with-previous-tab",
    label: "Compare with Previous Tab",
    contextMenuGroupId: "navigation",
    contextMenuOrder: 3.4,
    precondition: "previousTabAvailable",
    run: guarded("compare with previous tab", () => {
      const currentTabId = latestActiveTabRef.current?.id;
      if (!currentTabId) return;

      const view = getSideView(useSplitViewStore.getState().splitView, side);
      const previousTabId = findPreviousTabId(view, currentTabId);
      if (!previousTabId) return;

      const { leftTabId, rightTabId } = getTabsInVisualOrder(
        view.tabs,
        currentTabId,
        previousTabId,
      );
      useDiffModalStore.getState().openDiffModal(leftTabId, rightTabId);
    }),
  },
];
