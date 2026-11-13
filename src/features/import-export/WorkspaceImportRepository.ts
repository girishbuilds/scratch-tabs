import { normalizeSplitViewTabLists } from "../../utils/splitViewUtils";
import { db, type StorageProvider } from "../../db";
import type { SplitViewRecord, Tab } from "../../types";
import type { ExistingImportIds, WorkspaceImportPlan } from "./importPlanner";

const toTabRecord = (tab: Tab) => ({
  ...tab,
  content: tab.content || "",
  richContent: tab.richContent ? JSON.stringify(tab.richContent) : undefined,
  dateCreated: tab.dateCreated || Date.now(),
  lastModified: tab.lastModified || Date.now(),
});

const toSplitViewRecord = (
  splitView: WorkspaceImportPlan["splitViews"][number],
): SplitViewRecord =>
  normalizeSplitViewTabLists({
    ...splitView,
    lastModified: Date.now(),
    leftTabHistory: splitView.leftTabHistory || [],
    rightTabHistory: splitView.rightTabHistory || [],
  }).value;

export interface WorkspaceImportRepositoryContract {
  readExistingIds(): Promise<ExistingImportIds>;
  save(plan: WorkspaceImportPlan): Promise<void>;
}

export class WorkspaceImportRepository implements WorkspaceImportRepositoryContract {
  constructor(private readonly storage: StorageProvider) {}

  async readExistingIds(): Promise<ExistingImportIds> {
    const [workspaces, tabs, splitViews, documents, assets] = await Promise.all(
      [
        this.storage.getWorkspaces(),
        this.storage.getTabs(),
        db.splitView.toArray(),
        db.canvasDocuments.toArray(),
        db.canvasAssets.toArray(),
      ],
    );
    return {
      workspaceIds: new Set(workspaces.map((workspace) => workspace.id)),
      // Canvas documents from older builds could outlive a deleted workspace.
      // Reserve their tab IDs too so an import cannot create a second document
      // with the same tabId and make Canvas lookup return the orphan first.
      tabIds: new Set([
        ...tabs.map((tab) => tab.id),
        ...documents.map((document) => document.tabId),
      ]),
      splitViewIds: new Set(splitViews.map((splitView) => splitView.id)),
      canvasDocumentIds: new Set(documents.map((document) => document.id)),
      canvasAssetIds: new Set(assets.map((asset) => asset.id)),
      maxDisplayOrder: workspaces.reduce(
        (maximum, workspace) => Math.max(maximum, workspace.displayOrder ?? 0),
        0,
      ),
    };
  }

  async save(plan: WorkspaceImportPlan): Promise<void> {
    await db.transaction(
      "rw",
      db.workspaces,
      db.tabs,
      db.splitView,
      db.canvasDocuments,
      db.canvasAssets,
      async () => {
        if (plan.workspaces.length > 0) {
          await db.workspaces.bulkPut(plan.workspaces);
        }
        if (plan.tabs.length > 0) {
          await db.tabs.bulkPut(plan.tabs.map(toTabRecord));
        }
        if (plan.splitViews.length > 0) {
          await db.splitView.bulkPut(plan.splitViews.map(toSplitViewRecord));
        }
        if (plan.canvasDocuments.length > 0) {
          await db.canvasDocuments.bulkPut(plan.canvasDocuments);
        }
        if (plan.canvasAssets.length > 0) {
          await db.canvasAssets.bulkPut(plan.canvasAssets);
        }
      },
    );
  }
}
