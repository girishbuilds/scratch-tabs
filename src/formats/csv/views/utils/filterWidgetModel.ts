import { ColumnFilter, FilterOperator } from "./filtering";

export interface RangeFilterValues {
  min: string;
  max: string;
}

export interface TextFilterValues {
  operator: FilterOperator;
  value: string;
}

export type BooleanSelection = "any" | "true" | "false";

export const TEXT_FILTER_OPERATORS = [
  "contains",
  "notContains",
  "equals",
  "notEquals",
  "startsWith",
  "regex",
] as const;

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=",
  notEquals: "≠",
  contains: "contains",
  notContains: "does not contain",
  startsWith: "starts with",
  regex: "matches /…/",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
};

function nonEmpty(value: unknown): value is string | number {
  if (typeof value !== "string" && typeof value !== "number") return false;
  return String(value).trim() !== "";
}

function toComparable(value: string): number | string {
  const trimmed = value.trim();
  const asNumber = Number(trimmed);
  if (trimmed !== "" && !Number.isNaN(asNumber)) return asNumber;
  return trimmed;
}

function rangeEntry(value: unknown): string {
  return nonEmpty(value) ? String(value) : "";
}

function scalarEntry(value: unknown): string {
  return nonEmpty(value) ? String(value) : "";
}

/** Extracts the min/max input values shown by a range widget (number or date). */
export function toRangeValues(filter: ColumnFilter | undefined): RangeFilterValues {
  switch (filter?.operator) {
    case "gte":
      return { min: scalarEntry(filter.value), max: "" };
    case "lte":
      return { min: "", max: scalarEntry(filter.value) };
    case "between": {
      const range = filter.value;
      if (!Array.isArray(range) || range.length !== 2) break;
      return { min: rangeEntry(range[0]), max: rangeEntry(range[1]) };
    }
    default:
      break;
  }
  return { min: "", max: "" };
}

/**
 * Builds a filter from a range widget. One bound maps to an ordered operator,
 * two bounds to `between` (bounds are swapped when inverted). Returns undefined
 * when both bounds are blank.
 */
export function rangeToFilter(
  columnId: string,
  min: string,
  max: string,
): ColumnFilter | undefined {
  const hasMin = min.trim() !== "";
  const hasMax = max.trim() !== "";

  if (!hasMin && !hasMax) return undefined;
  if (!hasMax) return { columnId, operator: "gte", value: min };
  if (!hasMin) return { columnId, operator: "lte", value: max };

  let [low, high] = [min.trim(), max.trim()];
  if (toComparable(low) > toComparable(high)) [low, high] = [high, low];
  return { columnId, operator: "between", value: [low, high] };
}

/** Extracts the operator/text-input values shown by a text filter widget. */
export function toTextValues(filter: ColumnFilter | undefined): TextFilterValues {
  if (
    filter &&
    (TEXT_FILTER_OPERATORS as readonly string[]).includes(filter.operator)
  ) {
    return { operator: filter.operator, value: scalarEntry(filter.value) };
  }
  return { operator: "contains", value: "" };
}

export function textToFilter(
  columnId: string,
  operator: FilterOperator,
  value: string,
): ColumnFilter | undefined {
  if (value.trim() === "") return undefined;
  return { columnId, operator, value };
}

/** Maps a boolean select widget selection back from an existing filter. */
export function toBooleanSelection(
  filter: ColumnFilter | undefined,
): BooleanSelection {
  if (filter?.operator === "equals") {
    const value = scalarEntry(filter.value).toLowerCase();
    if (value === "true") return "true";
    if (value === "false") return "false";
  }
  return "any";
}

export function booleanToFilter(
  columnId: string,
  selection: BooleanSelection,
): ColumnFilter | undefined {
  if (selection === "any") return undefined;
  return { columnId, operator: "equals", value: selection };
}

/** Human-readable description used by filter chips, e.g. "Amount > 100". */
export function describeFilter(
  filter: ColumnFilter,
  columnName?: string,
): string {
  const name = columnName ?? filter.columnId;
  const value = scalarEntry(filter.value);

  switch (filter.operator) {
    case "between": {
      const range = filter.value;
      if (Array.isArray(range) && range.length === 2) {
        return `${name} ${rangeEntry(range[0])} - ${rangeEntry(range[1])}`;
      }
      return `${name} between`;
    }
    case "in": {
      const list = Array.isArray(filter.value) ? filter.value.join(", ") : "";
      return `${name} in (${list})`;
    }
    case "regex":
      return `${name} /${scalarEntry(filter.value)}/`;
    default: {
      const label = OPERATOR_LABELS[filter.operator] ?? filter.operator;
      return value === "" ? `${name} ${label}` : `${name} ${label} ${value}`;
    }
  }
}

/** Extracts the selected facet values from an `in` filter; null means "no restriction". */
export function toFacetSelection(
  filter: ColumnFilter | undefined,
): string[] | null {
  if (filter?.operator !== "in" || !Array.isArray(filter.value)) return null;
  return filter.value.map(String);
}

/** Maximum distinct values listed in the facet popover. */
export const FACET_MAX_VISIBLE_VALUES = 50;

/**
 * Builds an `in` filter from selected facet values. Selecting every selectable
 * value (or none) clears the filter instead of constraining it, so "select all"
 * never silently hides rows whose values fall outside the visible list.
 * `selectableCount` is how many values the UI actually offers (may be capped).
 */
export function facetSelectionToFilter(
  columnId: string,
  selectedValues: readonly string[],
  selectableCount: number,
): ColumnFilter | undefined {
  const unique = [...new Set(selectedValues)];
  if (unique.length === 0 || unique.length >= selectableCount) return undefined;
  return { columnId, operator: "in", value: unique };
}

/** Quick-filter actions offered by the cell context menu. */
export type QuickFilterAction =
  | "equals"
  | "notEquals"
  | "gt"
  | "lt";

/**
 * Builds a quick filter from a right-clicked cell's value. Returns undefined
 * for blank cells where a comparison would be meaningless.
 */
export function quickFilterFromCell(
  action: QuickFilterAction,
  columnId: string,
  cellValue: string | undefined,
): ColumnFilter | undefined {
  const value = typeof cellValue === "string" ? cellValue.trim() : "";
  if (value === "") return undefined;
  return { columnId, operator: action, value };
}
