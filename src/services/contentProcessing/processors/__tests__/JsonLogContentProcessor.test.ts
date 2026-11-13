import { JsonLogContentProcessor } from "../JsonLogContentProcessor";
import { ContentProcessingContext } from "../../types";

describe("JsonLogContentProcessor", () => {
  let processor: JsonLogContentProcessor;
  let context: ContentProcessingContext;

  beforeEach(() => {
    processor = new JsonLogContentProcessor();
    context = {
      isFromPaste: true,
      detectedLanguage: "plaintext",
      tabId: "test-tab",
      currentLanguage: "plaintext",
      languageLocked: false,
      previousContent: "",
    };
  });

  describe("canProcess", () => {
    it("should process pasted content with mixed JSON and non-JSON lines", () => {
      const content = `2024-01-01 10:00:00 [INFO] {"message": "test 1", "level": "info"}
{"message": "test 2", "level": "error"}
2024-01-01 10:00:02 [DEBUG] {"message": "test 3", "level": "debug"}`;

      const result = processor.canProcess(content, context);
      expect(result).toBe(true);
    });

    it("should not process non-pasted content", () => {
      const content = `{"message": "test 1"}
{"message": "test 2"}`;
      
      const nonPasteContext = { ...context, isFromPaste: false };
      const result = processor.canProcess(content, nonPasteContext);
      expect(result).toBe(false);
    });

    it("should not process already detected NDJSON", () => {
      const content = `{"message": "test 1"}
{"message": "test 2"}`;
      
      const ndjsonContext = { ...context, detectedLanguage: "ndjson" };
      const result = processor.canProcess(content, ndjsonContext);
      expect(result).toBe(false);
    });

    it("should not process already detected JSON", () => {
      const content = `{"message": "test 1"}
{"message": "test 2"}`;
      
      const jsonContext = { ...context, detectedLanguage: "json" };
      const result = processor.canProcess(content, jsonContext);
      expect(result).toBe(false);
    });

    it("should not process single line content", () => {
      const content = `2024-01-01 10:00:00 [INFO] {"message": "single line"}`;
      
      const result = processor.canProcess(content, context);
      expect(result).toBe(false);
    });

    it("should not process content with no JSON-like lines", () => {
      const content = `This is regular text
Another line of text
No JSON here`;
      
      const result = processor.canProcess(content, context);
      expect(result).toBe(false);
    });
  });

  describe("process", () => {
    it("should clean lines with timestamp prefixes", () => {
      const content = `2024-01-01 10:00:00 [INFO] {"message": "test 1", "level": "info"}
2024-01-01 10:00:01 [ERROR] {"message": "test 2", "level": "error"}
2024-01-01 10:00:02 [DEBUG] {"message": "test 3", "level": "debug"}`;

      const result = processor.process(content, context);
      
      expect(result.processed).toBe(true);
      expect(result.language).toBe("ndjson");
      expect(result.lockLanguage).toBe(true);
      
      const lines = result.content.split("\n");
      lines.forEach(line => {
        if (line.trim()) {
          expect(() => JSON.parse(line)).not.toThrow();
        }
      });
    });

    it("should unstringify double-escaped JSON", () => {
      const content = `"{\\"message\\": \\"test 1\\", \\"level\\": \\"info\\"}"
"{\\"message\\": \\"test 2\\", \\"level\\": \\"error\\"}"`;

      const result = processor.process(content, context);
      
      expect(result.processed).toBe(true);
      expect(result.language).toBe("ndjson");
      
      const lines = result.content.split("\n").filter(line => line.trim());
      expect(lines).toHaveLength(2);
      
      const firstParsed = JSON.parse(lines[0]);
      expect(firstParsed.message).toBe("test 1");
      expect(firstParsed.level).toBe("info");
    });

    it("should handle mixed valid and invalid lines", () => {
      const content = `{"message": "valid line 1"}
This is not JSON
{"message": "valid line 2"}
Another non-JSON line
{"message": "valid line 3"}`;

      const result = processor.process(content, context);
      
      expect(result.processed).toBe(true);
      expect(result.language).toBe("ndjson");
      
      const lines = result.content.split("\n");
      expect(lines).toHaveLength(5);
      
      // Valid JSON lines should be processed
      expect(() => JSON.parse(lines[0])).not.toThrow();
      expect(() => JSON.parse(lines[2])).not.toThrow();
      expect(() => JSON.parse(lines[4])).not.toThrow();
      
      // Invalid lines should be kept as-is
      expect(lines[1]).toBe("This is not JSON");
      expect(lines[3]).toBe("Another non-JSON line");
    });

    it("should not process content with low success ratio", () => {
      const content = `This is mostly text
{"message": "only one JSON line"}
More text here
And more text
Even more text`;

      const result = processor.process(content, context);
      
      expect(result.processed).toBe(false);
      expect(result.content).toBe(content);
    });

    it("should preserve empty lines", () => {
      const content = `{"message": "line 1"}

{"message": "line 2"}

{"message": "line 3"}`;

      const result = processor.process(content, context);
      
      expect(result.processed).toBe(true);
      const lines = result.content.split("\n");
      expect(lines).toHaveLength(5);
      expect(lines[1]).toBe("");
      expect(lines[3]).toBe("");
    });

    it("should handle complex log prefixes", () => {
      const content = `[2024-01-01T10:00:00.123Z] INFO web-server: {"requestId": "req_001", "message": "Request started"}
[2024-01-01T10:00:01.456Z] ERROR api-gateway: {"requestId": "req_002", "message": "Request failed", "error": "timeout"}`;

      const result = processor.process(content, context);
      
      expect(result.processed).toBe(true);
      expect(result.language).toBe("ndjson");
      
      const lines = result.content.split("\n").filter(line => line.trim());
      expect(lines).toHaveLength(2);
      
      const firstParsed = JSON.parse(lines[0]);
      expect(firstParsed.requestId).toBe("req_001");
      expect(firstParsed.message).toBe("Request started");
    });

    it("should include metadata in result", () => {
      const content = `prefix {"message": "test 1"}
prefix {"message": "test 2"}
prefix {"message": "test 3"}`;

      const result = processor.process(content, context);
      
      expect(result.processed).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.originalLines).toBe(3);
      expect(result.metadata?.processedLines).toBe(3);
      expect(result.metadata?.successRatio).toBe(100);
    });
  });

  describe("lossless output", () => {
    it("preserves 64-bit integers, number formatting and string escapes", () => {
      const content = [
        'INFO {"id": 12345678901234567890, "n": 1.50, "s": "a  b \\"q\\" {x}"}',
        'WARN {"id": 12345678901234567891, "n": 1e3}',
        '{"id":  12345678901234567892}',
      ].join("\n");

      const result = processor.process(content, context);

      expect(result.processed).toBe(true);
      expect(result.content.split("\n")).toEqual([
        '{"id":12345678901234567890,"n":1.50,"s":"a  b \\"q\\" {x}"}',
        '{"id":12345678901234567891,"n":1e3}',
        '{"id":12345678901234567892}',
      ]);
    });

    it("preserves big integers inside double-escaped JSON lines", () => {
      const inner = '{"id": 12345678901234567890}';
      const content = [JSON.stringify(inner), JSON.stringify(inner), 'x {"a": 1}'].join("\n");

      const result = processor.process(content, context);

      expect(result.content.split("\n")[0]).toBe('{"id":12345678901234567890}');
    });
  });

  describe("properties", () => {
    it("should have correct properties", () => {
      expect(processor.id).toBe("json-log-cleaner");
      expect(processor.name).toBe("JSON Log Cleaner");
      expect(processor.priority).toBe(95);
    });
  });
});