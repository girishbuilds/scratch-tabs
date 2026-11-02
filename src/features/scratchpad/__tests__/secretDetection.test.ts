import {
  DEFAULT_DETECTORS,
  detectSecretSpans,
  getLabelStrength,
  isPlaceholder,
} from "../services/secretDetection";
import { FIXTURES } from "../testing/inMemory";

const valuesOf = (text: string) =>
  detectSecretSpans(text).map((s) => text.slice(s.start, s.end));

describe("detectSecretSpans", () => {
  it("masks the values of the original scratch-pad keys", () => {
    expect(valuesOf(FIXTURES.uatKeyLine)).toEqual([FIXTURES.uatKeyValue]);
    expect(valuesOf(FIXTURES.prodKeyLine)).toEqual([FIXTURES.prodKeyValue]);
    expect(valuesOf(FIXTURES.prodKeyValue)).toEqual([FIXTURES.prodKeyValue]);
  });

  it("masks a real token inside a multi-line curl command but keeps the placeholder one", () => {
    expect(valuesOf(FIXTURES.curl)).toEqual([]);
    const real = FIXTURES.curl.replace("your-token-here", "abcdef123456xyz");
    expect(valuesOf(real)).toEqual(["abcdef123456xyz"]);
  });

  it.each([
    ["maven command", FIXTURES.mvn],
    ["browserstack url", FIXTURES.url],
    ["todo", FIXTURES.todo],
    ["empty", ""],
    ["whitespace", "   \n  "],
  ])("finds nothing in %s", (_name, text) => {
    expect(detectSecretSpans(text)).toEqual([]);
  });

  it("combines every detector and returns sorted, non-overlapping spans", () => {
    const text = "password: hunter22\nBearer abcdef123456xyz";
    expect(valuesOf(text)).toEqual(["hunter22", "abcdef123456xyz"]);
  });

  it("merges spans reported by different detectors", () => {
    const spans = detectSecretSpans("0123456789abcdefghijklmnopqrstuv", [
      () => [{ start: 10, end: 16 }],
      () => [{ start: 14, end: 22 }],
    ]);
    expect(spans).toEqual([{ start: 10, end: 22 }]);
  });

  it("uses all default detectors", () => {
    expect(DEFAULT_DETECTORS).toHaveLength(5);
  });

  it("fails closed by masking the whole block if a detector throws", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const text = "anything at all";
    const spans = detectSecretSpans(text, [
      () => {
        throw new Error("boom");
      },
    ]);
    expect(spans).toEqual([{ start: 0, end: text.length }]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("re-exports the label and placeholder helpers", () => {
    expect(getLabelStrength("password")).toBe("strong");
    expect(isPlaceholder("<token>")).toBe(true);
  });
});
