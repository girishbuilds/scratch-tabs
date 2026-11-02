import {
  openEntry,
  sealEntry,
  toEntryView,
  toUnreadableView,
} from "../services/scratchEntryCodec";
import { buildPayload } from "../services/blockSegmenter";
import { newTestKey } from "../testing/inMemory";

const text = "Prod-Key: 8d8sd89hsdh8-sdc0shc";
const payload = buildPayload(text, [{ start: 10, end: 30 }]);
const meta = { id: "e1", createdAt: 1000, batchIndex: 2 };

describe("scratchEntryCodec", () => {
  it("seals a payload into a record that holds only ciphertext and metadata", async () => {
    const record = await sealEntry(await newTestKey(), meta, payload);
    expect(record).toMatchObject({ id: "e1", v: 1, createdAt: 1000, updatedAt: 1000, batchIndex: 2 });
    expect(Object.keys(record).sort()).toEqual(
      ["batchIndex", "createdAt", "ct", "id", "iv", "updatedAt", "v"],
    );
    expect(JSON.stringify(Array.from(record.ct))).not.toContain("8d8sd");
  });

  it("uses the provided time for updatedAt", async () => {
    const record = await sealEntry(await newTestKey(), meta, payload, 5000);
    expect(record.updatedAt).toBe(5000);
  });

  it("opens a sealed record back into the original payload", async () => {
    const key = await newTestKey();
    const record = await sealEntry(key, meta, payload);
    expect(await openEntry(key, record)).toEqual(payload);
  });

  it("fails to open a record whose id was changed", async () => {
    const key = await newTestKey();
    const record = await sealEntry(key, meta, payload);
    await expect(openEntry(key, { ...record, id: "other" })).rejects.toBeDefined();
  });

  it("builds a view that contains no secret text", async () => {
    const record = await sealEntry(await newTestKey(), meta, payload);
    const view = toEntryView(record, payload);
    expect(view).toMatchObject({ id: "e1", kind: "secret", copyTarget: "value", secretCount: 1, createdAt: 1000, batchIndex: 2 });
    expect(JSON.stringify(view)).not.toContain("8d8sd89hsdh8");
    expect(JSON.stringify(view)).toContain("Prod-Key: ");
  });

  it("marks entries without a lone label:value secret as copying everything", async () => {
    const plain = buildPayload("mvn clean", []);
    const record = await sealEntry(await newTestKey(), meta, plain);
    expect(toEntryView(record, plain).copyTarget).toBe("all");
  });

  it("builds an unreadable view with no content", async () => {
    const record = await sealEntry(await newTestKey(), meta, payload);
    expect(toUnreadableView(record)).toEqual({
      id: "e1",
      kind: "unreadable",
      createdAt: 1000,
      batchIndex: 2,
    });
  });
});
