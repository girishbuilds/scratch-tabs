/**
 * World-Class CSV Export for JSON Data
 *
 * Features:
 * - Intelligent flattening of nested objects
 * - Configurable array expansion strategies
 * - Handles complex, real-world JSON structures
 * - Produces flat, filterable CSV tables
 */

export interface CsvOptions {
  delimiter: string; // "," or actual tab character
  includeHeaders: boolean;
  arrayExpansion: "expandFirst" | "expandAll" | "stringify";
}

const DEFAULT_OPTIONS: CsvOptions = {
  delimiter: ",",
  includeHeaders: true,
  arrayExpansion: "expandFirst",
};

/**
 * Flattens a nested value into exactly one row. Arrays inside it are kept as
 * JSON strings, so no items are lost when only one row can be used.
 */
function flattenToSingleRow(
  data: any,
  options: CsvOptions
): Record<string, any> {
  if (Array.isArray(data)) {
    return { value: JSON.stringify(data) };
  }
  return (
    flattenAndExpand(data, { ...options, arrayExpansion: "stringify" })[0] || {}
  );
}

/**
 * Recursively flattens a JSON object and expands its arrays into multiple rows.
 * This is the core of the smart CSV generation.
 *
 * @param data - The JSON object or value to process
 * @param options - Configuration options for flattening
 * @returns An array of flat objects, where each object represents a CSV row
 */
function flattenAndExpand(
  data: any,
  options: CsvOptions
): Record<string, any>[] {
  if (typeof data !== "object" || data === null) {
    return [{ value: data }];
  }

  // If the top-level item is an array, process each element
  if (Array.isArray(data)) {
    return data.flatMap((item) => flattenAndExpand(item, options));
  }

  // It's an object. Separate simple values from arrays
  const baseObject: Record<string, any> = {};
  const arraysToExpand: { key: string; values: any[] }[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && options.arrayExpansion !== "stringify") {
      arraysToExpand.push({ key, values: value });
      baseObject[key] = ""; // placeholder keeps the column in source order
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // Nested object: flatten its keys into the base object
      const flatSubObject = flattenToSingleRow(value, options);
      for (const [subKey, subValue] of Object.entries(flatSubObject)) {
        baseObject[`${key}.${subKey}`] = subValue;
      }
    } else {
      // Primitive value or array to stringify
      baseObject[key] = Array.isArray(value) ? JSON.stringify(value) : value;
    }
  }

  // If no arrays to expand, we just have one row
  if (arraysToExpand.length === 0) {
    return [baseObject];
  }

  // --- Handle Array Expansion ---

  let rows: Record<string, any>[] = [baseObject];

  // Determine which arrays to expand based on strategy
  const arraysToProcess =
    options.arrayExpansion === "expandFirst"
      ? arraysToExpand.slice(0, 1)
      : arraysToExpand;

  for (const { key, values } of arraysToProcess) {
    const nextRows: Record<string, any>[] = [];

    if (values.length === 0) {
      // If an array is empty, just add the key with an empty value
      rows.forEach((row) => {
        row[key] = "";
      });
      continue;
    }

    // For each existing row, create new rows for each item in the current array
    for (const currentRow of rows) {
      for (const item of values) {
        const flatItem = flattenToSingleRow(item, options);
        const newRow: Record<string, any> = {};

        // Rebuild the row so the array's columns stay where the array sat in the source
        for (const [rowKey, rowValue] of Object.entries(currentRow)) {
          if (rowKey !== key) {
            newRow[rowKey] = rowValue;
          } else if (
            Object.keys(flatItem).length === 1 &&
            flatItem.value !== undefined
          ) {
            // Primitive item: use the array key itself
            newRow[key] = flatItem.value;
          } else {
            // Object item: prefix its keys with the array key
            for (const [itemKey, itemValue] of Object.entries(flatItem)) {
              newRow[`${key}.${itemKey}`] = itemValue;
            }
          }
        }

        nextRows.push(newRow);
      }
    }
    rows = nextRows;
  }

  // If we only expanded the first array, stringify the rest
  if (
    options.arrayExpansion === "expandFirst" &&
    arraysToExpand.length > 1
  ) {
    for (const { key, values } of arraysToExpand.slice(1)) {
      rows.forEach((row) => {
        row[key] = JSON.stringify(values);
      });
    }
  }

  return rows;
}

/**
 * Escapes a value for CSV format.
 * Handles delimiters, quotes, and newlines.
 */
function escapeCsvValue(value: any, delimiter: string): string {
  if (value === null || value === undefined) return "";

  const str = String(value);

  // If value contains delimiter, quotes, or newlines, wrap in quotes
  if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts JSON to CSV with intelligent flattening and configurable array handling.
 *
 * @param jsonString - JSON string or parsed JSON object
 * @param options - Configuration options for CSV generation
 * @returns Object with csv string or error message
 */
export function convertToCsv(
  jsonString: string | any,
  options: Partial<CsvOptions> = {}
): { csv: string; rowCount: number; error: null } | { csv: ""; rowCount: 0; error: string } {
  const finalOptions: CsvOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Parse if string, otherwise use as-is
    const json =
      typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;

    // Flatten and expand the data
    const flatData = flattenAndExpand(json, finalOptions);

    if (flatData.length === 0) {
      return { csv: "", rowCount: 0, error: null };
    }

    // Collect all unique headers from all generated rows
    const headersSet = new Set<string>();
    flatData.forEach((row) => {
      Object.keys(row).forEach((key) => headersSet.add(key));
    });
    const headers = Array.from(headersSet);

    const csvRows: string[] = [];

    // Add headers if requested
    if (finalOptions.includeHeaders) {
      csvRows.push(
        headers
          .map((h) => escapeCsvValue(h, finalOptions.delimiter))
          .join(finalOptions.delimiter)
      );
    }

    // Add data rows
    flatData.forEach((row) => {
      const rowValues = headers.map((header) =>
        escapeCsvValue(row[header], finalOptions.delimiter)
      );
      csvRows.push(rowValues.join(finalOptions.delimiter));
    });

    return { csv: csvRows.join("\n"), rowCount: flatData.length, error: null };
  } catch (error: any) {
    console.error("Error during CSV conversion:", error);
    return {
      csv: "",
      rowCount: 0,
      error: `Conversion failed: ${error.message || "Unknown error"}`,
    };
  }
}
