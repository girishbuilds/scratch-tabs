import type { ScratchEntryRecord, ScratchKeyRecord } from "../types";
import type { ScratchDb, ScratchRepository } from "../services/scratchPersistence";

/** Test double for the Dexie-backed repository. */
export class InMemoryScratchRepository implements ScratchRepository {
  readonly records = new Map<string, ScratchEntryRecord>();

  async list(): Promise<ScratchEntryRecord[]> {
    return [...this.records.values()];
  }
  async get(id: string): Promise<ScratchEntryRecord | undefined> {
    return this.records.get(id);
  }
  async putMany(records: ScratchEntryRecord[]): Promise<void> {
    records.forEach((r) => this.records.set(r.id, r));
  }
  async remove(ids: string[]): Promise<void> {
    ids.forEach((id) => this.records.delete(id));
  }
  async clear(): Promise<void> {
    this.records.clear();
  }
}

export const newTestKey = (): Promise<CryptoKey> =>
  crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);

/** Deterministic ids and clock for store tests. */
export function sequentialIds(prefix = "id"): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

/** Random keyboard-mash fixtures; none of these are real credentials. */
export const FIXTURES = {
  uatKeyLine: "UAT key: 3knd8dsuhds89hds-ds8hdshds-ds98hds",
  uatKeyValue: "3knd8dsuhds89hds-ds8hdshds-ds98hds",
  prodKeyLine: "Prod-Key: 8d8sd89hsdh8-sdc0shc-sdcsdc-cdsc",
  prodKeyValue: "8d8sd89hsdh8-sdc0shc-sdcsdc-cdsc",
  mvn: "mvn -B -ntp -fae -T 1C clean verify",
  url: "https://live.browserstack.com/dashboard#os=OS+X&os_version=lion&browser=Firefox&browser_version=12.0&scale_to_fit=true&url=www.google.com&resolution=1920x1080&speed=1&start=true",
  curl: [
    "curl -X POST \\",
    '  "https://api.example.com/data" \\',
    '  -H "Content-Type: application/json" \\',
    '  -H "Authorization: Bearer your-token-here" \\',
    `  -d '{"key1":"value1", "key2":"value2"}'`,
  ].join("\n"),
  todo: "TODO: Make allow list include notes header",
} as const;

/** In-memory stand-in for the Dexie tables used by this feature. */
export function createFakeScratchDb() {
  const entries = new Map<string, ScratchEntryRecord>();
  const keys = new Map<string, ScratchKeyRecord>();
  const db: ScratchDb = {
    scratchEntries: {
      toArray: jest.fn(async () => [...entries.values()]),
      get: jest.fn(async (id: string) => entries.get(id)),
      bulkPut: jest.fn(async (rs: ScratchEntryRecord[]) => rs.forEach((r) => entries.set(r.id, r))),
      bulkDelete: jest.fn(async (ids: string[]) => ids.forEach((id) => entries.delete(id))),
      clear: jest.fn(async () => entries.clear()),
    },
    scratchKeys: {
      get: jest.fn(async (id: string) => keys.get(id)),
      put: jest.fn(async (r: ScratchKeyRecord) => keys.set(r.id, r)),
    },
    transaction: jest.fn(async (_mode, _table, scope) => scope()),
  };
  return { db, entries, keys };
}
