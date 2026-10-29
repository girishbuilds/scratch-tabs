import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as Papa from "papaparse";
import { debounce } from "lodash";
import {
  CsvRow,
  CsvColumn,
  CsvDiagnostic,
  CsvSnapshot,
  UseCsvDataOptions,
  CsvColumnStats,
} from "../types";
import { inferColumnTypes } from "../utils/typeInference";
import {
  applyFilters,
  ColumnFilter,
  FilterMatchMode,
} from "../utils/filtering";
import { detectDelimiter } from "../utils/delimiter";
import {
  AddColumnsOptions,
  ColumnSource,
  addColumnsFromTable as addColumnsFromTableState,
  duplicateColumn as duplicateColumnState,
  moveColumn as moveColumnState,
} from "../utils/columnOperations";

export interface UseCsvDataReturn {
  // Data state
  data: CsvRow[];
  columns: CsvColumn[];
  loading: boolean;
  error: string | null;

  // Diagnostics
  diagnostics: CsvDiagnostic[];
  isValid: boolean;

  // Data manipulation
  updateCell: (rowId: string, columnId: string, value: string) => void;
  updateCells: (updates: Array<{rowId: string, columnId: string, value: string}>) => void;
  addRow: (index?: number) => void;
  deleteRow: (rowId: string) => void;
  deleteRows: (rowIds: string[]) => void;
  duplicateRow: (rowId: string) => void;
  addColumn: (index?: number, name?: string) => void;
  deleteColumn: (columnId: string) => void;
  duplicateColumn: (columnId: string) => void;
  moveColumn: (columnId: string, toIndex: number) => void;
  addColumnsFromTable: (source: ColumnSource, options: AddColumnsOptions) => void;
  renameColumn: (columnId: string, newName: string) => void;
  insertAndShift: (cellIdentifiers: Array<{rowId: string, columnId: string}>) => void;
  promoteFirstRowToHeader: () => void;
  demoteHeaderToFirstRow: () => void;
  pasteCells: (startRowId: string, startColumnId: string, pastedGrid: string[][]) => void;
  insertColumnsFromGrid: (targetColumnId: string, columnNames: string[], columnRows: string[][]) => void;
  fillDown: (rowId: string, columnId: string) => number;

  // Undo/Redo (simplified)
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Snapshots
  snapshots: CsvSnapshot[];
  createSnapshot: (name: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;

  // Export
  // All exporters accept an optional subset of rows (e.g. the filtered view);
  // omitting it exports every row.
  toCsv: (rows?: CsvRow[]) => string;
  toJson: (rows?: CsvRow[]) => string;
  toMarkdown: (rows?: CsvRow[]) => string;
  toSql: (tableName: string, rows?: CsvRow[]) => string;

  // Delimiter
  detectedDelimiter: string;
  changeDelimiter: (newDelimiter: string) => void;

  // Column filters (view state; survives content re-parses)
  filters: ColumnFilter[];
  filterMatchMode: FilterMatchMode;
  filteredData: CsvRow[];
  setColumnFilter: (columnId: string, filter?: ColumnFilter) => void;
  removeColumnFilter: (columnId: string) => void;
  clearFilters: () => void;
  setFilterMatchMode: (mode: FilterMatchMode) => void;

  // Saved filter presets
  filterPresets: FilterPreset[];
  saveFilterPreset: (name: string) => void;
  applyFilterPreset: (presetId: string) => void;
  deleteFilterPreset: (presetId: string) => void;

  // Statistics
  getColumnStats: (columnId: string) => CsvColumnStats;
}

interface CsvState {
  data: CsvRow[];
  columns: CsvColumn[];
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: ColumnFilter[];
  matchMode: FilterMatchMode;
}

const makePresetId = () => `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useCsvData = (
  content: string,
  onContentChange: (newContent: string) => void,
  options: UseCsvDataOptions = {},
): UseCsvDataReturn => {
  const { delimiter: providedDelimiter, hasHeader = true, skipEmptyLines = true } = options;

  // Auto-detect delimiter if not provided
  const delimiter = useMemo(() => {
    if (providedDelimiter) return providedDelimiter;

    return detectDelimiter(content);
  }, [content, providedDelimiter]);

  // Core state
  const [csvState, setCsvState] = useState<CsvState>({ data: [], columns: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<CsvDiagnostic[]>([]);
  const [snapshots, setSnapshots] = useState<CsvSnapshot[]>([]);

  // Column filter view state.
  // Deliberately excluded from undo/redo history: filters never mutate content
  // (Monaco model stays the source of truth) and undoing a data edit should not
  // silently discard the user's view configuration.
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [filterMatchMode, setFilterMatchModeState] =
    useState<FilterMatchMode>("and");

  // Saved filter presets (named snapshots of the current filter set)
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);

  // Simple undo/redo
  const [history, setHistory] = useState<CsvState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Track the last content we synced to prevent circular updates
  const lastSyncedContentRef = useRef<string>("");

  // Debounced content sync
  const debouncedSync = useMemo(
    () =>
      debounce((newContent: string) => {
        lastSyncedContentRef.current = newContent;
        onContentChange(newContent);
      }, 300),
    [onContentChange],
  );

  // Parse CSV content
  const parseCsv = useCallback(
    (csvContent: string) => {
      try {
        const parseResult = Papa.parse(csvContent, {
          delimiter,
          header: false,
          skipEmptyLines,
          dynamicTyping: false,
          transform: (value: string) => value.trim(),
        });

        const { data: rawData, errors } = parseResult;

        // Generate diagnostics
        const newDiagnostics: CsvDiagnostic[] = [];

        errors.forEach((error) => {
          newDiagnostics.push({
            type: "error",
            message: error.message,
            line: error.row !== undefined ? error.row + 1 : undefined,
          });
        });

        // Check for inconsistent row lengths
        if (rawData.length > 0) {
          const expectedLength = (rawData[0] as string[]).length;
          rawData.forEach((row, index) => {
            if ((row as string[]).length !== expectedLength) {
              // Calculate data row number (excluding header if present)
              const dataRowNumber = hasHeader ? index : index + 1;
              const isHeaderRow = hasHeader && index === 0;

              if (isHeaderRow) {
                // Header row validation
                newDiagnostics.push({
                  type: "warning",
                  message: `Header has ${(row as string[]).length} columns, expected ${expectedLength}`,
                  line: index + 1,
                  suggestion: "Check for missing or extra delimiters in header",
                });
              } else {
                // Data row validation
                newDiagnostics.push({
                  type: "warning",
                  message: `Row ${dataRowNumber} has ${(row as string[]).length} columns, expected ${expectedLength}`,
                  line: index + 1,
                  suggestion: "Check for missing or extra delimiters",
                });
              }
            }
          });
        }

        // Extract headers and data
        let headers: string[] = [];
        let dataRows: string[][] = [];

        if (hasHeader && rawData.length > 0) {
          headers = rawData[0] as string[];
          dataRows = rawData.slice(1) as string[][];
        } else {
          const maxCols = Math.max(
            ...rawData.map((row) => (row as string[]).length),
          );
          headers = Array.from(
            { length: maxCols },
            (_, i) => `Column ${i + 1}`,
          );
          dataRows = rawData as string[][];
        }

        // Create columns with inferred types.
        // Ids embed the header name so a re-parse that renames, reorders or
        // inserts columns yields fresh ids — the filter-pruning effect below
        // then drops stale filters instead of silently re-targeting them at
        // different data. Ids stay stable when only rows change.
        const sanitizeIdPart = (name: string) =>
          name.replace(/[^A-Za-z0-9_-]/g, "_");
        const inferredTypes = inferColumnTypes(dataRows);
        const columns: CsvColumn[] = headers.map((header, index) => {
          const name = header || `Column ${index + 1}`;
          return {
            id: `col_${index}_${sanitizeIdPart(name)}`,
            name,
            type: inferredTypes[index] ?? "text",
            index,
          };
        });

        // Create rows
        const data: CsvRow[] = dataRows.map((row, index) => ({
          id: `row_${index}`,
          cells: row.map((cell) => ({
            value: cell || "",
            isValid: true,
          })),
          originalIndex: index,
          isValid: true,
        }));

        setDiagnostics(newDiagnostics);
        return { data, columns };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown parsing error";
        setError(errorMessage);
        setDiagnostics([
          {
            type: "error",
            message: errorMessage,
          },
        ]);
        return { data: [], columns: [] };
      }
    },
    [delimiter, hasHeader, skipEmptyLines],
  );

  // Initialize data from content
  useEffect(() => {
    // Skip re-parsing if this content change came from our own sync
    if (content === lastSyncedContentRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = parseCsv(content);
    setCsvState(result);
    setHistory([result]);
    setHistoryIndex(0);

    setLoading(false);
  }, [content, parseCsv]);

  // Drop filters whose column no longer exists. Parse-generated column ids
  // embed the header name, so a re-parse that renames, reorders or removes
  // columns invalidates the affected ids instead of silently re-targeting
  // existing filters at different data.
  useEffect(() => {
    setFilters((prev) => {
      if (prev.length === 0) return prev;
      const columnIds = new Set(csvState.columns.map((column) => column.id));
      const kept = prev.filter((filter) => columnIds.has(filter.columnId));
      return kept.length === prev.length ? prev : kept;
    });
  }, [csvState.columns]);

  const setColumnFilter = useCallback(
    (columnId: string, filter?: ColumnFilter) => {
      setFilters((prev) => {
        const index = prev.findIndex((existing) => existing.columnId === columnId);
        if (!filter) {
          return index === -1 ? prev : prev.filter((_, i) => i !== index);
        }
        if (index === -1) return [...prev, filter];
        const next = [...prev];
        next[index] = { ...filter, columnId };
        return next;
      });
    },
    [],
  );

  const removeColumnFilter = useCallback((columnId: string) => {
    setFilters((prev) => prev.filter((filter) => filter.columnId !== columnId));
  }, []);

  const clearFilters = useCallback(() => setFilters([]), []);

  const setFilterMatchMode = useCallback((mode: FilterMatchMode) => {
    setFilterMatchModeState(mode);
  }, []);

  const saveFilterPreset = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (trimmed === "") return;
      setFilterPresets((prev) => {
        const existingIndex = prev.findIndex(
          (preset) => preset.name === trimmed,
        );
        const preset: FilterPreset = {
          id:
            existingIndex === -1
              ? makePresetId()
              : prev[existingIndex].id,
          name: trimmed,
          filters: filters.map((filter) => ({ ...filter })),
          matchMode: filterMatchMode,
        };
        if (existingIndex === -1) return [...prev, preset];
        const next = [...prev];
        next[existingIndex] = preset;
        return next;
      });
    },
    [filters, filterMatchMode],
  );

  const applyFilterPreset = useCallback(
    (presetId: string) => {
      const preset = filterPresets.find(
        (candidate) => candidate.id === presetId,
      );
      if (!preset) return;
      // State updaters must stay pure, so side-effecting setState calls for
      // filters happen here instead of inside a setFilterPresets updater.
      setFilters(preset.filters.map((filter) => ({ ...filter })));
      setFilterMatchModeState(preset.matchMode);
    },
    [filterPresets],
  );

  const deleteFilterPreset = useCallback((presetId: string) => {
    setFilterPresets((prev) =>
      prev.filter((preset) => preset.id !== presetId),
    );
  }, []);

  const filteredData = useMemo(
    () =>
      applyFilters(csvState.data, filters, csvState.columns, {
        matchMode: filterMatchMode,
      }),
    [csvState.data, filters, csvState.columns, filterMatchMode],
  );

  // Save state to history for undo/redo
  const saveToHistory = useCallback((newState: CsvState) => {
    setHistoryIndex((currentIndex) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push(newState);
        const finalHistory = newHistory.slice(-50);
        return finalHistory;
      });
      const newIndex = Math.min(currentIndex + 1, 49);
      return newIndex;
    });
  }, []);

  // Sync changes back to content
  const syncToContent = useCallback(
    (currentState?: CsvState) => {
      const stateToUse = currentState || csvState;

      // Generate CSV from the provided state
      const headers = hasHeader
        ? [stateToUse.columns.map((col) => col.name)]
        : [];
      const rows = stateToUse.data.map((row) =>
        row.cells.map((cell) => cell.value),
      );
      const allRows = [...headers, ...rows];

      const csvContent = Papa.unparse(allRows, { delimiter });
      debouncedSync(csvContent);
    },
    [debouncedSync, hasHeader, delimiter],
  );

  // Data manipulation functions
  const updateCell = useCallback(
    (rowId: string, columnId: string, value: string) => {
      const newState = {
        ...csvState,
        data: csvState.data.map((row) => {
          if (row.id === rowId) {
            const columnIndex = csvState.columns.findIndex(
              (col) => col.id === columnId,
            );
            if (columnIndex !== -1) {
              const newCells = [...row.cells];
              newCells[columnIndex] = { value, isValid: true };
              return { ...row, cells: newCells };
            }
          }
          return row;
        }),
      };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  // Batch update multiple cells at once (avoids stale closure issues)
  const updateCells = useCallback(
    (updates: Array<{rowId: string, columnId: string, value: string}>) => {
      // Create a map of updates for quick lookup
      const updateMap = new Map<string, Map<string, string>>();
      updates.forEach(({rowId, columnId, value}) => {
        if (!updateMap.has(rowId)) {
          updateMap.set(rowId, new Map());
        }
        updateMap.get(rowId)!.set(columnId, value);
      });

      const newState = {
        ...csvState,
        data: csvState.data.map((row) => {
          const rowUpdates = updateMap.get(row.id);
          if (rowUpdates) {
            const newCells = row.cells.map((cell, cellIndex) => {
              const column = csvState.columns[cellIndex];
              if (column && rowUpdates.has(column.id)) {
                return { value: rowUpdates.get(column.id)!, isValid: true };
              }
              return cell;
            });
            return { ...row, cells: newCells };
          }
          return row;
        }),
      };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const addRow = useCallback(
    (index?: number) => {
      const insertIndex = index ?? csvState.data.length;

      const newRow: CsvRow = {
        id: `row_${Date.now()}_${Math.random()}`,
        cells: csvState.columns.map(() => ({ value: "", isValid: true })),
        originalIndex: insertIndex,
        isValid: true,
      };

      const newData = [...csvState.data];
      newData.splice(insertIndex, 0, newRow);

      const newState = { ...csvState, data: newData };
      setCsvState(newState);
      saveToHistory(newState);

      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const deleteRow = useCallback(
    (rowId: string) => {
      const newState = {
        ...csvState,
        data: csvState.data.filter((row) => row.id !== rowId),
      };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const deleteRows = useCallback(
    (rowIds: string[]) => {
      const rowIdSet = new Set(rowIds);
      const newState = {
        ...csvState,
        data: csvState.data.filter((row) => !rowIdSet.has(row.id)),
      };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const duplicateRow = useCallback(
    (rowId: string) => {
      const rowIndex = csvState.data.findIndex((row) => row.id === rowId);
      if (rowIndex === -1) return;

      const originalRow = csvState.data[rowIndex];
      const duplicatedRow: CsvRow = {
        id: `row_${Date.now()}_${Math.random()}`,
        cells: originalRow.cells.map((cell) => ({ ...cell })), // Deep copy cells
        originalIndex: rowIndex + 1,
        isValid: originalRow.isValid,
      };

      const newData = [...csvState.data];
      newData.splice(rowIndex + 1, 0, duplicatedRow); // Insert after original row

      const newState = { ...csvState, data: newData };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const addColumn = useCallback(
    (index?: number, name?: string) => {
      const insertIndex = index ?? csvState.columns.length;
      const newColumn: CsvColumn = {
        id: `col_${Date.now()}_${Math.random()}`,
        name: name || `Column ${csvState.columns.length + 1}`,
        type: "text",
        index: insertIndex,
      };

      const newColumns = [...csvState.columns];
      newColumns.splice(insertIndex, 0, newColumn);

      const newData = csvState.data.map((row) => {
        const newCells = [...row.cells];
        newCells.splice(insertIndex, 0, { value: "", isValid: true });
        return { ...row, cells: newCells };
      });

      const newState = { columns: newColumns, data: newData };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const deleteColumn = useCallback(
    (columnId: string) => {
      const columnIndex = csvState.columns.findIndex(
        (col) => col.id === columnId,
      );
      if (columnIndex === -1) return;

      const newColumns = csvState.columns.filter((col) => col.id !== columnId);
      const newData = csvState.data.map((row) => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== columnIndex),
      }));

      const newState = { columns: newColumns, data: newData };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  // Applies a pure column operation; no-ops (same state reference) skip history and sync.
  const commitColumnOperation = useCallback(
    (operation: (state: CsvState) => CsvState) => {
      const newState = operation(csvState);
      if (newState === csvState) return;
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const duplicateColumn = useCallback(
    (columnId: string) =>
      commitColumnOperation((state) => duplicateColumnState(state, columnId)),
    [commitColumnOperation],
  );

  const moveColumn = useCallback(
    (columnId: string, toIndex: number) =>
      commitColumnOperation((state) => moveColumnState(state, columnId, toIndex)),
    [commitColumnOperation],
  );

  const addColumnsFromTable = useCallback(
    (source: ColumnSource, options: AddColumnsOptions) =>
      commitColumnOperation((state) =>
        addColumnsFromTableState(state, source, options),
      ),
    [commitColumnOperation],
  );

  const renameColumn = useCallback(
    (columnId: string, newName: string) => {
      const newColumns = csvState.columns.map((col) =>
        col.id === columnId ? { ...col, name: newName } : col,
      );

      const newState = { ...csvState, columns: newColumns };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const insertAndShift = useCallback(
    (cellIdentifiers: Array<{rowId: string, columnId: string}>) => {
      if (cellIdentifiers.length === 0) return;
      
      // Check if any row has multiple selected cells (not allowed)
      const cellsByRow = new Map<string, string[]>();
      cellIdentifiers.forEach(({ rowId, columnId }) => {
        if (!cellsByRow.has(rowId)) {
          cellsByRow.set(rowId, []);
        }
        cellsByRow.get(rowId)!.push(columnId);
      });
      
      // Validate that no row has multiple cells selected
      for (const [, columnIds] of cellsByRow) {
        if (columnIds.length > 1) {
          console.warn('Insert and shift cannot be applied to multiple cells in the same row');
          return;
        }
      }
      
      // Group cells by column and row to process each column separately
      const cellsByColumn = new Map<string, string[]>();
      cellIdentifiers.forEach(({ rowId, columnId }) => {
        if (!cellsByColumn.has(columnId)) {
          cellsByColumn.set(columnId, []);
        }
        cellsByColumn.get(columnId)!.push(rowId);
      });
      
      // Process each column separately to support multi-column selections
      let newData = [...csvState.data];
      
      for (const [columnId, rowIds] of cellsByColumn) {
        const columnIndex = csvState.columns.findIndex(col => col.id === columnId);
        
        if (columnIndex === -1) {
          console.warn('Column not found');
          continue;
        }
        
        // Update rows for this column
        newData = newData.map(row => {
          if (rowIds.includes(row.id)) {
            // Safety check: row must have fewer cells than total columns
            if (row.cells.length >= csvState.columns.length) {
              console.warn(`Row ${row.id} already has maximum columns, cannot shift`);
              return row;
            }
            
            // Insert empty cell at the column index and shift right
            const newCells = [...row.cells];
            newCells.splice(columnIndex, 0, { value: "", isValid: true });
            
            return {
              ...row,
              cells: newCells,
            };
          }
          return row;
        });
      }
      
      const newState = { ...csvState, data: newData };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const promoteFirstRowToHeader = useCallback(() => {
    if (csvState.data.length === 0) return;

    const firstRow = csvState.data[0];
    const newColumns = csvState.columns.map((col, index) => ({
      ...col,
      name: firstRow.cells[index]?.value || col.name,
    }));
    const newState = { columns: newColumns, data: csvState.data.slice(1) };
    setCsvState(newState);
    saveToHistory(newState);
    syncToContent(newState);
  }, [csvState, saveToHistory, syncToContent]);

  const demoteHeaderToFirstRow = useCallback(() => {
    const headerRow: CsvRow = {
      id: `row_${Date.now()}_${Math.random()}`,
      cells: csvState.columns.map((col) => ({ value: col.name, isValid: true })),
      originalIndex: 0,
      isValid: true,
    };
    const newColumns = csvState.columns.map((col, index) => ({
      ...col,
      name: `Column ${index + 1}`,
    }));
    const newState = { columns: newColumns, data: [headerRow, ...csvState.data] };
    setCsvState(newState);
    saveToHistory(newState);
    syncToContent(newState);
  }, [csvState, saveToHistory, syncToContent]);

  const changeDelimiter = useCallback(
    (newDelimiter: string) => {
      const headers = hasHeader ? [csvState.columns.map((col) => col.name)] : [];
      const rows = csvState.data.map((row) => row.cells.map((cell) => cell.value));
      const newContent = Papa.unparse([...headers, ...rows], { delimiter: newDelimiter });
      lastSyncedContentRef.current = newContent;
      onContentChange(newContent);
    },
    [csvState, hasHeader, onContentChange],
  );

  const pasteCells = useCallback(
    (startRowId: string, startColumnId: string, pastedGrid: string[][]) => {
      if (pastedGrid.length === 0 || pastedGrid[0].length === 0) return;

      const startRowIndex = csvState.data.findIndex((row) => row.id === startRowId);
      const startColumnIndex = csvState.columns.findIndex((col) => col.id === startColumnId);

      if (startRowIndex === -1 || startColumnIndex === -1) return;

      // Determine if we need to add columns or rows
      const requiredRowCount = startRowIndex + pastedGrid.length;
      const requiredColCount = startColumnIndex + Math.max(...pastedGrid.map(r => r.length));

      let newColumns = [...csvState.columns];
      const additionalColsNeeded = requiredColCount - csvState.columns.length;
      if (additionalColsNeeded > 0) {
        for (let i = 0; i < additionalColsNeeded; i++) {
          newColumns.push({
            id: `col_${Date.now()}_${Math.random()}_${i}`,
            name: `Column ${newColumns.length + 1}`,
            type: "text",
            index: newColumns.length,
          });
        }
      }

      let newData = csvState.data.map((row) => {
        // Pad existing rows with extra cells if columns were added
        const newCells = [...row.cells];
        if (newCells.length < newColumns.length) {
          const cellsToAdd = newColumns.length - newCells.length;
          for (let i = 0; i < cellsToAdd; i++) {
            newCells.push({ value: "", isValid: true });
          }
        }
        return { ...row, cells: newCells };
      });

      const additionalRowsNeeded = requiredRowCount - csvState.data.length;
      if (additionalRowsNeeded > 0) {
        for (let i = 0; i < additionalRowsNeeded; i++) {
          const newRow: CsvRow = {
            id: `row_${Date.now()}_${Math.random()}_${i}`,
            cells: newColumns.map(() => ({ value: "", isValid: true })),
            originalIndex: newData.length,
            isValid: true,
          };
          newData.push(newRow);
        }
      }

      // Now apply the pasted values
      pastedGrid.forEach((pastedRow, rIdx) => {
        const targetRowIndex = startRowIndex + rIdx;
        const targetRow = newData[targetRowIndex];
        if (targetRow) {
          pastedRow.forEach((pastedValue, cIdx) => {
            const targetColIndex = startColumnIndex + cIdx;
            if (targetColIndex < newColumns.length) {
              targetRow.cells[targetColIndex] = { value: pastedValue || "", isValid: true };
            }
          });
        }
      });

      const newState = { columns: newColumns, data: newData };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  const insertColumnsFromGrid = useCallback(
    (targetColumnId: string, columnNames: string[], columnRows: string[][]) => {
      if (columnNames.length === 0) return;

      const targetColumnIndex = csvState.columns.findIndex(
        (col) => col.id === targetColumnId,
      );
      const insertIndex =
        targetColumnIndex === -1 ? csvState.columns.length : targetColumnIndex;
      const newColumnCount = columnNames.length;
      const requiredRowCount = Math.max(csvState.data.length, columnRows.length);

      const insertedColumns: CsvColumn[] = columnNames.map((name, index) => ({
        id: `col_${Date.now()}_${Math.random()}_${index}`,
        name: name.trim() || `Column ${insertIndex + index + 1}`,
        type: "text",
        index: insertIndex + index,
      }));

      const newColumns = [
        ...csvState.columns.slice(0, insertIndex),
        ...insertedColumns,
        ...csvState.columns.slice(insertIndex),
      ].map((column, index) => ({ ...column, index }));

      const newData: CsvRow[] = Array.from({ length: requiredRowCount }, (_, rowIndex) => {
        const existingRow = csvState.data[rowIndex];
        const existingCells =
          existingRow?.cells.map((cell) => ({ ...cell })) ??
          csvState.columns.map(() => ({ value: "", isValid: true }));
        const insertedCells = Array.from({ length: newColumnCount }, (_, columnIndex) => ({
          value: columnRows[rowIndex]?.[columnIndex] ?? "",
          isValid: true,
        }));

        return {
          id: existingRow?.id ?? `row_${Date.now()}_${Math.random()}_${rowIndex}`,
          cells: [
            ...existingCells.slice(0, insertIndex),
            ...insertedCells,
            ...existingCells.slice(insertIndex),
          ],
          originalIndex: existingRow?.originalIndex ?? rowIndex,
          isValid: existingRow?.isValid ?? true,
        };
      });

      const newState = { columns: newColumns, data: newData };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
    },
    [csvState, saveToHistory, syncToContent],
  );

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const newState = history[newIndex];
      setCsvState(newState);
      setHistoryIndex(newIndex);
      syncToContent(newState);
    }
  }, [history, historyIndex, syncToContent]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const newState = history[newIndex];
      setCsvState(newState);
      setHistoryIndex(newIndex);
      syncToContent(newState);
    }
  }, [history, historyIndex, syncToContent]);

  // Export functions
  const toCsv = useCallback((rows?: CsvRow[]): string => {
    const sourceRows = rows ?? csvState.data;
    const headers = hasHeader ? [csvState.columns.map((col) => col.name)] : [];
    const data = sourceRows.map((row) =>
      row.cells.map((cell) => cell.value),
    );
    const allRows = [...headers, ...data];

    const result = Papa.unparse(allRows, { delimiter });
    return result;
  }, [csvState, hasHeader, delimiter]);

  const toJson = useCallback((rows?: CsvRow[]): string => {
    const sourceRows = rows ?? csvState.data;
    const jsonData = sourceRows.map((row) => {
      const obj: Record<string, string> = {};
      csvState.columns.forEach((col, index) => {
        obj[col.name] = row.cells[index]?.value || "";
      });
      return obj;
    });
    return JSON.stringify(jsonData, null, 2);
  }, [csvState]);

  const toMarkdown = useCallback((rows?: CsvRow[]): string => {
    const sourceRows = rows ?? csvState.data;
    if (sourceRows.length === 0) return "";

    const headers = `| ${csvState.columns.map((col) => col.name).join(" | ")} |`;
    const separator = `| ${csvState.columns.map(() => "---").join(" | ")} |`;
    const dataRows = sourceRows.map(
      (row) => `| ${row.cells.map((cell) => cell.value || "").join(" | ")} |`,
    );

    return [headers, separator, ...dataRows].join("\n");
  }, [csvState]);

  const toSql = useCallback(
    (tableName: string, rows?: CsvRow[]): string => {
      const sourceRows = rows ?? csvState.data;
      if (sourceRows.length === 0) return "";

      const insertStatements = sourceRows.map((row) => {
        const values = row.cells.map(
          (cell) => `'${cell.value.replace(/'/g, "''")}'`,
        );
        return `INSERT INTO ${tableName} (${csvState.columns.map((col) => col.name).join(", ")}) VALUES (${values.join(", ")});`;
      });

      return insertStatements.join("\n");
    },
    [csvState],
  );

  // Snapshot management
  const createSnapshot = useCallback(
    (name: string) => {
      const snapshot: CsvSnapshot = {
        id: `snapshot_${Date.now()}`,
        name,
        timestamp: Date.now(),
        data: [...csvState.data],
        columns: [...csvState.columns],
      };
      setSnapshots((prev) => [...prev, snapshot]);
    },
    [csvState],
  );

  const restoreSnapshot = useCallback(
    (snapshotId: string) => {
      const snapshot = snapshots.find((s) => s.id === snapshotId);
      if (snapshot) {
        const newState = { data: snapshot.data, columns: snapshot.columns };
        setCsvState(newState);
        saveToHistory(newState);
        syncToContent(newState);
      }
    },
    [snapshots, saveToHistory, syncToContent],
  );

  const deleteSnapshot = useCallback((snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
  }, []);

  // Statistics
  const getColumnStats = useCallback(
    (columnId: string): CsvColumnStats => {
      const columnIndex = csvState.columns.findIndex(
        (col) => col.id === columnId,
      );
      if (columnIndex === -1) {
        return {
          count: 0,
          unique: 0,
          empty: 0,
          mostCommon: null,
          dataType: "string",
          frequencyDistribution: [],
        };
      }

      const values = csvState.data.map(
        (row) => row.cells[columnIndex]?.value || "",
      );
      const nonEmpty = values.filter((v) => v.trim() !== "");
      const empty = values.length - nonEmpty.length;

      // Value frequency counting
      const valueCounts = new Map<string, number>();
      nonEmpty.forEach((value) => {
        valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
      });

      const mostCommon =
        valueCounts.size > 0
          ? Array.from(valueCounts.entries()).reduce((a, b) =>
              a[1] > b[1] ? a : b,
            )
          : null;

      // Create frequency distribution (top 10 values)
      const frequencyDistribution = Array.from(valueCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([value, count]) => ({
          value,
          count,
          percentage: (count / nonEmpty.length) * 100,
        }));

      // Data type detection
      const numericValues: number[] = [];
      let allNumeric = true;

      for (const value of nonEmpty) {
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
          numericValues.push(num);
        } else {
          allNumeric = false;
        }
      }

      const dataType: "number" | "string" | "mixed" =
        allNumeric && numericValues.length > 0
          ? "number"
          : numericValues.length === 0
            ? "string"
            : "mixed";

      // Calculate numeric statistics if applicable
      let numericStats: CsvColumnStats["numericStats"] | undefined;
      if (numericValues.length > 0) {
        const sorted = numericValues.slice().sort((a, b) => a - b);
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        const average = sum / numericValues.length;

        // Calculate median
        const median =
          sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        // Calculate standard deviation
        const variance =
          numericValues.reduce(
            (acc, val) => acc + Math.pow(val - average, 2),
            0,
          ) / numericValues.length;
        const standardDeviation = Math.sqrt(variance);

        numericStats = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          sum,
          average,
          median,
          standardDeviation,
        };
      }

      // Calculate string statistics
      const stringStats = {
        minLength: Math.min(...nonEmpty.map((v) => v.length)),
        maxLength: Math.max(...nonEmpty.map((v) => v.length)),
        avgLength:
          nonEmpty.reduce((acc, v) => acc + v.length, 0) / nonEmpty.length || 0,
      };

      return {
        count: values.length,
        unique: valueCounts.size,
        empty,
        mostCommon: mostCommon
          ? { value: mostCommon[0], count: mostCommon[1] }
          : null,
        dataType,
        numericStats,
        stringStats,
        frequencyDistribution,
      };
    },
    [csvState],
  );

  const isValid = diagnostics.every((d) => d.type !== "error");

  // Copy-down (fill down): copy the source cell's value (empty or not) into
  // every cell below it in the same column. Overwrites existing values.
  // Returns the number of cells actually changed. No-op (0, no history entry)
  // when ids are unknown, source is the last row, or everything below
  // already matches.
  const fillDown = useCallback(
    (rowId: string, columnId: string): number => {
      const sourceRowIndex = csvState.data.findIndex(
        (row) => row.id === rowId,
      );
      const columnIndex = csvState.columns.findIndex(
        (col) => col.id === columnId,
      );
      if (sourceRowIndex === -1 || columnIndex === -1) return 0;
      if (sourceRowIndex >= csvState.data.length - 1) return 0;

      const sourceValue =
        csvState.data[sourceRowIndex].cells[columnIndex]?.value ?? "";

      let changedCount = 0;
      const newData = csvState.data.map((row, index) => {
        if (index <= sourceRowIndex) return row;
        const currentValue = row.cells[columnIndex]?.value ?? "";
        const hasCell = row.cells.length > columnIndex;
        if (hasCell && currentValue === sourceValue) return row;
        changedCount += 1;
        const newCells = [...row.cells];
        while (newCells.length <= columnIndex) {
          newCells.push({ value: "", isValid: true });
        }
        newCells[columnIndex] = { value: sourceValue, isValid: true };
        return { ...row, cells: newCells };
      });

      if (changedCount === 0) return 0;

      const newState = { ...csvState, data: newData };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent(newState);
      return changedCount;
    },
    [csvState, saveToHistory, syncToContent],
  );

  return {
    // Data state
    data: csvState.data,
    columns: csvState.columns,
    loading,
    error,

    // Diagnostics
    diagnostics,
    isValid,

    // Data manipulation
    updateCell,
    updateCells,
    addRow,
    deleteRow,
    deleteRows,
    duplicateRow,
    addColumn,
    deleteColumn,
    duplicateColumn,
    moveColumn,
    addColumnsFromTable,
    renameColumn,
    insertAndShift,
    promoteFirstRowToHeader,
    demoteHeaderToFirstRow,
    pasteCells,
    insertColumnsFromGrid,
    fillDown,

    // Undo/Redo
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,

    // Snapshots
    snapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,

    // Export
    toCsv,
    toJson,
    toMarkdown,
    toSql,

    // Delimiter
    detectedDelimiter: delimiter,
    changeDelimiter,

    // Column filters
    filters,
    filterMatchMode,
    filteredData,
    setColumnFilter,
    removeColumnFilter,
    clearFilters,
    setFilterMatchMode,

    // Saved filter presets
    filterPresets,
    saveFilterPreset,
    applyFilterPreset,
    deleteFilterPreset,

    // Statistics
    getColumnStats,
  };
};
