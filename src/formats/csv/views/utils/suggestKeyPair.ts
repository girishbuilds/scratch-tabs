import { CsvColumn } from "../types";

export interface KeyPair {
  targetColumnId: string;
  sourceColumnIndex: number;
}

const normalize = (name: string): string => name.trim().toLowerCase();

/** Finds the first current column that shares a header name with the source table. */
export const suggestKeyPair = (
  columns: CsvColumn[],
  sourceHeaders: string[],
): KeyPair | null => {
  const sourceIndexByName = new Map<string, number>();
  sourceHeaders.forEach((header, index) => {
    const name = normalize(header);
    if (name !== "" && !sourceIndexByName.has(name)) {
      sourceIndexByName.set(name, index);
    }
  });

  for (const column of columns) {
    const sourceColumnIndex = sourceIndexByName.get(normalize(column.name));
    if (sourceColumnIndex !== undefined) {
      return { targetColumnId: column.id, sourceColumnIndex };
    }
  }
  return null;
};
