import type { ScratchEntryView, ScratchPayload } from "../types";
import { openEntry, resealEntry, toEntryView } from "./scratchEntryCodec";
import type { ScratchRepository } from "./scratchPersistence";

export interface EntryGatewayDeps {
  repository: ScratchRepository;
  getKey: () => Promise<CryptoKey>;
  now: () => number;
}

export interface EntryGateway {
  /** Decrypts one entry. The result must never be put into UI state. */
  readPayload(id: string): Promise<ScratchPayload>;
  /** Decrypts, applies `change`, re-encrypts and saves. Returns the new view. */
  edit(id: string, change: (payload: ScratchPayload) => ScratchPayload): Promise<ScratchEntryView>;
  /** Pin state is plaintext metadata, so no decryption is involved. */
  setPinned(id: string, pinned: boolean): Promise<void>;
  /** Pins or unpins several entries in one write. Missing ids are skipped. */
  setPinnedMany(ids: string[], pinned: boolean): Promise<void>;
  /** Stores list positions in one write. Position is plaintext metadata, like pin state. */
  setOrders(changes: { id: string; order: number }[]): Promise<void>;
}

/** Read/modify/write of single stored entries. No UI state lives here. */
export function createEntryGateway({ repository, getKey, now }: EntryGatewayDeps): EntryGateway {
  const findRecord = async (id: string) => {
    const record = await repository.get(id);
    if (!record) throw new Error("Entry not found");
    return record;
  };

  return {
    async readPayload(id) {
      return openEntry(await getKey(), await findRecord(id));
    },

    async edit(id, change) {
      const key = await getKey();
      const record = await findRecord(id);
      const payload = change(await openEntry(key, record));
      const updated = await resealEntry(key, record, payload, now());
      await repository.putMany([updated]);
      return toEntryView(updated, payload);
    },

    async setPinned(id, pinned) {
      await repository.putMany([{ ...(await findRecord(id)), pinned }]);
    },

    async setOrders(changes) {
      const found = await Promise.all(changes.map(({ id }) => repository.get(id)));
      await repository.putMany(
        found.flatMap((record, i) => (record ? [{ ...record, order: changes[i].order }] : [])),
      );
    },

    async setPinnedMany(ids, pinned) {
      const found = await Promise.all(ids.map((id) => repository.get(id)));
      await repository.putMany(
        found.flatMap((record) => (record ? [{ ...record, pinned }] : [])),
      );
    },
  };
}
