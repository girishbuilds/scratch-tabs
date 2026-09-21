import * as Papa from "papaparse";
import type {
  MergeEligibility,
  MergeInput,
  MergeOptions,
  MergeResult,
  MergeStrategy,
  MergeValidationError,
} from "../types";

const HAS_HEADER_OPTION = "hasHeader";
const ALIGN_COLUMNS_OPTION = "alignColumnsByName";

interface ParsedInput {
  input: Readonly<MergeInput>;
  delimiter: string;
  rows: string[][];
}

const invalid = (code: string, message: string): MergeValidationError => ({
  ok: false,
  error: { code, message },
});

const optionRecord = (options: MergeOptions): Record<string, unknown> => {
  const value = options[HAS_HEADER_OPTION];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

export const csvInputHasHeader = (
  options: MergeOptions,
  inputId: string,
): boolean => {
  const value = optionRecord(options)[inputId];
  return typeof value === "boolean" ? value : true;
};

export const csvAlignColumnsByName = (options: MergeOptions): boolean =>
  options[ALIGN_COLUMNS_OPTION] === true;

const describeParseError = (
  input: Readonly<MergeInput>,
  error: Papa.ParseError,
) => {
  const row = error.row === undefined ? "" : ` at row ${error.row + 1}`;
  return `${input.title}${row}: ${error.message}`;
};

const parseInput = (
  input: Readonly<MergeInput>,
): ParsedInput | MergeValidationError => {
  const parse = (delimiter?: string) =>
    Papa.parse<string[]>(input.content, {
      ...(delimiter ? { delimiter } : {}),
      // Ignore physical blank lines, but keep rows such as `,,` whose fields
      // are intentionally empty.
      skipEmptyLines: true,
      dynamicTyping: false,
    });
  let result = parse();
  if (result.errors.some((error) => error.code === "UndetectableDelimiter")) {
    result = [",", "\t", ";", "|"]
      .map(parse)
      .reduce((best, candidate) =>
        (candidate.data[0]?.length ?? 0) > (best.data[0]?.length ?? 0)
          ? candidate
          : best,
      );
  }
  if ((result.data[0]?.length ?? 0) < 2) {
    return invalid(
      "csv_parse_error",
      `Could not parse ${input.title}: no delimiter could be detected.`,
    );
  }
  if (result.errors.length > 0) {
    return invalid(
      "csv_parse_error",
      `Could not parse ${describeParseError(input, result.errors[0])}`,
    );
  }
  return {
    input,
    delimiter: result.meta.delimiter,
    rows: result.data,
  };
};

const parseInputs = (
  inputs: ReadonlyArray<Readonly<MergeInput>>,
): ParsedInput[] | MergeValidationError => {
  const parsed: ParsedInput[] = [];
  for (const input of inputs) {
    const result = parseInput(input);
    if ("ok" in result) return result;
    parsed.push(result);
  }
  return parsed;
};

const eligibilityError = (
  inputs: ReadonlyArray<Readonly<MergeInput>>,
): string | null => {
  if (inputs.length < 2) return "Select at least two CSV / TSV tabs.";
  const unsupported = inputs.find((input) => input.language !== "csv");
  if (unsupported) return `${unsupported.title} is not marked as CSV / TSV.`;
  const parsed = parseInputs(inputs);
  return Array.isArray(parsed) ? null : parsed.error.message;
};

const duplicateNames = (header: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of header) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
};

const quotedNames = (names: string[]) =>
  names.map((name) => JSON.stringify(name)).join(", ");

const validateRows = (
  parsed: ParsedInput,
  hasHeader: boolean,
):
  | { header?: string[]; dataRows: string[][]; columnCount: number }
  | MergeValidationError => {
  if (parsed.rows.length === 0) {
    return invalid("csv_empty_input", `${parsed.input.title} has no rows.`);
  }

  const header = hasHeader ? parsed.rows[0] : undefined;
  if (header) {
    const duplicates = duplicateNames(header);
    if (duplicates.length > 0) {
      return invalid(
        "csv_duplicate_headers",
        `${parsed.input.title} has duplicate header name${duplicates.length === 1 ? "" : "s"}: ${quotedNames(duplicates)}.`,
      );
    }
  }

  const columnCount = parsed.rows[0].length;
  for (let index = hasHeader ? 1 : 0; index < parsed.rows.length; index += 1) {
    const row = parsed.rows[index];
    if (row.length !== columnCount) {
      const difference = row.length - columnCount;
      return invalid(
        "csv_unequal_columns",
        `${parsed.input.title} row ${index + 1} has ${row.length} columns; expected ${columnCount} (${Math.abs(difference)} ${difference < 0 ? "missing" : "extra"}).`,
      );
    }
  }

  return {
    header,
    dataRows: parsed.rows.slice(hasHeader ? 1 : 0),
    columnCount,
  };
};

const schemaDifference = (expected: string[], actual: string[]) => {
  const actualNames = new Set(actual);
  const expectedNames = new Set(expected);
  return {
    missing: expected.filter((name) => !actualNames.has(name)),
    extra: actual.filter((name) => !expectedNames.has(name)),
  };
};

export const csvMergeStrategy: MergeStrategy = {
  canMerge(inputs): MergeEligibility {
    const reason = eligibilityError(inputs);
    return reason ? { canMerge: false, reason } : { canMerge: true };
  },

  getOptionsUI: () => import("./CsvMergeOptions"),

  merge(inputs, options): MergeResult {
    const reason = eligibilityError(inputs);
    if (reason) return invalid("csv_ineligible", reason);

    const parsed = parseInputs(inputs);
    if (!Array.isArray(parsed)) return parsed;

    const validated = parsed.map((input) =>
      validateRows(input, csvInputHasHeader(options, input.input.id)),
    );
    const validationError = validated.find(
      (result): result is MergeValidationError => "ok" in result,
    );
    if (validationError) return validationError;

    const tables = validated as Array<{
      header?: string[];
      dataRows: string[][];
      columnCount: number;
    }>;
    const first = tables[0];
    const expectedHeader = first.header;
    const alignByName = csvAlignColumnsByName(options);
    const outputRows: string[][] = expectedHeader ? [[...expectedHeader]] : [];
    let dataRowCount = 0;

    for (let index = 0; index < tables.length; index += 1) {
      const table = tables[index];
      const source = parsed[index].input;
      if (table.columnCount !== first.columnCount) {
        const difference = table.columnCount - first.columnCount;
        return invalid(
          "csv_incompatible_columns",
          `${source.title} has ${table.columnCount} columns; expected ${first.columnCount} from ${parsed[0].input.title} (${Math.abs(difference)} ${difference < 0 ? "missing" : "extra"}).`,
        );
      }

      let rows = table.dataRows;
      if (expectedHeader && table.header) {
        if (alignByName) {
          const difference = schemaDifference(expectedHeader, table.header);
          if (difference.missing.length || difference.extra.length) {
            const details = [
              difference.missing.length
                ? `missing ${quotedNames(difference.missing)}`
                : "",
              difference.extra.length
                ? `extra ${quotedNames(difference.extra)}`
                : "",
            ]
              .filter(Boolean)
              .join("; ");
            return invalid(
              "csv_incompatible_headers",
              `${source.title} has incompatible headers: ${details}.`,
            );
          }
          const positions = expectedHeader.map((name) =>
            table.header?.indexOf(name),
          );
          rows = rows.map((row) =>
            positions.map((position) => row[position ?? -1]),
          );
        } else if (
          expectedHeader.some(
            (name, position) => table.header?.[position] !== name,
          )
        ) {
          return invalid(
            "csv_header_order",
            `${source.title} headers do not match ${parsed[0].input.title} in the same order. Enable Align columns by name to accept reordered headers.`,
          );
        }
      }

      outputRows.push(...rows.map((row) => [...row]));
      dataRowCount += rows.length;
    }

    return {
      ok: true,
      content: Papa.unparse(outputRows, {
        delimiter: parsed[0].delimiter,
        newline: "\n",
      }),
      language: "csv",
      warnings: [],
      counts: {
        sources: inputs.length,
        rows: dataRowCount,
        columns: first.columnCount,
      },
    };
  },
};
