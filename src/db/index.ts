import Dexie from "dexie";
import { Tab, Workspace, WorkspaceLink, SplitViewRecord } from "../types";
import type {
  ScratchEntryRecord,
  ScratchKeyRecord,
} from "../features/scratchpad/types";
import type {
  CanvasAssetRecord,
  CanvasDocument,
  CanvasSessionRecord,
} from "../features/canvas/types";

interface TabRecord {
  id: string;
  title: string;
  content: string;
  richContent?: string; // JSON string for TipTap content
  language: string;
  languageLocked: boolean;
  isTablet?: boolean;
  tabletState?: string;
  isRich?: boolean;
  contentKind?: Tab["contentKind"];
  documentId?: string;
  lastModified: number;
  lastAccessed?: number;
  dateCreated: number;
  workspaceId: string;
  cursorPosition?: { lineNumber: number; column: number };
  isPinned?: boolean;
  activeViewId?: string | null;
  previewMode?: boolean;
  fontSize?: number;
}

interface WorkspaceRecord {
  id: string;
  name: string;
  notes?: string;
  links: WorkspaceLink[];
  createdAt: number;
  lastAccessed: number;
  displayOrder?: number;
}

interface SettingsRecord {
  key: string;
  value: string;
}

interface PipelineRecord {
  id: string;
  name: string | null;
  description?: string;
  steps: string; // JSON serialized PipelineStep[]
  createdAt: number;
  lastModified: number;
  lastUsedAt: number;
  isFavorite: boolean;
}

export class ScratchTabsDB extends Dexie {
  tabs!: Dexie.Table<TabRecord>;
  splitView!: Dexie.Table<SplitViewRecord>;
  workspaces!: Dexie.Table<WorkspaceRecord>;
  settings!: Dexie.Table<SettingsRecord>;
  pipelines!: Dexie.Table<PipelineRecord>;
  canvasDocuments!: Dexie.Table<CanvasDocument>;
  canvasAssets!: Dexie.Table<CanvasAssetRecord>;
  canvasSessions!: Dexie.Table<CanvasSessionRecord>;
  scratchEntries!: Dexie.Table<ScratchEntryRecord, string>;
  scratchKeys!: Dexie.Table<ScratchKeyRecord, string>;

  constructor() {
    super("ScratchTabsDB");

    this.version(1).stores({
      tabs: "id, lastModified",
      splitView: "id, lastModified",
    });

    this.version(2)
      .stores({
        tabs: "id, workspaceId, lastModified",
        splitView: "id, workspaceId, lastModified",
        workspaces: "id, lastAccessed",
      })
      .upgrade((tx) => this.upgradeToV2(tx));

    this.version(3).stores({
      tabs: "id, workspaceId, lastModified",
      splitView: "id, workspaceId, lastModified",
      workspaces: "id, lastAccessed",
      settings: "key",
    });

    // Version 4: Add pipelines table for saved transformation pipelines
    this.version(4).stores({
      tabs: "id, workspaceId, lastModified",
      splitView: "id, workspaceId, lastModified",
      workspaces: "id, lastAccessed",
      settings: "key",
      pipelines: "id, name, lastUsedAt, lastModified, isFavorite",
    });

    // Version 5: Add displayOrder to workspaces for stable ordering
    this.version(5)
      .stores({
        tabs: "id, workspaceId, lastModified",
        splitView: "id, workspaceId, lastModified",
        workspaces: "id, lastAccessed, displayOrder",
        settings: "key",
        pipelines: "id, name, lastUsedAt, lastModified, isFavorite",
      })
      .upgrade((tx) => this.upgradeToV5(tx));

    // Version 6: Add lastAccessed to tabs for recency-based navigation.
    this.version(6)
      .stores({
        tabs: "id, workspaceId, lastModified, lastAccessed",
        splitView: "id, workspaceId, lastModified",
        workspaces: "id, lastAccessed, displayOrder",
        settings: "key",
        pipelines: "id, name, lastUsedAt, lastModified, isFavorite",
      })
      .upgrade((tx) => this.upgradeToV6(tx));

    // Version 7: Store Canvas scenes, binary assets, and viewport sessions
    // separately from lightweight tab metadata.
    this.version(7).stores({
      tabs: "id, workspaceId, lastModified, lastAccessed",
      splitView: "id, workspaceId, lastModified",
      workspaces: "id, lastAccessed, displayOrder",
      settings: "key",
      pipelines: "id, name, lastUsedAt, lastModified, isFavorite",
      canvasDocuments: "id, tabId, workspaceId, updatedAt",
      canvasAssets: "id, workspaceId, sha256, createdAt",
      canvasSessions: "tabId, updatedAt",
    });

    // Version 8: Global Scratchpad. Encrypted entries and their key live in
    // dedicated tables so no tab/workspace code path (search, export, share,
    // broadcast) can read them.
    this.version(8).stores({
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
    });
  }

  private async upgradeToV2(tx: any): Promise<void> {
    // First check if there are any existing tabs that need migration
    const existingTabs = await tx.table("tabs").toArray();

    if (existingTabs.length > 0) {
      // Only create default workspace if there are tabs to migrate
      const defaultWorkspace: WorkspaceRecord = {
        id: crypto.randomUUID(),
        name: "Default Workspace",
        links: [],
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };

      await tx.table("workspaces").add(defaultWorkspace);

      // Update existing tabs with the workspace ID
      await Promise.all(
        existingTabs.map((tab: any) =>
          tx.table("tabs").update(tab.id, { workspaceId: defaultWorkspace.id }),
        ),
      );

      // Update split views if they exist
      const splitViews = await tx.table("splitView").toArray();
      await Promise.all(
        splitViews.map((sv: any) =>
          tx
            .table("splitView")
            .update(sv.id, { workspaceId: defaultWorkspace.id }),
        ),
      );
    }
  }

  private async upgradeToV5(tx: any): Promise<void> {
    // Assign displayOrder to existing workspaces based on current lastAccessed order
    const workspaces = await tx.table("workspaces").toArray();

    if (workspaces.length > 0) {
      // Sort by lastAccessed (most recent first) to maintain current order
      const sortedWorkspaces = workspaces.sort(
        (a: WorkspaceRecord, b: WorkspaceRecord) => b.lastAccessed - a.lastAccessed
      );

      // Assign displayOrder starting from 0
      await Promise.all(
        sortedWorkspaces.map((ws: WorkspaceRecord, index: number) =>
          tx.table("workspaces").update(ws.id, { displayOrder: index })
        )
      );
    }
  }

  private async upgradeToV6(tx: any): Promise<void> {
    const tabs = await tx.table("tabs").toArray();

    await Promise.all(
      tabs.map((tab: TabRecord) =>
        tx.table("tabs").update(tab.id, {
          lastAccessed: tab.lastAccessed || tab.lastModified || tab.dateCreated || Date.now(),
        })
      )
    );
  }

  async reopenIfClosed(): Promise<void> {
    if (this.isOpen()) return;

    try {
      await this.open();
    } catch (error) {
      console.error("Failed to reopen database:", error);
      throw error;
    }
  }
}

export const db = new ScratchTabsDB();

const toTabRecord = (tab: Tab): TabRecord => ({
  ...tab,
  content: tab.content || "",
  richContent: tab.richContent ? JSON.stringify(tab.richContent) : undefined,
  lastModified: tab.lastModified,
  lastAccessed: tab.lastAccessed,
  dateCreated: tab.dateCreated,
  workspaceId: tab.workspaceId,
});

const toTab = (record: TabRecord): Tab => {
  const now = Date.now();
  const cursor = record.cursorPosition || { lineNumber: 1, column: 1 };

  let richContent = null;
  if (record.richContent) {
    try {
      richContent = JSON.parse(record.richContent);
    } catch (error) {
      console.warn('Failed to parse rich content:', error);
    }
  }

  return {
    ...record,
    richContent,
    isRich: record.isRich || false,
    dateCreated: record.dateCreated || now,
    lastModified: record.lastModified || now,
    lastAccessed: record.lastAccessed || record.lastModified || record.dateCreated || now,
    cursorPosition: cursor,
    workspaceId: record.workspaceId,
  };
};

// NEW: Convert record to tab metadata (without content)
const toTabMetadata = (record: TabRecord): Omit<Tab, "content"> => {
  const now = Date.now();
  const { content, richContent, ...metadata } = record;

  let parsedRichContent = null;
  if (richContent) {
    try {
      parsedRichContent = JSON.parse(richContent);
    } catch (error) {
      console.warn('Failed to parse rich content in metadata:', error);
    }
  }

  return {
    ...metadata,
    richContent: parsedRichContent,
    isRich: metadata.isRich || false,
    dateCreated: record.dateCreated || now,
    lastModified: record.lastModified || now,
    lastAccessed: record.lastAccessed || record.lastModified || record.dateCreated || now,
    cursorPosition: record.cursorPosition || { lineNumber: 1, column: 1 },
    workspaceId: record.workspaceId,
  };
};

export interface StorageProvider {
  getTabs(): Promise<Tab[]>;
  saveTabsInterval(tabs: Tab[]): Promise<void>;
  saveTabNow(tab: Tab): Promise<void>;
  saveTabsNow(tabs: Tab[]): Promise<void>;
  deleteTab(id: string): Promise<void>;
  getSplitView(): Promise<SplitViewRecord | null>;
  saveSplitViewInterval(splitView: SplitViewRecord): Promise<void>;
  saveSplitViewNow(splitView: SplitViewRecord): Promise<void>;
  getWorkspaces(): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | null>;
  saveWorkspace(workspace: Workspace): Promise<void>;
  deleteWorkspace(id: string): Promise<void>;
  getTabsByWorkspace(workspaceId: string): Promise<Tab[]>;
  getSplitViewByWorkspace(workspaceId: string): Promise<SplitViewRecord | null>;
  deleteSplitViewByWorkspace(workspaceId: string): Promise<void>;
  getTabsMetadataByWorkspace(
    workspaceId: string,
  ): Promise<Omit<Tab, "content">[]>;
  getTabContent(tabId: string): Promise<string | undefined>;
  updateTabAccessed(tabId: string, lastAccessed: number): Promise<void>;
  updateTabPinned(tabId: string, isPinned: boolean): Promise<void>;
  updateTabCursor(
    tabId: string,
    cursorPosition: { lineNumber: number; column: number },
  ): Promise<void>;
  purgeOrphanedTabData(tabId: string): Promise<void>;
  purgeOrphanedWorkspaceData(): Promise<OrphanPurgeResult>;
}

export interface OrphanPurgeResult {
  tabs: number;
  splitViews: number;
  canvasDocuments: number;
  canvasAssets: number;
  canvasSessions: number;
}

export class IndexedDBStorage implements StorageProvider {
  private static instance: IndexedDBStorage;
  private lastSaveTabsTime: number = 0;
  private lastSaveSplitViewTime: number = 0;
  private readonly DEBOUNCE_TIME = 2000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  private constructor() { }

  static getInstance(): IndexedDBStorage {
    if (!IndexedDBStorage.instance) {
      IndexedDBStorage.instance = new IndexedDBStorage();
    }
    return IndexedDBStorage.instance;
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        await db.reopenIfClosed();
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof Dexie.DatabaseClosedError) {
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }

  async getTabs(): Promise<Tab[]> {
    return this.withRetry(async () => {
      const records = await db.tabs.toArray();
      return records.map(toTab);
    });
  }

  async saveTabsInterval(tabs: Tab[]): Promise<void> {
    const now = Date.now();
    if (now - this.lastSaveTabsTime < this.DEBOUNCE_TIME) return;

    this.lastSaveTabsTime = now;
    await this.putTabs(tabs);
  }

  async saveTabNow(tab: Tab): Promise<void> {
    this.lastSaveTabsTime = Date.now();
    await this.putTabs([tab]);
  }

  async saveTabsNow(tabs: Tab[]): Promise<void> {
    this.lastSaveTabsTime = Date.now();
    await this.putTabs(tabs);
  }

  /**
   * Invariant: a tab or split-view row is only written while its workspace row exists.
   * deleteWorkspace runs in a transaction over the same tables, and IndexedDB serializes
   * overlapping transactions, so a save that races a delete (autosave, switchWorkspace,
   * another window) either lands before the delete (and is removed by it) or sees the
   * workspace missing and is skipped. Records without a workspaceId are written as before.
   */
  private async keepRecordsOfExistingWorkspaces<T extends { workspaceId?: string }>(
    records: T[],
    kind: string,
  ): Promise<T[]> {
    const workspaceIds = [
      ...new Set(
        records
          .map((record) => record.workspaceId)
          .filter((id): id is string => !!id),
      ),
    ];
    if (workspaceIds.length === 0) return records;

    const rows = await db.workspaces.bulkGet(workspaceIds);
    const existing = new Set(workspaceIds.filter((_, index) => rows[index]));
    const kept = records.filter(
      (record) => !record.workspaceId || existing.has(record.workspaceId),
    );
    if (kept.length !== records.length) {
      console.warn(
        `[Storage] Skipped saving ${records.length - kept.length} ${kind} record(s) for a deleted workspace`,
      );
    }
    return kept;
  }

  private async putTabs(tabs: Tab[]): Promise<void> {
    await this.withRetry(async () => {
      await db.transaction("rw", db.workspaces, db.tabs, async () => {
        const kept = await this.keepRecordsOfExistingWorkspaces(
          tabs.map(toTabRecord),
          "tab",
        );
        if (kept.length > 0) {
          await db.tabs.bulkPut(kept);
        }
      });
    });
  }

  private async putSplitView(splitView: SplitViewRecord): Promise<void> {
    await this.withRetry(async () => {
      // Generate UUID if not provided
      if (!splitView.id) {
        splitView.id = crypto.randomUUID();
      }
      await db.transaction("rw", db.workspaces, db.splitView, async () => {
        const [kept] = await this.keepRecordsOfExistingWorkspaces(
          [splitView],
          "split view",
        );
        if (kept) {
          await db.splitView.put(kept);
        }
      });
    });
  }

  async deleteTab(id: string): Promise<void> {
    await this.withRetry(async () => {
      await db.tabs.delete(id);
    });
  }

  async getSplitView(): Promise<SplitViewRecord | null> {
    return this.withRetry(async () => {
      const result = await db.splitView.get("default");
      return result || null;
    });
  }

  async saveSplitViewInterval(splitView: SplitViewRecord): Promise<void> {
    const now = Date.now();
    if (now - this.lastSaveSplitViewTime < this.DEBOUNCE_TIME) return;

    this.lastSaveSplitViewTime = now;
    await this.putSplitView(splitView);
  }

  async saveSplitViewNow(splitView: SplitViewRecord): Promise<void> {
    this.lastSaveSplitViewTime = Date.now();
    await this.putSplitView(splitView);
  }

  async getWorkspaces(): Promise<Workspace[]> {
    return this.withRetry(async () => {
      return await db.workspaces.orderBy("lastAccessed").reverse().toArray();
    });
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.withRetry(async () => {
      const result = await db.workspaces.get(id);
      return result || null;
    });
  }

  async saveWorkspace(workspace: Workspace): Promise<void> {
    await this.withRetry(async () => {
      await db.workspaces.put(workspace);
    });
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.withRetry(async () => {
      try {
        await db.transaction(
          "rw",
          db.workspaces,
          db.tabs,
          db.splitView,
          db.canvasDocuments,
          db.canvasAssets,
          db.canvasSessions,
          async () => {
            const canvasDocuments = await db.canvasDocuments
              .where("workspaceId")
              .equals(id)
              .toArray();

            // 1. Delete tabs associated with the workspace
            // This will delete all tab records where the 'workspaceId' property equals the given 'id'.
            await db.tabs.where("workspaceId").equals(id).delete();

            // 2. Delete split views associated with the workspace
            // Changed from fetching then looping, to a direct delete operation.
            // This will delete all splitView records where the 'workspaceId' property equals the given 'id'.
            await db.splitView.where("workspaceId").equals(id).delete();

            // 3. Delete Canvas scenes, their viewport sessions, and assets.
            // Assets are workspace-scoped, so removing all of them is safe when
            // the complete workspace is being deleted.
            const canvasTabIds = [
              ...new Set(canvasDocuments.map((document) => document.tabId)),
            ];
            if (canvasTabIds.length > 0) {
              await db.canvasSessions.bulkDelete(canvasTabIds);
            }
            await db.canvasDocuments
              .where("workspaceId")
              .equals(id)
              .delete();
            await db.canvasAssets.where("workspaceId").equals(id).delete();

            // 4. Delete the workspace itself
            // This is done last; if any of the above deletions fail, the transaction
            // will roll back, and the workspace will not be deleted either.
            await db.workspaces.delete(id);
          },
        );
      } catch (error) {
        // Log the error or handle it as appropriate for your application
        console.error(
          `Error deleting workspace ${id} and its associated data:`,
          error,
        );
        throw error; // Re-throw the error to be handled by withRetry or the caller
      }
    });
  }

  async getTabsByWorkspace(workspaceId: string): Promise<Tab[]> {
    return this.withRetry(async () => {
      const records = await db.tabs
        .where("workspaceId")
        .equals(workspaceId)
        .toArray();
      return records.map(toTab);
    });
  }

  async getSplitViewByWorkspace(
    workspaceId: string,
  ): Promise<SplitViewRecord | null> {
    return this.withRetry(async () => {
      const result = await db.splitView
        .where("workspaceId")
        .equals(workspaceId)
        .first();
      return result || null;
    });
  }

  async deleteSplitViewByWorkspace(workspaceId: string): Promise<void> {
    await this.withRetry(async () => {
      await db.splitView.where("workspaceId").equals(workspaceId).delete();
    });
  }

  // NEW: Methods for lazy loading
  async getTabsMetadataByWorkspace(
    workspaceId: string,
  ): Promise<Omit<Tab, "content">[]> {
    return this.withRetry(async () => {
      const records = await db.tabs
        .where("workspaceId")
        .equals(workspaceId)
        .toArray();
      return records.map(toTabMetadata);
    });
  }

  async getTabContent(tabId: string): Promise<string | undefined> {
    return this.withRetry(async () => {
      const record = await db.tabs.get(tabId);
      return record?.content;
    });
  }

  async updateTabAccessed(tabId: string, lastAccessed: number): Promise<void> {
    await this.withRetry(async () => {
      await db.tabs.update(tabId, { lastAccessed });
    });
  }

  async updateTabPinned(tabId: string, isPinned: boolean): Promise<void> {
    await this.withRetry(async () => {
      await db.tabs.update(tabId, { isPinned });
    });
  }

  async updateTabCursor(
    tabId: string,
    cursorPosition: { lineNumber: number; column: number },
  ): Promise<void> {
    await this.withRetry(async () => {
      await db.tabs.update(tabId, { cursorPosition });
    });
  }

  /**
   * Removes every record that belongs to a workspace that no longer exists: tabs, split views,
   * Canvas documents and assets, plus the Canvas sessions of those tabs and any Canvas session
   * whose document is gone. Records without a workspaceId are never touched.
   *
   * Runs in one transaction, so it is all-or-nothing and atomic with respect to workspace
   * creation (which writes the workspace row first, in its own transaction).
   */
  async purgeOrphanedWorkspaceData(): Promise<OrphanPurgeResult> {
    return this.withRetry(() =>
      db.transaction(
        "rw",
        db.workspaces,
        db.tabs,
        db.splitView,
        db.canvasDocuments,
        db.canvasAssets,
        db.canvasSessions,
        async () => {
          const workspaceIds = new Set(
            (await db.workspaces.toCollection().primaryKeys()).map(String),
          );
          const orphanedWorkspaceIds = async (table: Dexie.Table<any, any>) =>
            (await table.orderBy("workspaceId").uniqueKeys())
              .filter(
                (key): key is string =>
                  typeof key === "string" && key !== "" && !workspaceIds.has(key),
              );

          const [tabWs, splitViewWs, documentWs, assetWs] = await Promise.all([
            orphanedWorkspaceIds(db.tabs),
            orphanedWorkspaceIds(db.splitView),
            orphanedWorkspaceIds(db.canvasDocuments),
            orphanedWorkspaceIds(db.canvasAssets),
          ]);

          const result: OrphanPurgeResult = {
            tabs: 0,
            splitViews: 0,
            canvasDocuments: 0,
            canvasAssets: 0,
            canvasSessions: 0,
          };

          const sessionTabIds = new Set<string>();

          if (tabWs.length > 0) {
            const tabIds = await db.tabs
              .where("workspaceId")
              .anyOf(tabWs)
              .primaryKeys();
            tabIds.forEach((id) => sessionTabIds.add(String(id)));
            result.tabs = tabIds.length;
            await db.tabs.bulkDelete(tabIds);
          }
          if (splitViewWs.length > 0) {
            result.splitViews = await db.splitView
              .where("workspaceId")
              .anyOf(splitViewWs)
              .delete();
          }
          if (documentWs.length > 0) {
            const documents = await db.canvasDocuments
              .where("workspaceId")
              .anyOf(documentWs)
              .toArray();
            documents.forEach((document) => sessionTabIds.add(document.tabId));
            result.canvasDocuments = documents.length;
            await db.canvasDocuments.bulkDelete(documents.map((d) => d.id));
          }
          if (assetWs.length > 0) {
            result.canvasAssets = await db.canvasAssets
              .where("workspaceId")
              .anyOf(assetWs)
              .delete();
          }

          // Sessions of the purged tabs/documents, plus any session whose document is gone.
          const remainingDocumentTabIds = new Set(
            (await db.canvasDocuments.orderBy("tabId").uniqueKeys()).map(String),
          );
          const sessionKeys = (await db.canvasSessions.toCollection().primaryKeys()).map(String);
          const sessionsToDelete = sessionKeys.filter(
            (tabId) => sessionTabIds.has(tabId) || !remainingDocumentTabIds.has(tabId),
          );
          if (sessionsToDelete.length > 0) {
            result.canvasSessions = sessionsToDelete.length;
            await db.canvasSessions.bulkDelete(sessionsToDelete);
          }

          return result;
        },
      ),
    );
  }

  /**
   * Hard-deletes a tab record plus any canvas documents, sessions, and
   * no-longer-referenced assets. Used for orphaned tabs whose workspace no
   * longer exists, where the normal lifecycle path cannot find them.
   */
  async purgeOrphanedTabData(tabId: string): Promise<void> {
    await this.withRetry(async () => {
      await db.transaction(
        "rw",
        db.tabs,
        db.canvasDocuments,
        db.canvasAssets,
        db.canvasSessions,
        async () => {
          await db.tabs.delete(tabId);

          const orphanedDocuments = await db.canvasDocuments
            .where("tabId")
            .equals(tabId)
            .toArray();
          if (orphanedDocuments.length === 0) return;

          const orphanedAssetIds = new Set(
            orphanedDocuments.flatMap((document) =>
              document.items
                .filter((item) => item.type === "image")
                .map((item) =>
                  "assetId" in item && item.assetId ? item.assetId : null,
                )
                .filter((assetId): assetId is string => assetId !== null),
            ),
          );

          await db.canvasDocuments.where("tabId").equals(tabId).delete();
          await db.canvasSessions.where("tabId").equals(tabId).delete();

          if (orphanedAssetIds.size === 0) return;

          const remainingDocuments = await db.canvasDocuments.toArray();
          const stillReferenced = new Set(
            remainingDocuments.flatMap((document) =>
              document.items
                .filter((item) => item.type === "image")
                .map((item) =>
                  "assetId" in item && item.assetId ? item.assetId : null,
                )
                .filter((assetId): assetId is string => assetId !== null),
            ),
          );
          const deletableAssetIds = Array.from(orphanedAssetIds).filter(
            (assetId) => !stillReferenced.has(assetId),
          );
          if (deletableAssetIds.length > 0) {
            await db.canvasAssets.bulkDelete(deletableAssetIds);
          }
        },
      );
    });
  }
}

export class StorageProviderFactory {
  static getProvider(
    type: "indexeddb" | "cloud" = "indexeddb",
  ): StorageProvider {
    switch (type) {
      case "indexeddb":
        return IndexedDBStorage.getInstance();
      case "cloud":
        throw new Error("Cloud storage not implemented yet");
      default:
        return IndexedDBStorage.getInstance();
    }
  }
}

export async function setSetting(key: string, value: string) {
  await db.settings.put({ key, value });
}

export async function getSetting(key: string): Promise<string | undefined> {
  const record = await db.settings.get(key);
  return record?.value;
}

/**
 * Recent Tools Management
 */
const RECENT_TOOLS_KEY = 'recent_tools_v2';
const MAX_RECENT_TOOLS = 10;

export async function getRecentTools(): Promise<string[]> {
  const value = await getSetting(RECENT_TOOLS_KEY);
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch (e) {
    return [];
  }
}

export async function addRecentTool(toolId: string) {
  const recent = await getRecentTools();
  // Remove if already exists, then add to front
  const updated = [toolId, ...recent.filter(id => id !== toolId)].slice(0, MAX_RECENT_TOOLS);
  await setSetting(RECENT_TOOLS_KEY, JSON.stringify(updated));
}

export async function incrementSetting(
  key: string,
  increment: number = 1,
): Promise<number> {
  const currentValue = await getSetting(key);
  const currentNumber = currentValue ? parseInt(currentValue, 10) : 0;
  const newValue = currentNumber + increment;
  await setSetting(key, newValue.toString());
  return newValue;
}
