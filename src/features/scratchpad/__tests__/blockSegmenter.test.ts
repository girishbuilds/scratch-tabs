import {
  buildPayload,
  buildSegments,
  classifyKind,
  getCopyTarget,
  getPrimaryCopyText,
  getSecretValues,
  splitIntoBlocks,
} from "../services/blockSegmenter";
import type { ScratchPayload } from "../types";
import { FIXTURES } from "../testing/inMemory";

describe("splitIntoBlocks", () => {
  it("returns nothing for empty or whitespace input", () => {
    expect(splitIntoBlocks("")).toEqual([]);
    expect(splitIntoBlocks("  \n \n\n")).toEqual([]);
  });

  it("splits on blank lines", () => {
    expect(splitIntoBlocks("a b\n\nc d")).toEqual(["a b", "c d"]);
  });

  it("treats each line of a paragraph as its own entry", () => {
    expect(splitIntoBlocks(`${FIXTURES.uatKeyLine}\n${FIXTURES.prodKeyLine}`)).toEqual([
      FIXTURES.uatKeyLine,
      FIXTURES.prodKeyLine,
    ]);
  });

  it("normalises CRLF and CR line endings", () => {
    expect(splitIntoBlocks("a\r\n\r\nb\rc")).toEqual(["a", "b", "c"]);
  });

  it("keeps a backslash-continued command together", () => {
    expect(splitIntoBlocks(FIXTURES.curl)).toEqual([FIXTURES.curl]);
  });

  it.each(["&&", "||", "|"])("keeps a line ending in %s with the next", (op) => {
    expect(splitIntoBlocks(`cat a ${op}\ngrep b`)).toEqual([`cat a ${op}\ngrep b`]);
  });

  it("keeps indented continuation lines", () => {
    expect(splitIntoBlocks("name:\n  child: 1\n  other: 2")).toEqual([
      "name:\n  child: 1\n  other: 2",
    ]);
  });

  it("keeps multi-line bracketed content together", () => {
    const json = '{\n"a": 1,\n"b": [\n2\n]\n}';
    expect(splitIntoBlocks(json)).toEqual([json]);
  });

  it("does not let an unbalanced bracket swallow later paragraphs", () => {
    expect(splitIntoBlocks("note (open\n\nnext")).toEqual(["note (open", "next"]);
  });

  it("keeps a PEM block together even without indentation", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nAAAA\nBBBB\n-----END PRIVATE KEY-----";
    expect(splitIntoBlocks(`${pem}\nafter`)).toEqual([pem, "after"]);
  });

  it("trims trailing whitespace on blocks but keeps inner indentation", () => {
    expect(splitIntoBlocks("a\n  b   \n")).toEqual(["a\n  b"]);
  });

  it("splits the user's whole scratch pad as expected", () => {
    const pad = [
      FIXTURES.uatKeyLine,
      FIXTURES.prodKeyLine,
      "",
      FIXTURES.mvn,
      "",
      FIXTURES.url,
      "",
      FIXTURES.curl,
      "",
      FIXTURES.todo,
      "- Check in with yasser on pairing for pipeline run",
      "",
      "Scenario for trigger button on download is flakey",
    ].join("\n");
    expect(splitIntoBlocks(pad)).toEqual([
      FIXTURES.uatKeyLine,
      FIXTURES.prodKeyLine,
      FIXTURES.mvn,
      FIXTURES.url,
      FIXTURES.curl,
      FIXTURES.todo,
      "- Check in with yasser on pairing for pipeline run",
      "Scenario for trigger button on download is flakey",
    ]);
  });
});

describe("classifyKind", () => {
  it("prefers secret whenever secrets were found", () => {
    expect(classifyKind("curl x", true)).toBe("secret");
  });

  it.each([
    [FIXTURES.mvn, "command"],
    ["$ git status", "command"],
    ["./gradlew build", "command"],
    [FIXTURES.curl, "command"],
    [FIXTURES.url, "url"],
    ["see https://example.com now", "note"],
    [FIXTURES.todo, "note"],
  ])("classifies %j as %s", (text, kind) => {
    expect(classifyKind(text, false)).toBe(kind);
  });

  it("does not treat a multi-line value as a url", () => {
    expect(classifyKind("https://a.test\nhttps://b.test", false)).toBe("note");
  });
});

describe("buildPayload", () => {
  it("combines text, spans and kind", () => {
    expect(buildPayload("a", [{ start: 0, end: 1 }])).toEqual({
      v: 1,
      text: "a",
      kind: "secret",
      secrets: [{ start: 0, end: 1 }],
    });
  });
});

describe("buildSegments / getSecretValues", () => {
  const payload: ScratchPayload = {
    v: 1,
    text: "a=SECRET1 b=SECRET2!",
    kind: "secret",
    secrets: [
      { start: 2, end: 9 },
      { start: 12, end: 19 },
    ],
  };

  it("interleaves text and indexed secret segments", () => {
    expect(buildSegments(payload)).toEqual([
      { type: "text", text: "a=" },
      { type: "secret", index: 0 },
      { type: "text", text: " b=" },
      { type: "secret", index: 1 },
      { type: "text", text: "!" },
    ]);
  });

  it("never puts secret text into segments", () => {
    expect(JSON.stringify(buildSegments(payload))).not.toContain("SECRET");
  });

  it("returns a single text segment when there are no secrets", () => {
    expect(buildSegments({ ...payload, secrets: [] })).toEqual([
      { type: "text", text: payload.text },
    ]);
  });

  it("handles a secret that spans the whole text", () => {
    expect(
      buildSegments({ ...payload, text: "abc", secrets: [{ start: 0, end: 3 }] }),
    ).toEqual([{ type: "secret", index: 0 }]);
  });

  it("extracts secret values in order", () => {
    expect(getSecretValues(payload)).toEqual(["SECRET1", "SECRET2"]);
  });
});

describe("getPrimaryCopyText", () => {
  const make = (text: string, start: number, end: number): ScratchPayload => ({
    v: 1,
    text,
    kind: "secret",
    secrets: [{ start, end }],
  });

  it("copies just the value for a single-line `label: value` secret", () => {
    const text = FIXTURES.uatKeyLine;
    const start = text.indexOf(FIXTURES.uatKeyValue);
    expect(getPrimaryCopyText(make(text, start, text.length))).toBe(FIXTURES.uatKeyValue);
  });

  it("copies just the value when it is quoted", () => {
    const text = 'password: "hunter22"';
    expect(getPrimaryCopyText(make(text, 11, 19))).toBe("hunter22");
  });

  it("copies the whole block when the secret is embedded in a command", () => {
    const text = "curl -H 'Authorization: Bearer abcdef123456' https://x.test";
    const start = text.indexOf("abcdef123456");
    expect(getPrimaryCopyText(make(text, start, start + 12))).toBe(text);
  });

  it("copies the whole block when there are several secrets", () => {
    const payload: ScratchPayload = {
      v: 1,
      text: "a: 123456 b: 654321",
      kind: "secret",
      secrets: [
        { start: 3, end: 9 },
        { start: 13, end: 19 },
      ],
    };
    expect(getPrimaryCopyText(payload)).toBe(payload.text);
  });

  it("copies the whole block when it spans several lines", () => {
    const text = "key: abcdef\nextra";
    expect(getPrimaryCopyText(make(text, 5, 11))).toBe(text);
  });

  it("copies the whole text when there are no secrets", () => {
    expect(getPrimaryCopyText({ v: 1, text: "mvn clean", kind: "command", secrets: [] })).toBe(
      "mvn clean",
    );
  });
});

describe("getCopyTarget", () => {
  const payload = (text: string, spans: [number, number][]): ScratchPayload => ({
    v: 1,
    text,
    kind: "secret",
    secrets: spans.map(([start, end]) => ({ start, end })),
  });

  it("targets just the value for a single-line `label: value` secret", () => {
    expect(getCopyTarget(payload("password: correct horse battery staple", [[10, 38]]))).toBe("value");
    expect(getCopyTarget(payload("API_KEY=abcdef123456", [[8, 20]]))).toBe("value");
  });

  it("tolerates quotes and trailing punctuation around the value", () => {
    expect(getCopyTarget(payload('"password": "hunter22",', [[13, 21]]))).toBe("value");
  });

  it("targets everything when the secret is embedded in a larger command", () => {
    const text = "curl -H 'Authorization: Bearer abcdef123456' https://x.test";
    const start = text.indexOf("abcdef123456");
    expect(getCopyTarget(payload(text, [[start, start + 12]]))).toBe("all");
  });

  it("targets everything for several secrets, multi-line text, or no secrets", () => {
    expect(getCopyTarget(payload("a: 123456 b: 654321", [[3, 9], [13, 19]]))).toBe("all");
    expect(getCopyTarget(payload("key: abcdef\nextra", [[5, 11]]))).toBe("all");
    expect(getCopyTarget(payload("mvn clean", []))).toBe("all");
  });

  it("targets everything when text follows the secret", () => {
    expect(getCopyTarget(payload("key: abcdef and more words", [[5, 11]]))).toBe("all");
  });
});

describe("splitIntoBlocks - stray punctuation and pasted layout", () => {
  it.each([
    ["an unmatched opening paren", "remember :( to do\nnpm test\ngit status"],
    ["an unmatched opening brace", "use { for blocks\nnpm test\ngit status"],
    ["a trailing opener that never closes", "ok :(\nnpm test\ngit status"],
  ])("a note with %s does not swallow the lines after it", (_name, text) => {
    expect(splitIntoBlocks(text)).toEqual(text.split("\n"));
  });

  it("splits a uniformly indented paste line by line", () => {
    expect(splitIntoBlocks("  note one\n  note two\n  npm test")).toEqual([
      "  note one",
      "  note two",
      "  npm test",
    ]);
  });

  it("keeps a multi-line JSON blob together and splits what follows", () => {
    const json = '{\n  "a": 1,\n  "b": [1, 2]\n}';
    expect(splitIntoBlocks(`${json}\nsome note\nnpm test`)).toEqual([json, "some note", "npm test"]);
  });

  it("ignores brackets inside JSON strings", () => {
    const json = '{\n"a": ")",\n"b": "{"\n}';
    expect(splitIntoBlocks(`${json}\nafter`)).toEqual([json, "after"]);
  });

  it("keeps a curl with a multi-line quoted body together", () => {
    const curl = "curl -X POST https://x.io -d '{\n\"a\": 1\n}'";
    expect(splitIntoBlocks(`${curl}\nnpm test`)).toEqual([curl, "npm test"]);
  });

  it("does not treat an apostrophe in a note as a quote", () => {
    expect(splitIntoBlocks("don't forget\nnpm test")).toEqual(["don't forget", "npm test"]);
  });
});
