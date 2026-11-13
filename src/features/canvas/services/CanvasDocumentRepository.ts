import { db } from "../../../db";
import type { Tab } from "../../../types";
import { getTabContentKind } from "../../../utils/tabContentKind";
import type {
  CanvasDocument,
  CanvasSessionRecord,
} from "../types";
import {
  createEmptyCanvasDocument,
  parseCanvasDocument,
  parseCanvasSession,
} from "../utils/canvasSchemas";
import {
  assertCanvasRevision,
  createCanvasTakeOverDocument,
} from "./CanvasRevisionConflict";

export interface CanvasDocumentSaveOptions {
  expectedRevision: number;
  updateParentTabModified?: boolean;
}

export interface CanvasDocumentRepositoryContract {
  createWithTab(tab: Tab): Promise<CanvasDocument>;
  getByTabId(tabId: string): Promise<CanvasDocument | undefined>;
  hasContent(tabId: string): Promise<boolean>;
  saveDocument(
    document: CanvasDocument,
    options: CanvasDocumentSaveOptions,
  ): Promise<void>;
  takeOverDocument(
    document: CanvasDocument,
    updateParentTabModified?: boolean,
  ): Promise<CanvasDocument>;
  getSession(tabId: string): Promise<CanvasSessionRecord | undefined>;
  saveSession(session: CanvasSessionRecord): Promise<void>;
  removeWithTab(tab: Tab): Promise<void>;
}

const toPersistedCanvasTab = (tab: Tab) => ({
  id: tab.id,
  title: tab.title,
  content: "",
  language: tab.language,
  languageLocked: tab.languageLocked,
  isTablet: false,
  isRich: false,
  contentKind: tab.contentKind,
  documentId: tab.documentId,
  lastModified: tab.lastModified,
  lastAccessed: tab.lastAccessed,
  dateCreated: tab.dateCreated,
  workspaceId: tab.workspaceId,
  cursorPosition: tab.cursorPosition,
  isPinned: tab.isPinned,
});

export class CanvasDocumentRepository
  implements CanvasDocumentRepositoryContract
{
  async createWithTab(tab: Tab): Promise<CanvasDocument> {
    if (getTabContentKind(tab) !== "canvas" || !tab.documentId) {
      throw new Error("Cannot create a Canvas document for a non-Canvas tab");
    }

    const document = createEmptyCanvasDocument({
      id: tab.documentId,
      tabId: tab.id,
      workspaceId: tab.workspaceId,
      now: tab.dateCreated,
    });

    await db.transaction("rw", db.tabs, db.canvasDocuments, async () => {
      await db.tabs.add(toPersistedCanvasTab(tab));
      await db.canvasDocuments.add(document);
    });

    return document;
  }

  async getByTabId(tabId: string): Promise<CanvasDocument | undefined> {
    const record = await db.canvasDocuments.where("tabId").equals(tabId).first();
    return record ? parseCanvasDocument(record) : undefined;
  }

  async hasContent(tabId: string): Promise<boolean> {
    const record = await db.canvasDocuments.where("tabId").equals(tabId).first();
    return record ? parseCanvasDocument(record).items.length > 0 : false;
  }

  async saveDocument(
    document: CanvasDocument,
    options: CanvasDocumentSaveOptions,
  ): Promise<void> {
    const parsedDocument = parseCanvasDocument(document);
    const tables = options.updateParentTabModified
      ? [db.canvasDocuments, db.tabs]
      : [db.canvasDocuments];
    await db.transaction("rw", tables, async () => {
      const stored = await db.canvasDocuments.get(parsedDocument.id);
      assertCanvasRevision(stored, parsedDocument, options.expectedRevision);
      await db.canvasDocuments.put(parsedDocument);
      if (options.updateParentTabModified) {
        await db.tabs.update(parsedDocument.tabId, {
          lastModified: parsedDocument.updatedAt,
        });
      }
    });
  }

  async takeOverDocument(
    document: CanvasDocument,
    updateParentTabModified = false,
  ): Promise<CanvasDocument> {
    let savedDocument: CanvasDocument | undefined;
    const tables = updateParentTabModified
      ? [db.canvasDocuments, db.tabs]
      : [db.canvasDocuments];
    await db.transaction("rw", tables, async () => {
      const stored = await db.canvasDocuments.get(document.id);
      if (!stored) {
        throw new Error(`Canvas document ${document.id} no longer exists`);
      }
      savedDocument = parseCanvasDocument(
        createCanvasTakeOverDocument(document, parseCanvasDocument(stored)),
      );
      await db.canvasDocuments.put(savedDocument);
      if (updateParentTabModified) {
        await db.tabs.update(savedDocument.tabId, {
          lastModified: savedDocument.updatedAt,
        });
      }
    });
    if (!savedDocument) {
      throw new Error("Canvas take-over transaction did not complete");
    }
    return savedDocument;
  }

  async getSession(tabId: string): Promise<CanvasSessionRecord | undefined> {
    const record = await db.canvasSessions.get(tabId);
    return record ? parseCanvasSession(record) : undefined;
  }

  async saveSession(session: CanvasSessionRecord): Promise<void> {
    const parsedSession = parseCanvasSession(session);
    // A session is only meaningful while its document exists. Pending session saves can
    // flush after the document was deleted with its workspace; skip them instead of
    // re-creating an orphan row.
    await db.transaction("rw", db.canvasDocuments, db.canvasSessions, async () => {
      const document = await db.canvasDocuments
        .where("tabId")
        .equals(parsedSession.tabId)
        .first();
      if (document) {
        await db.canvasSessions.put(parsedSession);
      }
    });
  }

  async removeWithTab(tab: Tab): Promise<void> {
    if (getTabContentKind(tab) !== "canvas" || !tab.documentId) {
      throw new Error("Cannot remove a Canvas document for a non-Canvas tab");
    }

    await db.transaction(
      "rw",
      db.tabs,
      db.canvasDocuments,
      db.canvasSessions,
      async () => {
        await db.tabs.delete(tab.id);
        await db.canvasDocuments.delete(tab.documentId!);
        await db.canvasSessions.delete(tab.id);
      },
    );
  }
}

export const canvasDocumentRepository = new CanvasDocumentRepository();
