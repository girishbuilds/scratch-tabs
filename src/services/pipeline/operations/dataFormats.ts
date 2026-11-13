import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";
import * as jsYaml from "js-yaml";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

/**
 * Data Format Pipeline Operations
 *
 * Operations for converting between data formats like YAML, JSON, CSV.
 */
export const dataFormatOperations: OperationDefinition[] = [
    // === YAML <-> JSON ===
    {
        id: "yaml.to-json",
        name: "YAML to JSON",
        description: "Convert YAML content to JSON format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "Number of spaces for JSON indentation (0 = minified)"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;

            try {
                const parsed = jsYaml.load(input);
                // Handle undefined result (empty input)
                const result = parsed === undefined ? null : parsed;
                return indent === 0
                    ? JSON.stringify(result)
                    : JSON.stringify(result, null, indent);
            } catch (e: any) {
                throw new Error(`Failed to parse YAML: ${e.message}`);
            }
        },
        keywords: ["yaml", "json", "convert", "yml"],
        source: "core",
    },
    {
        id: "json.to-yaml",
        name: "JSON to YAML",
        description: "Convert JSON content to YAML format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 1,
                max: 8,
                description: "Number of spaces for YAML indentation"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;

            try {
                const parsed = JSON.parse(input);
                return jsYaml.dump(parsed, {
                    indent,
                    quotingType: '"',  // Use double quotes
                    forceQuotes: false  // Only quote when necessary
                });
            } catch (e: any) {
                if (e.message?.includes('JSON')) {
                    throw new Error(`Failed to parse JSON: ${e.message}`);
                }
                throw new Error(`Failed to convert to YAML: ${e.message}`);
            }
        },
        keywords: ["json", "yaml", "convert", "yml"],
        source: "core",
    },

    // === TOML ===
    {
        id: "toml.to-json",
        name: "TOML to JSON",
        description: "Convert TOML content to JSON format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "Number of spaces for JSON indentation (0 = minified)",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;
            try {
                const parsed = parseToml(input);
                return indent === 0
                    ? JSON.stringify(parsed)
                    : JSON.stringify(parsed, null, indent);
            } catch (e: any) {
                throw new Error(`Failed to parse TOML: ${e.message}`);
            }
        },
        keywords: ["toml", "json", "convert"],
        source: "core",
    },
    {
        id: "json.to-toml",
        name: "JSON to TOML",
        description: "Convert JSON content to TOML format",
        categories: ["formatting", "utilities"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            try {
                const parsed = JSON.parse(input);
                return stringifyToml(parsed);
            } catch (e: any) {
                throw new Error(`Failed to convert to TOML: ${e.message}`);
            }
        },
        keywords: ["json", "toml", "convert"],
        source: "core",
    },
    {
        id: "toml.to-yaml",
        name: "TOML to YAML",
        description: "Convert TOML content to YAML format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 1,
                max: 8,
                description: "Number of spaces for YAML indentation",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;
            try {
                const parsed = parseToml(input);
                return jsYaml.dump(parsed, { indent, quotingType: '"', forceQuotes: false });
            } catch (e: any) {
                throw new Error(`Failed to convert TOML to YAML: ${e.message}`);
            }
        },
        keywords: ["toml", "yaml", "convert"],
        source: "core",
    },
    {
        id: "yaml.to-toml",
        name: "YAML to TOML",
        description: "Convert YAML content to TOML format",
        categories: ["formatting", "utilities"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            try {
                const parsed = jsYaml.load(input);
                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                    throw new Error("TOML root must be a table (object). Arrays at root level are not supported.");
                }
                return stringifyToml(parsed as Record<string, unknown>);
            } catch (e: any) {
                throw new Error(`Failed to convert YAML to TOML: ${e.message}`);
            }
        },
        keywords: ["yaml", "toml", "convert"],
        source: "core",
    },

    // === CSV ===
    {
        id: "csv.extract-column",
        name: "Extract CSV Column",
        description: "Extract a specific column from CSV data",
        categories: ["extraction", "utilities"],
        parameters: [
            {
                name: "column",
                label: "Column",
                type: "string",
                default: "0",
                description: "Column index (0-based) or header name"
            },
            {
                name: "hasHeaders",
                label: "Has Headers",
                type: "boolean",
                default: true,
                description: "First row contains column headers"
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const columnSpec = (params.column as string) ?? "0";
            const hasHeaders = params.hasHeaders ?? true;
            const delimiter = (params.delimiter as string) ?? ",";

            const lines = input.trim().split('\n');
            if (lines.length === 0) {
                return '';
            }

            // CSV parser that handles quoted fields containing delimiters
            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let currentCell = '';
                let inQuotes = false;

                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    const nextChar = row[i + 1];

                    if (char === '"') {
                        // Handle escaped quotes ("" inside quoted string)
                        if (inQuotes && nextChar === '"') {
                            currentCell += '"';
                            i++; // Skip next quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === delimiter && !inQuotes) {
                        cells.push(currentCell.trim());
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                cells.push(currentCell.trim());

                // Remove surrounding quotes from cells
                return cells.map(c => {
                    const trimmed = c.trim();
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        return trimmed.slice(1, -1);
                    }
                    return trimmed;
                });
            };

            let columnIndex: number;
            let startRow = 0;

            if (hasHeaders) {
                const headers = parseRow(lines[0]);
                // Check if columnSpec is a number or header name
                const numericIndex = parseInt(columnSpec);
                if (!isNaN(numericIndex)) {
                    columnIndex = numericIndex;
                } else {
                    // Find by header name (case-insensitive)
                    columnIndex = headers.findIndex(h =>
                        h.toLowerCase() === columnSpec.toLowerCase()
                    );
                    if (columnIndex === -1) {
                        throw new Error(`Column "${columnSpec}" not found in headers: ${headers.join(', ')}`);
                    }
                }
                startRow = 1; // Skip header row
            } else {
                columnIndex = parseInt(columnSpec);
                if (isNaN(columnIndex)) {
                    throw new Error('Column must be numeric when hasHeaders is false');
                }
            }

            const result: string[] = [];
            for (let i = startRow; i < lines.length; i++) {
                const cells = parseRow(lines[i]);
                if (columnIndex >= 0 && columnIndex < cells.length) {
                    result.push(cells[columnIndex]);
                }
            }

            return result.join('\n');
        },
        keywords: ["csv", "column", "extract", "field", "data"],
        source: "core",
    },
    {
        id: "csv.to-json",
        name: "CSV to JSON",
        description: "Convert CSV data to JSON array of objects",
        categories: ["conversion", "utilities"],
        parameters: [
            {
                name: "hasHeaders",
                label: "Has Headers",
                type: "boolean",
                default: true,
                description: "First row contains column headers (used as object keys)"
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            },
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "JSON indentation (0 = minified)"
            },
            {
                name: "parseNumbers",
                label: "Parse Numbers",
                type: "boolean",
                default: true,
                description: "Convert plain numeric strings to numbers (zero-padded values and integers beyond 2^53 stay strings)"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const hasHeaders = params.hasHeaders ?? true;
            const delimiter = (params.delimiter as string) ?? ",";
            const indent = (params.indent as number) ?? 2;
            const parseNumbers = params.parseNumbers ?? true;

            // RFC 4180 parser over the whole input, so quoted fields may contain newlines
            const parseRows = (text: string): string[][] => {
                const rows: string[][] = [];
                let row: string[] = [];
                let cell = '';
                let inQuotes = false;
                let wasQuoted = false;

                const endCell = () => {
                    row.push(wasQuoted ? cell : cell.trim());
                    cell = '';
                    wasQuoted = false;
                };
                const endRow = () => {
                    endCell();
                    // Skip blank lines (a single empty, unquoted cell)
                    if (!(row.length === 1 && row[0] === '')) rows.push(row);
                    row = [];
                };

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];

                    if (inQuotes) {
                        if (char === '"') {
                            if (text[i + 1] === '"') {
                                cell += '"';
                                i++;
                            } else {
                                inQuotes = false;
                            }
                        } else {
                            cell += char;
                        }
                    } else if (char === '"' && !wasQuoted && cell.trim() === '') {
                        // Opening quote at the start of a field
                        inQuotes = true;
                        wasQuoted = true;
                        cell = '';
                    } else if (char === delimiter) {
                        endCell();
                    } else if (char === '\n' || char === '\r') {
                        if (char === '\r' && text[i + 1] === '\n') i++;
                        endRow();
                    } else if (wasQuoted) {
                        // Ignore stray characters between a closing quote and the delimiter
                        if (char.trim() !== '') cell += char;
                    } else {
                        cell += char;
                    }
                }
                if (cell !== '' || wasQuoted || row.length > 0) endRow();

                return rows;
            };

            const parsedRows = parseRows(input.trim());
            if (parsedRows.length === 0) {
                return '[]';
            }

            const parseValue = (val: string): string | number | boolean | null => {
                if (val === '') return null;
                if (val.toLowerCase() === 'true') return true;
                if (val.toLowerCase() === 'false') return false;
                if (val.toLowerCase() === 'null') return null;
                // Only convert canonical numbers. Zero-padded identifiers ("02134") and integers
                // beyond Number.MAX_SAFE_INTEGER would be silently changed, so they stay strings.
                if (parseNumbers && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(val)) {
                    const num = Number(val);
                    const isInteger = !val.includes('.');
                    const digits = val.replace(/[-.]/g, '').length;
                    if (isInteger ? Number.isSafeInteger(num) : Number.isFinite(num) && digits <= 15) {
                        return num;
                    }
                }
                return val;
            };

            let headers: string[];
            let startRow: number;

            if (hasHeaders) {
                headers = parsedRows[0];
                startRow = 1;
            } else {
                // Generate column names: col0, col1, col2, ...
                const firstRow = parsedRows[0];
                headers = firstRow.map((_, i) => `col${i}`);
                startRow = 0;
            }

            const result: Record<string, unknown>[] = [];

            for (let i = startRow; i < parsedRows.length; i++) {
                const cells = parsedRows[i];
                const obj: Record<string, unknown> = {};

                headers.forEach((header, idx) => {
                    const value = idx < cells.length ? cells[idx] : '';
                    obj[header] = parseValue(value);
                });

                result.push(obj);
            }

            return indent === 0
                ? JSON.stringify(result)
                : JSON.stringify(result, null, indent);
        },
        keywords: ["csv", "json", "convert", "array", "objects"],
        source: "core",
    },
    {
        id: "json.to-csv",
        name: "JSON to CSV",
        description: "Convert JSON array of objects to CSV",
        categories: ["conversion", "utilities"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            },
            {
                name: "includeHeaders",
                label: "Include Headers",
                type: "boolean",
                default: true,
                description: "Add header row with column names"
            },
            {
                name: "flattenObjects",
                label: "Flatten Nested Objects",
                type: "boolean",
                default: true,
                description: "Convert nested objects to dot-notation columns"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) ?? ",";
            const includeHeaders = params.includeHeaders ?? true;
            const flattenObjects = params.flattenObjects ?? true;

            let data: unknown;
            try {
                data = JSON.parse(input);
            } catch (e: any) {
                throw new Error(`Failed to parse JSON: ${e.message}`);
            }

            // Ensure it's an array
            if (!Array.isArray(data)) {
                // If it's an object, wrap in array
                if (typeof data === 'object' && data !== null) {
                    data = [data];
                } else {
                    throw new Error('Input must be a JSON array of objects');
                }
            }

            if (data.length === 0) {
                return '';
            }

            // Flatten nested objects if requested
            const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
                const result: Record<string, unknown> = {};

                for (const [key, value] of Object.entries(obj)) {
                    const newKey = prefix ? `${prefix}.${key}` : key;

                    if (flattenObjects && value && typeof value === 'object' && !Array.isArray(value)) {
                        Object.assign(result, flatten(value as Record<string, unknown>, newKey));
                    } else if (Array.isArray(value)) {
                        result[newKey] = JSON.stringify(value);
                    } else {
                        result[newKey] = value;
                    }
                }

                return result;
            };

            // Process all objects and collect all unique keys
            const processedData = (data as Record<string, unknown>[]).map(item => {
                if (typeof item !== 'object' || item === null) {
                    return { value: item };
                }
                return flatten(item as Record<string, unknown>);
            });

            const allKeys = new Set<string>();
            processedData.forEach(obj => {
                Object.keys(obj).forEach(key => allKeys.add(key));
            });

            const headers = Array.from(allKeys);

            // Escape CSV value
            const escapeValue = (val: unknown): string => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Quote if contains delimiter, newline, or quote
                if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const rows: string[] = [];

            if (includeHeaders) {
                rows.push(headers.map(escapeValue).join(delimiter));
            }

            processedData.forEach(obj => {
                const row = headers.map(header => escapeValue(obj[header]));
                rows.push(row.join(delimiter));
            });

            return rows.join('\n');
        },
        keywords: ["json", "csv", "convert", "export", "spreadsheet"],
        source: "core",
    },

    // === MARKDOWN TABLES ===
    {
        id: "csv.to-markdown",
        name: "CSV to Markdown Table",
        description: "Convert CSV data to a Markdown table",
        categories: ["conversion", "formatting"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            },
            {
                name: "alignment",
                label: "Alignment",
                type: "select",
                default: "left",
                options: [
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) ?? ",";
            const alignment = (params.alignment as string) ?? "left";

            const lines = input.trim().split('\n').filter(l => l.trim());
            if (lines.length === 0) {
                return '';
            }

            // CSV parser
            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let currentCell = '';
                let inQuotes = false;

                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    const nextChar = row[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            currentCell += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === delimiter && !inQuotes) {
                        cells.push(currentCell.trim());
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                cells.push(currentCell.trim());

                return cells.map(c => {
                    let trimmed = c.trim();
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        trimmed = trimmed.slice(1, -1).replace(/""/g, '"');
                    }
                    // Escape pipe characters in cell content
                    return trimmed.replace(/\|/g, '\\|');
                });
            };

            const rows = lines.map(parseRow);
            const headers = rows[0];
            const dataRows = rows.slice(1);

            // Build separator row
            let separatorChar: string;
            switch (alignment) {
                case "center": separatorChar = ':---:'; break;
                case "right": separatorChar = '---:'; break;
                default: separatorChar = '---';
            }
            const separator = headers.map(() => separatorChar);

            // Build markdown table
            const result: string[] = [];
            result.push('| ' + headers.join(' | ') + ' |');
            result.push('| ' + separator.join(' | ') + ' |');
            dataRows.forEach(row => {
                // Pad row if needed
                while (row.length < headers.length) {
                    row.push('');
                }
                result.push('| ' + row.slice(0, headers.length).join(' | ') + ' |');
            });

            return result.join('\n');
        },
        keywords: ["csv", "markdown", "table", "convert", "documentation"],
        source: "core",
    },
    {
        id: "json.to-markdown",
        name: "JSON to Markdown Table",
        description: "Convert JSON array of objects to a Markdown table",
        categories: ["conversion", "formatting"],
        parameters: [
            {
                name: "alignment",
                label: "Alignment",
                type: "select",
                default: "left",
                options: [
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                ]
            },
            {
                name: "flattenObjects",
                label: "Flatten Nested Objects",
                type: "boolean",
                default: true,
                description: "Convert nested objects to dot-notation columns"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const alignment = (params.alignment as string) ?? "left";
            const flattenObjects = params.flattenObjects ?? true;

            let data: unknown;
            try {
                data = JSON.parse(input);
            } catch (e: any) {
                throw new Error(`Failed to parse JSON: ${e.message}`);
            }

            // Ensure it's an array
            if (!Array.isArray(data)) {
                if (typeof data === 'object' && data !== null) {
                    data = [data];
                } else {
                    throw new Error('Input must be a JSON array of objects');
                }
            }

            if (data.length === 0) {
                return '';
            }

            // Flatten nested objects if requested
            const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
                const result: Record<string, unknown> = {};

                for (const [key, value] of Object.entries(obj)) {
                    const newKey = prefix ? `${prefix}.${key}` : key;

                    if (flattenObjects && value && typeof value === 'object' && !Array.isArray(value)) {
                        Object.assign(result, flatten(value as Record<string, unknown>, newKey));
                    } else if (Array.isArray(value)) {
                        result[newKey] = JSON.stringify(value);
                    } else {
                        result[newKey] = value;
                    }
                }

                return result;
            };

            // Process all objects and collect all unique keys
            const processedData = (data as Record<string, unknown>[]).map(item => {
                if (typeof item !== 'object' || item === null) {
                    return { value: item };
                }
                return flatten(item as Record<string, unknown>);
            });

            const allKeys = new Set<string>();
            processedData.forEach(obj => {
                Object.keys(obj).forEach(key => allKeys.add(key));
            });

            const headers = Array.from(allKeys);

            // Escape special markdown characters in cell content
            const escapeCell = (val: unknown): string => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.replace(/\|/g, '\\|').replace(/\n/g, ' ');
            };

            // Build separator row
            let separatorChar: string;
            switch (alignment) {
                case "center": separatorChar = ':---:'; break;
                case "right": separatorChar = '---:'; break;
                default: separatorChar = '---';
            }
            const separator = headers.map(() => separatorChar);

            // Build markdown table
            const result: string[] = [];
            result.push('| ' + headers.join(' | ') + ' |');
            result.push('| ' + separator.join(' | ') + ' |');

            processedData.forEach(obj => {
                const row = headers.map(header => escapeCell(obj[header]));
                result.push('| ' + row.join(' | ') + ' |');
            });

            return result.join('\n');
        },
        keywords: ["json", "markdown", "table", "convert", "documentation"],
        source: "core",
    },

    // === CSV FILTER / SORT / TRANSPOSE ===
    {
        id: "csv.filter-rows",
        name: "Filter CSV Rows",
        description: "Keep rows where a column matches a condition",
        categories: ["filtering", "utilities"],
        parameters: [
            {
                name: "column",
                label: "Column",
                type: "string",
                default: "0",
                description: "Column index (0-based) or header name",
            },
            {
                name: "operator",
                label: "Operator",
                type: "select",
                default: "contains",
                options: [
                    { value: "contains", label: "Contains" },
                    { value: "not-contains", label: "Does not contain" },
                    { value: "equals", label: "Equals" },
                    { value: "not-equals", label: "Not equals" },
                    { value: "regex", label: "Matches regex" },
                    { value: "gt", label: "Greater than (number)" },
                    { value: "lt", label: "Less than (number)" },
                ],
            },
            {
                name: "value",
                label: "Value",
                type: "string",
                default: "",
                description: "Value or pattern to compare against",
            },
            {
                name: "caseSensitive",
                label: "Case Sensitive",
                type: "boolean",
                default: false,
            },
            {
                name: "hasHeaders",
                label: "Has Headers",
                type: "boolean",
                default: true,
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const columnSpec = (params.column as string) ?? "0";
            const operator = (params.operator as string) ?? "contains";
            const filterValue = (params.value as string) ?? "";
            const caseSensitive = params.caseSensitive ?? false;
            const hasHeaders = params.hasHeaders ?? true;
            const delimiter = (params.delimiter as string) ?? ",";

            const lines = input.split("\n");
            if (lines.length === 0) return "";

            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let cell = "";
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const ch = row[i];
                    if (ch === '"') {
                        if (inQuotes && row[i + 1] === '"') { cell += '"'; i++; }
                        else inQuotes = !inQuotes;
                    } else if (ch === delimiter && !inQuotes) {
                        cells.push(cell.trim());
                        cell = "";
                    } else {
                        cell += ch;
                    }
                }
                cells.push(cell.trim());
                return cells.map((c) => {
                    const t = c.trim();
                    return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).replace(/""/g, '"') : t;
                });
            };

            const headerRow = hasHeaders ? lines[0] : null;
            const dataLines = hasHeaders ? lines.slice(1) : lines;

            let columnIndex: number;
            if (hasHeaders && headerRow) {
                const headers = parseRow(headerRow);
                const numericIndex = parseInt(columnSpec);
                if (!isNaN(numericIndex)) {
                    columnIndex = numericIndex;
                } else {
                    columnIndex = headers.findIndex(
                        (h) => h.toLowerCase() === columnSpec.toLowerCase(),
                    );
                    if (columnIndex === -1) {
                        throw new Error(`Column "${columnSpec}" not found`);
                    }
                }
            } else {
                columnIndex = parseInt(columnSpec);
                if (isNaN(columnIndex)) throw new Error("Column must be numeric when hasHeaders is false");
            }

            const matches = (cellValue: string): boolean => {
                const a = caseSensitive ? cellValue : cellValue.toLowerCase();
                const b = caseSensitive ? filterValue : filterValue.toLowerCase();
                switch (operator) {
                    case "contains": return a.includes(b);
                    case "not-contains": return !a.includes(b);
                    case "equals": return a === b;
                    case "not-equals": return a !== b;
                    case "regex": {
                        const flags = caseSensitive ? "" : "i";
                        try { return new RegExp(filterValue, flags).test(cellValue); }
                        catch { return false; }
                    }
                    case "gt": return parseFloat(cellValue) > parseFloat(filterValue);
                    case "lt": return parseFloat(cellValue) < parseFloat(filterValue);
                    default: return true;
                }
            };

            const filtered = dataLines.filter((line) => {
                if (!line.trim()) return false;
                const cells = parseRow(line);
                const cell = columnIndex < cells.length ? cells[columnIndex] : "";
                return matches(cell);
            });

            const result = headerRow ? [headerRow, ...filtered] : filtered;
            return result.join("\n");
        },
        keywords: ["csv", "filter", "rows", "query", "search", "where"],
        source: "core",
    },
    {
        id: "csv.sort",
        name: "Sort CSV",
        description: "Sort CSV rows by a column value",
        categories: ["sorting", "utilities"],
        parameters: [
            {
                name: "column",
                label: "Column",
                type: "string",
                default: "0",
                description: "Column index (0-based) or header name to sort by",
            },
            {
                name: "order",
                label: "Order",
                type: "select",
                default: "asc",
                options: [
                    { value: "asc", label: "Ascending" },
                    { value: "desc", label: "Descending" },
                ],
            },
            {
                name: "type",
                label: "Sort Type",
                type: "select",
                default: "auto",
                options: [
                    { value: "auto", label: "Auto (numeric if possible)" },
                    { value: "string", label: "String" },
                    { value: "number", label: "Number" },
                ],
            },
            {
                name: "hasHeaders",
                label: "Has Headers",
                type: "boolean",
                default: true,
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const columnSpec = (params.column as string) ?? "0";
            const order = (params.order as string) ?? "asc";
            const sortType = (params.type as string) ?? "auto";
            const hasHeaders = params.hasHeaders ?? true;
            const delimiter = (params.delimiter as string) ?? ",";

            const lines = input.split("\n").filter((l) => l.trim());
            if (lines.length === 0) return "";

            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let cell = "";
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const ch = row[i];
                    if (ch === '"') {
                        if (inQuotes && row[i + 1] === '"') { cell += '"'; i++; }
                        else inQuotes = !inQuotes;
                    } else if (ch === delimiter && !inQuotes) {
                        cells.push(cell.trim());
                        cell = "";
                    } else {
                        cell += ch;
                    }
                }
                cells.push(cell.trim());
                return cells.map((c) => {
                    const t = c.trim();
                    return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).replace(/""/g, '"') : t;
                });
            };

            const headerRow = hasHeaders ? lines[0] : null;
            const dataLines = hasHeaders ? lines.slice(1) : lines;

            let columnIndex: number;
            if (hasHeaders && headerRow) {
                const headers = parseRow(headerRow);
                const numericIndex = parseInt(columnSpec);
                if (!isNaN(numericIndex)) {
                    columnIndex = numericIndex;
                } else {
                    columnIndex = headers.findIndex(
                        (h) => h.toLowerCase() === columnSpec.toLowerCase(),
                    );
                    if (columnIndex === -1) {
                        throw new Error(`Column "${columnSpec}" not found`);
                    }
                }
            } else {
                columnIndex = parseInt(columnSpec);
                if (isNaN(columnIndex)) throw new Error("Column must be numeric when hasHeaders is false");
            }

            const getValue = (line: string): string => {
                const cells = parseRow(line);
                return columnIndex < cells.length ? cells[columnIndex] : "";
            };

            const sorted = [...dataLines].sort((a, b) => {
                const va = getValue(a);
                const vb = getValue(b);
                let cmp: number;

                const numA = parseFloat(va);
                const numB = parseFloat(vb);
                const useNumeric =
                    sortType === "number" ||
                    (sortType === "auto" && !isNaN(numA) && !isNaN(numB));

                if (useNumeric) {
                    cmp = (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
                } else {
                    cmp = va.localeCompare(vb);
                }

                return order === "desc" ? -cmp : cmp;
            });

            const result = headerRow ? [headerRow, ...sorted] : sorted;
            return result.join("\n");
        },
        keywords: ["csv", "sort", "order", "alphabetical", "numeric"],
        source: "core",
    },
    {
        id: "csv.transpose",
        name: "Transpose CSV",
        description: "Swap rows and columns — each row becomes a column",
        categories: ["conversion", "utilities"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) ?? ",";

            const lines = input.split("\n").filter((l) => l.trim());
            if (lines.length === 0) return "";

            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let cell = "";
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const ch = row[i];
                    if (ch === '"') {
                        if (inQuotes && row[i + 1] === '"') { cell += '"'; i++; }
                        else inQuotes = !inQuotes;
                    } else if (ch === delimiter && !inQuotes) {
                        cells.push(cell);
                        cell = "";
                    } else {
                        cell += ch;
                    }
                }
                cells.push(cell);
                return cells;
            };

            const escapeCell = (val: string): string => {
                if (val.includes(delimiter) || val.includes('"') || val.includes("\n")) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            };

            const rows = lines.map(parseRow);
            const colCount = Math.max(...rows.map((r) => r.length));

            const transposed: string[] = [];
            for (let col = 0; col < colCount; col++) {
                const newRow = rows.map((row) => escapeCell(row[col] ?? ""));
                transposed.push(newRow.join(delimiter));
            }

            return transposed.join("\n");
        },
        keywords: ["csv", "transpose", "pivot", "rotate", "columns", "rows"],
        source: "core",
    },
    {
        id: "csv.dedupe",
        name: "CSV Deduplicate Rows",
        description: "Remove duplicate rows from CSV data, optionally by a specific column",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "column",
                label: "Dedupe By Column",
                type: "string",
                default: "",
                description: "Column name or 0-based index to dedupe by. Leave empty to dedupe on entire row.",
                placeholder: "e.g. email or 2"
            },
            {
                name: "hasHeaders",
                label: "Has Headers",
                type: "boolean",
                default: true,
                description: "First row contains column headers"
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            },
            {
                name: "caseSensitive",
                label: "Case Sensitive",
                type: "boolean",
                default: true,
                description: "Treat values as case-sensitive when comparing"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            if (!input.trim()) return "";

            const delimiter = (params.delimiter as string) ?? ",";
            const hasHeaders = params.hasHeaders ?? true;
            const columnSpec = (params.column as string) ?? "";
            const caseSensitive = params.caseSensitive ?? true;

            const lines = input.trimEnd().split('\n');

            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let currentCell = '';
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    const nextChar = row[i + 1];
                    if (char === '"') {
                        if (inQuotes && nextChar === '"') { currentCell += '"'; i++; }
                        else { inQuotes = !inQuotes; }
                    } else if (char === delimiter && !inQuotes) {
                        cells.push(currentCell);
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                cells.push(currentCell);
                return cells;
            };

            const headerLine = hasHeaders ? lines[0] : null;
            const dataLines = hasHeaders ? lines.slice(1) : lines;

            // Resolve column index — use strict digit-only test so names like "1st Name" aren't
            // silently coerced to index 1 by parseInt
            let colIndex = -1;
            if (columnSpec !== "") {
                if (/^\d+$/.test(columnSpec)) {
                    colIndex = parseInt(columnSpec, 10);
                } else if (headerLine) {
                    const headers = parseRow(headerLine);
                    colIndex = headers.findIndex(h => h.toLowerCase() === columnSpec.toLowerCase());
                    if (colIndex === -1) throw new Error(`Column "${columnSpec}" not found in headers`);
                }
            }

            const seen = new Set<string>();
            const deduped = dataLines.filter(line => {
                const key = colIndex >= 0
                    ? (parseRow(line)[colIndex] ?? line)
                    : line;
                const normalised = caseSensitive ? key : key.toLowerCase();
                if (seen.has(normalised)) return false;
                seen.add(normalised);
                return true;
            });

            const result = headerLine ? [headerLine, ...deduped] : deduped;
            return result.join('\n');
        },
        keywords: ["csv", "dedupe", "deduplicate", "unique", "rows", "distinct"],
        source: "core",
    },
    {
        id: "csv.stats",
        name: "CSV Column Stats",
        description:
            "Per-column summary statistics: count, empty count, distinct values, and for numeric columns: min, max, mean, and median",
        categories: ["filtering", "utilities"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "comma",
                options: [
                    { value: "comma", label: "Comma (,)" },
                    { value: "tab", label: "Tab" },
                    { value: "semicolon", label: "Semicolon (;)" },
                ],
            },
            {
                name: "header",
                label: "First Row Is Header",
                type: "boolean",
                default: true,
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimChar =
                (params.delimiter as string) === "tab"
                    ? "\t"
                    : (params.delimiter as string) === "semicolon"
                      ? ";"
                      : ",";
            const hasHeader = (params.header as boolean) ?? true;

            const parseCsvRow = (line: string): string[] => {
                const fields: string[] = [];
                let field = "";
                let inQuotes = false;
                for (let k = 0; k < line.length; k++) {
                    const c = line[k];
                    if (inQuotes) {
                        if (c === '"') {
                            if (k + 1 < line.length && line[k + 1] === '"') {
                                field += '"';
                                k++;
                            } else {
                                inQuotes = false;
                            }
                        } else {
                            field += c;
                        }
                    } else if (c === '"') {
                        inQuotes = true;
                    } else if (c === delimChar) {
                        fields.push(field);
                        field = "";
                    } else {
                        field += c;
                    }
                }
                fields.push(field);
                return fields;
            };

            const rawInput = input.trim();
            if (!rawInput) throw new Error("Empty input");
            const lines = rawInput.split("\n");

            const rows = lines.map(parseCsvRow);
            const headers = hasHeader
                ? rows[0]
                : rows[0].map((_, idx) => `Column ${idx + 1}`);
            const dataRows = hasHeader ? rows.slice(1) : rows;

            if (dataRows.length === 0) throw new Error("No data rows found");

            const numCols = headers.length;
            const colValues: string[][] = Array.from({ length: numCols }, () => []);
            for (const row of dataRows) {
                for (let c = 0; c < numCols; c++) {
                    colValues[c].push(row[c] ?? "");
                }
            }

            const lines2: string[] = [
                `CSV Stats — ${dataRows.length} row${dataRows.length !== 1 ? "s" : ""} × ${numCols} column${numCols !== 1 ? "s" : ""}`,
                "",
            ];

            for (let c = 0; c < numCols; c++) {
                const vals = colValues[c];
                const nonEmpty = vals.filter((v) => v.trim() !== "");
                const numericVals = nonEmpty.map(Number).filter((n) => !isNaN(n));
                const isNumeric =
                    numericVals.length > 0 && numericVals.length === nonEmpty.length;
                const distinct = new Set(vals).size;

                lines2.push(`${headers[c]}`);
                lines2.push(
                    `  count:    ${vals.length}  (empty: ${vals.length - nonEmpty.length}, distinct: ${distinct})`,
                );

                if (isNumeric) {
                    const sorted = [...numericVals].sort((a, b) => a - b);
                    const sum = sorted.reduce((a, b) => a + b, 0);
                    const mean = sum / sorted.length;
                    const mid = Math.floor(sorted.length / 2);
                    const median =
                        sorted.length % 2 === 0
                            ? (sorted[mid - 1] + sorted[mid]) / 2
                            : sorted[mid];
                    lines2.push(`  min:      ${sorted[0]}`);
                    lines2.push(`  max:      ${sorted[sorted.length - 1]}`);
                    lines2.push(`  mean:     ${mean.toFixed(4)}`);
                    lines2.push(`  median:   ${median}`);
                } else {
                    const freq: Record<string, number> = {};
                    for (const v of vals) freq[v] = (freq[v] ?? 0) + 1;
                    const top3 = Object.entries(freq)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([v, n]) => `"${v}" (${n})`);
                    lines2.push(`  top:      ${top3.join(", ")}`);
                }
                lines2.push("");
            }

            return lines2.join("\n").trimEnd();
        },
        keywords: ["csv", "statistics", "stats", "summary", "describe", "analyze", "profile", "column"],
        source: "core",
    },

    // === JSON TO TYPE DEFINITION ===
    {
        id: "json.to-type-definition",
        name: "JSON To Type Definition",
        description:
            "Infer typed model definitions from JSON: TypeScript interfaces, Go structs, Python TypedDicts, or Rust structs. Replaces online generators like json-to-go.",
        categories: ["json", "conversion"],
        parameters: [
            {
                name: "language",
                label: "Target Language",
                type: "select",
                default: "typescript",
                options: [
                    { value: "typescript", label: "TypeScript interface" },
                    { value: "go", label: "Go struct" },
                    { value: "python", label: "Python TypedDict" },
                    { value: "rust", label: "Rust struct" },
                ],
            },
            {
                name: "rootName",
                label: "Root Type Name",
                type: "string",
                default: "Root",
                placeholder: "Root",
            },
            {
                name: "optionalNullable",
                label: "Nullables As Optional",
                type: "boolean",
                default: true,
                description:
                    "Fields seen with a null value become optional / pointer / Option types instead of union-with-null",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const language = (params.language as string) ?? "typescript";
            const rawRootName = ((params.rootName as string) ?? "").trim() || "Root";
            const nullableOptional = params.optionalNullable !== false;

            let data: unknown;
            try {
                data = JSON.parse(input);
            } catch (e) {
                throw new Error(
                    `Invalid JSON input: ${e instanceof Error ? e.message : String(e)}`,
                );
            }

            return buildTypeDefinition(data, {
                language,
                rootName: rawRootName,
                nullableAsOptional: nullableOptional,
            });
        },
        keywords: [
            "type", "definition", "interface", "struct", "typeddict", "model",
            "typescript", "golang", "python", "rust", "codegen", "json-to-go", "infer",
        ],
        source: "core",
    },
];

type InferredType =
    | { kind: "string" | "number" | "boolean" | "any" }
    | { kind: "ref"; name: string }
    | { kind: "array"; element: InferredType };

interface FieldInfo {
    type: InferredType;
    nullable: boolean;
    partial?: boolean;
}

interface ObjectDef {
    name: string;
    fields: Map<string, FieldInfo>;
}

const PRIMITIVE_NAMES: Record<string, Record<string, string>> = {
    typescript: { string: "string", number: "number", boolean: "boolean", any: "unknown" },
    go: { string: "string", number: "float64", boolean: "bool", any: "any" },
    python: { string: "str", number: "float", boolean: "bool", any: "Any" },
    rust: { string: "String", number: "f64", boolean: "bool", any: "serde_json::Value" },
};

function singularize(word: string): string {
    if (/ies$/.test(word) && word.length > 3) return `${word.slice(0, -3)}y`;
    if (/(ss|us|is)$/.test(word) || word.length <= 2 || !/s$/.test(word)) return word;
    return word.slice(0, -1);
}

function pascalCaseName(hint: string): string {
    const words = hint.replace(/[^A-Za-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "Item";
    const pascal = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    return /^[0-9]/.test(pascal) ? `Item${pascal}` : pascal;
}

function goExportedField(jsonKey: string): string {
    const parts = jsonKey.split(/[^A-Za-z0-9]+/).filter(Boolean);
    let base = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
    if (!base) base = "Field";
    if (/^[0-9]/.test(base)) base = `Field${base}`;
    return base.charAt(0).toUpperCase() + base.slice(1);
}

function rustIdentifier(jsonKey: string): { ident: string; renamed: boolean } {
    let ident = jsonKey.replace(/[^A-Za-z0-9_]/g, "_");
    if (!ident || /^_*$/.test(ident)) ident = "field";
    if (/^[0-9]/.test(ident)) ident = `_${ident}`;
    const snake = ident.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    return { ident: snake, renamed: snake !== jsonKey };
}

class TypeInference {
    private defs: ObjectDef[] = [];
    private usedNames = new Set<string>();

    get objectDefs(): readonly ObjectDef[] {
        return this.defs;
    }

    private uniqueName(preferred: string): string {
        if (!this.usedNames.has(preferred)) {
            this.usedNames.add(preferred);
            return preferred;
        }
        let counter = 2;
        while (this.usedNames.has(`${preferred}${counter}`)) counter++;
        const name = `${preferred}${counter}`;
        this.usedNames.add(name);
        return name;
    }

    infer(value: unknown, hint: string): InferredType {
        if (typeof value === "string") return { kind: "string" };
        if (typeof value === "number") return { kind: "number" };
        if (typeof value === "boolean") return { kind: "boolean" };
        if (Array.isArray(value)) {
            const nonNull = value.filter((v) => v !== null);
            if (nonNull.length === 0) return { kind: "array", element: { kind: "any" } };

            const allPlainObjects = nonNull.every(
                (v) => typeof v === "object" && !Array.isArray(v),
            );
            if (allPlainObjects) {
                const def = this.mergeObjectElements(
                    nonNull as Record<string, unknown>[],
                    singularize(hint),
                );
                return { kind: "array", element: { kind: "ref", name: def.name } };
            }

            const elements = nonNull.map((v) => this.infer(v, singularize(hint)));
            return { kind: "array", element: this.mergeTypes(elements) };
        }
        if (value !== null && typeof value === "object") {
            const obj = value as Record<string, unknown>;
            const keys = Object.keys(obj);
            let def = this.defs.find(
                (d) => d.fields.size === keys.length && keys.every((k) => d.fields.has(k)),
            );
            if (!def) {
                def = { name: this.uniqueName(pascalCaseName(hint)), fields: new Map() };
                this.defs.push(def);
                for (const [key, val] of Object.entries(obj)) {
                    def.fields.set(key, {
                        type: val === null ? { kind: "any" } : this.infer(val, key),
                        nullable: val === null,
                    });
                }
            } else {
                for (const [key, val] of Object.entries(obj)) {
                    const info: FieldInfo = {
                        type: val === null ? { kind: "any" } : this.infer(val, key),
                        nullable: val === null,
                    };
                    const existing = def.fields.get(key)!;
                    existing.nullable = existing.nullable || info.nullable;
                    if (JSON.stringify(existing.type) !== JSON.stringify(info.type)) {
                        existing.type = { kind: "any" };
                    }
                }
            }
            return { kind: "ref", name: def.name };
        }
        return { kind: "any" };
    }

    private mergeObjectElements(
        objects: Record<string, unknown>[],
        hint: string,
    ): ObjectDef {
        const def: ObjectDef = { name: this.uniqueName(pascalCaseName(hint)), fields: new Map() };
        this.defs.push(def);
        for (const obj of objects) {
            for (const [key, val] of Object.entries(obj)) {
                const info: FieldInfo = {
                    type: val === null ? { kind: "any" } : this.infer(val, key),
                    nullable: val === null,
                };
                const existing = def.fields.get(key);
                if (!existing) {
                    def.fields.set(key, info);
                } else {
                    if (JSON.stringify(existing.type) !== JSON.stringify(info.type)) {
                        existing.type = { kind: "any" };
                    }
                    existing.nullable = existing.nullable || info.nullable;
                }
            }
            for (const [key, info] of def.fields) {
                if (!(key in obj)) info.partial = true;
            }
        }
        return def;
    }

    private mergeTypes(types: InferredType[]): InferredType {
        const distinct: InferredType[] = [];
        outer: for (const t of types) {
            for (const d of distinct) {
                if (JSON.stringify(d) === JSON.stringify(t)) continue outer;
            }
            distinct.push(t);
        }
        return distinct.length === 1 ? distinct[0] : { kind: "any" };
    }
}

function collectRefs(type: InferredType, into: Set<string>): void {
    switch (type.kind) {
        case "ref":
            into.add(type.name);
            break;
        case "array":
            collectRefs(type.element, into);
            break;
        default:
            break;
    }
}

function buildTypeDefinition(
    data: unknown,
    options: { language: string; rootName: string; nullableAsOptional: boolean },
): string {
    if (!(options.language in PRIMITIVE_NAMES)) {
        throw new Error(`Unsupported language: ${options.language}`);
    }

    const inference = new TypeInference(options.rootName);
    const rootType = inference.infer(data, options.rootName);

    const reachable = new Set<string>();
    collectRefs(rootType, reachable);
    for (const def of inference.objectDefs) {
        if (reachable.has(def.name)) {
            for (const info of def.fields.values()) collectRefs(info.type, reachable);
        }
    }
    const liveDefs = inference.objectDefs.filter((d) => reachable.has(d.name));

    switch (options.language) {
        case "typescript":
            return emitTypeScript(options.rootName, rootType, liveDefs, options.nullableAsOptional);
        case "go":
            return emitGo(options.rootName, rootType, liveDefs, options.nullableAsOptional);
        case "python":
            return emitPython(options.rootName, rootType, liveDefs, options.nullableAsOptional);
        case "rust":
            return emitRust(options.rootName, rootType, liveDefs, options.nullableAsOptional);
        default:
            throw new Error(`Unsupported language: ${options.language}`);
    }
}

function emitTypeScript(
    rootName: string,
    rootType: InferredType,
    defs: ObjectDef[],
    nullableAsOptional: boolean,
): string {
    const render = (t: InferredType): string => {
        switch (t.kind) {
            case "ref":
                return t.name;
            case "array": {
                const el = render(t.element);
                return /\s/.test(el) ? `(${el})[]` : `${el}[]`;
            }
            default:
                return PRIMITIVE_NAMES.typescript[t.kind];
        }
    };

    const blocks = defs.map((def) => {
        const lines = [`export interface ${def.name} {`];
        for (const [key, info] of def.fields) {
            const optional = nullableAsOptional && (info.nullable || info.partial === true);
            const rendered =
                !optional && info.nullable ? `${render(info.type)} | null` : render(info.type);
            lines.push(`  ${JSON.stringify(key)}${optional ? "?" : ""}: ${rendered};`);
        }
        lines.push("}");
        return lines.join("\n");
    });

    if (!(rootType.kind === "ref" && rootType.name === rootName)) {
        blocks.push(`export type ${rootName} = ${render(rootType)};`);
    }
    return blocks.join("\n\n");
}

function emitGo(
    rootName: string,
    rootType: InferredType,
    defs: ObjectDef[],
    nullableAsOptional: boolean,
): string {
    const render = (t: InferredType): string => {
        switch (t.kind) {
            case "ref":
                return t.name;
            case "array": {
                if (t.element.kind === "ref") return `[]${t.element.name}`;
                return `[]${render(t.element)}`;
            }
            default:
                return PRIMITIVE_NAMES.go[t.kind];
        }
    };
    const pointerize = (goType: string): string =>
        goType.startsWith("*") || goType.startsWith("[]") || goType.startsWith("map[")
            ? goType
            : `*${goType}`;

    const blocks = defs.map((def) => {
        const lines = [`type ${def.name} struct {`];
        for (const [key, info] of def.fields) {
            const wrap = info.nullable || (info.partial === true && nullableAsOptional);
            const fieldType = wrap ? pointerize(render(info.type)) : render(info.type);
            const tag = wrap ? ` \`json:"${key},omitempty"\`` : ` \`json:"${key}"\``;
            lines.push(`\t${goExportedField(key)} ${fieldType}${tag}`);
        }
        lines.push("}");
        return lines.join("\n");
    });

    if (!(rootType.kind === "ref" && rootType.name === rootName)) {
        blocks.push(`type ${rootName} = ${render(rootType)}`);
    }
    return blocks.join("\n\n");
}

function emitPython(
    rootName: string,
    rootType: InferredType,
    defs: ObjectDef[],
    nullableAsOptional: boolean,
): string {
    const render = (t: InferredType, quoteRefs: boolean): string => {
        switch (t.kind) {
            case "ref":
                return quoteRefs ? `"${t.name}"` : t.name;
            case "array":
                return `list[${render(t.element, quoteRefs)}]`;
            default:
                return PRIMITIVE_NAMES.python[t.kind];
        }
    };

    const blocks = defs.map((def) => {
        const lines = [`class ${def.name}(TypedDict):`];
        if (def.fields.size === 0) {
            lines.push("    pass");
        }
        for (const [key, info] of def.fields) {
            const wrap = info.nullable || (info.partial === true && nullableAsOptional);
            const inner = render(info.type, true);
            lines.push(`    ${JSON.stringify(key)}: ${wrap ? `Optional[${inner}]` : inner}`);
        }
        return lines.join("\n");
    });

    if (!(rootType.kind === "ref" && rootType.name === rootName)) {
        blocks.push(`${rootName} = ${render(rootType, false)}`);
    }
    return `from typing import Any, Optional\n\n\n${blocks.join("\n\n\n")}\n`;
}

function emitRust(
    rootName: string,
    rootType: InferredType,
    defs: ObjectDef[],
    nullableAsOptional: boolean,
): string {
    const render = (t: InferredType): string => {
        switch (t.kind) {
            case "ref":
                return t.name;
            case "array":
                return `Vec<${render(t.element)}>`;
            default:
                return PRIMITIVE_NAMES.rust[t.kind];
        }
    };

    const derive = "#[derive(Debug, Clone, Serialize, Deserialize)]";
    const blocks = defs.map((def) => {
        const lines = [derive, `pub struct ${def.name} {`];
        for (const [key, info] of def.fields) {
            const { ident, renamed } = rustIdentifier(key);
            const inner = render(info.type);
            const wrap = info.nullable || (info.partial === true && nullableAsOptional);
            const fieldType = wrap ? `Option<${inner}>` : inner;
            const attrs: string[] = [];
            if (renamed) attrs.push(`rename = ${JSON.stringify(key)}`);
            if (wrap && nullableAsOptional) {
                attrs.push('skip_serializing_if = "Option::is_none"');
            }
            if (attrs.length > 0) lines.push(`  #[serde(${attrs.join(", ")})]`);
            lines.push(`  ${ident}: ${fieldType},`);
        }
        lines.push("}");
        return lines.join("\n");
    });

    if (!(rootType.kind === "ref" && rootType.name === rootName)) {
        blocks.push(`pub type ${rootName} = ${render(rootType)};`);
    }
    return blocks.join("\n\n");
}

// Self-register all operations
dataFormatOperations.forEach(op => operationRegistry.register(op));

export default dataFormatOperations;
