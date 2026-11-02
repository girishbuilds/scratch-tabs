import { detectLabelledValues, getLabelStrength } from "../../services/detection/labelHeuristics";
import { FIXTURES } from "../../testing/inMemory";

const valuesOf = (text: string) =>
  detectLabelledValues(text).map((s) => text.slice(s.start, s.end));

describe("getLabelStrength", () => {
  it.each([
    ["password", "strong"],
    ["DB_PASSWORD", "strong"],
    ["dbPassword", "strong"],
    ["accessToken", "strong"],
    ["client-secret", "strong"],
    ["passphrase", "strong"],
    ["UAT key", "weak"],
    ["Prod-Key", "weak"],
    ["api_key", "weak"],
    ["apiKey", "weak"],
    ["auth", "weak"],
    ["username", "none"],
    ["monkey", "none"],
    ["author", "none"],
    ["passed", "none"],
    ["path", "none"],
  ])("%s -> %s", (label, expected) => {
    expect(getLabelStrength(label)).toBe(expected);
  });
});

describe("detectLabelledValues", () => {
  it("masks the values (not the labels) of the real-world examples", () => {
    expect(valuesOf(FIXTURES.uatKeyLine)).toEqual([FIXTURES.uatKeyValue]);
    expect(valuesOf(FIXTURES.prodKeyLine)).toEqual([FIXTURES.prodKeyValue]);
  });

  it("masks several labelled secrets in one block", () => {
    expect(valuesOf(`${FIXTURES.uatKeyLine}\n${FIXTURES.prodKeyLine}`)).toEqual([
      FIXTURES.uatKeyValue,
      FIXTURES.prodKeyValue,
    ]);
  });

  it("handles env-style, export and quoted values", () => {
    expect(valuesOf("export API_KEY=abcdef123456")).toEqual(["abcdef123456"]);
    expect(valuesOf('password: "hunter22"')).toEqual(["hunter22"]);
    expect(valuesOf("token = 'abc123def'")).toEqual(["abc123def"]);
    expect(valuesOf("set PASSWORD=hunter22")).toEqual(["hunter22"]);
  });

  it("handles JSON properties with a trailing comma", () => {
    expect(valuesOf('  "password": "s3cr3tvalue",')).toEqual(["s3cr3tvalue"]);
  });

  it("masks multi-word values only for strong labels", () => {
    expect(valuesOf("password: correct horse battery")).toEqual(["correct horse battery"]);
    expect(valuesOf("key: this is just a sentence")).toEqual([]);
  });

  it("masks a quoted multi-word value even for a weak label", () => {
    expect(valuesOf('key: "two words here"')).toEqual(["two words here"]);
  });

  it("applies a shorter minimum length for strong labels than weak ones", () => {
    expect(valuesOf("pwd: abcd")).toEqual(["abcd"]);
    expect(valuesOf("key: abcd")).toEqual([]);
  });

  it("reports the correct offsets on later lines", () => {
    const text = `first line\n${FIXTURES.uatKeyLine}`;
    expect(valuesOf(text)).toEqual([FIXTURES.uatKeyValue]);
  });

  it("ignores placeholders and unrelated labels", () => {
    expect(valuesOf("api_key: your-api-key-here")).toEqual([]);
    expect(valuesOf("username: gizjv-user-name")).toEqual([]);
    expect(valuesOf("owner: somebody-with-a-long-name")).toEqual([]);
    expect(valuesOf(FIXTURES.todo)).toEqual([]);
  });

  it("leaves command-line flags to the inline rules", () => {
    expect(valuesOf("mysql --password=hunter22 -h db")).toEqual([]);
  });

  it("ignores lines without a separator", () => {
    expect(valuesOf("just some words about a password")).toEqual([]);
  });
});
