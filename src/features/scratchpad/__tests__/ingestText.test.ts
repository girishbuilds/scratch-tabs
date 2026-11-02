import {
  createPayloads,
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
