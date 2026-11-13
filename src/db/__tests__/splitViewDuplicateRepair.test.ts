/**
 * Real Dexie on fake-indexeddb. Seeds a version 8 database containing split views that have the
 * same tab id in leftTabs and rightTabs, then opens it with the current schema and checks the
 * v9 upgrade, the read/write guards and that clean data is untouched.
 */
import "../testing/structuredClonePolyfill";
import "fake-indexeddb/auto";

jest.mock("dexie", () => jest.requireActual("../../../node_modules/dexie/dist/dexie.js"));

import Dexie from "dexie";
import type { SplitViewRecord } from "../../types";

const V8_STORES = {
  tabs: "id, workspaceId, lastModified, lastAccessed",
  splitView: "id, workspaceId, lastModified",
  workspaces: "id, lastAccessed, displayOrder",
  settings: "key",
  pipelines: "id, name, lastUsedAt, lastModified, isFavorite",
  canvasDocuments: "id, tabId, workspaceId, updatedAt",
  canvasAssets: "id, workspaceId, sha256, createdAt",
  canvasSessions: "tabId, updatedAt",
  scratchEntries: "id, createdAt",
  scratchKeys: "id",
};

const record = (id: string, workspaceId: string, over: Partial<SplitViewRecord>): SplitViewRecord => ({
  id,
  isSplit: true,
  leftTabs: ["a"],
  rightTabs: ["b"],
  activeLeftTabId: "a",
  activeRightTabId: "b",
  activeSide: "left",
  splitRatio: 0.5,
  workspaceId,
  lastModified: 1,
  leftTabHistory: ["a"],
  rightTabHistory: ["b"],
  ...over,
});

describe("split view duplicate repair (Dexie v9)", () => {
  let storage: import("../index").IndexedDBStorage;
  let db: import("../index").ScratchTabsDB;

  beforeAll(async () => {
    const legacy = new Dexie("ScratchTabsDB");
    legacy.version(8).stores(V8_STORES);
    await legacy.open();
    await legacy.table("workspaces").bulkPut(
      ["corrupt", "clean", "weird"].map((id) => ({ id, name: id, links: [], createdAt: 1, lastAccessed: 1, displayOrder: 0 })),
    );
    await legacy.table("splitView").bulkPut([
      record("sv-corrupt", "corrupt", { leftTabs: ["b", "a"], rightTabs: ["b"], activeLeftTabId: "b", leftTabHistory: ["b", "a"] }),
      record("sv-clean", "clean", {}),
      // A row missing its list fields must not abort the upgrade.
      { id: "sv-weird", workspaceId: "weird", lastModified: 1 } as unknown as SplitViewRecord,
    ]);
    legacy.close();

    const mod = await import("../index");
    db = mod.db;
    storage = mod.IndexedDBStorage.getInstance();
    await db.open();
  });

  afterAll(() => db.close());

  it("opens at version 9 and repairs the corrupted row", async () => {
    expect(db.verno).toBe(9);
    const row = await db.splitView.get("sv-corrupt");
    expect(row?.leftTabs).toEqual(["a"]);
    expect(row?.rightTabs).toEqual(["b"]);
    expect(row?.activeLeftTabId).toBe("a");
    expect(row?.leftTabHistory).toEqual(["a"]);
  });

  it("leaves clean rows byte-for-byte alone", async () => {
    expect(await db.splitView.get("sv-clean")).toEqual(record("sv-clean", "clean", {}));
  });

  it("does not abort the upgrade on malformed rows", async () => {
    expect((await db.splitView.get("sv-weird"))?.id).toBe("sv-weird");
  });

  it("heals a duplicate on read and refuses to persist one on write", async () => {
    const dirty = record("sv-clean", "clean", { leftTabs: ["b", "a"], rightTabs: ["b"] });
    await storage.saveSplitViewNow(dirty);
    const stored = await db.splitView.get("sv-clean");
    expect([...stored!.leftTabs, ...stored!.rightTabs].sort()).toEqual(["a", "b"]);

    await db.splitView.put(dirty); // simulate an old window writing directly
    const read = await storage.getSplitViewByWorkspace("clean");
    expect(read?.leftTabs).toEqual(["a"]);
    expect(read?.rightTabs).toEqual(["b"]);
  });
});
