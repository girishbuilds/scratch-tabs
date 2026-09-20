export type ReconcileMode = "line" | "csv";
export type Scope = { kind: "all" | "matching" | "not-matching"; pattern?: string };

export interface NormalizationOptions {
  trim: boolean;
  ignoreCase: boolean;
  collapseWhitespace: boolean;
}

export interface CsvKeyPair {
  a: string;
  b: string;
}

export interface ReconcileOptions {
  mode: ReconcileMode;
  normalization: NormalizationOptions;
  scopeA: Scope;
  scopeB: Scope;
  keyPairs: CsvKeyPair[];
  treatDuplicatesAsOne?: boolean;
}

export interface ReconcileInput {
  a: string;
  b: string;
  options: ReconcileOptions;
}

export interface ReconcileRow {
  source: "A" | "B";
  rowNumber: number;
  text: string;
  values?: Record<string, string>;
}

export interface ChangedRow {
  a: ReconcileRow;
  b: ReconcileRow;
  differences: Array<{ column: string; a: string; b: string }>;
}

export interface ReconcileResult {
  inBoth: Array<{ a: ReconcileRow; b: ReconcileRow }>;
  changed: ChangedRow[];
  onlyA: ReconcileRow[];
  onlyB: ReconcileRow[];
  headers?: { a: string[]; b: string[] };
}

export type ReconcileResponse = {
  headers?: ReconcileResult["headers"];
} & ({ result: ReconcileResult; error?: never } | { error: string; result?: never });

export interface DataReconcilePayload {
  sourceAId?: string;
  sourceBId?: string;
  csvMode?: boolean;
}

export interface DataReconcileStateData {
  sourceAId?: string;
  sourceBId?: string;
  options: ReconcileOptions;
  selectedResult: "aInB" | "aNotInB" | "bInA" | "bNotInA" | "changed";
}
