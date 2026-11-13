/**
 * KNOWN-FAILING tests (see BUGS.md). Real stores on real Dexie (fake-indexeddb).
 *
 * Tab lifecycle actions in rootStore write to IndexedDB first and update the in-memory stores
 * afterwards (or the other way round). Autosave (persistenceStore.saveState, every 2.5s) snapshots
 * the in-memory stores, so a save that fires while one of those awaits is in flight writes the
 * pre-action state back over the action's own DB write.
 */
import "../../db/testing/structuredClonePolyfill";
import "fake-indexeddb/auto";

jest.mock("dexie", () => jest.requireActual("../../../node_modules/dexie/dist/dexie.js"));

jest.mock("../broadcastStore", () => ({
  broadcastManager: {
    broadcastWorkspaceList: jest.fn(),
    broadcastWorkspaceDeletion: jest.fn(),
    broadcastWorkspaceState: jest.fn(),
    broadcastWorkspaceTabsMetadata: jest.fn(),
  },
}));
jest.mock("../../services/modelManager", () => ({
  modelManager: { getContent: jest.fn(() => undefined), disposeAll: jest.fn(), dispose: jest.fn() },
}));
jest.mock("../../services/canvasLifecycleCoordinator", () => ({
  canvasLifecycleCoordinator: { flushActiveDocuments: jest.fn(async () => undefined) },
}));
jest.mock("../../formats", () => ({
  detectFormat: jest.fn(() => "plaintext"),
  isAmbiguousFormat: jest.fn(() => false),
}));
jest.mock("../../formats/registry", () => ({ formatRegistry: { getById: jest.fn() } }));
jest.mock("../../formats/json/stores/useQueryPanelStore", () => ({
  useQueryPanelStore: { getState: () => ({ removePanelState: jest.fn() }) },
}));
jest.mock("../../services/contentProcessing", () => ({ contentProcessingService: {} }));

import { db, StorageProviderFactory } from "../../db";
import { makeSplitView, makeTab, makeWorkspace } from "../../db/testing/realDbFixtures";
import { useRootStore } from "../rootStore";
import { useTabsStore } from "../tabsStore";
import { useSplitViewStore } from "../splitViewStore";
import { useWorkspaceStore } from "../workspaceStore";
import { usePersistenceStore } from "../persistenceStore";

const storage = StorageProviderFactory.getProvider();

/** Workspace A is active with t1,t2 loaded; workspace B is inactive. */
async function seed(options: { splitB?: boolean } = {}) {
  await Promise.all([db.workspaces.clear(), db.tabs.clear(), db.splitView.clear()]);
  const wsA = makeWorkspace("A", 0);
  const wsB = makeWorkspace("B", 1);
  const tabsA = [makeTab("t1", "A"), makeTab("t2", "A")];
  const tabsB = [makeTab("b1", "B"), makeTab("b2", "B")];
  const svA = makeSplitView("svA", "A", ["t1", "t2"]);
  const svB = options.splitB
    ? makeSplitView("svB", "B", ["b1"], ["b2"])
    : makeSplitView("svB", "B", ["b1", "b2"]);
  await db.workspaces.bulkPut([wsA, wsB]);
  await db.tabs.bulkPut([...tabsA, ...tabsB] as any);
  await db.splitView.bulkPut([svA, svB]);

  useWorkspaceStore.setState({ workspaces: [wsA, wsB], activeWorkspaceId: "A" });
  useTabsStore.setState({ tabs: tabsA, activeTabId: "t1" });
  useSplitViewStore.setState({ splitView: { ...svA } as any });
}

/** Fires an autosave while `method` on the storage provider is in flight, like the 2.5s timer can. */
function autosaveDuring(method: "deleteTab" | "getSplitViewByWorkspace") {
  const saves: Promise<void>[] = [];
  const original = (storage as any)[method].bind(storage);
  const spy = jest.spyOn(storage as any, method).mockImplementation((...args: any[]) => {
    const inFlight = original(...args);
    saves.push(usePersistenceStore.getState().saveState());
    return inFlight;
  });
  return {
    settle: async () => {
      await Promise.all(saves);
      spy.mockRestore();
    },
  };
}

describe("BUG: autosave racing a tab lifecycle action undoes the action in IndexedDB", () => {
  beforeEach(() => seed());
  afterEach(() => jest.restoreAllMocks());

  it("removeTab: a closed tab is not written back by an autosave that overlaps the delete", async () => {
    const race = autosaveDuring("deleteTab");

    await useRootStore.getState().removeTab("t1");
    await race.settle();

    // In memory the tab is gone...
    expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual(["t2"]);
    // ...and it must be gone from the database too. Currently the overlapping save re-inserts it,
    // so it comes back as an invisible row (in no pane) on the next load.
    expect(await db.tabs.get("t1")).toBeUndefined();
  });

  it("moveTabBetweenWorkspaces: an overlapping autosave does not move the tab back to the source workspace", async () => {
    const race = autosaveDuring("getSplitViewByWorkspace");

    await useRootStore.getState().moveTabBetweenWorkspaces("t1", "A", "B");
    await race.settle();

    const svB = await db.splitView.get("svB");
    expect(svB!.leftTabs).toContain("t1");
    // The tab row must belong to the workspace whose split view lists it.
    expect((await db.tabs.get("t1"))!.workspaceId).toBe("B");
  });
});

describe("BUG: tab actions on an INACTIVE split workspace leave an empty pane / dangling active id", () => {
  beforeEach(() => seed({ splitB: true }));

  const expectValidSplit = async () => {
    const sv = (await db.splitView.get("svB"))!;
    const all = [...sv.leftTabs, ...sv.rightTabs];
    // A split view never has an empty pane (the active-workspace path unsplits instead).
    if (sv.isSplit) {
      expect(sv.leftTabs.length).toBeGreaterThan(0);
      expect(sv.rightTabs.length).toBeGreaterThan(0);
    }
    // The pane that has focus must have an active tab that exists.
    const activeId = sv.activeSide === "right" ? sv.activeRightTabId : sv.activeLeftTabId;
    expect(all).toContain(activeId);
    // Histories only reference tabs that are still there.
    expect(sv.leftTabHistory.every((id) => sv.leftTabs.includes(id))).toBe(true);
    expect(sv.rightTabHistory.every((id) => sv.rightTabs.includes(id))).toBe(true);
  };

  it("removeTab: closing the only left-pane tab of an inactive split workspace", async () => {
    await useRootStore.getState().removeTab("b1");
    await expectValidSplit();
  });

  it("moveTabBetweenWorkspaces: moving the only left-pane tab out of an inactive split workspace", async () => {
    await useRootStore.getState().moveTabBetweenWorkspaces("b1", "B", "A");
    await expectValidSplit();
  });
});

describe("BUG: closing a tab leaves the persisted split view pointing at it until the next autosave", () => {
  beforeEach(() => seed());

  it("removeTab: the persisted split view no longer lists or activates the closed tab", async () => {
    await useRootStore.getState().removeTab("t1");

    // No autosave has run yet (a reload or crash here is the scenario).
    expect(await db.tabs.get("t1")).toBeUndefined();
    const sv = (await db.splitView.get("svA"))!;
    expect(sv.leftTabs).not.toContain("t1");
    expect(sv.activeLeftTabId).not.toBe("t1");
  });
});
