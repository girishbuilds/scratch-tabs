import * as React from "react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Plus,
  Minus,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  ArrowDown,
  Copy,
  BarChart3,
  Eye,
  EyeOff,
  ClipboardPaste,
  ListFilter,
  ArrowLeft,
  ArrowRight,
  Columns,
} from "lucide-react";
import * as Papa from "papaparse";
import { SmartViewProps } from "../../../../views/registry";
import { useCsvData } from "../hooks/useCsvData";
import { CsvRow } from "../types";
import { ColumnStatsPopover } from "./ColumnStatsPopover";
import { CsvToolbar } from "./CsvToolbar";
import { CsvFilterBar } from "./CsvFilterBar";
import { ColumnFilterInput } from "./ColumnFilterInput";
import { CsvSnapshotsPanel } from "./CsvSnapshotsPanel";
import { CsvAddColumnsPanel } from "./CsvAddColumnsPanel";
import { useColumnSourceTabs } from "../hooks/useColumnSourceTabs";
import { FacetFilterPopover } from "./FacetFilterPopover";
import { CsvFilterPresetsPanel } from "./CsvFilterPresetsPanel";
import { computeFacetCounts } from "../utils/facets";
import {
  FACET_MAX_VISIBLE_VALUES,
  facetSelectionToFilter,
  quickFilterFromCell,
  toFacetSelection,
  QuickFilterAction,
} from "../utils/filterWidgetModel";
import { CsvDiagnosticsFooter } from "./CsvDiagnosticsFooter";
import { useRootStore } from "../../../../stores/rootStore";
import { tabletActionService } from "../../../../services/tabletActionService";
import { createTab } from "../../../../utils/tabUtils";
import { EditableCell } from "./EditableCell";
import { MaskedCell } from "./MaskedCell";
import { isSensitiveHeader } from "../utils/sensitiveUtils";
import { createCellKey, parseCellKey } from "../utils/cellUtils";
import { canPerformShiftRight, getShiftRightCellIdentifiers } from "../utils/shiftRightUtils";
import { CsvFindReplaceBar } from "./CsvFindReplaceBar";
import {
  buildReplaceUpdates,
  cellMatchesFind,
  findReplaceMatches,
  ReplaceScope,
  summarizeReplaceMatches,
} from "../utils/findReplace";

interface DuplicateGroup {
  rowString: string;
  rowIds: string[];
  count: number;
}

interface SearchMatch {
  rowId: string;
  columnId: string;
  rowIndex: number;
}

interface CopiedColumns {
  columnNames: string[];
  rows: string[][];
}

export const CsvTableViewer: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  side,
}) => {
  const { addBackgroundTab } = useRootStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [editingCellTrigger, setEditingCellTrigger] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [isAnyCellEditing, setIsAnyCellEditing] = useState(false);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState("");
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [showSnapshotsPanel, setShowSnapshotsPanel] = useState(false);
  // undefined anchor = append new columns at the end
  const [addColumnsPanel, setAddColumnsPanel] = useState<{ anchorColumnId?: string } | null>(null);
  const [duplicateSearchPerformed, setDuplicateSearchPerformed] = useState(false);
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [showPresetsPanel, setShowPresetsPanel] = useState(false);
  // Export scope: export the filtered (visible) rows or every row. Only
  // meaningful while a filter actually hides rows.
  const [exportVisibleRowsOnly, setExportVisibleRowsOnly] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);

  // Find & Replace state (find text reuses the search bar)
  const [showReplace, setShowReplace] = useState(false);
  const [replaceValue, setReplaceValue] = useState("");
  const [replaceScope, setReplaceScope] = useState<ReplaceScope>("all");
  const [replaceColumnId, setReplaceColumnId] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [exactCell, setExactCell] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowId?: string;
    columnId: string;
    kind: "cell" | "column";
  } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState<"cell" | "row" | "column" | "all">("cell");
  const copiedColumnsRef = useRef<CopiedColumns | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Stats popover state
  const [statsPopover, setStatsPopover] = useState<{
    columnId: string;
    position: { x: number; y: number };
  } | null>(null);

  // Facet (value list) popover state
  const [facetPopover, setFacetPopover] = useState<{
    columnId: string;
    position: { x: number; y: number };
  } | null>(null);

  // Masking state
  const [maskedColumns, setMaskedColumns] = useState<Set<string>>(new Set());

  const csvData = useCsvData(content, onContentChange);
  const { tabs: columnSourceTabs, loadSource: loadColumnSource } =
    useColumnSourceTabs(tabId);
  const {
    data,
    columns,
    loading,
    error,
    diagnostics,
    isValid,
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
    canUndo,
    canRedo,
    undo,
    redo,
    pasteCells,
    insertColumnsFromGrid,
    snapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    getColumnStats,
    insertAndShift,
    promoteFirstRowToHeader,
    demoteHeaderToFirstRow,
    detectedDelimiter,
    changeDelimiter,
    fillDown,
    filters,
    filterMatchMode,
    filteredData: typeFilteredRows,
    setColumnFilter,
    removeColumnFilter,
    clearFilters,
    setFilterMatchMode,
    filterPresets,
    saveFilterPreset,
    applyFilterPreset,
    deleteFilterPreset,
    toCsv,
    toJson,
    toMarkdown,
    toSql,
  } = csvData;

  // Auto-detect and mask sensitive columns
  useEffect(() => {
    if (columns.length > 0) {
      const newMaskedColumns = new Set<string>();
      columns.forEach((column) => {
        if (isSensitiveHeader(column.name)) {
          newMaskedColumns.add(column.id);
        }
      });
      setMaskedColumns(newMaskedColumns);
    }
  }, [columns]);

  // Masking functions
  const toggleColumnMask = useCallback((columnId: string) => {
    setMaskedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  }, []);

  const isColumnMasked = useCallback(
    (columnId: string) => {
      return maskedColumns.has(columnId);
    },
    [maskedColumns],
  );


  // Check if a cell is highlighted by search
  const isCellSearchMatch = useCallback((rowId: string, columnId: string) => {
    return searchMatches.some(match => match.rowId === rowId && match.columnId === columnId);
  }, [searchMatches]);

  // Check if a cell is the active search match
  const isCellActiveSearchMatch = useCallback((rowId: string, columnId: string) => {
    if (searchMatches.length === 0) return false;
    const activeMatch = searchMatches[searchActiveIndex];
    return activeMatch && activeMatch.rowId === rowId && activeMatch.columnId === columnId;
  }, [searchMatches, searchActiveIndex]);

  // Check if a cell is multi-selected
  const isCellMultiSelected = useCallback((rowId: string, columnId: string) => {
    const cellKey = createCellKey(rowId, columnId);
    return selectedCells.has(cellKey) && selectedCells.size > 1;
  }, [selectedCells]);

  // Helper function to update selectedCell when removing a cell from multi-selection
  const updateSelectedCellAfterRemoval = useCallback((removedCellKey: string) => {
    const remainingCells = Array.from(selectedCells).filter(key => key !== removedCellKey);

    if (remainingCells.length > 0) {
      const firstRemaining = remainingCells[0];
      const { rowId: remainingRowId, columnId: remainingColumnId } = parseCellKey(firstRemaining);
      setSelectedCell({ rowId: remainingRowId, columnId: remainingColumnId });
    } else {
      setSelectedCell(null);
    }
  }, [selectedCells]);

  // Handle CTRL/CMD+Click multi-selection toggle
  const handleMultiSelectToggle = useCallback((cellKey: string, rowId: string, columnId: string) => {
    const wasSelected = selectedCells.has(cellKey);

    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (wasSelected) {
        newSet.delete(cellKey);
      } else {
        newSet.add(cellKey);
      }
      return newSet;
    });

    // Update selectedCell based on the action
    if (!wasSelected) {
      // Adding a cell: set it as the primary selected cell
      setSelectedCell({ rowId, columnId });
    } else {
      // Removing a cell: set selectedCell to one of the remaining cells
      updateSelectedCellAfterRemoval(cellKey);
    }
  }, [selectedCells, updateSelectedCellAfterRemoval]);

  // Handle regular click single selection
  const handleSingleSelect = useCallback((cellKey: string, rowId: string, columnId: string) => {
    setSelectedCell({ rowId, columnId });
    setSelectedCells(new Set([cellKey]));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCell(null);
    setSelectedCells(new Set());
    setEditingCellTrigger(null);
    setSelectionMode("cell");
  }, []);

  // Cell selection functions
  const handleCellSelect = useCallback((e: React.MouseEvent, rowId: string, columnId: string) => {
    const cellKey = createCellKey(rowId, columnId);

    if (e.ctrlKey || e.metaKey) {
      handleMultiSelectToggle(cellKey, rowId, columnId);
    } else {
      handleSingleSelect(cellKey, rowId, columnId);
    }

    setEditingCellTrigger(null);
    setSelectionMode("cell");
  }, [handleMultiSelectToggle, handleSingleSelect]);

  // Handle column selection
  const handleSelectColumn = useCallback((columnId: string, e: React.MouseEvent) => {
    const colIndex = columns.findIndex(c => c.id === columnId);
    if (colIndex === -1) return;

    setSelectedCells(prev => {
      let newSet = new Set<string>();
      
      if (e.shiftKey && selectedCell) {
        // Range selection of columns
        const lastColIndex = columns.findIndex(c => c.id === selectedCell.columnId);
        if (lastColIndex !== -1) {
          const start = Math.min(colIndex, lastColIndex);
          const end = Math.max(colIndex, lastColIndex);
          
          for (let i = start; i <= end; i++) {
            const col = columns[i];
            data.forEach(row => {
              newSet.add(createCellKey(row.id, col.id));
            });
          }
          return newSet;
        }
      }
      
      if (e.ctrlKey || e.metaKey) {
        newSet = new Set(prev);
        // Toggle the clicked column
        let allSelected = true;
        for (const row of data) {
          if (!prev.has(createCellKey(row.id, columnId))) {
            allSelected = false;
            break;
          }
        }
        
        data.forEach(row => {
          const cellKey = createCellKey(row.id, columnId);
          if (allSelected) {
            newSet.delete(cellKey);
          } else {
            newSet.add(cellKey);
          }
        });
      } else {
        // Single column selection
        data.forEach(row => {
          newSet.add(createCellKey(row.id, columnId));
        });
      }
      
      if (newSet.size > 0) {
        if (!e.shiftKey) {
          if (data.length > 0) {
            setSelectedCell({ rowId: data[0].id, columnId });
          }
        }
      } else {
        setSelectedCell(null);
      }
      
      return newSet;
    });
    setEditingCellTrigger(null);
    setSelectionMode("column");
  }, [data, columns, selectedCell]);

  // Handle row selection
  const handleSelectRow = useCallback((rowId: string, e: React.MouseEvent) => {
    const rowIndex = data.findIndex(r => r.id === rowId);
    if (rowIndex === -1) return;

    setSelectedCells(prev => {
      let newSet = new Set<string>();
      
      if (e.shiftKey && selectedCell) {
        // Range selection of rows
        const lastRowIndex = data.findIndex(r => r.id === selectedCell.rowId);
        if (lastRowIndex !== -1) {
          const start = Math.min(rowIndex, lastRowIndex);
          const end = Math.max(rowIndex, lastRowIndex);
          
          for (let i = start; i <= end; i++) {
            const row = data[i];
            columns.forEach(col => {
              newSet.add(createCellKey(row.id, col.id));
            });
          }
          return newSet;
        }
      }
      
      if (e.ctrlKey || e.metaKey) {
        newSet = new Set(prev);
        // Toggle the clicked row
        let allSelected = true;
        for (const col of columns) {
          if (!prev.has(createCellKey(rowId, col.id))) {
            allSelected = false;
            break;
          }
        }
        
        columns.forEach(col => {
          const cellKey = createCellKey(rowId, col.id);
          if (allSelected) {
            newSet.delete(cellKey);
          } else {
            newSet.add(cellKey);
          }
        });
      } else {
        // Single row selection
        columns.forEach(col => {
          newSet.add(createCellKey(rowId, col.id));
        });
      }
      
      if (newSet.size > 0) {
        if (!e.shiftKey) {
          if (columns.length > 0) {
            setSelectedCell({ rowId, columnId: columns[0].id });
          }
        }
      } else {
        setSelectedCell(null);
      }
      
      return newSet;
    });
    setEditingCellTrigger(null);
    setSelectionMode("row");
  }, [data, columns, selectedCell]);

  // Handle select all cells
  const handleSelectAll = useCallback(() => {
    const newSelectedCells = new Set<string>();
    data.forEach(row => {
      columns.forEach(col => {
        newSelectedCells.add(createCellKey(row.id, col.id));
      });
    });
    setSelectedCells(newSelectedCells);
    if (data.length > 0 && columns.length > 0) {
      setSelectedCell({ rowId: data[0].id, columnId: columns[0].id });
    }
    setEditingCellTrigger(null);
    setSelectionMode("all");
  }, [data, columns]);

  const isFullColumnSelection = useCallback(() => {
    if (selectionMode !== "column" || data.length === 0 || selectedCells.size === 0) {
      return false;
    }

    const selectedColumnIds = columns
      .filter((column) =>
        data.every((row) => selectedCells.has(createCellKey(row.id, column.id))),
      )
      .map((column) => column.id);

    return selectedColumnIds.length > 0 && selectedCells.size === selectedColumnIds.length * data.length;
  }, [columns, data, selectedCells, selectionMode]);

  const getSelectedColumnsForCopy = useCallback((): CopiedColumns | null => {
    if (!isFullColumnSelection()) return null;

    const selectedColumnIndexes = columns
      .map((column, index) => ({ column, index }))
      .filter(({ column }) =>
        data.every((row) => selectedCells.has(createCellKey(row.id, column.id))),
      );

    if (selectedColumnIndexes.length === 0) return null;

    return {
      columnNames: selectedColumnIndexes.map(({ column }) => column.name),
      rows: data.map((row) =>
        selectedColumnIndexes.map(({ index }) => row.cells[index]?.value ?? ""),
      ),
    };
  }, [columns, data, isFullColumnSelection, selectedCells]);

  // Helper to parse and paste text
  const pasteText = useCallback((text: string) => {
    if (!text || !selectedCell) return;

    let pastedGrid: string[][] = [];
    const lines = text.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    try {
      const parseResult = Papa.parse(text, {
        delimiter: text.includes("\t") ? "\t" : undefined,
        header: false,
        skipEmptyLines: false,
      });
      pastedGrid = parseResult.data as string[][];
    } catch (err) {
      pastedGrid = lines.map(line => line.split("\t"));
    }

    if (pastedGrid.length === 0 || pastedGrid[0].length === 0) return;

    if (copiedColumnsRef.current && isFullColumnSelection()) {
      insertColumnsFromGrid(
        selectedCell.columnId,
        copiedColumnsRef.current.columnNames,
        copiedColumnsRef.current.rows,
      );
      return;
    }

    pasteCells(selectedCell.rowId, selectedCell.columnId, pastedGrid);
  }, [insertColumnsFromGrid, isFullColumnSelection, selectedCell, pasteCells]);

  // Handle pasting data from event
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (isAnyCellEditing || editingHeader) return;
      e.preventDefault();
      
      const clipboardData = e.clipboardData || (window as any).clipboardData;
      if (!clipboardData) return;

      const pastedText = clipboardData.getData("text");
      if (pastedText) {
        pasteText(pastedText);
      }
    },
    [isAnyCellEditing, editingHeader, pasteText],
  );

  // Context menu functions
  const handleCellRightClick = useCallback((e: React.MouseEvent, rowId: string, columnId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      rowId,
      columnId,
      kind: "cell",
    });

    const cellKey = createCellKey(rowId, columnId);

    // If the right-clicked cell is not part of the current selection, 
    // make it the only selected cell
    if (!selectedCells.has(cellKey)) {
      setSelectedCells(new Set([cellKey]));
      setSelectedCell({ rowId, columnId });
      setSelectionMode("cell");
    }
    // If it is part of the selection, keep the current multi-selection
  }, [selectedCells]);

  const handleColumnRightClick = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();

    const columnIsSelected =
      data.length > 0 &&
      data.every((row) => selectedCells.has(createCellKey(row.id, columnId)));

    if (!columnIsSelected) {
      const newSelection = new Set<string>();
      data.forEach((row) => {
        newSelection.add(createCellKey(row.id, columnId));
      });
      setSelectedCells(newSelection);
      if (data.length > 0) {
        setSelectedCell({ rowId: data[0].id, columnId });
      }
      setSelectionMode("column");
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      columnId,
      kind: "column",
    });
  }, [data, selectedCells]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const canMoveContextColumn = useCallback(
    (direction: -1 | 1) => {
      if (!contextMenu) return false;
      const index = columns.findIndex((c) => c.id === contextMenu.columnId);
      const target = index + direction;
      return index !== -1 && target >= 0 && target < columns.length;
    },
    [contextMenu, columns],
  );

  const moveContextColumn = useCallback(
    (direction: -1 | 1) => {
      if (!contextMenu || !canMoveContextColumn(direction)) return;
      const index = columns.findIndex((c) => c.id === contextMenu.columnId);
      moveColumn(contextMenu.columnId, index + direction);
      setContextMenu(null);
    },
    [contextMenu, columns, canMoveContextColumn, moveColumn],
  );

  const openAddColumnsFromContextMenu = useCallback(() => {
    if (!contextMenu) return;
    setAddColumnsPanel({ anchorColumnId: contextMenu.columnId });
    setContextMenu(null);
  }, [contextMenu]);

  // Quick filters from the right-clicked cell ("Filter by this value", etc.)
  const applyQuickFilter = useCallback(
    (action: QuickFilterAction) => {
      if (!contextMenu?.rowId) return;
      const column = columns.find((c) => c.id === contextMenu.columnId);
      const row = data.find((candidate) => candidate.id === contextMenu.rowId);
      const cellValue =
        column && row ? row.cells[column.index]?.value : undefined;
      const filter = quickFilterFromCell(
        action,
        contextMenu.columnId,
        cellValue,
      );
      setContextMenu(null);
      if (filter) setColumnFilter(filter.columnId, filter);
    },
    [contextMenu, columns, data, setColumnFilter],
  );

  // Facet popover helpers
  const facetColumn = facetPopover
    ? columns.find((column) => column.id === facetPopover.columnId)
    : undefined;

  // Memoized distinct-value counts; recomputed when data/filters change so
  // counts stay live as other filters apply.
  const facetValues = useMemo(
    () =>
      facetPopover && facetColumn
        ? computeFacetCounts(
            data,
            columns,
            facetPopover.columnId,
            filters,
            filterMatchMode,
          )
        : [],
    [facetPopover, facetColumn, data, columns, filters, filterMatchMode],
  );

  const facetSelection = useMemo(
    () =>
      facetPopover
        ? toFacetSelection(
            filters.find((filter) => filter.columnId === facetPopover.columnId),
          )
        : null,
    [facetPopover, filters],
  );

  const handleFacetSelectionChange = useCallback(
    (selectedValues: string[]) => {
      if (!facetPopover || !facetColumn) return;
      // Only the values actually offered in the popover are selectable, so
      // "select all" compares against that (capped) count — never the total
      // distinct count, which would leave an in-filter silently hiding rows.
      const selectableCount = Math.min(
        FACET_MAX_VISIBLE_VALUES,
        facetValues.length,
      );
      const filter = facetSelectionToFilter(
        facetPopover.columnId,
        selectedValues,
        selectableCount,
      );
      setColumnFilter(facetPopover.columnId, filter);
    },
    [facetPopover, facetColumn, facetValues.length, setColumnFilter],
  );

  // Check if shift right action is safe for selected cells
  const canShiftRight = useCallback(() => {
    return canPerformShiftRight(selectedCells, data, columns);
  }, [selectedCells, data, columns]);

  // Handle shift right action
  const handleShiftRight = useCallback(() => {
    if (!canShiftRight()) return;

    const cellIdentifiers = getShiftRightCellIdentifiers(selectedCells);

    // Execute the shift right operation
    insertAndShift(cellIdentifiers);

    // Close context menu and clear selection
    setContextMenu(null);
    setSelectedCells(new Set());
  }, [canShiftRight, selectedCells, insertAndShift]);

  // Rows below the right-clicked cell in the same column (data order).
  // Works for empty and non-empty source values; 0 means nothing to fill.
  const fillDownRowCount = useMemo(() => {
    if (!contextMenu?.rowId) return 0;
    const sourceIndex = data.findIndex((row) => row.id === contextMenu.rowId);
    if (sourceIndex === -1) return 0;
    return Math.max(0, data.length - sourceIndex - 1);
  }, [contextMenu, data]);

  const canFillDown = useCallback(() => {
    return (
      contextMenu?.kind === "cell" &&
      !!contextMenu?.rowId &&
      fillDownRowCount > 0
    );
  }, [contextMenu, fillDownRowCount]);

  // Handle fill down (copy down) action
  const handleFillDown = useCallback(() => {
    if (!contextMenu?.rowId || !canFillDown()) return;
    fillDown(contextMenu.rowId, contextMenu.columnId);
    setContextMenu(null);
  }, [contextMenu, canFillDown, fillDown]);

  // Handle copy selected cells
  const handleCopySelectedCells = useCallback(async () => {
    if (selectedCells.size === 0) return;

    const copiedColumns = getSelectedColumnsForCopy();
    if (copiedColumns) {
      const copyText = [
        copiedColumns.columnNames.join("\t"),
        ...copiedColumns.rows.map((row) => row.join("\t")),
      ].join("\n");

      try {
        await navigator.clipboard.writeText(copyText);
        copiedColumnsRef.current = copiedColumns;
      } catch (err) {
        console.error('Failed to copy columns:', err);
      }

      setContextMenu(null);
      return;
    }

    copiedColumnsRef.current = null;

    // Extract cell values in a structured format
    const cellsData: Array<{ rowId: string; columnId: string; value: string; rowIndex: number; colIndex: number }> = [];

    selectedCells.forEach(cellKey => {
      const { rowId, columnId } = parseCellKey(cellKey);
      const row = data.find(r => r.id === rowId);
      const colIndex = columns.findIndex(c => c.id === columnId);
      const rowIndex = data.findIndex(r => r.id === rowId);

      if (row && colIndex !== -1) {
        const cellValue = row.cells[colIndex]?.value || '';
        cellsData.push({ rowId, columnId, value: cellValue, rowIndex, colIndex });
      }
    });

    // Sort by row then column for consistent output
    cellsData.sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return a.colIndex - b.colIndex;
    });

    // Format as tab-separated values (TSV) for better Excel/spreadsheet compatibility
    let copyText = '';
    let currentRowIndex = cellsData[0]?.rowIndex;

    cellsData.forEach((cell, index) => {
      if (index > 0) {
        // New row
        if (cell.rowIndex !== currentRowIndex) {
          copyText += '\n';
          currentRowIndex = cell.rowIndex;
        } else {
          // Same row, add tab
          copyText += '\t';
        }
      }
      copyText += cell.value;
    });

    try {
      await navigator.clipboard.writeText(copyText);
      // Optional: Show success feedback
    } catch (err) {
      console.error('Failed to copy cells:', err);
    }

    setContextMenu(null);
  }, [selectedCells, getSelectedColumnsForCopy, data, columns]);

  const handlePasteCopiedColumns = useCallback(() => {
    if (!contextMenu || !copiedColumnsRef.current) return;

    insertColumnsFromGrid(
      contextMenu.columnId,
      copiedColumnsRef.current.columnNames,
      copiedColumnsRef.current.rows,
    );
    setContextMenu(null);
  }, [contextMenu, insertColumnsFromGrid]);

  // Handle clear selected cells
  const handleClearSelectedCells = useCallback(() => {
    const cellsToClear = Array.from(selectedCells);
    if (cellsToClear.length === 0) return;

    // Prepare batch update - clear all selected cells to empty string
    const updates = cellsToClear.map(cellKey => {
      const { rowId, columnId } = parseCellKey(cellKey);
      return { rowId, columnId, value: '' };
    });

    // Apply all updates at once (avoids stale closure issues)
    updateCells(updates);

    setContextMenu(null);
    setSelectedCells(new Set());
  }, [selectedCells, updateCells]);

  // Close context menu and clear table selection when clicking outside the viewer.
  // Clicks on viewer chrome (toolbar, filter bar, replace bar) preserve the
  // selection so scope-aware actions like selection-scoped Find & Replace keep
  // working after interacting with the toolbar.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu) {
        closeContextMenu();
      }

      const target = event.target;
      if (!(target instanceof Node)) return;

      if (tableContainerRef.current?.contains(target)) return;

      const targetElement =
        target instanceof Element ? target : target.parentElement;
      if (targetElement?.closest("[data-testid='csv-context-menu']")) return;
      if (targetElement?.closest("[data-testid='csv-table-viewer']")) return;

      clearSelection();
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu, closeContextMenu, clearSelection]);

  // Efficient duplicate detection using hash map - O(n) complexity
  const findDuplicates = useCallback(() => {
    const rowMap = new Map<string, string[]>();

    // Single pass through data to build hash map
    data.forEach((row) => {
      // Create row string by joining all cell values
      const rowString = row.cells.map((cell) => cell.value || "").join("|");

      if (rowMap.has(rowString)) {
        rowMap.get(rowString)!.push(row.id);
      } else {
        rowMap.set(rowString, [row.id]);
      }
    });

    // Filter to only include groups with more than one row (duplicates)
    const duplicates: DuplicateGroup[] = [];
    rowMap.forEach((rowIds, rowString) => {
      if (rowIds.length > 1) {
        duplicates.push({
          rowString,
          rowIds,
          count: rowIds.length,
        });
      }
    });

    setDuplicateGroups(duplicates);
    setShowDuplicatesOnly(duplicates.length > 0);
    setDuplicateSearchPerformed(true);
  }, [data]);

  const clearDuplicates = useCallback(() => {
    setDuplicateGroups([]);
    setShowDuplicatesOnly(false);
    setDuplicateSearchPerformed(false);
  }, []);

  const removeDuplicateRows = useCallback(() => {
    if (duplicateGroups.length === 0) return;

    // Collect all duplicate row IDs except the first one in each group
    const rowsToDelete: string[] = [];
    duplicateGroups.forEach((group) => {
      // Keep the first row, delete the rest
      rowsToDelete.push(...group.rowIds.slice(1));
    });

    // Delete all duplicate rows in a single batch operation
    if (rowsToDelete.length > 0) {
      deleteRows(rowsToDelete);
    }

    // Clear duplicates state
    clearDuplicates();
  }, [duplicateGroups, deleteRows, clearDuplicates]);

  // Export functions
  const exportToTab = useCallback(
    (content: string, filename: string, language: string) => {
      const tab = createTab({
        title: filename,
        content,
        language,
      });
      addBackgroundTab(tab);
    },
    [addBackgroundTab],
  );

  const columnHelper = createColumnHelper<CsvRow>();

  // Get all duplicate row IDs for highlighting
  const duplicateRowIds = useMemo(() => {
    const ids = new Set<string>();
    duplicateGroups.forEach((group) => {
      group.rowIds.forEach((id) => ids.add(id));
    });
    return ids;
  }, [duplicateGroups]);

  // Filter data based on duplicate view mode (column filters already applied in useCsvData)
  const filteredData = useMemo(() => {
    if (!showDuplicatesOnly) return typeFilteredRows;
    return typeFilteredRows.filter((row) => duplicateRowIds.has(row.id));
  }, [typeFilteredRows, showDuplicatesOnly, duplicateRowIds]);

  // Export handlers — export the filtered (visible) rows or every row,
  // depending on the scope chosen in the export menu.
  const handleExportCsv = useCallback(() => {
    const csvContent = toCsv(exportVisibleRowsOnly ? filteredData : undefined);
    exportToTab(csvContent, "Export.csv", "csv");
  }, [toCsv, exportToTab, exportVisibleRowsOnly, filteredData]);

  const handleExportJson = useCallback(() => {
    const jsonContent = toJson(exportVisibleRowsOnly ? filteredData : undefined);
    exportToTab(jsonContent, "Export.json", "json");
  }, [toJson, exportToTab, exportVisibleRowsOnly, filteredData]);

  const handleExportMarkdown = useCallback(() => {
    const markdownContent = toMarkdown(exportVisibleRowsOnly ? filteredData : undefined);
    exportToTab(markdownContent, "Export.md", "markdown");
  }, [toMarkdown, exportToTab, exportVisibleRowsOnly, filteredData]);

  const handleExportSql = useCallback(
    (tableName: string) => {
      const sqlContent = toSql(tableName, exportVisibleRowsOnly ? filteredData : undefined);
      exportToTab(sqlContent, `${tableName}_inserts.sql`, "sql");
    },
    [toSql, exportToTab, exportVisibleRowsOnly, filteredData],
  );

  const tableColumns = useMemo<ColumnDef<CsvRow, any>[]>(() => {
    return [
      columnHelper.display({
        id: "rowNumber",
        header: () => (
          <div 
            className="flex h-full items-center justify-center font-mono text-secondary cursor-pointer hover:bg-element-hover w-full select-none"
            onClick={handleSelectAll}
            title="Select all cells"
          >
            #
          </div>
        ),
        size: 50,
        cell: ({ row }) => (
          <div 
            className="flex h-full items-center justify-center font-mono text-secondary cursor-pointer hover:bg-element-hover w-full select-none"
            onClick={(e) => handleSelectRow(row.original.id, e)}
            title="Click to select row"
          >
            {row.index + 1}
          </div>
        ),
      }),
      ...columns.map((column, columnIndex) =>
        columnHelper.accessor((row) => row.cells[columnIndex]?.value || "", {
          id: column.id,
          header: ({ column: tableColumn }) => (
            <div className="flex items-center justify-between min-w-0">
              {editingHeader === column.id ? (
                <input
                  className="bg-element text-main font-medium text-sm border-none outline-none flex-1 px-1 py-0.5 rounded"
                  value={headerEditValue}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onChange={(e) => setHeaderEditValue(e.target.value)}
                  onBlur={() => {
                    if (headerEditValue.trim())
                      renameColumn(column.id, headerEditValue.trim());
                    setEditingHeader(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (headerEditValue.trim())
                        renameColumn(column.id, headerEditValue.trim());
                      setEditingHeader(null);
                    } else if (e.key === "Escape") setEditingHeader(null);
                  }}
                  autoFocus
                />
              ) : (
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="flex-1 cursor-text hover:bg-element-hover px-1 py-0.5 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.detail > 1) return;
                      handleSelectColumn(column.id, e);
                    }}
                    onContextMenu={(e) => handleColumnRightClick(e, column.id)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearSelection();
                      setEditingHeader(column.id);
                      setHeaderEditValue(column.name);
                    }}
                    title="Click to select column. Double-click to rename."
                  >
                    {column.name}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      tableColumn.toggleSorting();
                    }}
                    className="p-1 hover:bg-element-hover rounded"
                    title="Sort column"
                    data-testid="sort-column"
                  >
                    {tableColumn.getIsSorted() === "asc" ? (
                      <SortAsc size={12} />
                    ) : tableColumn.getIsSorted() === "desc" ? (
                      <SortDesc size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-60" />
                    )}
                  </button>
                </div>
              )}
              <div className="flex items-center space-x-1 ml-2">
                {/* Mask toggle button for sensitive columns */}
                {isSensitiveHeader(column.name) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleColumnMask(column.id);
                    }}
                    className={`p-1 rounded hover:bg-element-hover transition-all ${isColumnMasked(column.id)
                      ? "text-info"
                      : "text-secondary"
                      }`}
                    title={
                      isColumnMasked(column.id)
                        ? "Unmask sensitive column"
                        : "Mask sensitive column"
                    }
                  >
                    {isColumnMasked(column.id) ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}
                  </button>
                )}
                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatsPopover({
                      columnId: column.id,
                      position: { x: rect.left, y: rect.bottom + 5 },
                    });
                  }}
                  title="Column statistics"
                >
                  <BarChart3 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addColumn(columnIndex + 1);
                  }}
                  title="Add column after"
                  data-testid="add-column-after"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateColumn(column.id);
                  }}
                  title="Duplicate column"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteColumn(column.id);
                  }}
                  title="Delete column"
                >
                  <Minus size={12} />
                </button>
              </div>
            </div>
          ),
          cell: ({ row, getValue }) => {
            const isMasked = isColumnMasked(column.id);

            // Since we need row and column indices for data attributes,
            // we'll add them as data attributes in the containing div in the virtualized render

            if (isMasked) {
              return (
                <MaskedCell
                  value={getValue() as string}
                  isSelected={
                    selectedCell?.rowId === row.original.id &&
                    selectedCell?.columnId === column.id
                  }
                  isMultiSelected={isCellMultiSelected(row.original.id, column.id)}
                  isValid={row.original.cells[columnIndex]?.isValid ?? true}
                  error={row.original.cells[columnIndex]?.error}
                  startEditing={
                    editingCellTrigger?.rowId === row.original.id &&
                    editingCellTrigger?.columnId === column.id
                  }
                  isMasked={isMasked}
                  isSearchMatch={isCellSearchMatch(row.original.id, column.id)}
                  isActiveSearchMatch={isCellActiveSearchMatch(row.original.id, column.id)}
                  searchQuery={searchQuery}
                  onRightClick={(e) => handleCellRightClick(e, row.original.id, column.id)}
                  onSelect={(e) => {
                    handleCellSelect(e, row.original.id, column.id);
                  }}
                  onStartEdit={() => {
                    setSelectedCell({
                      rowId: row.original.id,
                      columnId: column.id,
                    });
                    setEditingCellTrigger({
                      rowId: row.original.id,
                      columnId: column.id,
                    });
                  }}
                  onChange={(newValue) => {
                    // Clear the editing trigger immediately when data changes
                    setEditingCellTrigger(null);
                    updateCell(row.original.id, column.id, newValue);
                  }}
                  onEditingChange={(isEditing) => {
                    setIsAnyCellEditing(isEditing);
                    // Only clear editingCellTrigger if this specific cell was the one being edited
                    if (
                      !isEditing &&
                      editingCellTrigger?.rowId === row.original.id &&
                      editingCellTrigger?.columnId === column.id
                    ) {
                      setEditingCellTrigger(null);
                    }
                  }}
                />
              );
            }

            return (
              <EditableCell
                value={getValue() as string}
                isSelected={
                  selectedCell?.rowId === row.original.id &&
                  selectedCell?.columnId === column.id
                }
                isMultiSelected={isCellMultiSelected(row.original.id, column.id)}
                isValid={row.original.cells[columnIndex]?.isValid ?? true}
                error={row.original.cells[columnIndex]?.error}
                startEditing={
                  editingCellTrigger?.rowId === row.original.id &&
                  editingCellTrigger?.columnId === column.id
                }
                isSearchMatch={isCellSearchMatch(row.original.id, column.id)}
                isActiveSearchMatch={isCellActiveSearchMatch(row.original.id, column.id)}
                searchQuery={searchQuery}
                onRightClick={(e) => handleCellRightClick(e, row.original.id, column.id)}
                onSelect={(e) => {
                  handleCellSelect(e, row.original.id, column.id);
                }}
                onStartEdit={() => {
                  setSelectedCell({
                    rowId: row.original.id,
                    columnId: column.id,
                  });
                  setEditingCellTrigger({
                    rowId: row.original.id,
                    columnId: column.id,
                  });
                }}
                onChange={(newValue) => {
                  // Clear the editing trigger immediately when data changes
                  setEditingCellTrigger(null);
                  updateCell(row.original.id, column.id, newValue);
                }}
                onEditingChange={(isEditing) => {
                  setIsAnyCellEditing(isEditing);
                  // Only clear editingCellTrigger if this specific cell was the one being edited
                  if (
                    !isEditing &&
                    editingCellTrigger?.rowId === row.original.id &&
                    editingCellTrigger?.columnId === column.id
                  ) {
                    setEditingCellTrigger(null);
                  }
                }}
              />
            );
          },
          enableSorting: true,
        }),
      ),
      columnHelper.display({
        id: "actions",
        header: "",
        size: 60,
        cell: ({ row }) => (
          <div className="flex h-full items-center justify-center space-x-1">
            <button onClick={() => addRow(row.index + 1)} title="Add row below">
              <Plus size={14} />
            </button>
            <button
              onClick={() => duplicateRow(row.original.id)}
              title="Duplicate row"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => deleteRow(row.original.id)}
              title="Delete row"
            >
              <Minus size={14} />
            </button>
          </div>
        ),
      }),
    ];
  }, [
    columns,
    editingHeader,
    headerEditValue,
    addColumn,
    deleteColumn,
    duplicateColumn,
    addRow,
    deleteRow,
    duplicateRow,
    updateCell,
    renameColumn,
    selectedCell,
    editingCellTrigger,
    setStatsPopover,
    isColumnMasked,
    toggleColumnMask,
    searchQuery,
    isCellSearchMatch,
    isCellActiveSearchMatch,
    isCellMultiSelected,
    handleCellSelect,
    handleCellRightClick,
    handleSelectColumn,
    handleSelectRow,
    handleSelectAll,
    handleColumnRightClick,
    clearSelection,
  ]);

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Virtualization setup
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35, // Estimated row height in pixels
    overscan: 10, // Render extra rows outside viewport for smooth scrolling
  });

  // Search functionality (moved here to access filteredData and rowVirtualizer)
  // Matching honors the Find & Replace toggles so the highlighted search
  // results and the replace preview stay in sync.
  const performSearch = useCallback((query: string, options?: { matchCase?: boolean; exactCell?: boolean }) => {
    const { matchCase: caseSensitive = false, exactCell: wholeCell = false } = options ?? {};
    if (!query.trim() && !(wholeCell && query === "")) {
      setSearchMatches([]);
      setSearchActiveIndex(0);
      return;
    }

    const matches: SearchMatch[] = [];

    filteredData.forEach((row, rowIndex) => {
      row.cells.forEach((cell, cellIndex) => {
        if (cellMatchesFind(cell.value ?? "", query, { matchCase: caseSensitive, exactCell: wholeCell })) {
          const column = columns[cellIndex];
          if (column) {
            matches.push({
              rowId: row.id,
              columnId: column.id,
              rowIndex,
            });
          }
        }
      });
    });

    setSearchMatches(matches);
    setSearchActiveIndex(matches.length > 0 ? 0 : 0);

    // Auto-select the first match when search results change
    if (matches.length > 0) {
      const firstMatch = matches[0];
      setSelectedCell({
        rowId: firstMatch.rowId,
        columnId: firstMatch.columnId,
      });
    }
  }, [filteredData, columns]);

  // Scroll to search match (separate effect to avoid dependency loop)
  useEffect(() => {
    if (searchMatches.length > 0 && searchActiveIndex >= 0) {
      const activeMatch = searchMatches[searchActiveIndex];
      if (activeMatch) {
        rowVirtualizer.scrollToIndex(activeMatch.rowIndex, {
          align: "center",
          behavior: "smooth",
        });
      }
    }
  }, [searchActiveIndex, searchMatches, rowVirtualizer]);

  // Handler for search input changes, replacing the useEffect
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    // Pass the new query directly, as the state update is async
    performSearch(query, { matchCase, exactCell });
  }, [performSearch, matchCase, exactCell]);

  // Re-run search when the match toggles change so highlights track options
  const handleMatchCaseChange = useCallback((value: boolean) => {
    setMatchCase(value);
    performSearch(searchQuery, { matchCase: value, exactCell });
  }, [performSearch, searchQuery, exactCell]);

  const handleExactCellChange = useCallback((value: boolean) => {
    setExactCell(value);
    performSearch(searchQuery, { matchCase, exactCell: value });
  }, [performSearch, searchQuery, matchCase]);

  // Find & Replace preview: same matcher as search, narrowed by scope.
  // Computed against the filtered (visible) rows so the count matches the grid.
  const effectiveReplaceColumnId = replaceColumnId
    || selectedCell?.columnId
    || columns[0]?.id
    || "";
  const replaceMatches = useMemo(() => findReplaceMatches(filteredData, columns, {
    find: searchQuery,
    replace: replaceValue,
    scope: replaceScope,
    columnId: effectiveReplaceColumnId,
    selectionKeys: selectedCells,
    matchCase,
    exactCell,
  }), [filteredData, columns, searchQuery, replaceValue, replaceScope, effectiveReplaceColumnId, selectedCells, matchCase, exactCell]);
  const replaceSummary = useMemo(
    () => summarizeReplaceMatches(replaceMatches),
    [replaceMatches],
  );

  // Single updateCells() call = single undo step (same pattern as fillDown).
  // Works for value->empty and empty->value since replace values pass through untouched.
  const handleReplaceAll = useCallback(() => {
    if (replaceMatches.length === 0) return;
    updateCells(buildReplaceUpdates(replaceMatches));
    // Refresh highlights against the new data
    performSearch(searchQuery, { matchCase, exactCell });
  }, [replaceMatches, updateCells, performSearch, searchQuery, matchCase, exactCell]);

  // Search navigation functions
  const handleSearchNext = useCallback(() => {
    if (searchMatches.length > 0) {
      const nextIndex = (searchActiveIndex + 1) % searchMatches.length;
      setSearchActiveIndex(nextIndex);

      // Select the active match cell for better visibility
      const match = searchMatches[nextIndex];
      setSelectedCell({
        rowId: match.rowId,
        columnId: match.columnId,
      });

      // Scroll to the active match
      rowVirtualizer.scrollToIndex(match.rowIndex, {
        align: "center",
        behavior: "smooth",
      });
    }
  }, [searchMatches, searchActiveIndex, rowVirtualizer]);

  const handleSearchPrevious = useCallback(() => {
    if (searchMatches.length > 0) {
      const prevIndex = searchActiveIndex === 0 ? searchMatches.length - 1 : searchActiveIndex - 1;
      setSearchActiveIndex(prevIndex);

      // Select the active match cell for better visibility
      const match = searchMatches[prevIndex];
      setSelectedCell({
        rowId: match.rowId,
        columnId: match.columnId,
      });

      // Scroll to the active match
      rowVirtualizer.scrollToIndex(match.rowIndex, {
        align: "center",
        behavior: "smooth",
      });
    }
  }, [searchMatches, searchActiveIndex, rowVirtualizer]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchMatches([]);
    setSearchActiveIndex(0);
  }, []);

  // Calculate column widths based on content sampling
  const columnWidths = useMemo(() => {
    const headers = table.getHeaderGroups()[0]?.headers || [];
    const rows = table.getRowModel().rows;
    const sampleSize = Math.min(50, rows.length); // Sample first 50 rows for width calculation

    const widths: string[] = [];

    headers.forEach((header, colIndex) => {
      if (colIndex === 0) {
        // Row number column - calculate based on max row number
        const maxRowNum = Math.max(rows.length, 999);
        const width = Math.max(40, maxRowNum.toString().length * 12 + 20);
        widths.push(`${width}px`);
      } else if (header.id === "actions") {
        // Actions column - fixed width for icons
        widths.push("80px");
      } else {
        // Data columns - sample content to determine width
        let maxWidth = header.column.columnDef.header?.toString().length || 0;

        // Sample rows to find max content width
        for (let i = 0; i < sampleSize; i++) {
          const row = rows[i];
          if (row) {
            const cell = row.getVisibleCells()[colIndex];
            if (cell) {
              const cellValue = cell.getValue();
              const cellText = cellValue?.toString() || "";
              maxWidth = Math.max(maxWidth, cellText.length);
            }
          }
        }

        // Convert character count to approximate pixel width
        // Average character width ~8px + padding
        const minWidth = 60;
        const maxWidthPx = 300; // Cap at 300px
        const calculatedWidth = Math.min(
          Math.max(minWidth, maxWidth * 8 + 16),
          maxWidthPx,
        );
        widths.push(`${calculatedWidth}px`);
      }
    });

    return widths;
  }, [table, csvData]); // Depend on csvData to recalculate when data changes

  const gridTemplateColumns = columnWidths.join(" ");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isAnyCellEditing || editingHeader) return;
      if (!selectedCell) {
        if (filteredData.length > 0 && columns.length > 0) {
          setSelectedCell({
            rowId: filteredData[0].id,
            columnId: columns[0].id,
          });
        }
        return;
      }
      // Handle Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopySelectedCells();
        return;
      }

      // Handle Select All (Ctrl+A / Cmd+A)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        setEditingCellTrigger(selectedCell);
        return;
      }

      const currentRowIndex = filteredData.findIndex(
        (row) => row.id === selectedCell.rowId,
      );
      const currentColumnIndex = columns.findIndex(
        (col) => col.id === selectedCell.columnId,
      );
      let newRowIndex = currentRowIndex;
      let newColumnIndex = currentColumnIndex;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newRowIndex = Math.max(0, currentRowIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newRowIndex = Math.min(filteredData.length - 1, currentRowIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newColumnIndex = Math.max(0, currentColumnIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newColumnIndex = Math.min(columns.length - 1, currentColumnIndex + 1);
          break;
        case "Tab":
          /* Tab logic can be added here */ break;
        default:
          return;
      }

      if (
        newRowIndex !== currentRowIndex ||
        newColumnIndex !== currentColumnIndex
      ) {
        const newRowId = filteredData[newRowIndex].id;
        const newColumnId = columns[newColumnIndex].id;
        setSelectedCell({ rowId: newRowId, columnId: newColumnId });

        // Scroll to the selected cell if it's not visible
        rowVirtualizer.scrollToIndex(newRowIndex, {
          align: "auto",
          behavior: "smooth",
        });
      }
    },
    [
      selectedCell,
      isAnyCellEditing,
      editingHeader,
      filteredData,
      columns,
      rowVirtualizer,
      handleCopySelectedCells,
      handleSelectAll,
    ],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="text-secondary">Loading CSV data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-surface">
        <div className="text-danger">Error: {error}</div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-canvas text-main focus:outline-none"
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      tabIndex={0}
      data-testid="csv-table-viewer"
    >
      {/* Toolbar */}
      <CsvToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchMatchCount={searchMatches.length}
        searchActiveIndex={searchActiveIndex}
        onSearchNext={handleSearchNext}
        onSearchPrevious={handleSearchPrevious}
        onClearSearch={handleClearSearch}
        showReplace={showReplace}
        onToggleReplace={setShowReplace}
        snapshots={snapshots}
        showSnapshotsPanel={showSnapshotsPanel}
        onToggleSnapshotsPanel={setShowSnapshotsPanel}
        onCreateSnapshot={(name) => createSnapshot(name)}
        onRestoreSnapshot={restoreSnapshot}
        onDeleteSnapshot={deleteSnapshot}
        duplicateGroups={duplicateGroups}
        showDuplicatesOnly={showDuplicatesOnly}
        duplicateSearchPerformed={duplicateSearchPerformed}
        onFindDuplicates={findDuplicates}
        onToggleDuplicatesOnly={setShowDuplicatesOnly}
        onRemoveDuplicates={removeDuplicateRows}
        onClearDuplicates={clearDuplicates}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onExportMarkdown={handleExportMarkdown}
        onExportSql={handleExportSql}
        exportVisibleRowsOnly={exportVisibleRowsOnly}
        onToggleExportVisibleRowsOnly={setExportVisibleRowsOnly}
        onPromoteFirstRowToHeader={promoteFirstRowToHeader}
        onDemoteHeaderToFirstRow={demoteHeaderToFirstRow}
        currentDelimiter={detectedDelimiter}
        onChangeDelimiter={changeDelimiter}
        rowCount={data.length}
        visibleRowCount={filteredData.length}
        columnCount={columns.length}
        diagnostics={diagnostics}
        isValid={isValid}
        showAddColumnsPanel={addColumnsPanel !== null}
        onToggleAddColumnsPanel={() =>
          setAddColumnsPanel((current) => (current ? null : {}))
        }
        onReconcileTab={() => tabletActionService.handleAction({
          targetTablet: "datareconcile",
          action: "new-tab",
          payload: { sourceAId: tabId, csvMode: true },
          source: { tabId, titleHint: "Data Reconcile", side },
        })}
      />

      {/* Filter Bar */}
      <CsvFilterBar
        columns={columns}
        filters={filters}
        matchMode={filterMatchMode}
        showFilterRow={showFilterRow}
        visibleRowCount={typeFilteredRows.length}
        totalRowCount={data.length}
        showPresetsPanel={showPresetsPanel}
        onToggleFilterRow={setShowFilterRow}
        onRemoveFilter={removeColumnFilter}
        onClearFilters={clearFilters}
        onMatchModeChange={setFilterMatchMode}
        onTogglePresetsPanel={setShowPresetsPanel}
      />

      {/* Find & Replace Bar */}
      {showReplace && (
        <CsvFindReplaceBar
          columns={columns}
          replaceValue={replaceValue}
          onReplaceChange={setReplaceValue}
          scope={replaceScope}
          onScopeChange={setReplaceScope}
          columnId={effectiveReplaceColumnId}
          onColumnChange={setReplaceColumnId}
          matchCase={matchCase}
          onMatchCaseChange={handleMatchCaseChange}
          exactCell={exactCell}
          onExactCellChange={handleExactCellChange}
          previewText={replaceSummary.text}
          matchCount={replaceSummary.cellCount}
          selectionCount={selectedCells.size}
          onReplaceAll={handleReplaceAll}
          onClose={() => setShowReplace(false)}
        />
      )}

      {/* Saved Filter Presets Panel */}
      {showPresetsPanel && (
        <CsvFilterPresetsPanel
          presets={filterPresets}
          canSave={filters.length > 0}
          onSave={saveFilterPreset}
          onApply={applyFilterPreset}
          onDelete={deleteFilterPreset}
          onClose={() => setShowPresetsPanel(false)}
        />
      )}

      {/* Facet (value list) Popover */}
      {facetPopover && facetColumn && (
        <FacetFilterPopover
          column={facetColumn}
          values={facetValues}
          selection={facetSelection}
          onSelectionChange={handleFacetSelectionChange}
          onClose={() => setFacetPopover(null)}
          position={facetPopover.position}
        />
      )}

      {/* Snapshots Panel */}
      {showSnapshotsPanel && snapshots.length > 0 && (
        <CsvSnapshotsPanel
          snapshots={snapshots}
          onRestore={restoreSnapshot}
          onDelete={deleteSnapshot}
          onClose={() => setShowSnapshotsPanel(false)}
        />
      )}

      {/* Add Columns From Another Tab Panel */}
      {addColumnsPanel && (
        <CsvAddColumnsPanel
          key={addColumnsPanel.anchorColumnId ?? "end"}
          tabs={columnSourceTabs}
          columns={columns}
          anchorColumnId={addColumnsPanel.anchorColumnId}
          loadSource={loadColumnSource}
          onApply={addColumnsFromTable}
          onClose={() => setAddColumnsPanel(null)}
        />
      )}

      {/* Virtualized Table */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto custom-scrollbar bg-surface"
        style={{ contain: "strict" }}
        data-testid="csv-table-container"
      >
        {/* Fixed Header */}
        <div className="sticky top-0 z-10">
          <div
            className="bg-surface-secondary border-b border-base"
            style={{
              display: "grid",
              gridTemplateColumns,
              width: "fit-content",
            }}
            data-testid="csv-table"
          >
            {table.getHeaderGroups()[0]?.headers.map((header) => (
              <div
                key={header.id}
                className="border-r border-base p-2 text-left font-medium text-main bg-surface-secondary"
                data-testid="column-header"
                onClick={(e) => {
                  if (
                    e.detail <= 1 &&
                    header.id !== "rowNumber" &&
                    header.id !== "actions"
                  ) {
                    handleSelectColumn(header.id, e);
                  }
                }}
                onContextMenu={(e) => {
                  if (header.id !== "rowNumber" && header.id !== "actions") {
                    handleColumnRightClick(e, header.id);
                  }
                }}
              >
                <span className="flex items-center justify-between gap-1 min-w-0">
                  <span className="truncate">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </span>
                  {header.id !== "rowNumber" && header.id !== "actions" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFacetPopover({
                          columnId: header.id,
                          position: { x: e.clientX, y: e.clientY },
                        });
                      }}
                      aria-label={`Filter ${
                        columns.find((c) => c.id === header.id)?.name ?? header.id
                      } by value`}
                      title="Filter by value"
                      className="flex-none rounded hover:bg-element-hover p-0.5 text-secondary"
                      data-testid={`facet-button-${header.id}`}
                    >
                      <ListFilter size={12} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Column Filter Row */}
          {showFilterRow && columns.length > 0 && (
            <div
              className="bg-surface-secondary border-b border-base"
              style={{
                display: "grid",
                gridTemplateColumns,
                width: "fit-content",
              }}
              data-testid="csv-filter-row"
            >
              <div className="border-r border-base" aria-hidden="true" />
              {columns.map((column) => (
                <div key={column.id} className="border-r border-base">
                  <ColumnFilterInput
                    column={column}
                    filter={filters.find((f) => f.columnId === column.id)}
                    onChange={(next) => setColumnFilter(column.id, next)}
                  />
                </div>
              ))}
              <div aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Virtual Rows Container */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
          data-testid="virtualized-table"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            const isDuplicate = duplicateRowIds.has(row.original.id);

            return (
              <div
                key={virtualRow.key}
                className={`absolute border-b border-base hover:bg-element-hover ${isDuplicate ? "bg-warning/10 border-warning/30" : ""
                  }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns,
                  width: "fit-content",
                }}
                data-testid={isDuplicate ? "duplicate-row-indicator" : "csv-row"}
              >
                {row.getVisibleCells().map((cell, cellIndex) => {
                  // Determine the actual column index for data cells (excluding row number and actions columns)
                  const actualColumnIndex = cellIndex - 1; // Exclude row number column
                  if (cellIndex >= row.getVisibleCells().length - 1) {
                    // This is the actions column, skip data attributes
                    return (
                      <div key={cell.id} className="border-r border-base">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  }
                  if (cellIndex === 0) {
                    // This is the row number column, skip data attributes
                    return (
                      <div key={cell.id} className="border-r border-base">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={cell.id}
                      className="border-r border-base"
                      data-testid="csv-cell"
                      data-row={virtualRow.index.toString()}
                      data-col={actualColumnIndex.toString()}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {/* Diagnostics Footer */}
      <CsvDiagnosticsFooter diagnostics={diagnostics} />

      {/* Stats Popover */}
      {statsPopover && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setStatsPopover(null)}
          />
          <ColumnStatsPopover
            columnName={
              columns.find((col) => col.id === statsPopover.columnId)?.name ||
              "Unknown"
            }
            stats={getColumnStats(statsPopover.columnId)}
            onClose={() => setStatsPopover(null)}
            position={statsPopover.position}
          />
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            data-testid="csv-context-menu"
            className="fixed bg-surface border border-base rounded-lg shadow-xl z-50 min-w-[200px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <div className="py-1">
              {contextMenu.kind === "cell" && (
                <>
                  <button
                    onClick={() => applyQuickFilter("equals")}
                    className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                    title="Show only rows with this value"
                  >
                    <ListFilter size={14} className="mr-2" />
                    <span>Filter by this value</span>
                  </button>
                  <button
                    onClick={() => applyQuickFilter("notEquals")}
                    className="flex items-center w-full px-3 py-2 text-left transition-colors text-sm text-main hover:bg-element-hover"
                    title="Hide rows with this value"
                  >
                    <ListFilter size={14} className="mr-2" />
                    <span>Exclude this value</span>
                  </button>
                  {(columns.find((c) => c.id === contextMenu.columnId)?.type ===
                    "number" ||
                    columns.find((c) => c.id === contextMenu.columnId)?.type ===
                      "date") && (
                    <>
                      <button
                        onClick={() => applyQuickFilter("gt")}
                        className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                        title="Keep rows greater than this value"
                      >
                        <span>Filter &gt; this</span>
                      </button>
                      <button
                        onClick={() => applyQuickFilter("lt")}
                        className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                        title="Keep rows less than this value"
                      >
                        <span>Filter &lt; this</span>
                      </button>
                    </>
                  )}
                  <div className="border-t border-base my-1" />
                </>
              )}
              {contextMenu.kind === "column" && (
                <>
                  <button
                    onClick={() => moveContextColumn(-1)}
                    disabled={!canMoveContextColumn(-1)}
                    data-testid="move-column-left"
                    className={`flex items-center w-full px-3 py-2 text-sm text-left transition-colors ${canMoveContextColumn(-1)
                      ? 'text-main hover:bg-element-hover'
                      : 'text-muted cursor-not-allowed'
                      }`}
                    title="Move this column one position to the left"
                  >
                    <ArrowLeft size={14} className="mr-2" />
                    <span>Move column left</span>
                  </button>
                  <button
                    onClick={() => moveContextColumn(1)}
                    disabled={!canMoveContextColumn(1)}
                    data-testid="move-column-right"
                    className={`flex items-center w-full px-3 py-2 text-sm text-left transition-colors ${canMoveContextColumn(1)
                      ? 'text-main hover:bg-element-hover'
                      : 'text-muted cursor-not-allowed'
                      }`}
                    title="Move this column one position to the right"
                  >
                    <ArrowRight size={14} className="mr-2" />
                    <span>Move column right</span>
                  </button>
                  <button
                    onClick={openAddColumnsFromContextMenu}
                    data-testid="add-columns-from-tab"
                    className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                    title="Copy columns from another tab, inserted after this column"
                  >
                    <Columns size={14} className="mr-2" />
                    <span>Add columns from another tab...</span>
                  </button>
                  <div className="border-t border-base my-1" />
                </>
              )}
              <button
                onClick={handleCopySelectedCells}
                className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                title={
                  contextMenu.kind === "column" || isFullColumnSelection()
                    ? "Copy selected columns"
                    : "Copy selected cells"
                }
              >
                <Copy size={14} className="mr-2" />
                <span>
                  {contextMenu.kind === "column" || isFullColumnSelection()
                    ? `Copy columns`
                    : `Copy (${selectedCells.size} cell${selectedCells.size !== 1 ? 's' : ''})`}
                </span>
              </button>
              {copiedColumnsRef.current ? (
                <button
                  onClick={handlePasteCopiedColumns}
                  className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                  title="Insert copied columns before this column"
                >
                  <ClipboardPaste size={14} className="mr-2" />
                  <span>Insert copied columns</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      pasteText(text);
                    } catch (err) {
                      console.error("Failed to paste from context menu:", err);
                    }
                    closeContextMenu();
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                  title="Paste clipboard contents starting at the selected cell"
                >
                  <ClipboardPaste size={14} className="mr-2" />
                  <span>Paste cells</span>
                </button>
              )}
              <button
                onClick={handleClearSelectedCells}
                className="flex items-center w-full px-3 py-2 text-sm text-left transition-colors text-main hover:bg-element-hover"
                title="Clear selected cells"
              >
                <Minus size={14} className="mr-2" />
                <span>Clear ({selectedCells.size} cell{selectedCells.size !== 1 ? 's' : ''})</span>
              </button>
              {contextMenu.kind === "cell" && (
                <button
                  onClick={handleFillDown}
                  disabled={!canFillDown()}
                  data-testid="fill-down-button"
                  className={`flex items-center w-full px-3 py-2 text-sm text-left transition-colors ${canFillDown()
                    ? 'text-main hover:bg-element-hover'
                    : 'text-muted cursor-not-allowed'
                    }`}
                  title={
                    canFillDown()
                      ? `Copy this cell's value into the ${fillDownRowCount} cell${fillDownRowCount !== 1 ? 's' : ''} below in the same column`
                      : 'No rows below to fill'
                  }
                >
                  <ArrowDown size={14} className="mr-2" />
                  <span>
                    {fillDownRowCount > 0
                      ? `Copy down (${fillDownRowCount} row${fillDownRowCount !== 1 ? 's' : ''})`
                      : 'Copy down'}
                  </span>
                </button>
              )}
              <div className="border-t border-base my-1" />
              <button
                onClick={handleShiftRight}
                disabled={!canShiftRight()}
                className={`flex items-center w-full px-3 py-2 text-sm text-left transition-colors ${canShiftRight()
                  ? 'text-main hover:bg-element-hover'
                  : 'text-muted cursor-not-allowed'
                  }`}
                title={
                  canShiftRight()
                    ? 'Insert empty cell and shift remaining cells right'
                    : 'Not available when multiple cells are selected in the same row, or when selected rows already have maximum columns'
                }
              >
                <span>Insert Empty Cell & Shift Right</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
