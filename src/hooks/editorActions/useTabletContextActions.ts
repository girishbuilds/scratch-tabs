import { useEffect, useRef } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useTabsStore } from "../../stores/tabsStore";
import { modelManager } from "../../services/modelManager";
import { tabletMetadata } from "../../tablets/tabletMetadata";
import type { TabletAction } from "../../tablets/types";
import { getLiveModel, guarded } from "./guard";
import { getSideView, type EditorSide } from "./splitViewSide";

/** Delay before a burst of typing re-evaluates the content-gated entries. */
const CONTENT_REFRESH_DELAY_MS = 400;

/** Room between tablets so entries keep their metadata order once registered. */
const ORDER_STRIDE = 100;

interface TabletEntry {
  action: TabletAction;
  order: number;
}

interface RegisteredEntry {
  visible: Monaco.editor.IContextKey<boolean>;
  disposable: Monaco.IDisposable;
}

const collectTabletEntries = (
  editor: Monaco.editor.ICodeEditor,
  side: EditorSide,
): TabletEntry[] => {
  const { activeTabId } = getSideView(
    useSplitViewStore.getState().splitView,
    side,
  );
  const tab = useTabsStore.getState().tabs.find((t) => t.id === activeTabId);
  if (!tab || tab.isTablet || tab.isRich) return [];

  const content =
    getLiveModel(editor)?.getValue() ??
    modelManager.getContent(tab.id) ??
    tab.content ??
    "";

  return tabletMetadata.flatMap((meta, metaIndex) =>
    (
      meta.getActionsForContext?.({
        source: "editor-tab",
        tab,
        content,
        side,
      }) || []
    )
      .filter((action) => !!action && action.showInEditorMenu !== false)
      .map((action, index) => ({
        action,
        order: metaIndex * ORDER_STRIDE + index,
      })),
  );
};

/**
 * Tablet actions for the tab currently shown on this side, built from the live
 * editor content. Tablet, rich and unknown tabs have no actions.
 */
export const collectTabletActions = (
  editor: Monaco.editor.ICodeEditor,
  side: EditorSide,
): TabletAction[] =>
  collectTabletEntries(editor, side).map(({ action }) => action);

/**
 * Registers the "open in tablet" entries of the editor context menu.
 *
 * Most tablets only offer an action when the content matches their input
 * (e.g. "Verify Webhook Signature" only appears for webhook payloads), so the
 * entries are re-evaluated when the tab, the content or the model changes.
 *
 * An entry is registered the first time it qualifies and then only shown or
 * hidden through a context key. Changing the registrations while the context
 * menu is open breaks the visible menu item, so the entries are also synced
 * right before the menu opens (right mouse button or menu key) instead of
 * relying on the debounced refresh alone.
 *
 * The content seen at registration can be stale - Monaco swaps models
 * asynchronously after a tab switch - so each entry re-collects its action
 * from the live editor when it is chosen.
 */
export const useTabletContextActions = (
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  side: EditorSide,
) => {
  const registryRef = useRef<Map<string, RegisteredEntry> | null>(null);
  const activeTabId = useStoreWithEqualityFn(
    useSplitViewStore,
    (state) => getSideView(state.splitView, side).activeTabId,
    shallow,
  );

  // Owns the registered entries for as long as the editor and side stay put
  useEffect(() => {
    if (!editor) return;

    const registry = new Map<string, RegisteredEntry>();
    registryRef.current = registry;

    return () => {
      registry.forEach(({ disposable }) => disposable.dispose());
      registry.clear();
      registryRef.current = null;
    };
  }, [editor, side]);

  useEffect(() => {
    if (!editor) return;

    const register = ({ action, order }: TabletEntry): RegisteredEntry => {
      const { id, label } = action;
      const visibleKey = `tabletActionVisible.${id.replace(/\W/g, "_")}`;
      const visible = editor.createContextKey(visibleKey, true);
      const disposable = editor.addAction({
        id: `tablet-${id}`,
        label,
        contextMenuGroupId: "1_openin",
        contextMenuOrder: order,
        precondition: visibleKey,
        run: guarded("run tablet action", () => {
          collectTabletActions(editor, side)
            .find((current) => current.id === id)
            ?.action();
        }),
      });
      return { visible, disposable };
    };

    const sync = () => {
      const registry = registryRef.current;
      if (!registry) return;

      try {
        const entries = collectTabletEntries(editor, side);
        entries.forEach((entry) => {
          if (!registry.has(entry.action.id)) {
            registry.set(entry.action.id, register(entry));
          }
        });

        const shown = new Set(entries.map(({ action }) => action.id));
        registry.forEach(({ visible }, id) => visible.set(shown.has(id)));
      } catch (error) {
        console.warn("[useEditorActions] Failed to sync tablet actions:", error);
      }
    };
    sync();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const syncNow = () => {
      if (timer) clearTimeout(timer);
      sync();
    };

    const listeners = [
      editor.onDidChangeModelContent?.(() => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(sync, CONTENT_REFRESH_DELAY_MS);
      }),
      editor.onDidChangeModel?.(sync),
      editor.onMouseDown?.((event) => {
        if (event.event.rightButton) syncNow();
      }),
      editor.onKeyDown?.((event) => {
        const { key, shiftKey } = event.browserEvent;
        if (key === "ContextMenu" || (shiftKey && key === "F10")) syncNow();
      }),
    ];

    return () => {
      if (timer) clearTimeout(timer);
      listeners.forEach((listener) => listener?.dispose());
    };
  }, [editor, side, activeTabId]);
};
