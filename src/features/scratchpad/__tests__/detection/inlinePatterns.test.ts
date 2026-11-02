import { detectInlineSecrets } from "../../services/detection/inlinePatterns";
import { FIXTURES } from "../../testing/inMemory";

const valuesOf = (text: string) =>
  detectInlineSecrets(text).map((s) => text.slice(s.start, s.end));

describe("detectInlineSecrets", () => {
  it("masks authorization headers and bearer strings", () => {
    expect(valuesOf("Authorization: Bearer abcdef123456")).toEqual(["abcdef123456", "abcdef123456"]);
    expect(valuesOf("-H 'X-Api-Key: abcdef123456'")).toEqual(["abcdef123456"]);
    expect(valuesOf("echo Bearer abcdef123456xyz")).toEqual(["abcdef123456xyz"]);
    expect(valuesOf("Authorization: Basic dXNlcjpwYXNzd29yZA==")).toEqual(["dXNlcjpwYXNzd29yZA=="]);
  });

  it("does not mask a placeholder bearer token", () => {
    expect(valuesOf(FIXTURES.curl)).toEqual([]);
  });

  it("masks a real bearer token inside a multi-line curl command", () => {
    const text = FIXTURES.curl.replace("your-token-here", "abcdef123456xyz");
    expect(new Set(valuesOf(text))).toEqual(new Set(["abcdef123456xyz"]));
  });

  it("masks exactly the secret query parameter, not its neighbours", () => {
    const text = "https://x.test/p?user=bob&api_key=abcdef123456&page=2";
    expect(valuesOf(text)).toEqual(["abcdef123456"]);
  });

  it("ignores ordinary query parameters", () => {
    expect(valuesOf(FIXTURES.url)).toEqual([]);
  });

  it("masks credential-bearing CLI flags in each quoting style", () => {
    expect(valuesOf("mysql --password=hunter22 -h db")).toEqual(["hunter22"]);
    expect(valuesOf("tool --token 'abc def'")).toEqual(["abc def"]);
    expect(valuesOf('tool --secret "abc def"')).toEqual(["abc def"]);
    expect(valuesOf("tool --token abcdef")).toEqual(["abcdef"]);
  });

  it("does not treat -p (often a port) as a password flag", () => {
    expect(valuesOf("ssh -p 2222 host")).toEqual([]);
  });

  it("finds nothing in ordinary commands", () => {
    expect(valuesOf(FIXTURES.mvn)).toEqual([]);
  });
});
