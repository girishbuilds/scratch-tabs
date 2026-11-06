import {
  createEditedPayload,
  createPayloads,
  EmptyScratchEntryError,
  MAX_SCRATCH_INPUT_CHARS,
  ScratchInputTooLargeError,
} from "../services/ingestText";
import { getSecretValues } from "../services/blockSegmenter";
import { FIXTURES } from "../testing/inMemory";

describe("createPayloads", () => {
  it("returns no payloads for blank input", () => {
    expect(createPayloads("  \n\n")).toEqual([]);
  });

  it("analyses each block independently", () => {
    const payloads = createPayloads(
      [FIXTURES.uatKeyLine, FIXTURES.mvn, FIXTURES.url].join("\n\n"),
    );
    expect(payloads.map((p) => p.kind)).toEqual(["secret", "command", "url"]);
    expect(getSecretValues(payloads[0])).toEqual([FIXTURES.uatKeyValue]);
    expect(payloads[1].secrets).toEqual([]);
  });

  it("masks both labelled keys from the original scratch pad paste", () => {
    const payloads = createPayloads(`${FIXTURES.uatKeyLine}\n${FIXTURES.prodKeyLine}`);
    expect(payloads.map((p) => getSecretValues(p))).toEqual([
      [FIXTURES.uatKeyValue],
      [FIXTURES.prodKeyValue],
    ]);
  });

  it("rejects input over the size limit", () => {
    expect(() => createPayloads("x".repeat(MAX_SCRATCH_INPUT_CHARS + 1))).toThrow(
      ScratchInputTooLargeError,
    );
  });

  it("accepts input exactly at the size limit", () => {
    expect(() => createPayloads("x".repeat(MAX_SCRATCH_INPUT_CHARS))).not.toThrow();
  });
});

describe("createEditedPayload", () => {
  it("keeps multi-paragraph text as one entry instead of splitting it", () => {
    const payload = createEditedPayload("first line\n\nsecond paragraph");
    expect(payload.text).toBe("first line\n\nsecond paragraph");
  });

  it("detects secrets in the new text", () => {
    const payload = createEditedPayload(FIXTURES.uatKeyLine);
    expect(payload.kind).toBe("secret");
    expect(getSecretValues(payload)).toEqual([FIXTURES.uatKeyValue]);
  });

  it("reclassifies the entry from its new text", () => {
    expect(createEditedPayload(FIXTURES.mvn).kind).toBe("command");
    expect(createEditedPayload(FIXTURES.url).kind).toBe("url");
    expect(createEditedPayload("buy milk").kind).toBe("note");
  });

  it("normalises line endings and drops trailing whitespace", () => {
    expect(createEditedPayload("a\r\nb  \n\n").text).toBe("a\nb");
  });

  it("rejects blank text", () => {
    expect(() => createEditedPayload("")).toThrow(EmptyScratchEntryError);
    expect(() => createEditedPayload(" \n\t ")).toThrow(EmptyScratchEntryError);
  });

  it("rejects text over the size limit and accepts text at it", () => {
    expect(() => createEditedPayload("x".repeat(MAX_SCRATCH_INPUT_CHARS + 1))).toThrow(
      ScratchInputTooLargeError,
    );
    expect(() => createEditedPayload("x".repeat(MAX_SCRATCH_INPUT_CHARS))).not.toThrow();
  });
});
