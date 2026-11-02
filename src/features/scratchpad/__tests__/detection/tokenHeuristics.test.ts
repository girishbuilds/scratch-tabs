import { detectBareToken, detectHighEntropyTokens } from "../../services/detection/tokenHeuristics";
import { FIXTURES } from "../../testing/inMemory";

const valuesOf = (spans: { start: number; end: number }[], text: string) =>
  spans.map((s) => text.slice(s.start, s.end));

describe("detectBareToken", () => {
  it("masks a lone opaque token", () => {
    expect(valuesOf(detectBareToken(FIXTURES.prodKeyValue), FIXTURES.prodKeyValue)).toEqual([
      FIXTURES.prodKeyValue,
    ]);
  });

  it("reports offsets relative to the untrimmed text", () => {
    const text = `  ${FIXTURES.uatKeyValue}  `;
    expect(valuesOf(detectBareToken(text), text)).toEqual([FIXTURES.uatKeyValue]);
  });

  it.each([
    ["too short", "abc123"],
    ["contains whitespace", "abc123 def456 ghi789 jkl012"],
    ["a path", "/usr/local/lib/node_modules123/abc"],
    ["a url", "https://example.com/some/long/path123"],
    ["kebab-case words", "orders-service-release-candidate-build"],
    ["degenerate repetition", "aaaa1111aaaa1111aaaa1111"],
  ])("leaves %s alone", (_name, text) => {
    expect(detectBareToken(text)).toEqual([]);
  });
});

describe("detectHighEntropyTokens", () => {
  const blob = "q8Zk3Lp0Xv9RtYw2Nc7Ud4Hs6Jb1MgFe5aBo";

  it("finds a high-entropy token inside free text and masks only the token", () => {
    const text = `deploy with ${blob} today`;
    expect(valuesOf(detectHighEntropyTokens(text), text)).toEqual([blob]);
  });

  it("finds several tokens", () => {
    const text = `${blob}\nand ${blob}`;
    expect(detectHighEntropyTokens(text)).toHaveLength(2);
  });

  it.each([
    ["a file path", "/usr/local/share/some-long-directory-name/file"],
    ["a relative path", "./some/relative/path/with/many/segments"],
    ["a home path", "~/projects/some-long-project-name/src/index"],
    ["a url", "https://example.com/some/very/long/path/segment"],
    ["a sha-1", "3f9a1c7e5b2d4086a9e1c3b5d7f902468ace1357"],
    ["a sha-256", "3f9a1c7e5b2d4086a9e1c3b5d7f902468ace13573f9a1c7e5b2d4086a9e1c3b5"],
    ["a long ordinary word", "internationalizationconfiguration"],
    ["short text", "short words only"],
  ])("ignores %s", (_name, text) => {
    expect(detectHighEntropyTokens(text)).toEqual([]);
  });

  it("is repeatable across calls", () => {
    expect(detectHighEntropyTokens(blob)).toEqual(detectHighEntropyTokens(blob));
  });
});
