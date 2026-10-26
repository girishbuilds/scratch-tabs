import type { SplitViewState } from "../../types";

export type EditorSide = "left" | "right";

export interface SideView {
  activeTabId: string | null;
  otherActiveTabId: string | null;
  tabs: string[];
  history: string[];
}

/** Picks the split view state that belongs to one side of the editor. */
export const getSideView = (
  splitView: SplitViewState,
  side: EditorSide,
): SideView =>
  side === "left"
    ? {
        activeTabId: splitView.activeLeftTabId,
        otherActiveTabId: splitView.activeRightTabId,
        tabs: splitView.leftTabs || [],
        history: splitView.leftTabHistory || [],
      }
    : {
        activeTabId: splitView.activeRightTabId,
        otherActiveTabId: splitView.activeLeftTabId,
        tabs: splitView.rightTabs || [],
        history: splitView.rightTabHistory || [],
      };

/** The most recently visited tab on this side that is not the current one. */
export const findPreviousTabId = (
  view: SideView,
  currentTabId: string | null,
): string | undefined => view.history.find((id) => id !== currentTabId);
