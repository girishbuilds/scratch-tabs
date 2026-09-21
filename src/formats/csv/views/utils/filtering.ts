import { CsvColumn, CsvRow } from "../types";

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "isEmpty"
  | "isNotEmpty"
  | "in"
  | "regex";

export interface ColumnFilter {
  columnId: string;
  operator: FilterOperator;
  value?: string | number | [number, number] | string[];
  caseSensitive?: boolean;
}

export type FilterMatchMode = "and" | "or";

/**
 * Nested rule tree for compound filtering. A leaf is a plain `ColumnFilter`;
 * groups combine their children with AND/OR and may nest arbitrarily.
 * JSON-serializable so it can round-trip through presets/snapshots.
 */
export type FilterRule = ColumnFilter | { and: FilterRule[] } | { or: FilterRule[] };

export interface ApplyFiltersOptions {
  matchMode?: FilterMatchMode;
}

export function isFilterGroup(rule: FilterRule): rule is { and: FilterRule[] } | { or: FilterRule[] } {
  return "and" in rule || "or" in rule;
}

/** Wraps flat filters into a single group using the given match mode. */
export function flatFiltersToRule(
  filters: ColumnFilter[],
  matchMode: FilterMatchMode,
): FilterRule {
  return matchMode === "or" ? { or: [...filters] } : { and: [...filters] };
}

function getCellValue(row: CsvRow, column: CsvColumn): string {
  const cell = row.cells[column.index];
  return cell ? cell.value : "";
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

function toDate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareStrings(
  cellValue: string,
  filterValue: string,
  caseSensitive: boolean,
): number {
  const a = caseSensitive ? cellValue : cellValue.toLowerCase();
  const b = caseSensitive ? filterValue : filterValue.toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseFilterValueAs(
  value: unknown,
  parser: (raw: string) => number | null,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return parser(value);
  return null;
}

function matchesOrdered(
  cellValue: string,
  filterValue: unknown,
  columnType: CsvColumn["type"],
  operator: "gt" | "gte" | "lt" | "lte",
  compare: (a: string, b: string) => number,
): boolean {
  if (columnType === "number") {
    const cell = toNumber(cellValue);
    const bound = parseFilterValueAs(filterValue, toNumber);
    if (cell === null || bound === null) return false;
    switch (operator) {
      case "gt":
        return cell > bound;
      case "gte":
        return cell >= bound;
      case "lt":
        return cell < bound;
      case "lte":
        return cell <= bound;
    }
  }

  if (columnType === "date") {
    const cell = toDate(cellValue);
    const bound = parseFilterValueAs(filterValue, toDate);
    if (cell === null || bound === null) return false;
    switch (operator) {
      case "gt":
        return cell > bound;
      case "gte":
        return cell >= bound;
      case "lt":
        return cell < bound;
      case "lte":
        return cell <= bound;
    }
  }

  const filterString =
    typeof filterValue === "string" || typeof filterValue === "number"
      ? String(filterValue)
      : "";
  const comparison = compare(cellValue, filterString);
  switch (operator) {
    case "gt":
      return comparison > 0;
    case "gte":
      return comparison >= 0;
    case "lt":
      return comparison < 0;
    case "lte":
      return comparison <= 0;
  }
}

/**
 * Compiled regex cache keyed by the owning filter object (filters are treated
 * as immutable), so a pattern is compiled once instead of once per row.
 * Invalid patterns are cached as `null` to avoid re-throwing per row.
 */
const regexCache = new WeakMap<ColumnFilter, Map<string, RegExp | null>>();

function getCompiledRegex(filter: ColumnFilter): RegExp | null {
  if (typeof filter.value !== "string") return null;
  const key = `${filter.caseSensitive ? "s" : "i"}\u0000${filter.value}`;
  let patterns = regexCache.get(filter);
  if (!patterns) {
    patterns = new Map();
    regexCache.set(filter, patterns);
  }
  let compiled = patterns.get(key);
  if (compiled === undefined) {
    try {
      compiled = new RegExp(filter.value, filter.caseSensitive ? "" : "i");
    } catch {
      compiled = null;
    }
    patterns.set(key, compiled);
  }
  return compiled;
}

function matchesFilter(
  row: CsvRow,
  filter: ColumnFilter,
  columnsById: Map<string, CsvColumn>,
): boolean {
  const column = columnsById.get(filter.columnId);
  const cellValue = column ? getCellValue(row, column) : "";
  const columnType = column?.type ?? "text";
  const caseSensitive = filter.caseSensitive ?? false;

  const equalsString = (a: string, b: string) =>
    caseSensitive
      ? a === b
      : a.toLowerCase() === b.toLowerCase();

  switch (filter.operator) {
    case "isEmpty":
      return cellValue.trim() === "";
    case "isNotEmpty":
      return cellValue.trim() !== "";

    case "equals": {
      const expected = filter.value;
      if (typeof expected === "string" || typeof expected === "number") {
        const expectedString = String(expected);
        if (columnType === "number") {
          const cell = toNumber(cellValue);
          const expectedNumber = parseFilterValueAs(expected, toNumber);
          return (
            cell !== null &&
            expectedNumber !== null &&
            cell === expectedNumber
          );
        }
        return equalsString(cellValue, expectedString);
      }
      return equalsString(cellValue, "");
    }

    case "notEquals": {
      const expected = filter.value;
      if (typeof expected === "string" || typeof expected === "number") {
        const expectedString = String(expected);
        if (columnType === "number") {
          const cell = toNumber(cellValue);
          const expectedNumber = parseFilterValueAs(expected, toNumber);
          if (expectedNumber === null) return true;
          return cell === null || cell !== expectedNumber;
        }
        return !equalsString(cellValue, expectedString);
      }
      return !equalsString(cellValue, "");
    }

    case "contains": {
      if (typeof filter.value !== "string" && typeof filter.value !== "number")
        return false;
      const needle = String(filter.value);
      return caseSensitive
        ? cellValue.includes(needle)
        : cellValue.toLowerCase().includes(needle.toLowerCase());
    }

    case "notContains": {
      if (typeof filter.value !== "string" && typeof filter.value !== "number")
        return true;
      const needle = String(filter.value);
      return caseSensitive
        ? !cellValue.includes(needle)
        : !cellValue.toLowerCase().includes(needle.toLowerCase());
    }

    case "startsWith": {
      if (typeof filter.value !== "string" && typeof filter.value !== "number")
        return false;
      const prefix = String(filter.value);
      return caseSensitive
        ? cellValue.startsWith(prefix)
        : cellValue.toLowerCase().startsWith(prefix.toLowerCase());
    }

    case "in": {
      const candidates = Array.isArray(filter.value)
        ? filter.value.map(String)
        : [];
      return candidates.some((candidate) =>
        equalsString(cellValue, candidate),
      );
    }

    case "regex": {
      const pattern = getCompiledRegex(filter);
      return pattern !== null && pattern.test(cellValue);
    }

    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return matchesOrdered(
        cellValue,
        filter.value,
        columnType,
        filter.operator,
        (a, b) => compareStrings(a, b, caseSensitive),
      );

    case "between": {
      const range = filter.value;
      if (!Array.isArray(range) || range.length !== 2) return false;
      const [min, max] = range;
      if (columnType === "number") {
        const cell = toNumber(cellValue);
        const minNumber = parseFilterValueAs(min, toNumber);
        const maxNumber = parseFilterValueAs(max, toNumber);
        if (cell === null || minNumber === null || maxNumber === null)
          return false;
        return cell >= minNumber && cell <= maxNumber;
      }
      if (columnType === "date") {
        const cell = toDate(cellValue);
        const minDate = parseFilterValueAs(min, toDate);
        const maxDate = parseFilterValueAs(max, toDate);
        if (cell === null || minDate === null || maxDate === null) return false;
        return cell >= minDate && cell <= maxDate;
      }
      return (
        compareStrings(cellValue, String(min), caseSensitive) >= 0 &&
        compareStrings(cellValue, String(max), caseSensitive) <= 0
      );
    }
  }
}

export function applyFilters(
  rows: CsvRow[],
  filters: ColumnFilter[],
  columns: CsvColumn[],
  options: ApplyFiltersOptions = {},
): CsvRow[] {
  if (filters.length === 0) return rows;

  const columnsById = new Map(columns.map((column) => [column.id, column]));
  const combine = options.matchMode === "or"
    ? (row: CsvRow) => filters.some((filter) => matchesFilter(row, filter, columnsById))
    : (row: CsvRow) => filters.every((filter) => matchesFilter(row, filter, columnsById));

  return rows.filter(combine);
}

function matchesRule(
  row: CsvRow,
  rule: FilterRule,
  columnsById: Map<string, CsvColumn>,
): boolean {
  if ("and" in rule) return rule.and.every((child) => matchesRule(row, child, columnsById));
  if ("or" in rule) return rule.or.some((child) => matchesRule(row, child, columnsById));
  return matchesFilter(row, rule, columnsById);
}

/**
 * Filters rows against a (possibly nested) rule tree. Empty `and` groups match
 * every row (vacuous truth); empty `or` groups match none.
 */
export function applyRuleFilters(
  rows: CsvRow[],
  columns: CsvColumn[],
  rule: FilterRule,
): CsvRow[] {
  const columnsById = new Map(columns.map((column) => [column.id, column]));
  return rows.filter((row) => matchesRule(row, rule, columnsById));
}
