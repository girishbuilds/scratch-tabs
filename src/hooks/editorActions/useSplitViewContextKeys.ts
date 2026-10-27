import { useEffect, useRef } from "react";
import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { useSplitViewStore } from "../../stores/splitViewStore";
import {
  findPreviousTabId,
  getSideView,
  type EditorSide,
} from "./splitViewSide";

/**
 * Keeps the `splitViewActive` and `previousTabAvailable` context keys in sync
 * with the split view so the matching "Compare ..." entries are enabled only
 * when there is something to compare with.
 */
export const useSplitViewContextKeys = (
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  side: EditorSide,
) => {
  const isSplit = useStoreWithEqualityFn(
    useSplitViewStore,
    (state) => state.splitView.isSplit,
    shallow,
  );
  const hasPreviousTab = useStoreWithEqualityFn(
    useSplitViewStore,
    (state) => {
      const view = getSideView(state.splitView, side);
      return findPreviousTabId(view, view.activeTabId) !== undefined;
    },
    shallow,
  );

  const splitKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(null);
  const previousKeyRef = useRef<Monaco.editor.IContextKey<boolean> | null>(
    null,
  );

  useEffect(() => {
    if (!editor) return;

    try {
      splitKeyRef.current = editor.createContextKey("splitViewActive", isSplit);
      previousKeyRef.current = editor.createContextKey(
        "previousTabAvailable",
        hasPreviousTab,
      );
    } catch (error) {
      console.warn("[useEditorActions] Failed to create context keys:", error);
    }

    return () => {
      splitKeyRef.current = null;
      previousKeyRef.current = null;
    };
    // The values are kept current by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    splitKeyRef.current?.set(isSplit);
    previousKeyRef.current?.set(hasPreviousTab);
  }, [isSplit, hasPreviousTab]);
};
