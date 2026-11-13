import { SplitViewState } from "../types";
import { findTabById } from "./tabUtils";
import { Tab } from "../types";

/**
 * Generates a UUID, with fallback for environments where crypto.randomUUID is not available
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for Jest/Node.js environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a default split view state
 */
export function createDefaultSplitViewState(
  workspaceId?: string,
): SplitViewState {
  return {
    id: generateUUID(),
    isSplit: false,
    leftTabs: [],
    rightTabs: [],
    activeLeftTabId: null,
    activeRightTabId: null,
    activeSide: "left",
    splitRatio: 0.5,
    leftTabHistory: [],
    rightTabHistory: [],
    workspaceId: workspaceId || "default",
  };
}

/**
 * Updates tab history when a tab becomes active
 */
export function updateTabHistory(
  history: string[] | undefined | null,
  tabId: string,
): string[] {
  if (!history) {
    return [tabId];
  }
  return [tabId, ...history.filter((id) => id !== tabId)];
}

/**
 * Gets the previous active tab from history, falling back to first tab if no history
 */
export function getPreviousActiveTab(
  history: string[] | undefined | null,
  currentTabs: string[],
): string | null {
  if (!history || history.length === 0) {
    return currentTabs[0] || null;
  }

  // Filter history to only include tabs that still exist
  const validHistory = history.filter((id) => currentTabs.includes(id));

  // Return first valid tab from history or fall back to first tab
  return validHistory[0] || currentTabs[0] || null;
}

/**
 * Removes a tab from history
 */
export function removeTabFromHistory(
  history: string[] | undefined | null,
  tabId: string,
): string[] {
  if (!history) {
    return [];
  }
  return history.filter((id) => id !== tabId);
}

/**
 * Checks if a tab is in the left side of the split view
 */
export function isTabInLeftSide(
  splitView: SplitViewState,
  tabId: string,
): boolean {
  return splitView.leftTabs.includes(tabId);
}

/**
 * Checks if a tab is in the right side of the split view
 */
export function isTabInRightSide(
  splitView: SplitViewState,
  tabId: string,
): boolean {
  return splitView.rightTabs.includes(tabId);
}

/**
 * Gets the side of the split view that a tab is in
 */
export function getTabSide(
  splitView: SplitViewState,
  tabId: string,
): "left" | "right" | null {
  if (isTabInLeftSide(splitView, tabId)) return "left";
  if (isTabInRightSide(splitView, tabId)) return "right";
  return null;
}

/**
 * Gets the active tab ID for a side of the split view
 */
export function getActiveSideTabId(
  splitView: SplitViewState,
  side: "left" | "right",
): string | null {
  return side === "left"
    ? splitView.activeLeftTabId
    : splitView.activeRightTabId;
}

/**
 * Gets the tabs for a side of the split view
 */
export function getSideTabs(
  splitView: SplitViewState,
  side: "left" | "right",
): string[] {
  return side === "left" ? splitView.leftTabs : splitView.rightTabs;
}

/**
 * Gets all tab IDs from the split view
 */
export function getAllTabIds(splitView: SplitViewState): string[] {
  return [...splitView.leftTabs, ...splitView.rightTabs];
}

/**
 * Groups tabs by language for a side of the split view
 */
export function groupTabsByLanguage(tabs: Tab[], tabIds: string[]): string[] {
  // Create a map of language -> tab IDs
  const languageMap: Record<string, string[]> = {};

  // Group tabs by language
  tabIds.forEach((id) => {
    const tab = findTabById(tabs, id);
    if (!tab) return;

    const language = tab.language || "plaintext";
    if (!languageMap[language]) {
      languageMap[language] = [];
    }
    languageMap[language].push(id);
  });

  // Flatten the map back to an array, preserving the order of languages
  const languages = Object.keys(languageMap);
  const result: string[] = [];

  languages.forEach((language) => {
    result.push(...languageMap[language]);
  });

  return result;
}

/**
 * Tab-list fields shared by SplitViewState and SplitViewRecord. Histories are
 * optional because older persisted records may not have them.
 */
interface SplitViewTabLists {
  isSplit: boolean;
  leftTabs: string[];
  rightTabs: string[];
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  leftTabHistory?: string[];
  rightTabHistory?: string[];
}

const dedupe = (ids: string[]): string[] => Array.from(new Set(ids));

/**
 * Enforces the split view invariant: a tab id lives in exactly one pane and at
 * most once in it. Repairs records that already violate it.
 *
 * When an id is in both panes, `rightTabs` is treated as authoritative. The
 * known corruption (reordering an inactive split workspace) wrote the whole
 * combined order into `leftTabs` and left `rightTabs` untouched, so the right
 * pane entry is the original placement. If that would empty the left pane, the
 * left entry wins instead so a split never ends up with an empty pane.
 *
 * Returns the input object unchanged when it is already valid, so it is cheap
 * to call on every read and write.
 */
export function normalizeSplitViewTabLists<T extends SplitViewTabLists>(
  splitView: T,
): { value: T; changed: boolean } {
  const originalLeft = splitView.leftTabs || [];
  const originalRight = splitView.rightTabs || [];

  let left = dedupe(originalLeft);
  let right = dedupe(originalRight);

  const rightSet = new Set(right);
  const overlap = new Set(left.filter((id) => rightSet.has(id)));
  if (overlap.size > 0) {
    const leftOnly = left.filter((id) => !overlap.has(id));
    if (leftOnly.length > 0) {
      left = leftOnly;
    } else {
      // Every left id is also on the right: keep the left pane populated.
      right = right.filter((id) => !overlap.has(id));
    }
  }

  const changed =
    left.length !== originalLeft.length ||
    right.length !== originalRight.length ||
    left.some((id, i) => id !== originalLeft[i]) ||
    right.some((id, i) => id !== originalRight[i]);

  if (!changed) return { value: splitView, changed: false };

  const leftSet = new Set(left);
  const pickActive = (active: string | null, list: string[], set: Set<string>) =>
    active && !set.has(active) ? (list[0] ?? null) : active;

  const value: T = {
    ...splitView,
    leftTabs: left,
    rightTabs: right,
    activeLeftTabId: pickActive(splitView.activeLeftTabId, left, leftSet),
    activeRightTabId: pickActive(
      splitView.activeRightTabId,
      right,
      new Set(right),
    ),
  };
  if (splitView.leftTabHistory) {
    value.leftTabHistory = dedupe(splitView.leftTabHistory).filter((id) =>
      leftSet.has(id),
    );
  }
  if (splitView.rightTabHistory) {
    const rSet = new Set(right);
    value.rightTabHistory = dedupe(splitView.rightTabHistory).filter((id) =>
      rSet.has(id),
    );
  }
  return { value, changed: true };
}

/**
 * Applies a combined display order (the sidebar lists left pane then right
 * pane) to a split view without moving any tab between panes. Each pane keeps
 * its own ids, ordered as they appear in `newOrder`; ids missing from
 * `newOrder` keep their relative order at the end of their pane, and ids not
 * in the split view (stale sidebar data) are ignored.
 *
 * Dragging across panes therefore only reorders within each pane, matching how
 * reordering works in the active workspace.
 */
export function applyCombinedTabOrder(
  splitView: Pick<SplitViewTabLists, "leftTabs" | "rightTabs">,
  newOrder: string[],
): { leftTabs: string[]; rightTabs: string[] } {
  const orderFor = (current: string[]): string[] => {
    const currentSet = new Set(current);
    const ordered = dedupe(newOrder.filter((id) => currentSet.has(id)));
    const orderedSet = new Set(ordered);
    return [...ordered, ...current.filter((id) => !orderedSet.has(id))];
  };
  return {
    leftTabs: orderFor(dedupe(splitView.leftTabs || [])),
    rightTabs: orderFor(dedupe(splitView.rightTabs || [])),
  };
}

/**
 * Everything the pure split view helpers below read or write. Satisfied by
 * both `SplitViewState` (in-memory) and `SplitViewRecord` (persisted).
 */
interface SplitViewPaneState extends SplitViewTabLists {
  activeSide: "left" | "right" | null;
}

/**
 * Applies the pane rules that must hold after a tab left (or never belonged
 * to) a pane: a split never keeps an empty pane, the active ids point at tabs
 * that exist, and focus is on a pane that has tabs.
 */
function settlePanes<T extends SplitViewPaneState>(
  sv: T,
  wasTabOnLeft: boolean,
  wasTabOnRight: boolean,
): void {
  if (sv.isSplit) {
    if (sv.leftTabs.length === 0 && sv.rightTabs.length > 0) {
      // Left side empty, unsplit to right
      sv.isSplit = false;
      sv.leftTabs = [...sv.rightTabs];
      sv.leftTabHistory = [...(sv.rightTabHistory ?? [])];
      sv.activeLeftTabId = sv.activeRightTabId || sv.leftTabs[0] || null;
      sv.rightTabs = [];
      sv.rightTabHistory = [];
      sv.activeRightTabId = null;
      sv.activeSide = "left";
    } else if (sv.rightTabs.length === 0 && sv.leftTabs.length > 0) {
      // Right side empty, unsplit to left
      sv.isSplit = false;
      sv.activeRightTabId = null;
      sv.rightTabHistory = [];
      sv.activeSide = "left";
    } else if (sv.leftTabs.length === 0 && sv.rightTabs.length === 0) {
      // Both sides empty
      sv.isSplit = false;
      sv.activeLeftTabId = null;
      sv.activeRightTabId = null;
      sv.activeSide = "left";
    }
  } else if (sv.leftTabs.length === 0) {
    sv.activeLeftTabId = null;
  }

  // Determine active side after removal
  if (!sv.isSplit) {
    sv.activeSide = "left";
  } else if (
    wasTabOnLeft &&
    sv.leftTabs.length === 0 &&
    sv.rightTabs.length > 0
  ) {
    sv.activeSide = "right";
  } else if (
    wasTabOnRight &&
    sv.rightTabs.length === 0 &&
    sv.leftTabs.length > 0
  ) {
    sv.activeSide = "left";
  } else if (
    sv.activeSide === "left" &&
    sv.leftTabs.length === 0 &&
    sv.rightTabs.length > 0
  ) {
    sv.activeSide = "right";
  } else if (
    sv.activeSide === "right" &&
    sv.rightTabs.length === 0 &&
    sv.leftTabs.length > 0
  ) {
    sv.activeSide = "left";
  }
}

/**
 * Removes a tab from a split view: drops it from its pane and history,
 * refocuses the pane's active tab, and unsplits if a pane became empty. Pure,
 * so the active workspace store, the persisted (inactive workspace) path and
 * import all apply the same rules.
 */
export function removeTabFromSplitView<T extends SplitViewPaneState>(
  splitView: T,
  tabId: string,
): T {
  const next: T = { ...splitView };
  let wasTabOnLeft = false;
  let wasTabOnRight = false;

  if (next.leftTabs.includes(tabId)) {
    wasTabOnLeft = true;
    next.leftTabs = next.leftTabs.filter((id) => id !== tabId);
    next.leftTabHistory = removeTabFromHistory(next.leftTabHistory, tabId);
    if (next.activeLeftTabId === tabId) {
      next.activeLeftTabId = getPreviousActiveTab(
        next.leftTabHistory,
        next.leftTabs,
      );
    }
  }
  if (next.rightTabs.includes(tabId)) {
    wasTabOnRight = true;
    next.rightTabs = next.rightTabs.filter((id) => id !== tabId);
    next.rightTabHistory = removeTabFromHistory(next.rightTabHistory, tabId);
    if (next.activeRightTabId === tabId) {
      next.activeRightTabId = getPreviousActiveTab(
        next.rightTabHistory,
        next.rightTabs,
      );
    }
  }

  settlePanes(next, wasTabOnLeft, wasTabOnRight);
  return next;
}

/**
 * Makes a split view consistent with the tab rows that actually exist for its
 * workspace. Persisted split views can lag behind tab rows (a tab was closed
 * or duplicated and the page reloaded before the next autosave), which leaves
 * panes pointing at deleted tabs and tabs that no pane lists (invisible).
 *
 * - drops ids that have no tab row (from panes, histories and active ids)
 * - appends tabs that are in no pane to the left pane
 * - repairs active ids and unsplits when a pane ends up empty
 *
 * Returns the input unchanged when it is already consistent.
 */
export function reconcileSplitViewWithTabs<T extends SplitViewPaneState>(
  splitView: T,
  tabIds: string[],
): { value: T; changed: boolean } {
  const known = new Set(tabIds);
  const normalized = normalizeSplitViewTabLists(splitView).value;

  const next: T = { ...normalized };
  next.leftTabs = normalized.leftTabs.filter((id) => known.has(id));
  next.rightTabs = normalized.rightTabs.filter((id) => known.has(id));
  next.leftTabHistory = (normalized.leftTabHistory ?? []).filter((id) =>
    next.leftTabs.includes(id),
  );
  next.rightTabHistory = (normalized.rightTabHistory ?? []).filter((id) =>
    next.rightTabs.includes(id),
  );

  const placed = new Set([...next.leftTabs, ...next.rightTabs]);
  const unplaced = tabIds.filter((id) => !placed.has(id));
  if (unplaced.length > 0) {
    next.leftTabs = [...next.leftTabs, ...unplaced];
  }

  const repairActive = (
    active: string | null,
    list: string[],
    history: string[] | undefined,
  ): string | null =>
    active && list.includes(active)
      ? active
      : getPreviousActiveTab(history, list);
  next.activeLeftTabId = repairActive(
    normalized.activeLeftTabId,
    next.leftTabs,
    next.leftTabHistory,
  );
  next.activeRightTabId = repairActive(
    normalized.activeRightTabId,
    next.rightTabs,
    next.rightTabHistory,
  );

  settlePanes(next, false, false);

  const same = (a: string[], b: string[] | undefined) =>
    a.length === (b?.length ?? 0) && a.every((id, i) => id === b?.[i]);
  const changed =
    next.isSplit !== splitView.isSplit ||
    next.activeSide !== splitView.activeSide ||
    next.activeLeftTabId !== splitView.activeLeftTabId ||
    next.activeRightTabId !== splitView.activeRightTabId ||
    !same(next.leftTabs, splitView.leftTabs) ||
    !same(next.rightTabs, splitView.rightTabs) ||
    !same(next.leftTabHistory ?? [], splitView.leftTabHistory) ||
    !same(next.rightTabHistory ?? [], splitView.rightTabHistory);

  return changed ? { value: next, changed } : { value: splitView, changed };
}
