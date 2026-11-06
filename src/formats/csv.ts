import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * Quote-aware split of `content` into records of fields.
 *
 * Quotes are only valid wrapping a whole field. Inside a quoted field a doubled
 * quote (RFC 4180) or a backslash-escaped quote is a literal quote, and
 * delimiters and newlines are plain text. Returns null when quoting is
 * malformed (a quote in the middle of an unquoted field, or text after a
 * closing quote), so prose with stray quotes is not mistaken for CSV.
 *
 * Blank lines are skipped. A record still open at the end of input is dropped:
 * detection samples the first lines of a file, which can cut a multi-line
 * quoted field in half.
 */
function parseDelimitedRecords(
  content: string,
  delimiter: string,
): string[][] | null {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let state: "start" | "unquoted" | "quoted" | "afterQuote" = "start";
  let recordHasContent = false;

  const endField = () => {
    fields.push(field);
    field = "";
    state = "start";
  };
  const endRecord = () => {
    if (recordHasContent) {
      endField();
      records.push(fields);
    }
    fields = [];
    field = "";
    state = "start";
    recordHasContent = false;
  };
  const isFieldEnd = (index: number): boolean => {
    let i = index;
    while (content[i] === " ") i++;
    return (
      i >= content.length ||
      content[i] === delimiter ||
      content[i] === "\n" ||
      content[i] === "\r"
    );
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (state === "quoted") {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          state = "afterQuote";
        }
      } else if (ch === "\\" && content[i + 1] === '"' && !isFieldEnd(i + 2)) {
        field += '"';
        i++;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === "\r" && content[i + 1] === "\n") continue;

    if (ch === "\n") {
      endRecord();
      continue;
    }

    if (ch === delimiter) {
      recordHasContent = true;
      endField();
      continue;
    }

    if (state === "afterQuote") {
      if (ch === " ") continue;
      return null; // text after the closing quote
    }

    if (state === "start") {
      if (ch === " ") {
        field += ch;
        continue;
      }
      recordHasContent = true;
      if (ch === '"' && field.trim() === "") {
        field = "";
        state = "quoted";
      } else {
        field += ch;
        state = "unquoted";
      }
      continue;
    }

    // unquoted
    if (ch === '"') return null; // quote inside an unquoted field
    field += ch;
  }

  // Input ended outside quotes: flush the last record. Inside quotes: drop it.
  if (state !== "quoted") endRecord();

  return records;
}

/**
 * CSV/TSV language detector (Simplified)
 */
export class CsvFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "csv";
  name = "CSV / TSV";
  extensions = ["csv", "tsv", "txt"];
  priority = 2; // Still relatively low due to potential for false positives with simple text

  sampleContent(): string {
    return `ID,First Name,Last Name,Email
1,John,Doe,john.doe@example.com
2,Jane,Smith,jane.smith@example.com
3,Michael,Johnson,michael.j@example.com`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return this.noMatch();
    }

    const lines = content
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0);

    // Requirement 1: Must have at least 3 lines
    if (lines.length < 3) {
      return this.noMatch();
    }

    // Reject markdown tables (which have | separators and --- patterns)
    if (lines.some(line => /^\s*\|.*\|\s*$/.test(line)) && 
        lines.some(line => /^\s*\|[\s-|:]*\|\s*$/.test(line))) {
      return this.noMatch();
    }

    // --- 1. Determine Delimiter ---
    // The delimiter with the most occurrences outside quotes in the first
    // record wins; a quoted comma ("Smith, Jane") is not a delimiter.
    const candidateDelimiters = [",", "\t", ";", "|"];
    let chosenDelimiter: string | null = null;
    let chosenRecords: string[][] = [];
    let maxDelimiterFrequency = 0;

    for (const delim of candidateDelimiters) {
      const records = parseDelimitedRecords(content, delim);
      if (!records || records.length === 0) continue;
      const occurrences = records[0].length - 1;
      if (occurrences > maxDelimiterFrequency) {
        maxDelimiterFrequency = occurrences;
        chosenDelimiter = delim;
        chosenRecords = records;
      }
    }

    if (!chosenDelimiter) {
      return this.noMatch();
    }
    const expectedDelimiterCount = maxDelimiterFrequency;

    // Must have at least 2 delimiters (3 columns minimum)
    if (expectedDelimiterCount < 2) {
      return this.noMatch();
    }

    // --- 2. Check All Records Have a Consistent Field Count ---
    if (chosenRecords.length < 3) {
      return this.noMatch();
    }
    if (chosenRecords.some((record) => record.length !== expectedDelimiterCount + 1)) {
      return this.noMatch();
    }

    // Simple confidence based on delimiter consistency
    const confidence = Math.min(0.85, 0.6 + expectedDelimiterCount * 0.05);
    
    return {
      match: true,
      confidence: confidence,
      matchedDefinitive: false,
    };
  }

  getFileExtension(): string {
    return "csv";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id;

    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // Basic Monarch tokenizer for CSV/TSV (same as before, very generic)
    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "text.csv",
      ignoreCase: true,
      tokenizer: {
        root: [
          [/,/, "delimiter.comma.csv"],
          [/\t/, "delimiter.tab.csv"],
          [/;/, "delimiter.semicolon.csv"],
          [/\|/, "delimiter.pipe.csv"],
          [/"([^"\\]|\\.)*"/, "string.quoted.double.csv"],
          [/'([^'\\]|\\.)*'/, "string.quoted.single.csv"],
          [/[^,\t;|"'""\r\n]+/, "identifier.csv"],
          [/["']/, "text.csv"],
        ],
      },
    });

    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        {
          token: "delimiter.comma.csv",
          foreground: "D4D4D4",
          fontStyle: "bold",
        },
        { token: "delimiter.tab.csv", foreground: "6A9955", fontStyle: "bold" },
        {
          token: "delimiter.semicolon.csv",
          foreground: "C586C0",
          fontStyle: "bold",
        },
        {
          token: "delimiter.pipe.csv",
          foreground: "569CD6",
          fontStyle: "bold",
        },
        { token: "string.quoted.double.csv", foreground: "CE9178" },
        { token: "string.quoted.single.csv", foreground: "CE9178" },
        { token: "identifier.csv", foreground: "9CDCFE" },
        { token: "text.csv", foreground: "D4D4D4" },
      ],
      colors: {
        "editor.foreground": "#d4d4d4",
      },
    });

    // Basic CSV formatter
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let detectedDelimiter = ",";

        if (lines.length > 0) {
          const header = lines[0];
          const counts = { ",": 0, "\t": 0, ";": 0, "|": 0 };
          for (const char of header) {
            if (char in counts) counts[char as keyof typeof counts]++;
          }
          let maxCount = 0;
          for (const [delim, count] of Object.entries(counts)) {
            if (count > maxCount) {
              maxCount = count;
              detectedDelimiter = delim;
            }
          }
          if (maxCount === 0 && header.length > 0) detectedDelimiter = ""; // Single column
        }

        const formattedLines = lines.map((line: string) => {
          if (!line.trim()) return line; // Preserve empty lines
          if (!detectedDelimiter) return line.trim();

          return line
            .split(detectedDelimiter)
            .map((field: string) => field.trim())
            .join(detectedDelimiter);
        });

        let finalText = formattedLines.join("\n");
        if (content.endsWith("\n") && finalText.trim() !== "") {
          if (!finalText.endsWith("\n")) {
            finalText += "\n";
          }
        } else {
          finalText = finalText.trimEnd();
        }

        return [
          {
            range: model.getFullModelRange(),
            text: finalText,
          },
        ];
      },
    });
  }
}

// Create and register the detector
const csvDetector = new CsvFormatDetector();
formatRegistry.register(csvDetector);

// Export for backward compatibility (optional)
export const registerCsvProvider = (monaco: any) => {
  csvDetector.registerProvider(monaco);
};
