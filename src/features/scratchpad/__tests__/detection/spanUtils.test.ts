import { mergeSpans, spanFor, spansFromRegex } from "../../services/detection/spanUtils";

describe("spanFor", () => {
  it("covers the value from its start", () => {
    expect(spanFor(5, "abcdef")).toEqual([{ start: 5, end: 11 }]);
  });

  it("returns nothing for empty values and placeholders", () => {
    expect(spanFor(0, "")).toEqual([]);
    expect(spanFor(0, "<token>")).toEqual([]);
  });
});

describe("mergeSpans", () => {
  it("sorts spans", () => {
    expect(mergeSpans([{ start: 10, end: 12 }, { start: 1, end: 3 }])).toEqual([
      { start: 1, end: 3 },
      { start: 10, end: 12 },
    ]);
  });

  it("merges overlapping and touching spans", () => {
    expect(
      mergeSpans([
        { start: 1, end: 5 },
        { start: 4, end: 9 },
        { start: 9, end: 12 },
      ]),
    ).toEqual([{ start: 1, end: 12 }]);
  });

  it("keeps a span fully contained in another from shrinking it", () => {
    expect(mergeSpans([{ start: 0, end: 10 }, { start: 2, end: 4 }])).toEqual([{ start: 0, end: 10 }]);
  });

  it("drops empty spans and does not mutate its input", () => {
    const input = [{ start: 3, end: 3 }, { start: 0, end: 2 }, { start: 1, end: 4 }];
    const snapshot = JSON.stringify(input);
    expect(mergeSpans(input)).toEqual([{ start: 0, end: 4 }]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("handles no spans", () => {
    expect(mergeSpans([])).toEqual([]);
  });
});

describe("spansFromRegex", () => {
  it("uses the first defined capture group as the secret", () => {
    expect(spansFromRegex("k=abcdef rest", /k=(\w+)/g)).toEqual([{ start: 2, end: 8 }]);
  });

  it("falls back to the whole match when there is no group", () => {
    expect(spansFromRegex("see TOKEN123 now", /TOKEN\d+/g)).toEqual([{ start: 4, end: 12 }]);
  });

  it("picks whichever alternative group matched", () => {
    expect(spansFromRegex(`a="xyz1" b='uvw2'`, /=(?:"([^"]+)"|'([^']+)')/g)).toEqual([
      { start: 3, end: 7 },
      { start: 12, end: 16 },
    ]);
  });

  it("finds every match even if the regex is not global", () => {
    expect(spansFromRegex("a=11 a=22", /a=(\d+)/)).toHaveLength(2);
  });

  it("is repeatable (does not leak lastIndex between calls)", () => {
    const re = /a=(\d+)/g;
    expect(spansFromRegex("a=11", re)).toEqual(spansFromRegex("a=11", re));
  });

  it("skips placeholder values", () => {
    expect(spansFromRegex("key=<token>", /key=(\S+)/g)).toEqual([]);
  });
});
