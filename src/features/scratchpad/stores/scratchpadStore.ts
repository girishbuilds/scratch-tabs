import { create } from "zustand";
import type { ScratchListItem } from "../types";
import { getPrimaryCopyText, getSecretValues } from "../services/blockSegmenter";
import { createPayloads } from "../services/ingestText";
import {
  openEntry,
  sealEntry,
  toEntryView,
  toUnreadableView,
} from "../services/scratchEntryCodec";
import type { ScratchRepository } from "../services/scratchPersistence";
import type { ScratchEntryRecord } from "../types";

export interface ScratchpadDeps {
  repository: ScratchRepository;
  getKey: () => Promise<CryptoKey>;
  now?: () => number;
  newId?: () => string;
}

export interface ScratchNotice {
  addedIds: string[];
  maskedCount: number;
}

export type ScratchStatus = "idle" | "loading" | "ready" | "error";

export interface ScratchpadState {
  isOpen: boolean;
  status: ScratchStatus;
  items: ScratchListItem[];
  notice: ScratchNotice | null;
  error: string | null;

  open: () => Promise<void>;
  close: () => void;
  toggle: () => Promise<void>;
  addFromText: (raw: string) => Promise<void>;
  undoLastAdd: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Decrypts and returns the secret values of an entry. Never stored in state. */
  revealSecrets: (id: string) => Promise<string[]>;
  /** Decrypts and returns the text the primary Copy button should copy. */
  getCopyText: (id: string) => Promise<string>;
}

const byNewestThenBlockOrder = (a: ScratchListItem, b: ScratchListItem) =>
  b.createdAt - a.createdAt || a.batchIndex - b.batchIndex;

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export function createScratchpadStore(deps: ScratchpadDeps) {
  const { repository, getKey } = deps;
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? (() => crypto.randomUUID());

  const findRecord = async (id: string): Promise<ScratchEntryRecord> => {
    const record = await repository.get(id);
    if (!record) throw new Error("Entry not found");
    return record;
  };

  return create<ScratchpadState>((set, get) => {
    const load = async () => {
      set({ status: "loading", error: null });
      try {
        const key = await getKey();
        const records = await repository.list();
        const items = await Promise.all(
          records.map(async (record): Promise<ScratchListItem> => {
            try {
              return toEntryView(record, await openEntry(key, record));
            } catch {
              return toUnreadableView(record);
            }
          }),
        );
        set({ items: items.sort(byNewestThenBlockOrder), status: "ready" });
      } catch (error) {
        set({ status: "error", error: errorMessage(error, "Could not load Scratch") });
      }
    };

    return {
      isOpen: false,
      status: "idle",
      items: [],
      notice: null,
      error: null,

      open: async () => {
        set({ isOpen: true });
        await load();
      },

      close: () => set({ isOpen: false, notice: null, error: null }),

      toggle: async () => {
        if (get().isOpen) get().close();
        else await get().open();
      },

      addFromText: async (raw) => {
        try {
          const payloads = createPayloads(raw);
          if (payloads.length === 0) return;
          const key = await getKey();
          const createdAt = now();
          const records = await Promise.all(
            payloads.map((payload, batchIndex) =>
              sealEntry(key, { id: newId(), createdAt, batchIndex }, payload),
            ),
          );
          await repository.putMany(records);
          const views = records.map((record, i) => toEntryView(record, payloads[i]));
          set((state) => ({
            items: [...views, ...state.items].sort(byNewestThenBlockOrder),
            notice: {
              addedIds: records.map((r) => r.id),
              maskedCount: payloads.filter((p) => p.secrets.length > 0).length,
            },
            error: null,
          }));
        } catch (error) {
          set({ error: errorMessage(error, "Could not save to Scratch") });
        }
      },

      undoLastAdd: async () => {
        const notice = get().notice;
        if (!notice) return;
        await repository.remove(notice.addedIds);
        const removed = new Set(notice.addedIds);
        set((state) => ({
          items: state.items.filter((item) => !removed.has(item.id)),
          notice: null,
        }));
      },

      remove: async (id) => {
        await repository.remove([id]);
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          notice: null,
        }));
      },

      revealSecrets: async (id) => {
        const payload = await openEntry(await getKey(), await findRecord(id));
        return getSecretValues(payload);
      },

      getCopyText: async (id) => {
        const payload = await openEntry(await getKey(), await findRecord(id));
        return getPrimaryCopyText(payload);
      },
    };
  });
}
