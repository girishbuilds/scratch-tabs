/**
 * Loading or switching to a workspace reconciles its split view with the tab rows that exist.
 * Real stores on real Dexie (fake-indexeddb).
 */
import "../../db/testing/structuredClonePolyfill";
import "fake-indexeddb/auto";

jest.mock("dexie", () => jest.requireActual("../../../node_modules/dexie/dist/dexie.js"));

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

import { db } from "../../db";
import { makeSplitView, makeTab, makeWorkspace } from "../../db/testing/realDbFixtures";
import { useTabsStore } from "../tabsStore";
import { useSplitViewStore } from "../splitViewStore";
import { useWorkspaceStore } from "../workspaceStore";
import { createDefaultSplitViewState } from "../../utils";

// jsdom's crypto has no randomUUID; the stores need it to create workspaces.
if (typeof crypto.randomUUID !== "function") {
  Object.defineProperty(crypto, "randomUUID", {
    value: () => jest.requireActual("crypto").randomUUID(),
  });
}

async function reset() {
  await Promise.all([db.workspaces.clear(), db.tabs.clear(), db.splitView.clear()]);
  useWorkspaceStore.setState({ workspaces: [], activeWorkspaceId: null, error: null, isLoading: false });
  useTabsStore.setState({ tabs: [], activeTabId: null });
  useSplitViewStore.setState({ splitView: createDefaultSplitViewState() });
}

describe("loading a workspace reconciles its split view with its tabs", () => {
  beforeEach(reset);

  it("drops split-view ids whose tab row is gone (tab closed, page reloaded before the next autosave)", async () => {
    await db.workspaces.put(makeWorkspace("A"));
    await db.tabs.bulkPut([makeTab("t2", "A")] as any);
    // t1 was closed: its row was deleted immediately, the split view was not saved yet.
    await db.splitView.put(makeSplitView("svA", "A", ["t1", "t2"]));

    await useWorkspaceStore.getState().loadWorkspaces();

    const { splitView } = useSplitViewStore.getState();
    const tabIds = useTabsStore.getState().tabs.map((t) => t.id);
    expect(splitView.leftTabs.every((id) => tabIds.includes(id))).toBe(true);
    // Currently "t1": the editor shows the empty-workspace page although t2 exists.
    expect(tabIds).toContain(splitView.activeLeftTabId);
  });

  it("puts tabs that are in no pane back into a pane (otherwise they are invisible in the tab bar and sidebar)", async () => {
    await db.workspaces.put(makeWorkspace("A"));
    // t3 exists (e.g. duplicated/moved in, or re-saved by a racing autosave) but no pane lists it.
    await db.tabs.bulkPut([makeTab("t1", "A"), makeTab("t3", "A", { content: "important" })] as any);
    await db.splitView.put(makeSplitView("svA", "A", ["t1"]));

    await useWorkspaceStore.getState().loadWorkspaces();

    const { splitView } = useSplitViewStore.getState();
    expect([...splitView.leftTabs, ...splitView.rightTabs]).toContain("t3");
  });

  it("switchWorkspace applies the same reconciliation", async () => {
    await db.workspaces.bulkPut([makeWorkspace("A", 0), makeWorkspace("B", 1)]);
    await db.tabs.bulkPut([makeTab("t1", "A"), makeTab("b2", "B")] as any);
    await db.splitView.bulkPut([
      makeSplitView("svA", "A", ["t1"]),
      makeSplitView("svB", "B", ["b1", "b2"]), // b1 no longer exists
    ]);
    await useWorkspaceStore.getState().loadWorkspaces();

    await useWorkspaceStore.getState().switchWorkspace("B");

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("B");
    const { splitView } = useSplitViewStore.getState();
    expect(splitView.leftTabs).toEqual(["b2"]);
    expect(splitView.activeLeftTabId).toBe("b2");
    expect(useTabsStore.getState().activeTabId).toBe("b2");
  });
});
