/**
 * Uses real Dexie on top of fake-indexeddb (jest maps "dexie" to a mock globally, so the
 * actual library is loaded by path). These tests cover the storage-level rule that rows are
 * only written for workspaces that exist, and the purge of rows left by deleted workspaces.
 */
import "../testing/structuredClonePolyfill";
import "fake-indexeddb/auto";

jest.mock("dexie", () => jest.requireActual("../../../node_modules/dexie/dist/dexie.js"));

import { db, IndexedDBStorage } from "../index";
import { canvasDocumentRepository } from "../../features/canvas/services/CanvasDocumentRepository";
import type { SplitViewRecord, Tab, Workspace } from "../../types";

const storage = IndexedDBStorage.getInstance();

const workspace = (id: string): Workspace => ({
  id,
  name: id,
  links: [],
  createdAt: 1,
  lastAccessed: 1,
  displayOrder: 0,
});

const tab = (id: string, workspaceId: string | undefined): Tab =>
  ({
    id,
    title: id,
    content: `content of ${id}`,
    language: "plaintext",
    languageLocked: false,
    cursorPosition: { lineNumber: 1, column: 1 },
    dateCreated: 1,
    lastModified: 1,
    workspaceId,
  }) as Tab;

const splitView = (id: string, workspaceId: string, tabId: string): SplitViewRecord => ({
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

const canvasDocument = (id: string, tabId: string, workspaceId: string) => ({
  id,
  tabId,
  workspaceId,
  schemaVersion: 1,
  revision: 0,
  items: [],
  edges: [],
  settings: { background: "dots", snapToGrid: false },
  searchText: "",
  createdAt: 1,
  updatedAt: 1,
});

const canvasAsset = (id: string, workspaceId: string) => ({
  id,
  workspaceId,
  blob: new Blob(["x"]),
  mimeType: "image/png",
  byteLength: 1,
  createdAt: 1,
});

const session = (tabId: string) => ({
  tabId,
  viewport: { x: 0, y: 0, zoom: 1 },
  lastTool: "select",
  updatedAt: 1,
});

const tabIds = async () => (await db.tabs.toArray()).map((t) => t.id).sort();

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

describe("storage only writes rows for workspaces that exist", () => {
  it("skips tab and split-view writes for a missing workspace, writes the rest", async () => {
    await db.workspaces.put(workspace("A"));

    await storage.saveTabsNow([tab("a1", "A"), tab("ghost", "GONE")]);
    await storage.saveTabNow(tab("ghost2", "GONE"));
    await storage.saveSplitViewNow(splitView("svA", "A", "a1"));
    await storage.saveSplitViewNow(splitView("svGone", "GONE", "ghost"));

    expect(await tabIds()).toEqual(["a1"]);
    expect((await db.splitView.toArray()).map((sv) => sv.id)).toEqual(["svA"]);
  });

  it("still writes tabs that have no workspaceId", async () => {
    await storage.saveTabNow(tab("legacy", undefined));
    expect(await tabIds()).toEqual(["legacy"]);
  });

  it("does not bring a workspace back when a save races its deletion", async () => {
    await db.workspaces.put(workspace("A"));
    await db.workspaces.put(workspace("B"));
    await storage.saveTabsNow([tab("a1", "A"), tab("b1", "B")]);
    await storage.saveSplitViewNow(splitView("svA", "A", "a1"));

    await storage.deleteWorkspace("A");
    // What switchWorkspace / autosave / another window does right after the delete:
    await storage.saveTabsNow([tab("a1", "A")]);
    await storage.saveSplitViewNow(splitView("svA", "A", "a1"));

    expect(await tabIds()).toEqual(["b1"]);
    expect(await db.splitView.toArray()).toEqual([]);
  });

  it("allows creating a workspace and its first tab in one transaction", async () => {
    await db.transaction("rw", db.workspaces, db.tabs, db.splitView, async () => {
      await storage.saveWorkspace(workspace("NEW"));
      await storage.saveTabNow(tab("n1", "NEW"));
      await storage.saveSplitViewNow(splitView("svNew", "NEW", "n1"));
    });

    expect(await tabIds()).toEqual(["n1"]);
    expect(await db.splitView.count()).toBe(1);
  });
});

describe("purgeOrphanedWorkspaceData", () => {
  it("removes everything owned by workspaces that no longer exist and nothing else", async () => {
    await db.workspaces.put(workspace("A"));

    // Orphans (workspace "GONE" has no row)
    await db.tabs.bulkPut([
      { ...tab("o1", "GONE"), richContent: undefined } as any,
      { ...tab("o2", "GONE2"), richContent: undefined } as any,
    ]);
    await db.splitView.put(splitView("svOrphan", "GONE", "o1"));
    await db.canvasDocuments.put(canvasDocument("docOrphan", "oc1", "GONE"));
    await db.canvasAssets.put(canvasAsset("assetOrphan", "GONE"));
    await db.canvasSessions.bulkPut([session("oc1"), session("o1")]);
    // A session whose document is gone (re-created by an older build after delete)
    await db.canvasSessions.put(session("dangling"));

    // Valid data
    await db.tabs.put({ ...tab("a1", "A") } as any);
    await db.splitView.put(splitView("svA", "A", "a1"));
    await db.canvasDocuments.put(canvasDocument("docA", "ac1", "A"));
    await db.canvasAssets.put(canvasAsset("assetA", "A"));
    await db.canvasSessions.put(session("ac1"));
    // No workspaceId: not deletable by the rule, must be left alone
    await db.tabs.put({ ...tab("legacy", undefined) } as any);

    const result = await storage.purgeOrphanedWorkspaceData();

    expect(result).toEqual({
      tabs: 2,
      splitViews: 1,
      canvasDocuments: 1,
      canvasAssets: 1,
      canvasSessions: 3,
    });
    expect(await tabIds()).toEqual(["a1", "legacy"]);
    expect((await db.splitView.toArray()).map((s) => s.id)).toEqual(["svA"]);
    expect((await db.canvasDocuments.toArray()).map((d) => d.id)).toEqual(["docA"]);
    expect((await db.canvasAssets.toArray()).map((a) => a.id)).toEqual(["assetA"]);
    expect((await db.canvasSessions.toArray()).map((s) => s.tabId)).toEqual(["ac1"]);
  });

  it("is a no-op when nothing is orphaned and can run repeatedly", async () => {
    await db.workspaces.put(workspace("A"));
    await db.tabs.put({ ...tab("a1", "A") } as any);

    const first = await storage.purgeOrphanedWorkspaceData();
    const second = await storage.purgeOrphanedWorkspaceData();

    expect(Object.values(first).every((n) => n === 0)).toBe(true);
    expect(Object.values(second).every((n) => n === 0)).toBe(true);
    expect(await tabIds()).toEqual(["a1"]);
  });
});

describe("Canvas session saves", () => {
  it("do not re-create a session row once the document is gone", async () => {
    await canvasDocumentRepository.saveSession(session("deleted-tab"));
    expect(await db.canvasSessions.count()).toBe(0);
  });

  it("still save a session for an existing document", async () => {
    await db.canvasDocuments.put(canvasDocument("doc1", "tab1", "A"));
    await canvasDocumentRepository.saveSession(session("tab1"));
    expect((await db.canvasSessions.toArray()).map((s) => s.tabId)).toEqual(["tab1"]);
  });
});
