import * as Papa from "papaparse";
import { ReconcileInput, ReconcileOptions, ReconcileResponse, ReconcileResult, ReconcileRow, Scope } from "./types";

const normalize = (value: string, options: ReconcileOptions["normalization"]): string => {
  let next = value;
  if (options.trim) next = next.trim();
  if (options.collapseWhitespace) next = next.replace(/\s+/g, " ");
  if (options.ignoreCase) next = next.toLocaleLowerCase();
  return next;
};

const scoped = (rows: ReconcileRow[], scope: Scope): ReconcileRow[] => {
  if (scope.kind === "all") return rows;
  if (!scope.pattern) throw new Error("Enter a regular expression for the selected scope.");
  let regex: RegExp;
  try { regex = new RegExp(scope.pattern); } catch { throw new Error("The scope regular expression is invalid."); }
  return rows.filter((row) => scope.kind === "matching" ? regex.test(row.text) : !regex.test(row.text));
};

const lines = (content: string, source: "A" | "B"): ReconcileRow[] =>
  (content === "" ? [] : content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n"))
    .map((text, index) => ({ source, rowNumber: index + 1, text }));

function parseCsv(content: string, source: "A" | "B"): { headers: string[]; rows: ReconcileRow[] } {
  const parsed = Papa.parse<string[]>(content, { skipEmptyLines: false });
  if (parsed.errors.length) throw new Error(`Unable to parse CSV ${source}: ${parsed.errors[0].message}. Try whole-line comparison instead.`);
  const [headers = [], ...data] = parsed.data;
  if (!headers.length || headers.some((header) => !header)) throw new Error(`CSV ${source} needs a non-empty header row.`);
  if (new Set(headers).size !== headers.length) throw new Error(`CSV ${source} has duplicate header names.`);
  return {
    headers,
    rows: data.map((cells, index) => ({
      source,
      rowNumber: index + 2,
      text: Papa.unparse([cells]),
      values: Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""])),
    })),
  };
}

function getReconcileHeaders(input: ReconcileInput): ReconcileResult["headers"] {
  if (input.options.mode !== "csv") return undefined;
  const headersFor = (content: string, source: "A" | "B"): string[] => {
    try { return parseCsv(content, source).headers; } catch { return []; }
  };
  return { a: headersFor(input.a, "A"), b: headersFor(input.b, "B") };
}

function consumeMatches(
  aRows: ReconcileRow[], bRows: ReconcileRow[], keyFor: (row: ReconcileRow) => string, options: ReconcileOptions,
): ReconcileResult {
  const buckets = new Map<string, ReconcileRow[]>();
  const comparedB: ReconcileRow[] = [];
  for (const row of bRows) {
    const key = keyFor(row);
    const bucket = buckets.get(key) ?? [];
    if (!options.treatDuplicatesAsOne || bucket.length === 0) {
      bucket.push(row);
      comparedB.push(row);
    }
    buckets.set(key, bucket);
  }
  const result: ReconcileResult = { inBoth: [], changed: [], onlyA: [], onlyB: [] };
  const usedB = new Set<ReconcileRow>();
  const seenA = new Set<string>();
  for (const a of aRows) {
    const key = keyFor(a);
    if (options.treatDuplicatesAsOne && seenA.has(key)) continue;
    seenA.add(key);
    const candidate = buckets.get(key)?.find((row) => !usedB.has(row));
    if (!candidate) result.onlyA.push(a);
    else {
      usedB.add(candidate);
      result.inBoth.push({ a, b: candidate });
    }
  }
  for (const b of comparedB) if (!usedB.has(b)) result.onlyB.push(b);
  return result;
}

function reconcileLines(input: ReconcileInput): ReconcileResult {
  const aRows = scoped(lines(input.a, "A"), input.options.scopeA);
  const bRows = scoped(lines(input.b, "B"), input.options.scopeB);
  return consumeMatches(aRows, bRows, (row) => normalize(row.text, input.options.normalization), input.options);
}

function reconcileCsv(input: ReconcileInput): ReconcileResult {
  const a = parseCsv(input.a, "A");
  const b = parseCsv(input.b, "B");
  const pairs = input.options.keyPairs.length
    ? input.options.keyPairs
    : a.headers.filter((header) => b.headers.includes(header)).map((header) => ({ a: header, b: header }));
  if (!pairs.length || pairs.some((pair) => !a.headers.includes(pair.a) || !b.headers.includes(pair.b))) {
    throw new Error("Choose valid CSV key columns for both sources.");
  }
  const aRows = scoped(a.rows, input.options.scopeA);
  const bRows = scoped(b.rows, input.options.scopeB);
  const key = (row: ReconcileRow) => pairs.map((pair) => normalize(row.values?.[row.source === "A" ? pair.a : pair.b] ?? "", input.options.normalization)).join("\u0001");
  const result = consumeMatches(aRows, bRows, key, input.options);
  const nonKeyA = a.headers.filter((header) => !pairs.some((pair) => pair.a === header));
  const nonKeyB = b.headers.filter((header) => !pairs.some((pair) => pair.b === header));
  const comparedColumns = nonKeyA.filter((header) => nonKeyB.includes(header));
  const exact: typeof result.inBoth = [];
  for (const match of result.inBoth) {
    const differences = comparedColumns.filter((header) => normalize(match.a.values?.[header] ?? "", input.options.normalization) !== normalize(match.b.values?.[header] ?? "", input.options.normalization))
      .map((column) => ({ column, a: match.a.values?.[column] ?? "", b: match.b.values?.[column] ?? "" }));
    if (differences.length) result.changed.push({ ...match, differences }); else exact.push(match);
  }
  result.inBoth = exact;
  result.headers = { a: a.headers, b: b.headers };
  return result;
}

export function reconcile(input: ReconcileInput): ReconcileResult {
  return input.options.mode === "csv" ? reconcileCsv(input) : reconcileLines(input);
}

export function createReconcileResponse(input: ReconcileInput): ReconcileResponse {
  try {
    const result = reconcile(input);
    return { result, headers: result.headers };
  } catch (error) {
    return {
      headers: getReconcileHeaders(input),
      error: error instanceof Error ? error.message : "Comparison failed.",
    };
  }
}
