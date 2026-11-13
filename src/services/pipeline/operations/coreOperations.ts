import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

/**
 * Redacts a value based on its type
 */
function getRedactedValue(type: string, value: string): string {
    if (type === "email") {
        const [user, domain] = value.split("@");
        if (!domain) return "[REDACTED]";
        return `${user[0]}${"*".repeat(3)}${user[user.length - 1] || ""}@${domain[0]}${"*".repeat(3)}${domain[domain.length - 1] || ""}`;
    }
    if (type === "ipv4") {
        return value.split(".").map((part, i) => (i < 2 ? part : "***")).join(".");
    }
    if (type === "cc") {
        return `${value.slice(0, 4)}-****-****-${value.slice(-4)}`;
    }
    return "[REDACTED]";
}

function slugify(text: string, sep: string): string {
    // Characters that don't decompose cleanly via NFD (ligatures, stroked letters, etc.)
    // Using explicit \u escapes for safety across all transpilers and runtime environments.
    const overrides: Record<string, string> = {
        "Æ": "AE", "æ": "ae",  // Æ æ
        "Œ": "OE", "œ": "oe",  // Œ œ
        "ß": "ss",                   // ß
        "Ø": "o",  "ø": "o",   // Ø ø
        "Þ": "th", "þ": "th",  // Þ þ
        "Ð": "d",  "ð": "d",   // Ð ð
    };
    const result = Array.from(text)
        .map((c) => overrides[c] ?? c)
        .join("")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, sep);
    return sep === "-"
        ? result.replace(/^-+|-+$/g, "")
        : result.replace(/^_+|_+$/g, "");
}

/**
 * Core Pipeline Operations
 *
 * Generic text transformations available to all formats and tablets.
 * These were formerly part of BatchTools.
 */
const coreOperations: OperationDefinition[] = [
    // === WHITESPACE & CLEANUP ===
    {
        id: "text.trim",
        name: "Trim Lines",
        description: "Remove leading and trailing whitespace from each line",
        categories: ["text", "cleanup"],
        parameters: [],
        processingMode: "line",
        execute: (input) => input.trim(),
        keywords: ["trim", "whitespace", "strip"],
        source: "core",
    },
    {
        id: "text.remove-blank-lines",
        name: "Remove Blank Lines",
        description: "Remove all empty or whitespace-only lines",
        categories: ["text", "cleanup"],
        parameters: [],
        execute: (input) => {
            return input
                .split("\n")
                .filter((line) => line.trim() !== "")
                .join("\n");
        },
        keywords: ["blank", "empty", "remove"],
        source: "core",
    },
    {
        id: "text.remove-extra-blank-lines",
        name: "Remove Extra Blank Lines",
        description: "Collapse consecutive blank lines into single blank lines",
        categories: ["text", "cleanup"],
        parameters: [],
        execute: (input) => {
            const lines = input.split("\n");
            const result: string[] = [];
            let lastWasEmpty = false;

            for (const line of lines) {
                const isEmpty = line.trim() === "";
                if (!isEmpty || !lastWasEmpty) {
                    result.push(line);
                }
                lastWasEmpty = isEmpty;
            }

            return result.join("\n");
        },
        keywords: ["blank", "empty", "collapse", "consecutive"],
        source: "core",
    },
    {
        id: "text.remove-extra-whitespace",
        name: "Remove Extra Whitespace",
        description: "Collapse multiple spaces or remove all whitespace",
        categories: ["text", "cleanup"],
        parameters: [
            {
                name: "mode",
                label: "Mode",
                type: "select",
                default: "preserve-single",
                options: [
                    { value: "preserve-single", label: "Preserve Single Space" },
                    { value: "remove-all", label: "Remove All Whitespace" },
                ],
            },
        ],
        processingMode: "configurable",
        execute: (input, params) => {
            const mode = (params.mode as string) ?? "preserve-single";
            if (mode === "preserve-single") {
                return input.replace(/\s+/g, " ");
            } else {
                return input.replace(/\s+/g, "");
            }
        },
        keywords: ["whitespace", "space", "collapse", "clean"],
        source: "core",
    },

    // === CASE CONVERSION ===
    {
        id: "text.uppercase",
        name: "Uppercase",
        description: "Convert all text to uppercase",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => input.toUpperCase(),
        keywords: ["upper", "capitalize", "case"],
        source: "core",
    },
    {
        id: "text.lowercase",
        name: "Lowercase",
        description: "Convert all text to lowercase",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => input.toLowerCase(),
        keywords: ["lower", "case"],
        source: "core",
    },
    {
        id: "text.title-case",
        name: "Title Case",
        description: "Capitalize the first letter of each word",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input.replace(
                /\w\S*/g,
                (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
            );
        },
        keywords: ["title", "capitalize", "case"],
        source: "core",
    },
    {
        id: "text.sentence-case",
        name: "Sentence Case",
        description: "Capitalize the first letter of the text",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "configurable",
        execute: (input) => {
            return input
                .split("\n")
                .map((line) => {
                    if (!line) return "";
                    return line.charAt(0).toUpperCase() + line.slice(1).toLowerCase();
                })
                .join("\n");
        },
        keywords: ["sentence", "capitalize", "case"],
        source: "core",
    },
    {
        id: "text.camel-case",
        name: "camelCase",
        description: "Convert text to camelCase",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .split("\n")
                .map((line) => {
                    return line
                        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
                            index === 0 ? word.toLowerCase() : word.toUpperCase(),
                        )
                        .replace(/[ \t]+/g, "");
                })
                .join("\n");
        },
        keywords: ["camel", "case", "programming"],
        source: "core",
    },
    {
        id: "text.pascal-case",
        name: "PascalCase",
        description: "Convert text to PascalCase",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .split("\n")
                .map((line) => {
                    return line
                        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
                        .replace(/[ \t]+/g, "");
                })
                .join("\n");
        },
        keywords: ["pascal", "case", "programming"],
        source: "core",
    },
    {
        id: "text.kebab-case",
        name: "kebab-case",
        description: "Convert text to kebab-case",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .split("\n")
                .map((line) => line.toLowerCase().replace(/[ \t]+/g, "-"))
                .join("\n");
        },
        keywords: ["kebab", "case", "dash"],
        source: "core",
    },
    {
        id: "text.snake-case",
        name: "snake_case",
        description: "Convert text to snake_case",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .split("\n")
                .map((line) => line.toLowerCase().replace(/[ \t]+/g, "_"))
                .join("\n");
        },
        keywords: ["snake", "case", "underscore"],
        source: "core",
    },
    {
        id: "text.screaming-snake-case",
        name: "SCREAMING_SNAKE_CASE",
        description: "Convert text to SCREAMING_SNAKE_CASE",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .split("\n")
                .map((line) => {
                    return line
                        .replace(/([a-z])([A-Z])/g, "$1_$2")
                        .toUpperCase()
                        .replace(/[^A-Z0-9]+/g, "_")
                        .replace(/^_+|_+$/g, "");
                })
                .join("\n");
        },
        keywords: ["screaming", "snake", "case", "constant"],
        source: "core",
    },
    {
        id: "text.invert-case",
        name: "Invert Case",
        description: "Flip the case of each character",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .split("")
                .map((char) =>
                    char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase(),
                )
                .join("");
        },
        keywords: ["invert", "flip", "swap", "case"],
        source: "core",
    },
    {
        id: "text.alternating-case",
        name: "Alternating Case",
        description: "aLtErNaTiNg CaSe",
        categories: ["text", "case"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .split("")
                .map((char, index) =>
                    index % 2 === 0 ? char.toLowerCase() : char.toUpperCase(),
                )
                .join("");
        },
        keywords: ["alternating", "swirl", "case", "meme"],
        source: "core",
    },

    // === DUPLICATES ===
    {
        id: "text.remove-duplicates",
        name: "Remove Duplicate Lines",
        description: "Remove duplicate lines, keeping first occurrence",
        categories: ["text", "cleanup"],
        parameters: [],
        execute: (input) => {
            const seen = new Set<string>();
            const result: string[] = [];

            for (const line of input.split("\n")) {
                if (!seen.has(line)) {
                    seen.add(line);
                    result.push(line);
                }
            }

            return result.join("\n");
        },
        keywords: ["duplicate", "unique", "distinct"],
        source: "core",
    },

    // === TEXT TRANSFORMATIONS ===
    {
        id: "text.remove-diacritics",
        name: "Remove Diacritics",
        description: "Replace accented characters with ASCII equivalents (é → e, ñ → n)",
        categories: ["text", "cleanup"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            // Unicode normalization form D separates characters from their diacritics
            // Then we remove the combining diacritical marks (U+0300 to U+036F)
            return input
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        },
        keywords: ["diacritics", "accents", "normalize", "ascii", "unicode"],
        source: "core",
    },
    {
        id: "text.frequency",
        name: "Word/Character Frequency",
        description: "Count occurrences of unique lines, words, or characters",
        categories: ["text", "utilities"],
        parameters: [
            {
                name: "mode",
                label: "Count Mode",
                type: "select",
                default: "lines",
                options: [
                    { value: "lines", label: "Lines" },
                    { value: "words", label: "Words" },
                    { value: "chars", label: "Characters" }
                ]
            },
            {
                name: "sortBy",
                label: "Sort By",
                type: "select",
                default: "frequency",
                options: [
                    { value: "frequency", label: "Frequency (high to low)" },
                    { value: "alphabetical", label: "Alphabetical" }
                ]
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "text",
                options: [
                    { value: "text", label: "Text (item: count)" },
                    { value: "csv", label: "CSV" },
                    { value: "json", label: "JSON" }
                ]
            }
        ],
        execute: (input, params) => {
            const mode = (params.mode as string) ?? "lines";
            const sortBy = (params.sortBy as string) ?? "frequency";
            const outputFormat = (params.outputFormat as string) ?? "text";

            // Build frequency map
            const freqMap = new Map<string, number>();

            let items: string[];
            if (mode === "lines") {
                items = input.split('\n');
            } else if (mode === "words") {
                items = input.split(/\s+/).filter(w => w.trim());
            } else {
                items = input.split('');
            }

            items.forEach(item => {
                freqMap.set(item, (freqMap.get(item) || 0) + 1);
            });

            // Sort entries
            let entries = Array.from(freqMap.entries());
            if (sortBy === "frequency") {
                entries.sort((a, b) => b[1] - a[1]);
            } else {
                entries.sort((a, b) => a[0].localeCompare(b[0]));
            }

            // Format output
            if (outputFormat === "json") {
                const obj = Object.fromEntries(entries);
                return JSON.stringify(obj, null, 2);
            } else if (outputFormat === "csv") {
                return ['Item,Count', ...entries.map(([item, count]) => {
                    // Escape CSV values if they contain commas or quotes
                    const escapedItem = item.includes(',') || item.includes('"')
                        ? `"${item.replace(/"/g, '""')}"`
                        : item;
                    return `${escapedItem},${count}`;
                })].join('\n');
            } else {
                return entries.map(([item, count]) => `${item}: ${count}`).join('\n');
            }
        },
        keywords: ["frequency", "count", "occurrence", "statistics", "histogram", "distribution"],
        source: "core",
    },

    // === SORTING & LINE ORDER ===
    {
        id: "text.sort",
        name: "Sort Lines",
        description: "Sort lines using various algorithms",
        categories: ["text", "sorting"],
        parameters: [
            {
                name: "mode",
                label: "Sort Mode",
                type: "select",
                default: "asc",
                options: [
                    { value: "asc", label: "Alphabetical (A-Z)" },
                    { value: "desc", label: "Alphabetical (Z-A)" },
                    { value: "natural", label: "Natural Sort" },
                    { value: "numeric-asc", label: "Numeric (Ascending)" },
                    { value: "numeric-desc", label: "Numeric (Descending)" },
                    { value: "length", label: "By Length" },
                ],
            },
        ],
        execute: (input, params) => {
            const mode = (params.mode as string) ?? "asc";
            const lines = input.split("\n");

            switch (mode) {
                case "asc":
                    return lines.sort().join("\n");
                case "desc":
                    return lines.sort().reverse().join("\n");
                case "natural":
                    return lines.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join("\n");
                case "numeric-asc":
                    return lines.sort((a, b) => {
                        const numA = parseFloat(a.replace(/[^\d.-]/g, ""));
                        const numB = parseFloat(b.replace(/[^\d.-]/g, ""));
                        return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
                    }).join("\n");
                case "numeric-desc":
                    return lines.sort((a, b) => {
                        const numA = parseFloat(a.replace(/[^\d.-]/g, ""));
                        const numB = parseFloat(b.replace(/[^\d.-]/g, ""));
                        return (isNaN(numB) ? 0 : numB) - (isNaN(numA) ? 0 : numA);
                    }).join("\n");
                case "length":
                    return lines.sort((a, b) => a.length - b.length).join("\n");
                default:
                    return lines.sort().join("\n");
            }
        },
        keywords: ["sort", "alphabetical", "natural", "numeric", "length"],
        source: "core",
    },
    {
        id: "text.reverse-lines",
        name: "Reverse Lines",
        description: "Reverse the order of all lines",
        categories: ["text", "sorting"],
        parameters: [],
        execute: (input) => {
            return input.split("\n").reverse().join("\n");
        },
        keywords: ["reverse", "flip", "order"],
        source: "core",
    },
    {
        id: "text.reverse",
        name: "Reverse Text",
        description: "Reverse the characters in the text",
        categories: ["text"],
        parameters: [
            {
                name: "mode",
                label: "Mode",
                type: "select",
                default: "all",
                options: [
                    { value: "all", label: "Entire text" },
                    { value: "per-line", label: "Each line separately" },
                    { value: "words", label: "Each word separately" },
                ]
            }
        ],
        execute: (input, params) => {
            const mode = (params.mode as string) ?? "all";

            const reverseString = (str: string) => [...str].reverse().join('');

            switch (mode) {
                case "per-line":
                    return input.split('\n').map(reverseString).join('\n');
                case "words":
                    return input.split(/(\s+)/).map(part => {
                        // Only reverse non-whitespace parts
                        return /\s/.test(part) ? part : reverseString(part);
                    }).join('');
                default: // all
                    return reverseString(input);
            }
        },
        keywords: ["reverse", "flip", "backwards", "mirror"],
        source: "core",
    },
    {
        id: "text.statistics",
        name: "Text Statistics",
        description: "Count characters, words, lines, and other statistics",
        categories: ["text", "utilities"],
        parameters: [
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "text",
                options: [
                    { value: "text", label: "Plain Text" },
                    { value: "json", label: "JSON" },
                ]
            }
        ],
        execute: (input, params) => {
            const outputFormat = (params.outputFormat as string) ?? "text";

            const chars = input.length;
            const charsNoSpaces = input.replace(/\s/g, '').length;
            const words = input.split(/\s+/).filter(w => w.trim().length > 0).length;
            const lines = input.split('\n').length;
            const nonBlankLines = input.split('\n').filter(l => l.trim().length > 0).length;
            const sentences = (input.match(/[.!?]+/g) || []).length;
            const paragraphs = input.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

            // Calculate average word length
            const wordList = input.split(/\s+/).filter(w => w.trim().length > 0);
            const avgWordLength = wordList.length > 0
                ? (wordList.reduce((sum, w) => sum + w.length, 0) / wordList.length).toFixed(1)
                : 0;

            const stats = {
                characters: chars,
                charactersNoSpaces: charsNoSpaces,
                words,
                lines,
                nonBlankLines,
                sentences,
                paragraphs,
                averageWordLength: parseFloat(avgWordLength as string),
            };

            if (outputFormat === "json") {
                return JSON.stringify(stats, null, 2);
            }

            return [
                `Characters: ${chars}`,
                `Characters (no spaces): ${charsNoSpaces}`,
                `Words: ${words}`,
                `Lines: ${lines}`,
                `Non-blank lines: ${nonBlankLines}`,
                `Sentences: ${sentences}`,
                `Paragraphs: ${paragraphs}`,
                `Avg word length: ${avgWordLength}`,
            ].join('\n');
        },
        keywords: ["count", "statistics", "words", "characters", "lines", "length"],
        source: "core",
    },
    {
        id: "text.shuffle-lines",
        name: "Shuffle Lines",
        description: "Randomly reorder all lines",
        categories: ["text", "sorting"],
        parameters: [],
        execute: (input) => {
            const lines = input.split("\n");
            for (let i = lines.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [lines[i], lines[j]] = [lines[j], lines[i]];
            }
            return lines.join("\n");
        },
        keywords: ["shuffle", "random", "reorder", "lines"],
        source: "core",
    },

    // === FILTERING & SELECTION ===
    {
        id: "text.filter-regex",
        name: "Filter by Regex",
        description: "Keep or remove lines that match a regular expression",
        categories: ["text", "filtering"],
        parameters: [
            {
                name: "pattern",
                label: "Regex Pattern",
                type: "string",
                default: "",
                description: "Regular expression to match",
            },
            {
                name: "action",
                label: "Action",
                type: "select",
                default: "keep",
                options: [
                    { value: "keep", label: "Keep matching lines" },
                    { value: "remove", label: "Remove matching lines" },
                ],
            },
            {
                name: "caseSensitive",
                label: "Case Sensitive",
                type: "boolean",
                default: false,
            },
        ],
        execute: (input, params) => {
            const pattern = params.pattern as string;
            if (!pattern) return input;
            const action = (params.action as string) ?? "keep";
            const caseSensitive = params.caseSensitive as boolean;

            try {
                const regex = new RegExp(pattern, caseSensitive ? "" : "i");
                return input
                    .split("\n")
                    .filter((line) => {
                        const matches = regex.test(line);
                        return action === "keep" ? matches : !matches;
                    })
                    .join("\n");
            } catch (e) {
                return input;
            }
        },
        keywords: ["filter", "regex", "search", "match"],
        source: "core",
    },
    {
        id: "text.filter-keyword",
        name: "Filter by Keyword",
        description: "Keep or remove lines containing a keyword",
        categories: ["text", "filtering"],
        parameters: [
            {
                name: "keyword",
                label: "Keyword",
                type: "string",
                default: "",
            },
            {
                name: "action",
                label: "Action",
                type: "select",
                default: "keep",
                options: [
                    { value: "keep", label: "Keep matching lines" },
                    { value: "remove", label: "Remove matching lines" },
                ],
            },
            {
                name: "position",
                label: "Position",
                type: "select",
                default: "contains",
                options: [
                    { value: "contains", label: "Contains" },
                    { value: "starts", label: "Starts with" },
                    { value: "ends", label: "Ends with" },
                ],
            },
        ],
        execute: (input, params) => {
            const keyword = (params.keyword as string ?? "").toLowerCase();
            if (!keyword) return input;
            const action = (params.action as string) ?? "keep";
            const position = (params.position as string) ?? "contains";

            return input
                .split("\n")
                .filter((line) => {
                    const lowerLine = line.toLowerCase();
                    let matches = false;
                    if (position === "contains") matches = lowerLine.includes(keyword);
                    else if (position === "starts") matches = lowerLine.startsWith(keyword);
                    else if (position === "ends") matches = lowerLine.endsWith(keyword);

                    return action === "keep" ? matches : !matches;
                })
                .join("\n");
        },
        keywords: ["filter", "keyword", "search", "match"],
        source: "core",
    },
    {
        id: "text.keep-first-n",
        name: "Keep First N Lines",
        description: "Keep only the first N lines of text",
        categories: ["text", "filtering"],
        parameters: [
            {
                name: "n",
                label: "Number of lines",
                type: "number",
                default: 10,
            },
        ],
        execute: (input, params) => {
            const n = (params.n as number) ?? 10;
            return input.split("\n").slice(0, n).join("\n");
        },
        keywords: ["head", "first", "limit", "filter"],
        source: "core",
    },
    {
        id: "text.keep-last-n",
        name: "Keep Last N Lines",
        description: "Keep only the last N lines of text",
        categories: ["text", "filtering"],
        parameters: [
            {
                name: "n",
                label: "Number of lines",
                type: "number",
                default: 10,
            },
        ],
        execute: (input, params) => {
            const n = (params.n as number) ?? 10;
            return input.split("\n").slice(-n).join("\n");
        },
        keywords: ["tail", "last", "limit", "filter"],
        source: "core",
    },
    {
        id: "text.add-line-numbers",
        name: "Add Line Numbers",
        description: "Add a number to the start of each line",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "style",
                label: "Style",
                type: "select",
                default: "numeric",
                options: [
                    { value: "numeric", label: "1, 2, 3..." },
                    { value: "roman", label: "I, II, III..." },
                    { value: "alpha", label: "A, B, C..." },
                ],
            },
        ],
        processingMode: "line",
        execute: (input, params, context) => {
            const style = (params.style as string) ?? "numeric";
            const index = context.lineIndex ?? 0;
            let prefix: string;
            switch (style) {
                case "numeric":
                    prefix = `${index + 1}. `;
                    break;
                case "roman":
                    prefix = `${toRoman(index + 1)}. `;
                    break;
                case "alpha":
                    prefix = `${toAlpha(index + 1)}. `;
                    break;
                default:
                    prefix = `${index + 1}. `;
            }
            return prefix + input;
        },
        keywords: ["number", "index", "list"],
        source: "core",
    },
    {
        id: "text.wrap-lines",
        name: "Wrap Lines",
        description: "Wrap long lines to a specific width",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "width",
                label: "Width",
                type: "number",
                default: 80,
                description: "Maximum line width",
            },
        ],
        execute: (input, params) => {
            const width = (params.width as number) ?? 80;
            return wrapText(input, width);
        },
        keywords: ["wrap", "length", "format"],
        source: "core",
    },
    {
        id: "text.pad-lines",
        name: "Pad Lines",
        description: "Pad lines to a specific length",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "length",
                label: "Desired Length",
                type: "number",
                default: 20,
            },
            {
                name: "align",
                label: "Alignment",
                type: "select",
                default: "left",
                options: [
                    { value: "left", label: "Left (Pad right)" },
                    { value: "right", label: "Right (Pad left)" },
                    { value: "center", label: "Center" },
                ],
            },
            {
                name: "char",
                label: "Padding Character",
                type: "string",
                default: "",
            },
        ],
        processingMode: "line",
        execute: (input, params) => {
            const length = (params.length as number) ?? 20;
            const align = (params.align as string) ?? "left";
            const char = (params.char as string) || " ";

            if (input.length >= length) return input;

            if (align === "left") {
                return input.padEnd(length, char);
            }
            if (align === "right") {
                return input.padStart(length, char);
            }

            // Center padding
            const totalPadding = length - input.length;
            const leftPadLen = Math.floor(totalPadding / 2);
            const leftPart = "".padStart(leftPadLen, char);
            return (leftPart + input).padEnd(length, char);
        },
        keywords: ["pad", "align", "formatting"],
        source: "core",
    },
    {
        id: "text.change-indentation",
        name: "Change Indentation",
        description: "Add or remove leading tabs or spaces",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "action",
                label: "Action",
                type: "select",
                default: "add",
                options: [
                    { value: "add", label: "Add" },
                    { value: "remove", label: "Remove" },
                ],
            },
            {
                name: "type",
                label: "Type",
                type: "select",
                default: "spaces",
                options: [
                    { value: "spaces", label: "Spaces" },
                    { value: "tabs", label: "Tabs" },
                ],
            },
            {
                name: "amount",
                label: "Amount",
                type: "number",
                default: 2,
            },
        ],
        processingMode: "line",
        execute: (input, params) => {
            const action = (params.action as string) ?? "add";
            const type = (params.type as string) ?? "spaces";
            const amount = (params.amount as number) ?? 2;
            const indentStr = type === "spaces" ? " ".repeat(amount) : "\t".repeat(amount);

            if (action === "add") return indentStr + input;
            if (input.startsWith(indentStr)) return input.slice(indentStr.length);
            return input;
        },
        keywords: ["indent", "formatting", "spaces", "tabs"],
        source: "core",
    },
    {
        id: "text.convert-tabs-spaces",
        name: "Convert Tabs/Spaces",
        description: "Convert tabs to spaces or vice versa",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "mode",
                label: "Mode",
                type: "select",
                default: "tabs-to-spaces",
                options: [
                    { value: "tabs-to-spaces", label: "Tabs to Spaces (4)" },
                    { value: "spaces-to-tabs", label: "Spaces (4) to Tabs" },
                ],
            },
        ],
        execute: (input, params) => {
            const mode = (params.mode as string) ?? "tabs-to-spaces";
            if (mode === "tabs-to-spaces") return input.replace(/\t/g, "    ");
            return input.replace(/ {4}/g, "\t");
        },
        keywords: ["tabs", "spaces", "convert", "formatting"],
        source: "core",
    },
    {
        id: "text.normalize-line-endings",
        name: "Normalize Line Endings",
        description: "Convert line endings to LF or CRLF",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "mode",
                label: "Mode",
                type: "select",
                default: "lf",
                options: [
                    { value: "lf", label: "LF (Unix)" },
                    { value: "crlf", label: "CRLF (Windows)" },
                ],
            },
        ],
        execute: (input, params) => {
            const mode = (params.mode as string) ?? "lf";
            const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            if (mode === "lf") return normalized;
            return normalized.replace(/\n/g, "\r\n");
        },
        keywords: ["newline", "crlf", "lf", "normalize", "formatting"],
        source: "core",
    },

    // === JOIN/SPLIT ===
    {
        id: "text.join-lines",
        name: "Join Lines",
        description: "Join all lines with a specified separator",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "separator",
                label: "Separator",
                type: "string",
                default: ", ",
                description: "String to use between lines",
            },
        ],
        execute: (input, params) => {
            const separator = (params.separator as string) ?? ", ";
            return input.split("\n").join(separator);
        },
        keywords: ["join", "merge", "combine", "concatenate"],
        source: "core",
    },
    {
        id: "text.split-lines",
        name: "Split into Lines",
        description: "Split text by a separator into separate lines",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "separator",
                label: "Separator",
                type: "string",
                default: ", ",
                description: "String to split on",
            },
        ],
        execute: (input, params) => {
            const separator = (params.separator as string) ?? ", ";
            return input.split(separator).join("\n");
        },
        keywords: ["split", "divide", "separate"],
        source: "core",
    },

    // === PREFIX/SUFFIX ===
    {
        id: "text.add-prefix",
        name: "Add Prefix",
        description: "Add text to the beginning of each line",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "prefix",
                label: "Prefix",
                type: "string",
                default: "",
                description: "Text to add at the start of each line",
                placeholder: "Enter prefix text...",
            },
        ],
        processingMode: "line",
        execute: (input, params) => {
            const prefix = (params.prefix as string) ?? "";
            return prefix + input;
        },
        keywords: ["prefix", "prepend", "start"],
        source: "core",
    },
    {
        id: "text.add-suffix",
        name: "Add Suffix",
        description: "Add text to the end of each line",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "suffix",
                label: "Suffix",
                type: "string",
                default: "",
                description: "Text to add at the end of each line",
                placeholder: "Enter suffix text...",
            },
        ],
        processingMode: "line",
        execute: (input, params) => {
            const suffix = (params.suffix as string) ?? "";
            return input + suffix;
        },
        keywords: ["suffix", "append", "end"],
        source: "core",
    },

    {
        id: "text.remove-chars",
        name: "Remove Characters",
        description: "Remove N characters from the start, end, or both ends of each line",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "count",
                label: "Characters to remove",
                type: "number",
                default: 1,
                description: "Number of characters to remove (from each end when 'Both' is selected)",
            },
            {
                name: "from",
                label: "Remove from",
                type: "select",
                default: "start",
                options: [
                    { value: "start", label: "Start of line" },
                    { value: "end", label: "End of line" },
                    { value: "both", label: "Both ends" },
                ],
            },
        ],
        processingMode: "line",
        execute: (input, params) => {
            const rawCount = Number(params.count ?? 1);
            const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
            const from = (params.from as string) ?? "start";
            if (count === 0) return input;

            // Operate on code points so emoji and other astral characters count as one character
            const chars = Array.from(input);
            switch (from) {
                case "end":
                    return chars.slice(0, Math.max(0, chars.length - count)).join("");
                case "both":
                    return chars.length <= count * 2
                        ? ""
                        : chars.slice(count, chars.length - count).join("");
                case "start":
                default:
                    return chars.slice(count).join("");
            }
        },
        keywords: ["remove", "delete", "cut", "chop", "strip", "trim", "characters", "first", "last", "left", "right", "truncate"],
        source: "core",
    },

    // === FIND/REPLACE ===
    {
        id: "text.duplicate-lines",
        name: "Duplicate Lines",
        description: "Repeat each line N times",
        categories: ["text", "lines"],
        parameters: [
            {
                name: "count",
                label: "Count",
                type: "number",
                default: 2,
            },
        ],
        execute: (input, params) => {
            const count = (params.count as number) ?? 2;
            return input
                .split("\n")
                .map((line) => line + ("\n" + line).repeat(count - 1))
                .join("\n");
        },
        keywords: ["duplicate", "repeat", "lines"],
        source: "core",
    },
    {
        id: "text.find-replace-regex",
        name: "Find & Replace (Regex)",
        description: "Find and replace using regular expressions",
        categories: ["text", "search"],
        parameters: [
            {
                name: "find",
                label: "Find Pattern",
                type: "string",
                default: "",
                description: "Regular expression pattern to find",
                placeholder: "e.g. \\d+ or [a-z]+",
            },
            {
                name: "replace",
                label: "Replace With",
                type: "string",
                default: "",
                description: "Replacement text (supports $1, $2, etc.)",
                placeholder: "Replacement text",
            },
            {
                name: "flags",
                label: "Flags",
                type: "string",
                default: "gm",
                description: "Regex flags (g=global, m=multiline, i=case-insensitive)",
            },
        ],
        execute: (input, params) => {
            const find = params.find as string;
            const replace = (params.replace as string) ?? "";
            const flags = (params.flags as string) ?? "gm";

            if (!find) return input;

            try {
                const regex = new RegExp(find, flags);
                return input.replace(regex, replace);
            } catch (e) {
                return input;
            }
        },
        keywords: ["find", "replace", "regex", "regex"],
        source: "core",
    },

    // === ADVANCED & REDACTION ===
    {
        id: "text.apply-redaction",
        name: "Redact Sensitive Data",
        description: "Mask sensitive patterns like emails, IP addresses, and credit cards",
        categories: ["advanced", "redaction"],
        parameters: [
            {
                name: "types",
                label: "Patterns to Redact",
                type: "multiselect",
                default: ["email", "ipv4", "cc"],
                options: [
                    { value: "email", label: "Email Addresses" },
                    { value: "ipv4", label: "IPv4 Addresses" },
                    { value: "cc", label: "Credit Cards" },
                    { value: "ssn", label: "SSN (US)" },
                    { value: "phone", label: "Phone Numbers" },
                    { value: "guid", label: "GUID/UUID" },
                ],
            },
            {
                name: "mode",
                label: "Redaction Mode",
                type: "select",
                default: "mask",
                options: [
                    { value: "mask", label: "Mask (e.g., [REDACTED])" },
                    { value: "obfuscate", label: "Obfuscate (e.g., e***l@h***.com)" },
                ],
            },
            {
                name: "customPatterns",
                label: "Custom Regex Patterns",
                type: "textarea",
                default: "",
                description: "One regex per line",
                placeholder: "pattern1\npattern2",
            },
        ],
        execute: (input, params) => {
            const types = (params.types as string[]) ?? ["email", "ipv4", "cc"];
            const mode = (params.mode as string) ?? "mask";
            const customPatternsStr = (params.customPatterns as string) ?? "";

            let result = input;

            // Standard patterns
            const patterns: Record<string, RegExp> = {
                email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
                ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
                cc: /\b(?:\d{4}-?){3}\d{4}\b|\b\d{13,16}\b/g,
                ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
                phone: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
                guid: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
            };

            const redactionMask = mode === "mask" ? "[REDACTED]" : null;

            types.forEach(type => {
                const regex = patterns[type];
                if (regex) {
                    result = result.replace(regex, (match) => redactionMask ?? getRedactedValue(type, match));
                }
            });

            // Custom patterns
            if (customPatternsStr) {
                customPatternsStr.split("\n").forEach(p => {
                    if (p.trim()) {
                        try {
                            const regex = new RegExp(p, "g");
                            result = result.replace(regex, redactionMask ?? "[REDACTED]");
                        } catch (e) { }
                    }
                });
            }

            return result;
        },
        keywords: ["redact", "mask", "privacy", "security", "pii"],
        source: "core",
    },
    {
        id: "text.obfuscate",
        name: "Obfuscate Text",
        description: "Hide the middle of a sensitive value while preserving configurable characters at the start and end",
        categories: ["text", "redaction", "privacy"],
        parameters: [
            {
                name: "revealStart",
                label: "Reveal Start",
                type: "number",
                default: 4,
                min: 0,
                max: 100,
                description: "Characters to keep visible at the beginning",
            },
            {
                name: "revealEnd",
                label: "Reveal End",
                type: "number",
                default: 4,
                min: 0,
                max: 100,
                description: "Characters to keep visible at the end",
            },
            {
                name: "mask",
                label: "Mask",
                type: "string",
                default: "***",
                description: "Replacement shown for the hidden middle",
            },
            {
                name: "perLine",
                label: "Obfuscate Each Line",
                type: "boolean",
                default: false,
            },
        ],
        execute: (input, params) => {
            const revealStart = Math.max(0, (params.revealStart as number) ?? 4);
            const revealEnd = Math.max(0, (params.revealEnd as number) ?? 4);
            const mask = (params.mask as string) ?? "***";
            const perLine = params.perLine ?? false;

            const obfuscate = (value: string): string => {
                if (!value) return value;
                if (revealStart + revealEnd >= value.length) return mask;
                return `${value.slice(0, revealStart)}${mask}${value.slice(value.length - revealEnd)}`;
            };

            return perLine
                ? input.split("\n").map(obfuscate).join("\n")
                : obfuscate(input);
        },
        keywords: ["obfuscate", "mask", "token", "secret", "privacy", "redact"],
        source: "core",
    },
    {
        id: "text.javascript-snippet",
        name: "JavaScript Snippet",
        description: "Run custom JavaScript to transform text",
        categories: ["advanced"],
        parameters: [
            {
                name: "code",
                label: "JavaScript Code",
                type: "textarea",
                default: "return input.split('\\n').map(line => line.toUpperCase()).join('\\n');",
                description: "Variables available: input, params, context",
            },
        ],
        execute: async (input, params, context) => {
            const code = (params.code as string) ?? "";
            if (!code) return input;

            try {
                // Use AsyncFunction to support await in scripts
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const fn = new AsyncFunction("input", "params", "context", code);
                const result = await fn(input, params, context);
                return typeof result === "string" ? result : String(result);
            } catch (e: any) {
                return `Error in script: ${e.message}`;
            }
        },
        keywords: ["javascript", "js", "script", "code", "custom"],
        source: "core",
    },

    // === ANALYSIS ===
    {
        id: "text.entropy",
        name: "Shannon Entropy",
        description: "Calculate the Shannon entropy of the input text (bits per character)",
        categories: ["text", "utilities"],
        parameters: [
            {
                name: "format",
                label: "Output Format",
                type: "select",
                default: "full",
                options: [
                    { value: "full", label: "Full report" },
                    { value: "value", label: "Value only (bits/char)" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const format = (params.format as string) ?? "full";
            if (!input) return format === "value" ? "0" : "Entropy: 0.0000 bits/char\nLength: 0 characters\nUnique characters: 0";

            const freq: Record<string, number> = {};
            for (const char of input) {
                freq[char] = (freq[char] ?? 0) + 1;
            }

            const len = input.length;
            let entropy = 0;
            for (const count of Object.values(freq)) {
                const p = count / len;
                entropy -= p * Math.log2(p);
            }

            const value = entropy.toFixed(4);
            if (format === "value") return value;

            const uniqueChars = Object.keys(freq).length;
            const maxEntropy = uniqueChars > 1 ? Math.log2(uniqueChars).toFixed(4) : "0.0000";
            return `Entropy: ${value} bits/char\nLength: ${len} characters\nUnique characters: ${uniqueChars}\nMax possible: ${maxEntropy} bits/char`;
        },
        keywords: ["entropy", "shannon", "information", "security", "analysis", "randomness"],
        source: "core",
    },

    // === SLUGIFY ===
    {
        id: "text.slugify",
        name: "Slugify",
        description: "Convert text to a URL-safe slug with Unicode transliteration (e.g. Héllo Wörld! → hello-world)",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "separator",
                label: "Separator",
                type: "select",
                default: "-",
                options: [
                    { value: "-", label: "Hyphen (hello-world)" },
                    { value: "_", label: "Underscore (hello_world)" },
                ],
            },
        ],
        processingMode: "configurable",
        execute: (input, params) => {
            const sep = (params.separator as string) === "_" ? "_" : "-";
            return slugify(input.trim(), sep);
        },
        keywords: ["slug", "url", "kebab", "permalink", "lowercase", "dashes", "web"],
        source: "core",
    },

    // === NUMBER FORMAT ===
    {
        id: "text.number-format",
        name: "Format Number",
        description: "Format a number with locale-aware thousands separator, decimal places, and optional currency or percent style",
        categories: ["text", "utilities"],
        parameters: [
            {
                name: "locale",
                label: "Locale",
                type: "select",
                default: "en-US",
                options: [
                    { value: "en-US", label: "English US (1,234.56)" },
                    { value: "de-DE", label: "German (1.234,56)" },
                    { value: "fr-FR", label: "French (1 234,56)" },
                    { value: "ja-JP", label: "Japanese (1,234.56)" },
                ],
            },
            {
                name: "style",
                label: "Style",
                type: "select",
                default: "decimal",
                options: [
                    { value: "decimal", label: "Decimal" },
                    { value: "currency", label: "Currency" },
                    { value: "percent", label: "Percent" },
                ],
            },
            {
                name: "currency",
                label: "Currency",
                type: "select",
                default: "USD",
                options: [
                    { value: "USD", label: "USD ($)" },
                    { value: "EUR", label: "EUR (€)" },
                    { value: "GBP", label: "GBP (£)" },
                    { value: "JPY", label: "JPY (¥)" },
                ],
                description: "Only used when Style is set to Currency.",
            },
            {
                name: "decimals",
                label: "Decimal Places",
                type: "number",
                default: 2,
                min: 0,
                max: 10,
            },
        ],
        processingMode: "configurable",
        execute: (input, params) => {
            const locale = (params.locale as string) ?? "en-US";
            const style = (params.style as string) ?? "decimal";
            const currency = (params.currency as string) ?? "USD";
            const decimals = (params.decimals as number) ?? 2;

            const trimmed = input.trim().replace(/[,\s]/g, "");
            const num = parseFloat(trimmed);
            if (isNaN(num)) throw new Error(`Cannot parse as number: "${input.trim()}"`);

            const options: Intl.NumberFormatOptions = {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
                style,
            };
            if (style === "currency") options.currency = currency;

            return new Intl.NumberFormat(locale, options).format(num);
        },
        keywords: ["number", "format", "currency", "decimal", "thousands", "locale", "intl", "comma"],
        source: "core",
    },

    // === TEXT READING TIME ===
    {
        id: "text.reading-time",
        name: "Reading Time",
        description: "Estimate reading time from word count, with separate handling for fenced code blocks",
        categories: ["text", "utilities"],
        parameters: [
            {
                name: "wpm",
                label: "Reading Speed (WPM)",
                type: "number",
                default: 200,
                min: 50,
                max: 1000,
                description: "Words per minute for prose (typical: 200–250 WPM)",
            },
            {
                name: "codeWpm",
                label: "Code Reading Speed (WPM)",
                type: "number",
                default: 100,
                min: 10,
                max: 500,
                description: "Effective WPM for fenced code blocks (slower due to comprehension overhead)",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const wpm = Math.max(1, (params.wpm as number) ?? 200);
            const codeWpm = Math.max(1, (params.codeWpm as number) ?? 100);

            if (!input.trim()) return "0 min read\n0 words";

            // Extract fenced code blocks (``` ... ```)
            let codeWords = 0;
            const prose = input.replace(/```[\s\S]*?```/g, (match) => {
                const inner = match.slice(3, -3).trim();
                codeWords += inner ? inner.split(/\s+/).length : 0;
                return "";
            });

            const proseWords = prose.trim() ? prose.trim().split(/\s+/).length : 0;
            const totalWords = proseWords + codeWords;

            const totalMinutes = proseWords / wpm + codeWords / codeWpm;
            const readTime = totalMinutes < 1 ? "< 1 min" : `${Math.round(totalMinutes)} min`;

            const lines = [`Reading time:  ${readTime}`, `Total words:   ${totalWords.toLocaleString()}`];
            if (codeWords > 0) {
                lines.push(`Prose words:   ${proseWords.toLocaleString()}`);
                lines.push(`Code words:    ${codeWords.toLocaleString()}`);
            }
            lines.push(`Reading speed: ${wpm} WPM${codeWords > 0 ? ` prose / ${codeWpm} WPM code` : ""}`);
            return lines.join("\n");
        },
        keywords: ["reading", "time", "words", "wpm", "estimate", "duration", "content", "length"],
        source: "core",
    },

    // === TEXT DIFF ===
    {
        id: "text.diff",
        name: "Text Diff",
        description: "Produce a unified diff between the pipeline input (original) and a second text block (modified)",
        categories: ["text"],
        parameters: [
            {
                name: "modified",
                label: "Modified Text",
                type: "textarea",
                default: "",
                description: "The new / modified version of the text to compare against the pipeline input.",
            },
            {
                name: "context",
                label: "Context Lines",
                type: "number",
                default: 3,
                min: 0,
                max: 10,
                description: "Number of unchanged lines to show around each change.",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const modified = (params.modified as string) ?? "";
            const context = Math.max(0, (params.context as number) ?? 3);
            return unifiedDiff(input, modified, context);
        },
        keywords: ["diff", "compare", "patch", "unified", "changes", "delta"],
        source: "core",
    },

    // === STRIP ANSI ===
    {
        id: "text.strip-ansi",
        name: "Strip ANSI Codes",
        description: "Remove ANSI/VT100 colour and control escape sequences from terminal output",
        categories: ["text"],
        parameters: [],
        processingMode: "configurable",
        execute: (input) => {
            // Matches CSI sequences (ESC[...) and OSC sequences (ESC]...BEL)
            // eslint-disable-next-line no-control-regex
            const ANSI_RE = /\x1b(?:\][^\x07]*\x07|\[[0-?]*[ -/]*[@-~]|[@-Z\\-_])/g;
            return input.replace(ANSI_RE, "");
        },
        keywords: ["ansi", "color", "colour", "terminal", "escape", "vt100", "clean", "strip", "console", "log"],
        source: "core",
    },

    // === REMOVE LINE NUMBERS ===
    {
        id: "text.remove-line-numbers",
        name: "Remove Line Numbers",
        description: "Strip leading line numbers from each line (complement of Add Line Numbers)",
        categories: ["text", "formatting"],
        parameters: [],
        processingMode: "line",
        execute: (input) => {
            // Matches: optional leading whitespace, then a number or single letter or roman numeral,
            // then a separator (. ) :), then at least one space/tab.
            // Requires whitespace after separator to avoid stripping things like "v1.2" or "http://".
            return input.replace(/^\s*(?:\d+|[IVXLCDM]+|[ivxlcdm]+|[A-Za-z])[.):][ \t]+/, "");
        },
        keywords: ["line", "number", "remove", "strip", "unnumber"],
        source: "core",
    },

    // === COLUMN ALIGN ===
    {
        id: "text.column-align",
        name: "Align Columns",
        description: "Align whitespace- or tab-separated columns to uniform widths (like `column -t`)",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "delimiter",
                label: "Column Delimiter",
                type: "select",
                default: "whitespace",
                options: [
                    { value: "whitespace", label: "Whitespace (any spaces/tabs)" },
                    { value: "tab", label: "Tab only" },
                ],
            },
            {
                name: "padding",
                label: "Column Padding",
                type: "number",
                default: 2,
                min: 1,
                max: 16,
                description: "Spaces between columns",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) ?? "whitespace";
            const padding = Math.max(1, (params.padding as number) ?? 2);

            const lines = input.split("\n");

            const rows: string[][] = lines.map(line => {
                if (delimiter === "tab") {
                    return line.split("\t");
                }
                // Split on runs of whitespace; preserve empty lines as single empty column
                const trimmed = line.trim();
                return trimmed === "" ? [""] : trimmed.split(/\s+/);
            });

            const maxCols = Math.max(...rows.map(r => r.length));
            const colWidths: number[] = [];
            for (let c = 0; c < maxCols; c++) {
                colWidths[c] = Math.max(...rows.map(r => (r[c] ?? "").length));
            }

            const sep = " ".repeat(padding);
            return rows.map(cols =>
                cols.map((col, i) =>
                    i === cols.length - 1 ? col : col.padEnd(colWidths[i])
                ).join(sep)
            ).join("\n");
        },
        keywords: ["column", "align", "pad", "table", "tabulate", "format", "column -t"],
        source: "core",
    },

    // === UNICODE NORMALIZATION ===
    {
        id: "text.normalize-unicode",
        name: "Normalize Unicode",
        description:
            "Normalize text to a canonical Unicode form (NFC, NFD, NFKC, or NFKD) via String.prototype.normalize",
        categories: ["text", "utilities"],
        parameters: [
            {
                name: "form",
                label: "Normalization Form",
                type: "select",
                default: "NFC",
                options: [
                    { value: "NFC", label: "NFC — Canonical Composition" },
                    { value: "NFD", label: "NFD — Canonical Decomposition" },
                    { value: "NFKC", label: "NFKC — Compatibility Composition" },
                    { value: "NFKD", label: "NFKD — Compatibility Decomposition" },
                ],
                description: "See Unicode Standard Annex #15 for details on each form",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const form = ((params.form as string) ?? "NFC") as
                | "NFC"
                | "NFD"
                | "NFKC"
                | "NFKD";
            return input.normalize(form);
        },
        keywords: ["normalize", "unicode", "nfc", "nfd", "nfkc", "nfkd", "canonical", "compatibility"],
        source: "core",
    },

    // === TEMPLATE ===
    {
        id: "text.template",
        name: "Template Substitution",
        description:
            "Substitute {{variable}} placeholders from a JSON object. Dot notation ({{user.name}}) accesses nested values.",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "data",
                label: "Variables (JSON)",
                type: "textarea",
                default: "{}",
                required: true,
                placeholder: '{\n  "name": "World"\n}',
                description: 'JSON object whose keys map to {{placeholder}} names',
            },
            {
                name: "missing",
                label: "Missing Variables",
                type: "select",
                default: "leave",
                options: [
                    { value: "leave", label: "Leave placeholder as-is" },
                    { value: "empty", label: "Replace with empty string" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const dataStr = ((params.data as string) ?? "").trim() || "{}";
            let vars: unknown;
            try {
                vars = JSON.parse(dataStr);
            } catch {
                throw new Error("Variables must be valid JSON");
            }
            if (typeof vars !== "object" || vars === null || Array.isArray(vars)) {
                throw new Error("Variables must be a JSON object");
            }

            const missing = (params.missing as string) ?? "leave";

            return input.replace(/\{\{\s*([\w$][\w$.]*)\s*\}\}/g, (match, path: string) => {
                const value = path.split(".").reduce<unknown>((acc, key) => {
                    if (acc === null || acc === undefined) return undefined;
                    return (acc as Record<string, unknown>)[key];
                }, vars);

                if (value === undefined || typeof value === "function") {
                    return missing === "empty" ? "" : match;
                }
                if (typeof value === "object") return JSON.stringify(value);
                return String(value);
            });
        },
        keywords: ["template", "substitute", "placeholder", "mustache", "interpolate", "variables"],
        source: "core",
    },

    // === REMOVE COMMENTS ===
    {
        id: "text.remove-comments",
        name: "Remove Comments",
        description:
            "Strip comments from source code while preserving strings and line structure. Generic counterpart to the JSON-only json.removeComments.",
        categories: ["text", "cleanup"],
        parameters: [
            {
                name: "styles",
                label: "Comment Styles",
                type: "multiselect",
                default: ["cLine", "cBlock"],
                options: [
                    { value: "cLine", label: "// line comments (JS, TS, C, Go, …)" },
                    { value: "cBlock", label: "/* block comments */" },
                    { value: "hash", label: "# hash comments (Shell, Python, YAML)" },
                    { value: "sql", label: "-- SQL line comments" },
                    { value: "html", label: "<!-- HTML/XML comments -->" },
                ],
                description: "Which comment syntaxes to strip",
            },
            {
                name: "squeeze",
                label: "Remove Leftover Blank Lines",
                type: "boolean",
                default: false,
                description: "Drop lines that become blank after comment removal",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const selected = (params.styles as string[]) ?? ["cLine", "cBlock"];
            const styles = new Set(selected.length > 0 ? selected : ["cLine", "cBlock"]);
            const squeeze = params.squeeze === true;

            let result = stripComments(input, styles);
            if (squeeze) {
                result = result
                    .split("\n")
                    .filter((line) => line.trim() !== "")
                    .join("\n");
            }
            return result;
        },
        keywords: [
            "comments", "strip", "minify", "clean", "source", "code",
            "javascript", "python", "shell", "sql", "html", "xml",
        ],
        source: "core",
    },
];

function keepOnlyNewlines(segment: string): string {
    return segment.replace(/[^\n]/g, "");
}

function stripComments(input: string, styles: Set<string>): string {
    let out = "";
    let i = 0;
    const n = input.length;

    while (i < n) {
        const ch = input[i];

        if (ch === '"' || ch === "'" || ch === "`") {
            out += ch;
            i++;
            while (i < n) {
                if (input[i] === "\\") {
                    out += input.slice(i, i + 2);
                    i += 2;
                    continue;
                }
                out += input[i];
                i++;
                if (input[i - 1] === ch) break;
            }
            continue;
        }

        if (
            styles.has("sql") &&
            input.startsWith("--", i) &&
            !input.startsWith("-->", i)
        ) {
            let j = i + 2;
            while (j < n && input[j] !== "\n") j++;
            i = j;
            continue;
        }

        if (styles.has("cLine") && input.startsWith("//", i)) {
            let j = i + 2;
            while (j < n && input[j] !== "\n") j++;
            i = j;
            continue;
        }

        if (styles.has("hash") && ch === "#") {
            let j = i + 1;
            while (j < n && input[j] !== "\n") j++;
            i = j;
            continue;
        }

        if (styles.has("cBlock") && input.startsWith("/*", i)) {
            const end = input.indexOf("*/", i + 2);
            const stop = end === -1 ? n : end + 2;
            out += keepOnlyNewlines(input.slice(i, stop));
            i = stop;
            continue;
        }

        if (styles.has("html") && input.startsWith("<!--", i)) {
            const end = input.indexOf("-->", i + 4);
            const stop = end === -1 ? n : end + 3;
            out += keepOnlyNewlines(input.slice(i, stop));
            i = stop;
            continue;
        }

        out += ch;
        i++;
    }

    return out;
}

// Self-register
coreOperations.forEach((op) => operationRegistry.register(op));

// === HELPERS ===

function unifiedDiff(leftText: string, rightText: string, contextLines: number): string {
    const left = leftText.split("\n");
    const right = rightText.split("\n");
    const m = left.length;
    const n = right.length;

    if (m * n > 10_000_000) {
        throw new Error("Inputs too large to diff — limit is ~3000 lines per side");
    }

    // LCS dynamic programming table
    const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] =
                left[i - 1] === right[j - 1]
                    ? dp[i - 1][j - 1] + 1
                    : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    // Backtrack to build edit list
    type DiffOp = { op: " " | "-" | "+"; text: string };
    const ops: DiffOp[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
            ops.unshift({ op: " ", text: left[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            ops.unshift({ op: "+", text: right[j - 1] });
            j--;
        } else {
            ops.unshift({ op: "-", text: left[i - 1] });
            i--;
        }
    }

    if (ops.every((o) => o.op === " ")) return "(no differences)";

    // Compute left/right line numbers for every op position
    const lLineNums: number[] = new Array(ops.length);
    const rLineNums: number[] = new Array(ops.length);
    let lNum = 1, rNum = 1;
    for (let k = 0; k < ops.length; k++) {
        lLineNums[k] = lNum;
        rLineNums[k] = rNum;
        if (ops[k].op !== "+") lNum++;
        if (ops[k].op !== "-") rNum++;
    }

    // Collect ops that fall within `contextLines` of any change
    const included = new Set<number>();
    for (let k = 0; k < ops.length; k++) {
        if (ops[k].op !== " ") {
            for (
                let c = Math.max(0, k - contextLines);
                c <= Math.min(ops.length - 1, k + contextLines);
                c++
            ) {
                included.add(c);
            }
        }
    }

    // Group included indices into contiguous hunks
    const sortedInc = [...included].sort((a, b) => a - b);
    const hunks: number[][] = [];
    if (sortedInc.length > 0) {
        let hunk = [sortedInc[0]];
        for (let k = 1; k < sortedInc.length; k++) {
            if (sortedInc[k] === sortedInc[k - 1] + 1) {
                hunk.push(sortedInc[k]);
            } else {
                hunks.push(hunk);
                hunk = [sortedInc[k]];
            }
        }
        hunks.push(hunk);
    }

    const output: string[] = ["--- a", "+++ b"];
    for (const hunk of hunks) {
        const hunkOps = hunk.map((idx) => ({
            op: ops[idx].op,
            text: ops[idx].text,
            l: lLineNums[idx],
            r: rLineNums[idx],
        }));
        const lOps = hunkOps.filter((o) => o.op !== "+");
        const rOps = hunkOps.filter((o) => o.op !== "-");
        const lStart = lOps.length > 0 ? lOps[0].l : hunkOps[0].l;
        const rStart = rOps.length > 0 ? rOps[0].r : hunkOps[0].r;
        output.push(`@@ -${lStart},${lOps.length} +${rStart},${rOps.length} @@`);
        for (const o of hunkOps) output.push(`${o.op}${o.text}`);
    }

    return output.join("\n");
}

function toRoman(num: number): string {
    const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const symbols = [
        "M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I",
    ];
    let result = "";

    for (let i = 0; i < values.length; i++) {
        while (num >= values[i]) {
            result += symbols[i];
            num -= values[i];
        }
    }
    return result;
}

function toAlpha(num: number): string {
    let result = "";
    while (num > 0) {
        num--;
        result = String.fromCharCode(65 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result;
}

function wrapText(text: string, width: number): string {
    return text
        .split("\n")
        .map((line) => {
            if (line.length <= width) return line;

            const words = line.split(" ");
            const wrapped: string[] = [];
            let currentLine = "";

            for (const word of words) {
                if (currentLine.length + word.length + 1 <= width) {
                    currentLine += (currentLine ? " " : "") + word;
                } else {
                    if (currentLine) wrapped.push(currentLine);
                    currentLine = word;
                }
            }

            if (currentLine) wrapped.push(currentLine);
            return wrapped.join("\n");
        })
        .join("\n");
}
