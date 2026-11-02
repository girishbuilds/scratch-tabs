import { createFakeScratchDb, FIXTURES } from "../testing/inMemory";

const fake = createFakeScratchDb();
jest.mock("../../../db", () => ({ db: fake.db }));

describe("default Scratch wiring", () => {
  beforeAll(() => {
    // jsdom's crypto has no randomUUID; browsers (secure contexts) do.
    if (typeof crypto.randomUUID !== "function") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { randomUUID } = require("crypto");
      Object.defineProperty(crypto, "randomUUID", { value: randomUUID, configurable: true });
    }
  });

  it("persists encrypted entries and the key through the shared database", async () => {
    // Required after the mock is registered so the default services bind to it.
    const { useScratchpadStore } = await import("../stores/useScratchpadStore");

    await useScratchpadStore.getState().addFromText(FIXTURES.uatKeyLine);

    expect(useScratchpadStore.getState().error).toBeNull();
    expect(fake.keys.get("primary")?.key.extractable).toBe(false);
    expect(fake.entries.size).toBe(1);
    const [record] = [...fake.entries.values()];
    expect(record.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(record.createdAt).toBeGreaterThan(0);
    expect(JSON.stringify([...record.ct])).not.toContain(FIXTURES.uatKeyValue);

    expect(await useScratchpadStore.getState().revealSecrets(record.id)).toEqual([
      FIXTURES.uatKeyValue,
    ]);
  });

  it("reuses one key across calls", async () => {
    const { defaultKeyProvider } = await import("../services/defaultScratchServices");
    expect(await defaultKeyProvider.getKey()).toBe(await defaultKeyProvider.getKey());
    expect(fake.db.scratchKeys.put).toHaveBeenCalledTimes(1);
  });
});
