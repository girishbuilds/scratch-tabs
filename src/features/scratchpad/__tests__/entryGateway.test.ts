import { buildPayload } from "../services/blockSegmenter";
import { createEntryGateway } from "../services/entryGateway";
import { openEntry, sealEntry } from "../services/scratchEntryCodec";
import { InMemoryScratchRepository, newTestKey } from "../testing/inMemory";

async function setup() {
  const repository = new InMemoryScratchRepository();
  const key = await newTestKey();
  const gateway = createEntryGateway({ repository, getKey: async () => key, now: () => 5000 });
  const original = buildPayload("Prod-Key: abc", [{ start: 10, end: 13 }]);
  await repository.putMany([await sealEntry(key, { id: "e1", createdAt: 1000, batchIndex: 3 }, original)]);
  return { repository, key, gateway, original };
}

describe("entryGateway", () => {
  describe("readPayload", () => {
    it("decrypts an entry", async () => {
      const { gateway, original } = await setup();
      expect(await gateway.readPayload("e1")).toEqual(original);
    });

    it("rejects for an unknown entry", async () => {
      const { gateway } = await setup();
      await expect(gateway.readPayload("nope")).rejects.toThrow("Entry not found");
    });
  });

  describe("edit", () => {
    it("re-encrypts the changed payload and returns its view", async () => {
      const { gateway, repository, key } = await setup();
      const view = await gateway.edit("e1", (p) => buildPayload(p.text, []));
      expect(view).toMatchObject({ id: "e1", kind: "note", secretCount: 0, createdAt: 1000, batchIndex: 3 });
      const stored = await repository.get("e1");
      expect(stored?.updatedAt).toBe(5000);
      expect((await openEntry(key, stored!)).secrets).toEqual([]);
    });

    it("saves nothing if the change throws", async () => {
      const { gateway, repository, key } = await setup();
      const before = await repository.get("e1");
      await expect(
        gateway.edit("e1", () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
      expect(await repository.get("e1")).toBe(before);
      expect((await openEntry(key, before!)).secrets).toHaveLength(1);
    });

    it("rejects for an unknown entry", async () => {
      const { gateway } = await setup();
      await expect(gateway.edit("nope", (p) => p)).rejects.toThrow("Entry not found");
    });
  });

  describe("setPinned", () => {
    it("changes only the plaintext pin flag, not the ciphertext", async () => {
      const { gateway, repository } = await setup();
      const before = await repository.get("e1");
      await gateway.setPinned("e1", true);
      const after = await repository.get("e1");
      expect(after).toMatchObject({ pinned: true });
      expect(after?.ct).toBe(before?.ct);
      expect(after?.iv).toBe(before?.iv);
    });

    it("rejects for an unknown entry", async () => {
      const { gateway } = await setup();
      await expect(gateway.setPinned("nope", true)).rejects.toThrow("Entry not found");
    });
  });

  describe("setPinnedMany", () => {
    async function withSecond() {
      const ctx = await setup();
      await ctx.repository.putMany([
        await sealEntry(ctx.key, { id: "e2", createdAt: 2000, batchIndex: 0 }, buildPayload("hello", [])),
      ]);
      return ctx;
    }

    it("pins several entries in one write without touching ciphertext", async () => {
      const { gateway, repository } = await withSecond();
      const put = jest.spyOn(repository, "putMany");
      const before = await repository.get("e1");
      await gateway.setPinnedMany(["e1", "e2"], true);
      expect(put).toHaveBeenCalledTimes(1);
      expect((await repository.get("e1"))?.pinned).toBe(true);
      expect((await repository.get("e2"))?.pinned).toBe(true);
      expect((await repository.get("e1"))?.ct).toBe(before?.ct);
    });

    it("unpins", async () => {
      const { gateway, repository } = await withSecond();
      await gateway.setPinnedMany(["e1", "e2"], true);
      await gateway.setPinnedMany(["e1"], false);
      expect((await repository.get("e1"))?.pinned).toBe(false);
      expect((await repository.get("e2"))?.pinned).toBe(true);
    });

    it("skips ids that no longer exist", async () => {
      const { gateway, repository } = await withSecond();
      await gateway.setPinnedMany(["e1", "gone"], true);
      expect((await repository.get("e1"))?.pinned).toBe(true);
      expect(repository.records.has("gone")).toBe(false);
    });
  });

  describe("setOrders", () => {
    async function withSecond() {
      const ctx = await setup();
      await ctx.repository.putMany([
        await sealEntry(ctx.key, { id: "e2", createdAt: 2000, batchIndex: 0 }, buildPayload("hello", [])),
      ]);
      return ctx;
    }

    it("stores positions in one write without touching ciphertext or pin state", async () => {
      const { gateway, repository } = await withSecond();
      await gateway.setPinned("e1", true);
      const put = jest.spyOn(repository, "putMany");
      const before = await repository.get("e1");
      await gateway.setOrders([{ id: "e1", order: 1 }, { id: "e2", order: 0 }]);
      expect(put).toHaveBeenCalledTimes(1);
      expect(await repository.get("e1")).toMatchObject({ order: 1, pinned: true });
      expect((await repository.get("e2"))?.order).toBe(0);
      expect((await repository.get("e1"))?.ct).toBe(before?.ct);
    });

    it("skips ids that no longer exist", async () => {
      const { gateway, repository } = await withSecond();
      await gateway.setOrders([{ id: "gone", order: 0 }, { id: "e2", order: 1 }]);
      expect(repository.records.has("gone")).toBe(false);
      expect((await repository.get("e2"))?.order).toBe(1);
    });

    it("survives a later text edit", async () => {
      const { gateway, repository } = await withSecond();
      await gateway.setOrders([{ id: "e1", order: 4 }]);
      await gateway.edit("e1", (p) => buildPayload(`${p.text} more`, []));
      expect((await repository.get("e1"))?.order).toBe(4);
    });
  });
});
