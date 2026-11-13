import "../../db/testing/structuredClonePolyfill";
import "fake-indexeddb/auto";
import type { SplitViewRecord, Tab, Workspace } from "../../types";

// jest maps "dexie" to a mock globally; load the real library so the real IndexedDBStorage
// (and its transactions) run against fake-indexeddb.
jest.mock("dexie", () => jest.requireActual("../../../node_modules/dexie/dist/dexie.js"));

import { db } from "../../db";

jest.mock("../broadcastStore", () => ({
  broadcastManager: {
    broadcastWorkspaceList: jest.fn(),
    broadcastWorkspaceDeletion: jest.fn(),
    broadcastWorkspaceState: jest.fn(),
  },
}));
jest.mock("../../services/modelManager", () => ({
  modelManager: { getContent: jest.fn(() => undefined), disposeAll: jest.fn(), dispose: jest.fn() },
}));
jest.mock("../../services/canvasLifecycleCoordinator", () => ({
  canvasLifecycleCoordinator: { flushActiveDocuments: jest.fn(async () => undefined) },
}));

const makeTab = (id: string, workspaceId: string): Tab => ({
  id,
  title: id,
  content: `content of ${id}`,
  language: "plaintext",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 1,
  workspaceId,
});

const makeSplitView = (id: string, workspaceId: string, tabId: string): SplitViewRecord => ({
  id,
  isSplit: false,
  leftTabs: [tabId],
  rightTabs: [],
  activeLeftTabId: tabId,
  activeRightTabId: null,
  activeSide: "left",
  splitRatio: 0.5,
  workspaceId,
  lastModified: 1,
  leftTabHistory: [tabId],
  rightTabHistory: [],
});

describe("BUG: deleting the ACTIVE workspace re-saves its tabs and split view", () => {
  it("leaves no tab or split-view records behind for the deleted workspace", async () => {
    const { useWorkspaceStore } = await import("../workspaceStore");
    const { useTabsStore } = await import("../tabsStore");
    const { useSplitViewStore } = await import("../splitViewStore");

    const wsA: Workspace = { id: "A", name: "A", links: [], createdAt: 1, lastAccessed: 2, displayOrder: 0 };
    const wsB: Workspace = { id: "B", name: "B", links: [], createdAt: 1, lastAccessed: 1, displayOrder: 1 };
    await db.workspaces.bulkPut([wsA, wsB]);
    await db.tabs.bulkPut([makeTab("tA", "A"), makeTab("tB", "B")] as any);
    await db.splitView.bulkPut([makeSplitView("svA", "A", "tA"), makeSplitView("svB", "B", "tB")]);

    // App state: A is the active workspace with its tab loaded.
    useWorkspaceStore.setState({ workspaces: [wsA, wsB], activeWorkspaceId: "A" });
    useTabsStore.setState({ tabs: [makeTab("tA", "A")], activeTabId: "tA" });
    useSplitViewStore.setState({
      splitView: { ...makeSplitView("svA", "A", "tA") } as any,
    });

    await useWorkspaceStore.getState().deleteWorkspace("A");

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("B");
    expect(await db.workspaces.get("A")).toBeUndefined();
    expect(await db.tabs.where("workspaceId").equals("A").toArray()).toEqual([]);
    expect(await db.splitView.where("workspaceId").equals("A").toArray()).toEqual([]);
    // The other workspace is untouched
    expect((await db.tabs.where("workspaceId").equals("B").toArray()).map((t) => t.id)).toEqual(["tB"]);
  });
});
