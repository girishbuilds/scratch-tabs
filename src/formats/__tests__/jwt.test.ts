import { JwtFormatDetector } from "../jwt";
import { extractJwt } from "../jwtToken";
import { detectFormat } from "../index";

const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// header {"alg":"none"} . payload {"sub":"1"} . (empty signature)
const UNSIGNED_JWT = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.";

describe("JwtFormatDetector", () => {
  const detector = new JwtFormatDetector();

  it("has the expected identity", () => {
    expect(detector.id).toBe("jwt");
    expect(detector.name).toBe("JWT");
    expect(detector.getFileExtension()).toBe("jwt");
  });

  it("detects a bare token as a definitive match", () => {
    const result = detector.detect(JWT);
    expect(result.match).toBe(true);
    expect(result.matchedDefinitive).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("detects a token with surrounding whitespace and a trailing newline", () => {
    expect(detector.detect(`\n  ${JWT}  \n`).match).toBe(true);
  });

  it("detects a token with an empty signature (alg none)", () => {
    expect(detector.detect(UNSIGNED_JWT).match).toBe(true);
  });

  it("detects Bearer and Authorization header forms", () => {
    expect(detector.detect(`Bearer ${JWT}`).match).toBe(true);
    expect(detector.detect(`Authorization: Bearer ${JWT}`).match).toBe(true);
  });

  it("detects a quoted token", () => {
    expect(detector.detect(`"${JWT}"`).match).toBe(true);
  });

  it("detects its own sample content", () => {
    expect(detector.detect(detector.sampleContent()).match).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["a version string", "1.2.3"],
    ["a hostname", "api.example.com"],
    ["two segments only", JWT.split(".").slice(0, 2).join(".")],
    ["four segments", `${JWT}.extra`],
    ["a token followed by prose", `${JWT} is my token`],
    ["prose before a token", `my token ${JWT}`],
    ["a header without alg", "eyJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxIn0.sig"],
    ["a payload that is not an object", "eyJhbGciOiJIUzI1NiJ9.WzFd.sig"],
    ["segments that are not JSON", "aGVsbG8.d29ybGQ.c2ln"],
    ["multiple tokens", `${JWT}\n${JWT}`],
  ])("does not match %s", (_label, content) => {
    expect(detector.detect(content).match).toBe(false);
  });

  it("is picked by the registry for a bare token", () => {
    expect(detectFormat(JWT)).toBe("jwt");
    expect(detectFormat(`Bearer ${JWT}`)).toBe("jwt");
  });

  it("registers a Monaco language", () => {
    const monaco = {
      languages: {
        getLanguages: jest.fn(() => []),
        register: jest.fn(),
        setMonarchTokensProvider: jest.fn(),
      },
    };
    detector.registerProvider(monaco);
    expect(monaco.languages.register).toHaveBeenCalledWith({ id: "jwt" });
    expect(monaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
  });
});

describe("extractJwt", () => {
  it("returns the bare token from the supported wrappers", () => {
    expect(extractJwt(JWT)).toBe(JWT);
    expect(extractJwt(`  bearer ${JWT}\n`)).toBe(JWT);
    expect(extractJwt(`authorization: Bearer ${JWT}`)).toBe(JWT);
    expect(extractJwt(`'${JWT}'`)).toBe(JWT);
  });

  it("returns null for non-tokens", () => {
    expect(extractJwt("")).toBeNull();
    expect(extractJwt("not a token")).toBeNull();
    expect(extractJwt("a.b.c")).toBeNull();
  });
});
