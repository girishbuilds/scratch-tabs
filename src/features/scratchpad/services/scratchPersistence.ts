import type { ScratchEntryRecord, ScratchKeyRecord } from "../types";
import type { ScratchKeyStore } from "./scratchCrypto";

export interface ScratchRepository {
  list(): Promise<ScratchEntryRecord[]>;
  get(id: string): Promise<ScratchEntryRecord | undefined>;
  putMany(records: ScratchEntryRecord[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
}

/** The slice of the Dexie database this feature needs (keeps it testable). */
export interface ScratchDb {
  scratchEntries: {
    toArray(): Promise<ScratchEntryRecord[]>;
    get(id: string): Promise<ScratchEntryRecord | undefined>;
    bulkPut(records: ScratchEntryRecord[]): Promise<unknown>;
    bulkDelete(ids: string[]): Promise<void>;
  };
  scratchKeys: {
    get(id: string): Promise<ScratchKeyRecord | undefined>;
    put(record: ScratchKeyRecord): Promise<unknown>;
  };
  transaction<T>(
    mode: "rw",
    tables: ScratchDb["scratchKeys"],
    scope: () => Promise<T>,
  ): Promise<T>;
}

export const SCRATCH_KEY_ID = "primary";

export class DexieScratchRepository implements ScratchRepository {
  constructor(private readonly db: ScratchDb) {}

  list(): Promise<ScratchEntryRecord[]> {
    return this.db.scratchEntries.toArray();
  }

  get(id: string): Promise<ScratchEntryRecord | undefined> {
    return this.db.scratchEntries.get(id);
  }

  async putMany(records: ScratchEntryRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.db.scratchEntries.bulkPut(records);
  }

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.scratchEntries.bulkDelete(ids);
  }
}

export class DexieScratchKeyStore implements ScratchKeyStore {
  constructor(private readonly db: ScratchDb) {}

  async get(): Promise<CryptoKey | undefined> {
    return (await this.db.scratchKeys.get(SCRATCH_KEY_ID))?.key;
  }

  /**
   * Single read-write transaction so concurrent browser tabs agree on one key.
   * Only Dexie promises are awaited inside the scope.
   */
  putIfAbsent(key: CryptoKey): Promise<CryptoKey> {
    return this.db.transaction("rw", this.db.scratchKeys, async () => {
      const existing = await this.db.scratchKeys.get(SCRATCH_KEY_ID);
      if (existing) return existing.key;
      await this.db.scratchKeys.put({ id: SCRATCH_KEY_ID, key });
      return key;
    });
  }
}
