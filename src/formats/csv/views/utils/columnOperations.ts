import { CsvCell, CsvColumn, CsvRow } from "../types";

export interface CsvTableState {
  columns: CsvColumn[];
  data: CsvRow[];
}

/** A plain header + rows table, e.g. parsed from another tab. */
export interface ColumnSource {
  headers: string[];
  rows: string[][];
}

export type ColumnMatch =
  | { mode: "position" }
  | { mode: "key"; targetColumnId: string; sourceColumnIndex: number };

export interface AddColumnsOptions {
  /** Indexes into the source table, in the order the columns should be added. */
  sourceColumns: number[];
  match: ColumnMatch;
  /** Insert after this column; appends when omitted or unknown. */
  insertAfterColumnId?: string;
}

export type ColumnIdFactory = () => string;

const defaultColumnId: ColumnIdFactory = () =>
  `col_${Date.now()}_${Math.random()}`;

const emptyCell = (): CsvCell => ({ value: "", isValid: true });

const reindex = (columns: CsvColumn[]): CsvColumn[] =>
  columns.map((column, index) => ({ ...column, index }));

/** Pads ragged rows so cell positions line up with column positions. */
const padCells = (cells: CsvCell[], length: number): CsvCell[] =>
  cells.length >= length
    ? cells
    : [...cells, ...Array.from({ length: length - cells.length }, emptyCell)];

const insertAt = <T>(items: T[], index: number, inserted: T[]): T[] => [
  ...items.slice(0, index),
  ...inserted,
  ...items.slice(index),
];

export const duplicateColumn = (
  state: CsvTableState,
  columnId: string,
  createId: ColumnIdFactory = defaultColumnId,
): CsvTableState => {
  const columnIndex = state.columns.findIndex((col) => col.id === columnId);
  if (columnIndex === -1) return state;

  const original = state.columns[columnIndex];
  const copy: CsvColumn = {
    ...original,
    id: createId(),
    name: `${original.name} Copy`,
  };
  const insertIndex = columnIndex + 1;

  return {
    columns: reindex(insertAt(state.columns, insertIndex, [copy])),
    data: state.data.map((row) => {
      const cells = padCells(row.cells, state.columns.length);
      return {
        ...row,
        cells: insertAt(cells, insertIndex, [{ ...cells[columnIndex] }]),
      };
    }),
  };
};

const moveItem = <T>(items: T[], from: number, to: number): T[] => {
  const result = [...items];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
};

export const moveColumn = (
  state: CsvTableState,
  columnId: string,
  toIndex: number,
): CsvTableState => {
  const fromIndex = state.columns.findIndex((col) => col.id === columnId);
  if (fromIndex === -1) return state;

  const target = Math.min(Math.max(toIndex, 0), state.columns.length - 1);
  if (target === fromIndex) return state;

  return {
    columns: reindex(moveItem(state.columns, fromIndex, target)),
    data: state.data.map((row) => ({
      ...row,
      cells: moveItem(padCells(row.cells, state.columns.length), fromIndex, target),
    })),
  };
};

const normalizeKey = (value: string | undefined): string => (value ?? "").trim();

/** Source value for each target row, as one array of cell values per row. */
type RowMatcher = (row: CsvRow, rowIndex: number) => string[] | undefined;

const buildPositionMatcher =
  (source: ColumnSource): RowMatcher =>
  (_row, rowIndex) =>
    source.rows[rowIndex];

const buildKeyMatcher = (
  state: CsvTableState,
  source: ColumnSource,
  match: Extract<ColumnMatch, { mode: "key" }>,
): RowMatcher | null => {
  const targetIndex = state.columns.findIndex(
    (col) => col.id === match.targetColumnId,
  );
  const validSourceKey =
    match.sourceColumnIndex >= 0 &&
    match.sourceColumnIndex < source.headers.length;
  if (targetIndex === -1 || !validSourceKey) return null;

  const sourceRowsByKey = new Map<string, string[]>();
  source.rows.forEach((sourceRow) => {
    const key = normalizeKey(sourceRow[match.sourceColumnIndex]);
    if (key !== "" && !sourceRowsByKey.has(key)) {
      sourceRowsByKey.set(key, sourceRow);
    }
  });

  return (row) => {
    const key = normalizeKey(row.cells[targetIndex]?.value);
    return key === "" ? undefined : sourceRowsByKey.get(key);
  };
};

const buildMatcher = (
  state: CsvTableState,
  source: ColumnSource,
  match: ColumnMatch,
): RowMatcher | null =>
  match.mode === "position"
    ? buildPositionMatcher(source)
    : buildKeyMatcher(state, source, match);

const uniqueName = (name: string, taken: Set<string>): string => {
  if (!taken.has(name)) return name;
  let suffix = 2;
  while (taken.has(`${name} (${suffix})`)) suffix++;
  return `${name} (${suffix})`;
};

const buildNewColumns = (
  source: ColumnSource,
  sourceColumns: number[],
  existing: CsvColumn[],
  createId: ColumnIdFactory,
): CsvColumn[] => {
  const takenNames = new Set(existing.map((col) => col.name));

  return sourceColumns.map((sourceIndex) => {
    const header = source.headers[sourceIndex]?.trim();
    const name = uniqueName(header || `Column ${sourceIndex + 1}`, takenNames);
    takenNames.add(name);
    return { id: createId(), name, type: "text", index: 0 };
  });
};

export const addColumnsFromTable = (
  state: CsvTableState,
  source: ColumnSource,
  options: AddColumnsOptions,
  createId: ColumnIdFactory = defaultColumnId,
): CsvTableState => {
  const sourceColumns = options.sourceColumns.filter(
    (index) => index >= 0 && index < source.headers.length,
  );
  if (sourceColumns.length === 0) return state;

  const matcher = buildMatcher(state, source, options.match);
  if (!matcher) return state;

  const anchorIndex = state.columns.findIndex(
    (col) => col.id === options.insertAfterColumnId,
  );
  const insertIndex = anchorIndex === -1 ? state.columns.length : anchorIndex + 1;

  const newColumns = buildNewColumns(
    source,
    sourceColumns,
    state.columns,
    createId,
  );

  return {
    columns: reindex(insertAt(state.columns, insertIndex, newColumns)),
    data: state.data.map((row, rowIndex) => {
      const sourceRow = matcher(row, rowIndex);
      const newCells = sourceColumns.map(
        (sourceIndex): CsvCell => ({
          value: sourceRow?.[sourceIndex] ?? "",
          isValid: true,
        }),
      );
      const cells = padCells(row.cells, state.columns.length);
      return { ...row, cells: insertAt(cells, insertIndex, newCells) };
    }),
  };
};
