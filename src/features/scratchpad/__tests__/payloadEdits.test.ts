import { buildPayload } from "../services/blockSegmenter";
import { markRangeAsSecret, unmarkSecrets } from "../services/payloadEdits";

const text = "deploy pw is hunter2 now";
const start = text.indexOf("hunter2");
const range = { start, end: start + "hunter2".length };

describe("markRangeAsSecret", () => {
  it("masks the selected range and reclassifies the entry as a secret", () => {
    const result = markRangeAsSecret(buildPayload(text, []), range);
    expect(result.secrets).toEqual([range]);
    expect(result.kind).toBe("secret");
    expect(result.text).toBe(text);
  });

  it("ignores whitespace around the selection", () => {
    const result = markRangeAsSecret(buildPayload(text, []), { start: range.start - 1, end: range.end + 1 });
    expect(result.secrets).toEqual([range]);
  });

  it("accepts a backwards selection", () => {
    const result = markRangeAsSecret(buildPayload(text, []), { start: range.end, end: range.start });
    expect(result.secrets).toEqual([range]);
  });

  it("clamps a selection to the text", () => {
    const result = markRangeAsSecret(buildPayload("abc def", []), { start: -5, end: 99 });
    expect(result.secrets).toEqual([{ start: 0, end: 7 }]);
  });

  it("merges with existing and overlapping secrets", () => {
    const base = buildPayload(text, [{ start: range.start, end: range.start + 3 }]);
    const result = markRangeAsSecret(base, range);
    expect(result.secrets).toEqual([range]);
  });

  it("keeps existing secrets that do not overlap, in order", () => {
    const base = buildPayload(text, [range]);
    const result = markRangeAsSecret(base, { start: 0, end: 6 });
    expect(result.secrets).toEqual([{ start: 0, end: 6 }, range]);
  });

  it("returns the payload untouched for an empty or whitespace-only selection", () => {
    const base = buildPayload(text, []);
    expect(markRangeAsSecret(base, { start: 3, end: 3 })).toBe(base);
    expect(markRangeAsSecret(base, { start: 6, end: 7 })).toBe(base);
  });
});

describe("unmarkSecrets", () => {
  const two = buildPayload("a=aaaa b=bbbb", [
    { start: 2, end: 6 },
    { start: 9, end: 13 },
  ]);

  it("removes only the chosen secrets", () => {
    expect(unmarkSecrets(two, [0]).secrets).toEqual([{ start: 9, end: 13 }]);
    expect(unmarkSecrets(two, [1]).secrets).toEqual([{ start: 2, end: 6 }]);
  });

  it("keeps the entry a secret while any secret remains", () => {
    expect(unmarkSecrets(two, [0]).kind).toBe("secret");
  });

  it("reclassifies the entry once no secrets remain", () => {
    const command = buildPayload("curl http://x -H t", [{ start: 17, end: 18 }]);
    const result = unmarkSecrets(command, [0]);
    expect(result.secrets).toEqual([]);
    expect(result.kind).toBe("command");
  });

  it("does not change the text and ignores unknown indexes", () => {
    const result = unmarkSecrets(two, [7]);
    expect(result.text).toBe(two.text);
    expect(result.secrets).toEqual(two.secrets);
  });
});
