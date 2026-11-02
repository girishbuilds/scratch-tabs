import { create } from "zustand";
import type { ScratchListItem } from "../types";
import { getPrimaryCopyText, getSecretValues } from "../services/blockSegmenter";
import { sortEntries } from "../services/entryOrdering";
import { createEntryGateway } from "../services/entryGateway";
import { createPayloads } from "../services/ingestText";
import { markRangeAsSecret, unmarkSecrets } from "../services/payloadEdits";
import {
  openEntry,
  sealEntry,
  toEntryView,
  toUnreadableView,
} from "../services/scratchEntryCodec";
import type { ScratchRepository } from "../services/scratchPersistence";

/** Thrown by anything that would expose plaintext while presenting. */
export class PresentingModeError extends Error {
  constructor() {
    super("Hidden while presenting");
    this.name = "PresentingModeError";
  }
}

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
  /** Search text. Matched against non-secret text only. */
  query: string;
  /** Screen-share mode: nothing can be revealed or shown as plaintext. */
  isPresenting: boolean;

  open: () => Promise<void>;
  close: () => void;
  toggle: () => Promise<void>;
  addFromText: (raw: string) => Promise<void>;
  undoLastAdd: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setQuery: (query: string) => void;
  setPresenting: (presenting: boolean) => void;
  togglePin: (id: string) => Promise<void>;
  /** Unmasks one false positive. */
  markNotSecret: (id: string, secretIndex: number) => Promise<void>;
  /** Masks a range the detectors missed. */
  maskRange: (id: string, start: number, end: number) => Promise<void>;
  /** Decrypts and returns the secret values of an entry. Never stored in state. */
  revealSecrets: (id: string) => Promise<string[]>;
  /** Decrypts one secret to copy it without revealing it. Allowed while presenting. */
  getSecretValue: (id: string, secretIndex: number) => Promise<string>;
  /** Decrypts the whole entry text for select-to-mask. */
  getEditableText: (id: string) => Promise<string>;
  /** Decrypts and returns the text the primary Copy button should copy. */
  getCopyText: (id: string) => Promise<string>;
}

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export function createScratchpadStore(deps: ScratchpadDeps) {
  const { repository, getKey } = deps;
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? (() => crypto.randomUUID());

  const gateway = createEntryGateway({ repository, getKey, now });

  const replaceItem = (item: ScratchListItem) => (state: ScratchpadState) => ({
    items: sortEntries(state.items.map((current) => (current.id === item.id ? item : current))),
  });

  return create<ScratchpadState>((set, get) => {
    const assertNotPresenting = () => {
      if (get().isPresenting) throw new PresentingModeError();
    };

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
        set({ items: sortEntries(items), status: "ready" });
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
      query: "",
      isPresenting: false,

      open: async () => {
        set({ isOpen: true });
        await load();
      },

      close: () => set({ isOpen: false, notice: null, error: null, query: "" }),

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
            items: sortEntries([...views, ...state.items]),
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
        try {
          await repository.remove(notice.addedIds);
          const removed = new Set(notice.addedIds);
          set((state) => ({
            items: state.items.filter((item) => !removed.has(item.id)),
            notice: null,
            error: null,
          }));
        } catch (error) {
          set({ error: errorMessage(error, "Could not undo") });
        }
      },

      remove: async (id) => {
        try {
          await repository.remove([id]);
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
            notice: null,
            error: null,
          }));
        } catch (error) {
          set({ error: errorMessage(error, "Could not delete the entry") });
        }
      },

      clearAll: async () => {
        try {
          await repository.clear();
          set({ items: [], notice: null, error: null });
        } catch (error) {
          set({ error: errorMessage(error, "Could not delete the entries") });
        }
      },

      setQuery: (query) => set({ query }),

      setPresenting: (isPresenting) => set({ isPresenting }),

      togglePin: async (id) => {
        const item = get().items.find((candidate) => candidate.id === id);
        if (!item) return;
        const pinned = !item.pinned;
        try {
          await gateway.setPinned(id, pinned);
          set(replaceItem({ ...item, pinned }));
        } catch (error) {
          set({ error: errorMessage(error, "Could not update the entry") });
        }
      },

      markNotSecret: async (id, secretIndex) => {
        const view = await gateway.edit(id, (payload) => unmarkSecrets(payload, [secretIndex]));
        set(replaceItem(view));
      },

      maskRange: async (id, start, end) => {
        assertNotPresenting();
        const view = await gateway.edit(id, (payload) => markRangeAsSecret(payload, { start, end }));
        set(replaceItem(view));
      },

      revealSecrets: async (id) => {
        assertNotPresenting();
        return getSecretValues(await gateway.readPayload(id));
      },

      getSecretValue: async (id, secretIndex) => {
        const value = getSecretValues(await gateway.readPayload(id))[secretIndex];
        if (value === undefined) throw new Error("Secret not found");
        return value;
      },

      getEditableText: async (id) => {
        assertNotPresenting();
        return (await gateway.readPayload(id)).text;
      },

      getCopyText: async (id) => getPrimaryCopyText(await gateway.readPayload(id)),
    };
  });
}
