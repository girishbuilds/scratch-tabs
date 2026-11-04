import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * Java-style Properties format detector - focuses on flat key-value configuration files
 */
export class PropertiesFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "properties";
  name = "Properties";
  extensions = ["properties"];
  priority = 4; // Slightly lower than INI as structure is less unique

  sampleContent(): string {
    return `# Java-style Properties Configuration
# Application settings
app.name = My Application
app.version = 1.0.3
app.environment = production

# Database configuration using dot notation
database.host = localhost
database.port = 5432
database.username = admin
database.password = secret
database.pool.min = 5
database.pool.max = 20

# Server settings
server.port = 8080
server.timeout = 30000
server.ssl.enabled = false

# Features and toggles
feature.authentication = true
feature.logging = enabled
feature.debug.mode = false

# File paths and resources
log.file.path = /var/log/application.log
config.dir = /etc/myapp/
temp.directory = /tmp/myapp/
`;
  }

  /**
   * Detects Java-style Properties files by focusing on flat key-value pairs with dot notation
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 3) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let keyValuePairsCount = 0;
    let commentLinesCount = 0;
    let otherLinesCount = 0;
    let dotNotationCount = 0;

    const lines = content.split("\n");
    const nonEmptyTrimmedLines = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (nonEmptyTrimmedLines.length <= 3) {
      return this.noMatch();
    }

    if (this.hasYamlStructure(lines)) {
      return this.noMatch();
    }

    const keyValueRegex = /^\s*([a-zA-Z0-9_.-]+)\s*([:=])\s*(.*)/;
    const sectionRegex = /^\s*\[([^\]]+)\]\s*$/;
    const urlRegex = /https?:\/\/[^\s]+/i;

    for (const line of nonEmptyTrimmedLines) {
      if (line.startsWith("#") || line.startsWith("!")) {
        commentLinesCount++;
      } else if (sectionRegex.test(line)) {
        // CRITICAL ANTI-PATTERN: Properties files should not have sections
        return this.noMatch();
      } else if (urlRegex.test(line)) {
        otherLinesCount++;
      } else if (keyValueRegex.test(line)) {
        keyValuePairsCount++;
        
        // Check for dot notation (strong indicator of properties format)
        const keyMatch = line.match(/^\s*([a-zA-Z0-9_.-]+)\s*[:=]/);
        if (keyMatch && keyMatch[1].includes(".")) {
          dotNotationCount++;
        }
      } else {
        otherLinesCount++;
      }
    }

    const totalNonCommentLines = nonEmptyTrimmedLines.length - commentLinesCount;

    if (keyValuePairsCount === 0) {
      return this.noMatch();
    }

    // Primary signal: high ratio of key-value pairs
    if (totalNonCommentLines > 0) {
      const ratioValidPropertiesLines = keyValuePairsCount / totalNonCommentLines;
      
      if (ratioValidPropertiesLines >= 0.85) {
        confidenceScore += 0.5;
      } else if (ratioValidPropertiesLines >= 0.65) {
        confidenceScore += 0.3;
      } else if (ratioValidPropertiesLines >= 0.4) {
        confidenceScore += 0.1;
      } else {
        confidenceScore -= 0.2;
      }
    }

    // Significant boost for dot notation (very strong Properties indicator)
    if (dotNotationCount > 0 && keyValuePairsCount > 0) {
      const dotRatio = dotNotationCount / keyValuePairsCount;
      if (dotRatio >= 0.5) {
        confidenceScore += 0.4; // Strong boost
      } else if (dotRatio >= 0.25) {
        confidenceScore += 0.2;
      } else {
        confidenceScore += 0.1;
      }
    }

    // Bonus for key-value pairs
    if (keyValuePairsCount > 0) {
      confidenceScore += Math.min(keyValuePairsCount, 10) * 0.02;
    }

    // Small bonus for comments (common in properties files)
    if (commentLinesCount > 0 && keyValuePairsCount > 0) {
      confidenceScore += 0.05;
    }

    // Anti-patterns
    const antiPatterns = [
      { pattern: /\{|\}/g, weight: -0.4, threshold: 2 },
      { pattern: /<\w.*?>/g, weight: -0.5, threshold: 1 },
      {
        pattern: /\b(function|class|var|let|const|import|export|def|public|private)\b/i,
        weight: -0.6,
        threshold: 1,
      },
      {
        pattern: /\b(SELECT|FROM|WHERE|UPDATE|INSERT|CREATE|DROP|ALTER|DELETE)\b/i,
        weight: -0.6,
        threshold: 2,
      },
      { pattern: /=>|->|#!/g, weight: -0.5, threshold: 1 },
      { pattern: /https?:\/\/[^\s]+/gi, weight: -0.8, threshold: 1 },
    ];

    for (const ap of antiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches && matches.length >= ap.threshold) {
        if (confidenceScore < 0.7 || ap.pattern.source.includes("SELECT") || ap.pattern.source.includes("https")) {
          if (ap.pattern.source.includes("https")) {
            confidenceScore += ap.weight * Math.min(matches.length, 3);
          } else {
            confidenceScore += ap.weight;
          }
        }
      }
    }

    // Penalize if too many "other" lines
    if (
      totalNonCommentLines > 0 &&
      otherLinesCount > totalNonCommentLines * 0.4 &&
      confidenceScore > 0
    ) {
      confidenceScore *= 0.3;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match: need good key-value ratio and no sections
    const isMatch = confidenceScore >= 0.3 && keyValuePairsCount >= 1;

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && confidenceScore > 0.6 && dotNotationCount >= 2,
    };
  }

  /**
   * Properties files are flat. A `key:` line with no value followed by a more
   * indented line (a nested mapping), or `- item` list entries, is YAML.
   */
  private hasYamlStructure(lines: string[]): boolean {
    const significant = lines.filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith("#") && !t.startsWith("!");
    });
    const indentOf = (line: string) => line.length - line.trimStart().length;

    let listItems = 0;
    for (let i = 0; i < significant.length; i++) {
      const line = significant[i];
      if (/^\s*-\s+\S/.test(line)) listItems++;

      const next = significant[i + 1];
      if (
        next !== undefined &&
        /^\s*[a-zA-Z0-9_.-]+\s*:\s*$/.test(line) &&
        indentOf(next) > indentOf(line)
      ) {
        return true;
      }
    }
    return listItems >= 2;
  }

  getFileExtension(): string {
    return "properties";
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

    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "source.properties",
      ignoreCase: true,
      tokenPostfix: ".properties",

      tokenizer: {
        root: [
          [/^\s*[#!].*$/, "comment.properties"],
          
          // Key = Value with inline comment
          [
            /^\s*([^#!\s][^:=]*?)(\s*[:=]\s*)(.*?)(\s+[#!].*)$/,
            ["keyword.properties", "delimiter.properties", "string.properties", "comment.properties"],
          ],
          // Key = Value (no inline comment)
          [
            /^\s*([^#!\s][^:=]*?)(\s*[:=]\s*)(.*)$/,
            ["keyword.properties", "delimiter.properties", "string.properties"],
          ],
          // Key only
          [/^\s*([^#!\s][^:=]*?)\s*$/, "keyword.properties"],
        ],
      },
    });

    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" }, // Green for comments
        { token: "keyword", foreground: "4EC9B0", fontStyle: "bold" }, // Teal for keys
        { token: "delimiter", foreground: "d4d4d4" }, // Grey for = or :
        { token: "string", foreground: "CE9178" }, // Orange for values
        { token: "source", foreground: "d4d4d4" },
      ],
      colors: {},
    });

    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let maxKeyLengthBeforeDelim = 0;

        // First pass: find max key length for alignment
        lines.forEach((line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("#") && !trimmedLine.startsWith("!")) {
            const match = trimmedLine.match(/^([\w.-]+)\s*([:=])/);
            if (match) {
              maxKeyLengthBeforeDelim = Math.max(
                maxKeyLengthBeforeDelim,
                match[1].length,
              );
            }
          }
        });

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          if (
            !trimmedLine ||
            trimmedLine.startsWith("#") ||
            trimmedLine.startsWith("!")
          ) {
            return line;
          }

          const match = trimmedLine.match(/^([\w.-]+)(\s*[:=]\s*)(.*)$/);
          if (match) {
            const key = match[1];
            const delim = match[2].trim();
            const value = match[3].trim();
            const padding = " ".repeat(
              Math.max(0, maxKeyLengthBeforeDelim - key.length),
            );
            return `${key}${padding} ${delim} ${value}`;
          }
          return line;
        });

        return [
          {
            range: model.getFullModelRange(),
            text: formattedLines.join("\n"),
          },
        ];
      },
    });
  }
}

// Export for use by the Properties module
// Note: Registration is handled by src/formats/properties/index.ts
