import { PresentingModeError, createScratchpadStore } from "../stores/scratchpadStore";
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

/** One entry (an indented line continues the previous one) holding two secrets. */
const TWO_SECRETS = `${FIXTURES.uatKeyLine}\n  ${FIXTURES.prodKeyLine}`;
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

  describe("storage failures", () => {
    const disk = () => new Error("disk full");

    it("surfaces an error and keeps the entry when delete fails", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "remove").mockRejectedValueOnce(disk());
      await state().remove(state().items[0].id);
      expect(state().error).toBe("disk full");
      expect(state().items).toHaveLength(1);
    });

    it("surfaces an error and keeps the notice when undo fails", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "remove").mockRejectedValueOnce(disk());
      await state().undoLastAdd();
      expect(state().error).toBe("disk full");
      expect(state().items).toHaveLength(1);
      expect(state().notice).not.toBeNull();
    });

    it("surfaces an error and keeps the entries when clear all fails", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "clear").mockRejectedValueOnce(disk());
      await state().clearAll();
      expect(state().error).toBe("disk full");
      expect(state().items).toHaveLength(1);
    });

    it("surfaces an error and leaves the pin unchanged when pinning fails", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "putMany").mockRejectedValueOnce(disk());
      await state().togglePin(state().items[0].id);
      expect(state().error).toBe("disk full");
      expect(state().items[0].pinned).toBe(false);
    });

    it("clears the error after a later successful delete", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      const id = state().items[0].id;
      jest.spyOn(repository, "remove").mockRejectedValueOnce(disk());
      await state().remove(id);
      await state().remove(id);
      expect(state().error).toBeNull();
      expect(state().items).toHaveLength(0);
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

  describe("removeMany", () => {
    it("deletes the chosen entries from state and storage and keeps the rest", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(FIXTURES.mvn);
      await state().addFromText(FIXTURES.uatKeyLine);
      await state().removeMany(["id-1", "id-3"]);
      expect(state().items.map((i) => i.id)).toEqual(["id-2"]);
      expect([...repository.records.keys()]).toEqual(["id-2"]);
    });

    it("dismisses the add notice", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.mvn);
      await state().removeMany(["id-1"]);
      expect(state().notice).toBeNull();
    });

    it("does nothing for an empty list", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      const remove = jest.spyOn(repository, "remove");
      await state().removeMany([]);
      expect(remove).not.toHaveBeenCalled();
      expect(state().items).toHaveLength(1);
    });

    it("reports a failure and keeps every entry", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "remove").mockRejectedValueOnce(new Error("disk full"));
      await state().removeMany(["id-1"]);
      expect(state().error).toBe("disk full");
      expect(state().items).toHaveLength(1);
    });

    it("uses a fallback message for non-Error failures", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "remove").mockRejectedValueOnce("nope");
      await state().removeMany(["id-1"]);
      expect(state().error).toBe("Could not delete the entries");
    });
  });

  describe("setPinnedMany", () => {
    it("pins several entries at once and sorts them to the top", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(FIXTURES.mvn);
      await state().addFromText(FIXTURES.uatKeyLine);
      await state().setPinnedMany(["id-1", "id-2"], true);
      expect(state().items.map((i) => [i.id, i.pinned])).toEqual([
        ["id-2", true],
        ["id-1", true],
        ["id-3", false],
      ]);
      expect(repository.records.get("id-1")?.pinned).toBe(true);
      expect(repository.records.get("id-2")?.pinned).toBe(true);
    });

    it("unpins them again", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(FIXTURES.mvn);
      await state().setPinnedMany(["id-1", "id-2"], true);
      await state().setPinnedMany(["id-1", "id-2"], false);
      expect(state().items.every((i) => !i.pinned)).toBe(true);
    });

    it("does nothing for an empty list", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      const put = jest.spyOn(repository, "putMany");
      await state().setPinnedMany([], true);
      expect(put).not.toHaveBeenCalled();
    });

    it("reports a failure and changes nothing", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "putMany").mockRejectedValueOnce(new Error("disk full"));
      await state().setPinnedMany(["id-1"], true);
      expect(state().error).toBe("disk full");
      expect(state().items[0].pinned).toBe(false);
    });

    it("uses a fallback message for non-Error failures", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.mvn);
      jest.spyOn(repository, "putMany").mockRejectedValueOnce("nope");
      await state().setPinnedMany(["id-1"], true);
      expect(state().error).toBe("Could not update the entries");
    });
  });

  describe("moveEntries", () => {
    /** Three entries added in turn: the list reads id-3, id-2, id-1. */
    async function threeEntries() {
      const ctx = await setup();
      await ctx.state().addFromText(FIXTURES.todo);
      await ctx.state().addFromText(FIXTURES.mvn);
      await ctx.state().addFromText(FIXTURES.uatKeyLine);
      return ctx;
    }
    const order = (state: () => { items: { id: string }[] }) => state().items.map((i) => i.id);

    it("moves an entry and persists its position", async () => {
      const { state, repository } = await threeEntries();
      await state().moveEntries(["id-1"], "top");
      expect(order(state)).toEqual(["id-1", "id-3", "id-2"]);
      expect(repository.records.get("id-1")?.order).toBe(0);
      expect(repository.records.get("id-3")?.order).toBe(1);
    });

    it("moves several entries together", async () => {
      const { state } = await threeEntries();
      await state().moveEntries(["id-3", "id-2"], "bottom");
      expect(order(state)).toEqual(["id-1", "id-3", "id-2"]);
    });

    it("moves one step up and down", async () => {
      const { state } = await threeEntries();
      await state().moveEntries(["id-1"], "up");
      expect(order(state)).toEqual(["id-3", "id-1", "id-2"]);
      await state().moveEntries(["id-1"], "down");
      expect(order(state)).toEqual(["id-3", "id-2", "id-1"]);
    });

    it("writes nothing when the move changes nothing", async () => {
      const { state, repository } = await threeEntries();
      const put = jest.spyOn(repository, "putMany");
      await state().moveEntries(["id-3"], "top");
      expect(put).not.toHaveBeenCalled();
      expect(repository.records.get("id-3")?.order).toBeUndefined();
    });

    it("keeps the arrangement after a reload", async () => {
      const { state } = await threeEntries();
      await state().moveEntries(["id-1"], "top");
      state().close();
      await state().open();
      expect(order(state)).toEqual(["id-1", "id-3", "id-2"]);
    });

    it("puts a new paste at the top of a rearranged list", async () => {
      const { state } = await threeEntries();
      await state().moveEntries(["id-3"], "bottom");
      await state().addFromText("brand new");
      expect(state().items[0].id).toBe("id-4");
      expect(order(state).slice(1)).toEqual(["id-2", "id-1", "id-3"]);
    });

    it("keeps pinned entries above unpinned ones", async () => {
      const { state } = await threeEntries();
      await state().togglePin("id-1");
      await state().moveEntries(["id-1"], "down");
      expect(order(state)).toEqual(["id-1", "id-3", "id-2"]);
      await state().moveEntries(["id-2"], "top");
      expect(order(state)).toEqual(["id-1", "id-2", "id-3"]);
    });

    it("reports a failure and leaves the list as it was", async () => {
      const { state, repository } = await threeEntries();
      jest.spyOn(repository, "putMany").mockRejectedValueOnce(new Error("disk full"));
      await state().moveEntries(["id-1"], "top");
      expect(state().error).toBe("disk full");
      expect(order(state)).toEqual(["id-3", "id-2", "id-1"]);
    });

    it("uses a fallback message for non-Error failures", async () => {
      const { state, repository } = await threeEntries();
      jest.spyOn(repository, "putMany").mockRejectedValueOnce("nope");
      await state().moveEntries(["id-1"], "top");
      expect(state().error).toBe("Could not move the entries");
    });
  });

  describe("clearAll", () => {
    it("deletes every entry from storage and state", async () => {
      const { state, repository } = await setup();
      await state().addFromText(PASTE);
      await state().clearAll();
      expect(state().items).toEqual([]);
      expect(repository.records.size).toBe(0);
      expect(state().notice).toBeNull();
    });
  });

  describe("togglePin", () => {
    it("pins an entry above newer ones and persists it as plaintext metadata", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(FIXTURES.mvn);
      expect(state().items[0].id).toBe("id-2");
      await state().togglePin("id-1");
      expect(state().items.map((i) => [i.id, i.pinned])).toEqual([["id-1", true], ["id-2", false]]);
      expect(repository.records.get("id-1")?.pinned).toBe(true);
    });

    it("unpins on the second toggle and returns to chronological order", async () => {
      const { state, repository } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(FIXTURES.mvn);
      await state().togglePin("id-1");
      await state().togglePin("id-1");
      expect(state().items.map((i) => i.id)).toEqual(["id-2", "id-1"]);
      expect(repository.records.get("id-1")?.pinned).toBe(false);
    });

    it("keeps pins across reloads", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.todo);
      await state().addFromText(FIXTURES.mvn);
      await state().togglePin("id-1");
      state().close();
      await state().open();
      expect(state().items[0]).toMatchObject({ id: "id-1", pinned: true });
    });

    it("does not touch the secrets of a pinned entry", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      await state().togglePin("id-1");
      expect(await state().revealSecrets("id-1")).toEqual([FIXTURES.uatKeyValue]);
    });

    it("ignores an unknown id", async () => {
      const { state, repository } = await setup();
      const put = jest.spyOn(repository, "putMany");
      await state().togglePin("nope");
      expect(put).not.toHaveBeenCalled();
    });
  });

  describe("markNotSecret", () => {
    it("unmasks a false positive in state and in storage", async () => {
      const { state, key, repository } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      await state().markNotSecret("id-1", 0);
      expect(state().items[0]).toMatchObject({ kind: "note", secretCount: 0 });
      expect(await state().revealSecrets("id-1")).toEqual([]);
      const { openEntry } = await import("../services/scratchEntryCodec");
      const stored = await openEntry(key, repository.records.get("id-1")!);
      expect(stored.text).toBe(FIXTURES.uatKeyLine);
      expect(stored.secrets).toEqual([]);
    });

    it("only unmasks the chosen secret", async () => {
      const { state } = await setup();
      await state().addFromText(TWO_SECRETS);
      expect(await state().revealSecrets("id-1")).toEqual([FIXTURES.uatKeyValue, FIXTURES.prodKeyValue]);
      await state().markNotSecret("id-1", 0);
      expect(await state().revealSecrets("id-1")).toEqual([FIXTURES.prodKeyValue]);
    });

    it("keeps the entry's place in the list and its pin", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      await state().addFromText(FIXTURES.mvn);
      await state().togglePin("id-1");
      await state().markNotSecret("id-1", 0);
      expect(state().items[0]).toMatchObject({ id: "id-1", pinned: true });
    });

    it("never puts the value into state", async () => {
      const { state } = await setup();
      await state().addFromText(TWO_SECRETS);
      await state().markNotSecret("id-1", 0);
      expect(JSON.stringify(state().items)).not.toContain(FIXTURES.prodKeyValue);
    });

    it("rejects for an unknown entry", async () => {
      const { state } = await setup();
      await expect(state().markNotSecret("nope", 0)).rejects.toThrow("Entry not found");
    });
  });

  describe("maskRange", () => {
    const text = "deploy pw is plainword now";
    const start = text.indexOf("plainword");

    it("masks a range the detectors missed", async () => {
      const { state } = await setup();
      await state().addFromText(text);
      expect(state().items[0]).toMatchObject({ kind: "note", secretCount: 0 });
      await state().maskRange("id-1", start, start + "plainword".length);
      expect(state().items[0]).toMatchObject({ kind: "secret", secretCount: 1 });
      expect(await state().revealSecrets("id-1")).toEqual(["plainword"]);
      expect(JSON.stringify(state().items)).not.toContain("plainword");
    });

    it("is blocked while presenting", async () => {
      const { state } = await setup();
      await state().addFromText(text);
      state().setPresenting(true);
      await expect(state().maskRange("id-1", start, start + 3)).rejects.toBeInstanceOf(PresentingModeError);
      expect(state().items[0].kind).toBe("note");
    });

    it("rejects for an unknown entry", async () => {
      const { state } = await setup();
      await expect(state().maskRange("nope", 0, 1)).rejects.toThrow("Entry not found");
    });
  });

  describe("updateText", () => {
    it("replaces the text and re-detects secrets, in state and in storage", async () => {
      const { state } = await setup();
      await state().addFromText("deploy notes");
      expect(state().items[0]).toMatchObject({ kind: "note", secretCount: 0 });
      await state().updateText("id-1", FIXTURES.uatKeyLine);
      expect(state().items[0]).toMatchObject({ kind: "secret", secretCount: 1 });
      expect(await state().getEditableText("id-1")).toBe(FIXTURES.uatKeyLine);
      expect(await state().revealSecrets("id-1")).toEqual([FIXTURES.uatKeyValue]);
      expect(JSON.stringify(state().items)).not.toContain(FIXTURES.uatKeyValue);
    });

    it("unmasks an entry whose secret was edited away", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      await state().updateText("id-1", FIXTURES.mvn);
      expect(state().items[0]).toMatchObject({ kind: "command", secretCount: 0 });
    });

    it("keeps the entry's position, pin and creation time", async () => {
      const { state, repository } = await setup();
      await state().addFromText("older");
      await state().addFromText("newer");
      await state().togglePin("id-1");
      const createdAt = repository.records.get("id-1")!.createdAt;
      await state().updateText("id-1", "older, edited");
      expect(state().items.map((i) => i.id)).toEqual(["id-1", "id-2"]);
      expect(state().items[0]).toMatchObject({ pinned: true, createdAt });
    });

    it("stamps the stored record as updated", async () => {
      const { state, repository } = await setup();
      await state().addFromText("a");
      const before = repository.records.get("id-1")!;
      await state().updateText("id-1", "b");
      expect(repository.records.get("id-1")!.updatedAt).toBeGreaterThan(before.updatedAt);
    });

    it("rejects blank or oversized text and leaves the entry unchanged", async () => {
      const { state } = await setup();
      await state().addFromText("keep me");
      await expect(state().updateText("id-1", "  ")).rejects.toThrow("can't be empty");
      await expect(
        state().updateText("id-1", "x".repeat(MAX_SCRATCH_INPUT_CHARS + 1)),
      ).rejects.toThrow("too large");
      expect(await state().getEditableText("id-1")).toBe("keep me");
    });

    it("is blocked while presenting", async () => {
      const { state } = await setup();
      await state().addFromText("keep me");
      state().setPresenting(true);
      await expect(state().updateText("id-1", "changed")).rejects.toBeInstanceOf(PresentingModeError);
      state().setPresenting(false);
      expect(await state().getEditableText("id-1")).toBe("keep me");
    });

    it("rejects for an unknown entry", async () => {
      const { state } = await setup();
      await expect(state().updateText("nope", "x")).rejects.toThrow("Entry not found");
    });
  });

  describe("getSecretValue", () => {
    it("decrypts one secret by index", async () => {
      const { state } = await setup();
      await state().addFromText(`${FIXTURES.uatKeyLine}`);
      expect(await state().getSecretValue("id-1", 0)).toBe(FIXTURES.uatKeyValue);
    });

    it("rejects for an index that does not exist", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      await expect(state().getSecretValue("id-1", 5)).rejects.toThrow("Secret not found");
    });

    it("still works while presenting, so a secret can be copied without being shown", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      state().setPresenting(true);
      expect(await state().getSecretValue("id-1", 0)).toBe(FIXTURES.uatKeyValue);
      expect(await state().getCopyText("id-1")).toBe(FIXTURES.uatKeyValue);
    });
  });

  describe("getEditableText", () => {
    it("returns the full plaintext of an entry", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      expect(await state().getEditableText("id-1")).toBe(FIXTURES.uatKeyLine);
    });
  });

  describe("presenting mode", () => {
    it("is off by default and can be toggled", async () => {
      const { state } = await setup();
      expect(state().isPresenting).toBe(false);
      state().setPresenting(true);
      expect(state().isPresenting).toBe(true);
      state().setPresenting(false);
      expect(state().isPresenting).toBe(false);
    });

    it("refuses to reveal secrets or return plaintext text", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      state().setPresenting(true);
      await expect(state().revealSecrets("id-1")).rejects.toBeInstanceOf(PresentingModeError);
      await expect(state().getEditableText("id-1")).rejects.toThrow("Hidden while presenting");
    });

    it("allows revealing again once presenting stops", async () => {
      const { state } = await setup();
      await state().addFromText(FIXTURES.uatKeyLine);
      state().setPresenting(true);
      state().setPresenting(false);
      expect(await state().revealSecrets("id-1")).toEqual([FIXTURES.uatKeyValue]);
    });

    it("stays on when the drawer is closed and reopened", async () => {
      const { state } = await setup();
      state().setPresenting(true);
      state().close();
      await state().open();
      expect(state().isPresenting).toBe(true);
    });
  });

  describe("search query", () => {
    it("starts empty, can be set, and is cleared on close", async () => {
      const { state } = await setup();
      expect(state().query).toBe("");
      state().setQuery("mvn");
      expect(state().query).toBe("mvn");
      state().close();
      expect(state().query).toBe("");
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
