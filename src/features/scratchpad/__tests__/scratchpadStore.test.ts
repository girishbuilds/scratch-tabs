import { createScratchpadStore } from "../stores/scratchpadStore";
import {
  FIXTURES,
  InMemoryScratchRepository,
  newTestKey,
  sequentialIds,
} from "../testing/inMemory";
import { MAX_SCRATCH_INPUT_CHARS } from "../services/ingestText";
import type { ScratchEntryView } from "../types";

async function setup(options: { getKey?: () => Promise<CryptoKey>; start?: number } = {}) {
  const repository = new InMemoryScratchRepository();
  const key = await newTestKey();
  let time = options.start ?? 1000;
  const store = createScratchpadStore({
    repository,
    getKey: options.getKey ?? (async () => key),
    now: () => time++,
    newId: sequentialIds(),
  });
  return { store, repository, key, state: () => store.getState() };
}

const PASTE = `${FIXTURES.uatKeyLine}\n${FIXTURES.prodKeyLine}\n\n${FIXTURES.mvn}`;

describe("scratchpadStore", () => {
  describe("open / close / toggle", () => {
    it("starts closed and idle", async () => {
      const { state } = await setup();
      expect(state()).toMatchObject({ isOpen: false, status: "idle", items: [], notice: null, error: null });
    });

    it("loads entries when opened", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.mvn);
      await state().open();
      expect(state().isOpen).toBe(true);
      expect(state().status).toBe("ready");
      expect(state().items).toHaveLength(1);
    });

    it("reloads from storage each time it opens", async () => {
      const { state, repository, key } = await setup();
      await state().open();
      const { sealEntry } = await import("../services/scratchEntryCodec");
      const { buildPayload } = await import("../services/blockSegmenter");
      await repository.putMany([
        await sealEntry(key, { id: "from-other-tab", createdAt: 5, batchIndex: 0 }, buildPayload("hello", [])),
      ]);
      state().close();
      await state().open();
      expect(state().items.map((i) => i.id)).toContain("from-other-tab");
    });

    it("clears the notice and error on close", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.mvn);
      expect(state().notice).not.toBeNull();
      state().close();
      expect(state().isOpen).toBe(false);
      expect(state().notice).toBeNull();
    });

    it("toggles open and closed", async () => {
      const { state } = await setup();
      await state().toggle();
      expect(state().isOpen).toBe(true);
      await state().toggle();
      expect(state().isOpen).toBe(false);
    });

    it("reports an error status if the key cannot be obtained", async () => {
      const { state } = await setup({ getKey: async () => { throw new Error("no idb"); } });
      await state().open();
      expect(state()).toMatchObject({ status: "error", error: "no idb" });
    });

    it("falls back to a generic message for non-Error failures", async () => {
      const { state } = await setup({ getKey: () => Promise.reject("nope") });
      await state().open();
      expect(state().error).toBe("Could not load Scratch");
    });
  });

  describe("addFromText", () => {
    it("splits a paste into entries, newest paste first and block order preserved", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(PASTE);
      const kinds = state().items.map((i) => i.kind);
      expect(kinds).toEqual(["secret", "secret", "command", "note"]);
    });

    it("reports how many entries were added and masked", async () => {
      const { state } = await setup();
      await state().addFromText(PASTE);
      expect(state().notice).toEqual({ addedIds: ["id-1", "id-2", "id-3"], maskedCount: 2 });
    });

    it("stores only ciphertext", async () => {
      const { state, repository } = await setup();
      await state().addFromText(PASTE);
      const stored = JSON.stringify([...repository.records.values()].map((r) => [...r.ct]));
      expect(repository.records.size).toBe(3);
      expect(stored).not.toContain(FIXTURES.uatKeyValue);
      for (const record of repository.records.values()) {
        expect(record).not.toHaveProperty("text");
      }
    });

    it("keeps secret values out of state", async () => {
      const { state } = await setup();
      await state().addFromText(PASTE);
      const serialised = JSON.stringify(state().items);
      expect(serialised).not.toContain(FIXTURES.uatKeyValue);
      expect(serialised).not.toContain(FIXTURES.prodKeyValue);
      expect(serialised).toContain("UAT key: ");
    });

    it("ignores blank input", async () => {
      const { state, repository } = await setup();
      await state().addFromText("  \n ");
      expect(repository.records.size).toBe(0);
      expect(state().notice).toBeNull();
    });

    it("surfaces an error for oversized input and saves nothing", async () => {
      const { state, repository } = await setup();
      await state().addFromText("x".repeat(MAX_SCRATCH_INPUT_CHARS + 1));
      expect(state().error).toMatch(/too large/i);
      expect(repository.records.size).toBe(0);
    });

    it("surfaces an error if saving fails", async () => {
      const { state, repository } = await setup();
      jest.spyOn(repository, "putMany").mockRejectedValueOnce(new Error("quota exceeded"));
      await state().addFromText(FIXTURES.mvn);
      expect(state().error).toBe("quota exceeded");
      expect(state().items).toHaveLength(0);
    });

    it("clears a previous error after a successful add", async () => {
      const { state } = await setup();
      await state().addFromText("x".repeat(MAX_SCRATCH_INPUT_CHARS + 1));
      await state().addFromText(FIXTURES.mvn);
      expect(state().error).toBeNull();
    });
  });

  describe("undoLastAdd", () => {
    it("removes exactly the entries from the last paste", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(PASTE);
      await state().undoLastAdd();
      expect(state().items).toHaveLength(1);
      expect(repository.records.size).toBe(1);
      expect(state().notice).toBeNull();
    });

    it("does nothing without a notice", async () => {
      const { state, repository } = await setup();
      const remove = jest.spyOn(repository, "remove");
      await state().undoLastAdd();
      expect(remove).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("deletes an entry from storage and state and clears the notice", async () => {
      const { state, repository } = await setup();
      await state().addFromText(PASTE);
      await state().remove("id-1");
      expect(state().items.map((i) => i.id)).not.toContain("id-1");
      expect(repository.records.has("id-1")).toBe(false);
      expect(state().notice).toBeNull();
    });
  });

  describe("revealSecrets / getCopyText", () => {
    it("decrypts secret values on demand", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      expect(await state().revealSecrets("id-1")).toEqual([FIXTURES.uatKeyValue]);
    });

    it("returns no secrets for a plain entry", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.mvn);
      expect(await state().revealSecrets("id-1")).toEqual([]);
    });

    it("copies just the value for a labelled secret and the whole text otherwise", async () => {
      const { state } = await setup();
      await state().addFromText(`${FIXTURES.uatKeyLine}\n\n${FIXTURES.mvn}`);
      expect(await state().getCopyText("id-1")).toBe(FIXTURES.uatKeyValue);
      expect(await state().getCopyText("id-2")).toBe(FIXTURES.mvn);
    });

    it("rejects for an unknown entry", async () => {
      const { state } = await setup();
      await expect(state().revealSecrets("nope")).rejects.toThrow("Entry not found");
      await expect(state().getCopyText("nope")).rejects.toThrow("Entry not found");
    });
  });

  describe("unreadable entries", () => {
    it("shows entries encrypted with a different key as unreadable, not as an error", async () => {
      const repository = new InMemoryScratchRepository();
      const first = createScratchpadStore({ repository, getKey: async () => newTestKey(), newId: sequentialIds("a") });
      await first.getState().addFromText(FIXTURES.mvn);

      const second = createScratchpadStore({ repository, getKey: async () => newTestKey() });
      await second.getState().open();
      expect(second.getState().status).toBe("ready");
      expect(second.getState().items.map((i) => i.kind)).toEqual(["unreadable"]);
    });

    it("keeps readable entries alongside unreadable ones", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      const { sealEntry } = await import("../services/scratchEntryCodec");
      const { buildPayload } = await import("../services/blockSegmenter");
      await repository.putMany([
        await sealEntry(await newTestKey(), { id: "bad", createdAt: 1, batchIndex: 0 }, buildPayload("x", [])),
      ]);
      await state().open();
      const kinds = state().items.map((i) => i.kind).sort();
      expect(kinds).toEqual(["command", "unreadable"]);
      expect((state().items.find((i) => i.kind === "command") as ScratchEntryView).secretCount).toBe(0);
    });
  });
});
