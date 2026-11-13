/**
 * Failing tests documenting confirmed bugs in the paste content processors.
 * These rewrite what the user pasted; they must never alter data.
 */
import { ContentProcessingService } from "../contentProcessing/ContentProcessingService";

const pasteInto = async (content: string, language = "plaintext") => {
  const service = new ContentProcessingService();
  const ctx = service.createContext("tab", language, false, true, "");
  return service.processContent(content, ctx);
};

describe("BUG: CsvContentProcessor corrupts pasted Windows paths", () => {
  it("leaves plain-text Windows paths untouched (\\t in \\temp / \\tools is not a tab)", async () => {
    const paths = "C:\\temp\\tools\\bin\nD:\\temp\\tests\\bin";
    const result = await pasteInto(paths);
    expect(result.content).toBe(paths);
  });
});

describe("BUG: JsonLogContentProcessor rewrites log lines destructively", () => {
  const lines = [
    '2024-05-01T10:00:00Z INFO {"traceId": 12345678901234567890, "msg": "a"}',
    '2024-05-01T10:00:01Z WARN {"traceId": 12345678901234567891, "msg": "b"}',
  ].join("\n");

  it("does not change numeric values it cannot represent exactly (64-bit IDs)", async () => {
    const result = await pasteInto(lines);
    expect(result.content).toContain("12345678901234567890");
    expect(result.content).toContain("12345678901234567891");
  });
});
