import type { SplitViewRecord, Tab, Workspace } from "../../types";

/** Shared fixtures for tests that run the real stores against real Dexie (fake-indexeddb). */

export const makeWorkspace = (id: string, order = 0): Workspace => ({
  id,
  name: id,
  links: [],
  createdAt: 1,
  lastAccessed: 100 - order,
  displayOrder: order,
});

export const makeTab = (id: string, workspaceId: string, over: Partial<Tab> = {}): Tab => ({
  id,
  title: id,
  content: `content of ${id}`,
  language: "plaintext",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 1,
  workspaceId,
  ...over,
});

export const makeSplitView = (
  id: string,
  workspaceId: string,
  leftTabs: string[],
  rightTabs: string[] = [],
  over: Partial<SplitViewRecord> = {},
): SplitViewRecord => ({
  id,
  isSplit: rightTabs.length > 0,
  leftTabs,
  rightTabs,
  activeLeftTabId: leftTabs[0] ?? null,
  activeRightTabId: rightTabs[0] ?? null,
  activeSide: "left",
  splitRatio: 0.5,
  workspaceId,
  lastModified: 1,
  leftTabHistory: leftTabs.slice(0, 1),
  rightTabHistory: rightTabs.slice(0, 1),
  ...over,
});
