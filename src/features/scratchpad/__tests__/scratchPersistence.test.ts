import {
  DexieScratchKeyStore,
  DexieScratchRepository,
  SCRATCH_KEY_ID,
} from "../services/scratchPersistence";
import type { ScratchEntryRecord } from "../types";
import { createFakeScratchDb, newTestKey } from "../testing/inMemory";

const record = (id: string): ScratchEntryRecord => ({
  id,
  v: 1,
  createdAt: 1,
  updatedAt: 1,
  batchIndex: 0,
  iv: new Uint8Array(12),
  ct: new Uint8Array(4),
});

describe("DexieScratchRepository", () => {
  it("lists, gets, stores and removes records", async () => {
    const { db } = createFakeScratchDb();
    const repo = new DexieScratchRepository(db);
    await repo.putMany([record("a"), record("b")]);
    expect((await repo.list()).map((r) => r.id)).toEqual(["a", "b"]);
    expect((await repo.get("a"))?.id).toBe("a");
    expect(await repo.get("missing")).toBeUndefined();
    await repo.remove(["a"]);
    expect((await repo.list()).map((r) => r.id)).toEqual(["b"]);
  });

  it("skips the database for empty batches", async () => {
    const { db } = createFakeScratchDb();
    const repo = new DexieScratchRepository(db);
    await repo.putMany([]);
    await repo.remove([]);
    expect(db.scratchEntries.bulkPut).not.toHaveBeenCalled();
    expect(db.scratchEntries.bulkDelete).not.toHaveBeenCalled();
  });
});

describe("DexieScratchKeyStore", () => {
  it("returns undefined when no key is stored", async () => {
    expect(await new DexieScratchKeyStore(createFakeScratchDb().db).get()).toBeUndefined();
  });

  it("stores a key atomically on first putIfAbsent", async () => {
    const { db, keys } = createFakeScratchDb();
    const store = new DexieScratchKeyStore(db);
    const key = await newTestKey();
    expect(await store.putIfAbsent(key)).toBe(key);
    expect(keys.get(SCRATCH_KEY_ID)?.key).toBe(key);
    expect(db.transaction).toHaveBeenCalledWith("rw", db.scratchKeys, expect.any(Function));
    expect(await store.get()).toBe(key);
  });

  it("keeps the existing key and returns it when another tab won the race", async () => {
    const { db, keys } = createFakeScratchDb();
    const winner = await newTestKey();
    keys.set(SCRATCH_KEY_ID, { id: SCRATCH_KEY_ID, key: winner });
    const store = new DexieScratchKeyStore(db);
    expect(await store.putIfAbsent(await newTestKey())).toBe(winner);
    expect(db.scratchKeys.put).not.toHaveBeenCalled();
  });
});
