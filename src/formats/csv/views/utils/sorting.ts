const NUMBER_PATTERN = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  return NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : null;
}

/**
 * Compare two CSV cell values for sorting.
 * Numeric values compare as numbers (so 9 < 10, -5 < 1.5), numbers sort before
 * text, and everything else compares as text with embedded digits ordered naturally.
 */
export function compareCsvValues(a: string, b: string): number {
  const numA = toNumber(a);
  const numB = toNumber(b);

  if (numA !== null && numB !== null) return numA - numB;
  if (numA !== null) return -1;
  if (numB !== null) return 1;

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
