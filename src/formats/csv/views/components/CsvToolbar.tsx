import * as React from "react";
import { useState, useCallback } from "react";
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Camera,
  Replace,
  X,
  History,
  Download,
  FileText,
  Database,
  Code,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Columns,
} from "lucide-react";
import { CsvDiagnostic, CsvSnapshot } from "../types";

interface DuplicateGroup {
  rowString: string;
  rowIds: string[];
  count: number;
}

interface CsvToolbarProps {
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchMatchCount: number;
  searchActiveIndex: number;
  onSearchNext: () => void;
  onSearchPrevious: () => void;
  onClearSearch: () => void;

  // Find & Replace
  showReplace: boolean;
  onToggleReplace: (show: boolean) => void;

  // Snapshots
  snapshots: CsvSnapshot[];
  showSnapshotsPanel: boolean;
  onToggleSnapshotsPanel: (show: boolean) => void;
  onCreateSnapshot: (name: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;

  // Duplicates
  duplicateGroups: DuplicateGroup[];
  showDuplicatesOnly: boolean;
  duplicateSearchPerformed: boolean;
  onFindDuplicates: () => void;
  onToggleDuplicatesOnly: (show: boolean) => void;
  onRemoveDuplicates: () => void;
  onClearDuplicates: () => void;

  // Export
  onExportCsv: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportSql: (tableName: string) => void;
  /** Rows visible after filtering; the export-scope toggle only shows when it differs from rowCount. */
  visibleRowCount: number;
  exportVisibleRowsOnly: boolean;
  onToggleExportVisibleRowsOnly: (value: boolean) => void;

  // Add columns from another tab
  showAddColumnsPanel: boolean;
  onToggleAddColumnsPanel: () => void;

  // Header management
  onPromoteFirstRowToHeader: () => void;
  onDemoteHeaderToFirstRow: () => void;

  // Delimiter
  currentDelimiter: string;
  onChangeDelimiter: (delimiter: string) => void;

  // Data info
  rowCount: number;
  columnCount: number;
  diagnostics: CsvDiagnostic[];
  isValid: boolean;
  onReconcileTab: () => void;
}

export const CsvToolbar: React.FC<CsvToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  searchQuery,
  onSearchChange,
  searchMatchCount,
  searchActiveIndex,
  onSearchNext,
  onSearchPrevious,
  onClearSearch,
  showReplace,
  onToggleReplace,
  snapshots,
  showSnapshotsPanel,
  onToggleSnapshotsPanel,
  onCreateSnapshot,
  duplicateGroups,
  showDuplicatesOnly,
  duplicateSearchPerformed,
  onFindDuplicates,
  onToggleDuplicatesOnly,
  onRemoveDuplicates,
  onClearDuplicates,
  onExportCsv,
  onExportJson,
  onExportMarkdown,
  onExportSql,
  visibleRowCount,
  exportVisibleRowsOnly,
  onToggleExportVisibleRowsOnly,
  showAddColumnsPanel,
  onToggleAddColumnsPanel,
  onPromoteFirstRowToHeader,
  onDemoteHeaderToFirstRow,
  currentDelimiter,
  onChangeDelimiter,
  rowCount,
  columnCount,
  diagnostics,
  isValid,
  onReconcileTab,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sqlTableName, setSqlTableName] = useState("my_table");

  const handleExportSql = useCallback(() => {
    onExportSql(sqlTableName);
    setShowExportMenu(false);
  }, [onExportSql, sqlTableName]);

  const handleExportCsv = useCallback(() => {
    onExportCsv();
    setShowExportMenu(false);
  }, [onExportCsv]);

  const handleExportJson = useCallback(() => {
    onExportJson();
    setShowExportMenu(false);
  }, [onExportJson]);

  const handleExportMarkdown = useCallback(() => {
    onExportMarkdown();
    setShowExportMenu(false);
  }, [onExportMarkdown]);

  return (
    <div className="flex-none border-b border-base p-3 flex items-center justify-between gap-x-3 gap-y-2 flex-wrap bg-canvas">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className={`p-2 rounded shrink-0 ${canUndo ? "hover:bg-element-hover" : "opacity-50 cursor-not-allowed"}`}
          data-testid="undo-button"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
          className={`p-2 rounded transform scale-x-[-1] shrink-0 ${canRedo ? "hover:bg-element-hover" : "opacity-50 cursor-not-allowed"}`}
          data-testid="redo-button"
        >
          <RotateCcw size={16} />
        </button>

        <div className="w-px h-6 bg-element shrink-0" />

        {/* Search */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-main" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                // Prevent Enter and other keys from bubbling to table container
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  // Optional: could trigger "go to first match" behavior here
                }
              }}
              className="pl-10 pr-8 py-2 bg-element text-main border border-base rounded-lg text-sm placeholder-secondary focus:outline-none focus:border-focus w-48"
              data-testid="search-input"
            />
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                title="Clear search"
              >
                <X size={14} className="text-main hover:text-main" />
              </button>
            )}
          </div>

          {searchQuery && (
            <>
              <span className="text-sm text-secondary whitespace-nowrap" data-testid="search-match-count">
                {searchMatchCount > 0
                  ? `${searchActiveIndex + 1} of ${searchMatchCount}`
                  : "0 matches"
                }
              </span>

              <div className="flex items-center space-x-1">
                <button
                  onClick={onSearchPrevious}
                  disabled={searchMatchCount === 0}
                  title="Previous match"
                  className="p-1 rounded hover:bg-element-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="search-previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={onSearchNext}
                  disabled={searchMatchCount === 0}
                  title="Next match"
                  className="p-1 rounded hover:bg-element-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="search-next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}

          <button
            onClick={() => onToggleReplace(!showReplace)}
            title="Find & Replace"
            aria-pressed={showReplace}
            className={`p-2 rounded shrink-0 ${showReplace ? "bg-primary/20 text-primary" : "hover:bg-element-hover"}`}
            data-testid="toggle-replace"
          >
            <Replace size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-element shrink-0" />

        {/* Snapshots */}
        <button
          onClick={() => onCreateSnapshot(`Snapshot ${snapshots.length + 1}`)}
          title="Create snapshot"
          className="p-2 rounded hover:bg-element-hover shrink-0"
          data-testid="create-snapshot-button"
        >
          <Camera size={16} />
        </button>
        {snapshots.length > 0 && (
          <button
            onClick={() => onToggleSnapshotsPanel(!showSnapshotsPanel)}
            title="Manage snapshots"
            className={`p-2 rounded shrink-0 ${showSnapshotsPanel ? "bg-primary/20 text-primary" : "hover:bg-element-hover"}`}
          >
            <History size={16} />
          </button>
        )}

        <div className="w-px h-6 bg-element shrink-0" />

        <button
          onClick={onToggleAddColumnsPanel}
          title="Add columns from another tab"
          className={`flex items-center space-x-1 px-3 py-2 rounded shrink-0 ${showAddColumnsPanel ? "bg-primary/20 text-primary" : "hover:bg-element-hover"}`}
          data-testid="csv-add-columns-from-tab"
        >
          <Columns size={16} />
          <span className="text-sm whitespace-nowrap">Add columns</span>
        </button>

        <button
          onClick={onReconcileTab}
          title="Reconcile this CSV tab with another tab"
          className="flex items-center space-x-1 px-3 py-2 rounded hover:bg-element-hover shrink-0"
          data-testid="csv-reconcile-tab"
        >
          <Database size={16} />
          <span className="text-sm whitespace-nowrap">Reconcile data</span>
        </button>

        <div className="w-px h-6 bg-element shrink-0" />

        {/* Export Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export data"
            className={`flex items-center space-x-1 px-3 py-2 rounded ${showExportMenu ? "bg-primary/20 text-primary" : "hover:bg-element-hover"}`}
            data-testid="export-dropdown"
          >
            <Download size={16} />
            <span className="text-sm">Export</span>
            <ChevronDown
              size={12}
              className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`}
            />
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute top-full right-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[200px]">
                <div className="py-1">
                  {visibleRowCount !== rowCount && (
                    <div
                      className="px-3 py-2 border-b border-base"
                      role="radiogroup"
                      aria-label="Export scope"
                      data-testid="export-scope-toggle"
                    >
                      <div className="text-xs text-secondary mb-1">Rows to export:</div>
                      <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
                        <input
                          type="radio"
                          name="export-scope"
                          checked={exportVisibleRowsOnly}
                          onChange={() => onToggleExportVisibleRowsOnly(true)}
                          data-testid="export-scope-filtered"
                        />
                        Filtered ({visibleRowCount})
                      </label>
                      <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
                        <input
                          type="radio"
                          name="export-scope"
                          checked={!exportVisibleRowsOnly}
                          onChange={() => onToggleExportVisibleRowsOnly(false)}
                          data-testid="export-scope-all"
                        />
                        All rows ({rowCount})
                      </label>
                    </div>
                  )}
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    data-testid="export-option"
                    data-format="csv"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText size={16} className="text-success" />
                      <span>CSV</span>
                    </div>
                    <span className="text-xs text-muted">export.csv</span>
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    data-testid="export-option"
                    data-format="json"
                  >
                    <div className="flex items-center space-x-2">
                      <Code size={16} className="text-info" />
                      <span>JSON</span>
                    </div>
                    <span className="text-xs text-muted">export.json</span>
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    data-testid="export-option"
                    data-format="markdown"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText size={16} className="text-primary" />
                      <span>Markdown</span>
                    </div>
                    <span className="text-xs text-muted">export.md</span>
                  </button>
                  <div className="border-t border-base my-1" />
                  <div className="px-3 py-2">
                    <label className="block text-xs text-secondary mb-1">
                      SQL Table Name:
                    </label>
                    <input
                      type="text"
                      value={sqlTableName}
                      onChange={(e) => setSqlTableName(e.target.value)}
                      className="w-full bg-element border border-base rounded px-2 py-1 text-sm text-main focus:outline-none focus:border-focus"
                      placeholder="table_name"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <button
                    onClick={handleExportSql}
                    disabled={!sqlTableName.trim()}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="export-option"
                    data-format="sql"
                  >
                    <div className="flex items-center space-x-2">
                      <Database size={16} className="text-warning" />
                      <span>SQL</span>
                    </div>
                    <span className="text-xs text-muted">
                      {sqlTableName || "table"}_inserts.sql
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-element shrink-0" />

        {/* Header management */}
        <div className="flex items-center gap-1 shrink-0">
          {rowCount > 0 && (
            <button
              onClick={onPromoteFirstRowToHeader}
              title="Use the first data row as column headers"
              className="px-3 py-1 rounded text-sm bg-element text-main hover:bg-element-hover whitespace-nowrap"
              data-testid="promote-row-to-header"
            >
              Row 1 → Header
            </button>
          )}
          <button
            onClick={onDemoteHeaderToFirstRow}
            title="Move column headers down as first data row"
            className="px-3 py-1 rounded text-sm bg-element text-main hover:bg-element-hover whitespace-nowrap"
            data-testid="demote-header-to-row"
          >
            Header → Row 1
          </button>
        </div>

        <div className="w-px h-6 bg-element shrink-0" />

        {/* Delimiter selector */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-secondary whitespace-nowrap">Delimiter:</span>
          <select
            value={currentDelimiter}
            onChange={(e) => onChangeDelimiter(e.target.value)}
            className="bg-element text-main border border-base rounded px-2 py-1 text-sm focus:outline-none focus:border-focus cursor-pointer"
            title="Convert delimiter"
            data-testid="delimiter-select"
          >
            <option value=",">Comma (,)</option>
            <option value={"\t"}>Tab</option>
            <option value=";">Semicolon (;)</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>

        <div className="w-px h-6 bg-element shrink-0" />

        {/* Duplicates Controls */}
        {duplicateGroups.length === 0 ? (
          <>
            <button
              onClick={onFindDuplicates}
              title="Find duplicate rows"
              className="p-2 rounded hover:bg-element-hover shrink-0"
              data-testid="find-duplicates-button"
            >
              <Replace size={16} />
            </button>
            {duplicateSearchPerformed && (
              <span
                className="text-sm text-success whitespace-nowrap"
                data-testid="duplicate-message"
              >
                No duplicates found
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onToggleDuplicatesOnly(!showDuplicatesOnly)}
              title={
                showDuplicatesOnly ? "Show all rows" : "Show only duplicates"
              }
              className={`px-3 py-1 rounded text-sm whitespace-nowrap ${showDuplicatesOnly
                ? "bg-warning/20 text-warning hover:bg-warning/30"
                : "bg-element text-main hover:bg-element-hover"
                }`}
            >
              {showDuplicatesOnly ? "Show All" : "Duplicates Only"}
            </button>
            <button
              onClick={onRemoveDuplicates}
              title="Remove duplicate rows (keep first occurrence)"
              className="px-3 py-1 rounded text-sm bg-danger/20 text-danger hover:bg-danger/30 whitespace-nowrap"
            >
              Remove Duplicates
            </button>
            <button
              onClick={onClearDuplicates}
              title="Clear duplicate analysis"
              className="p-1 rounded hover:bg-element-hover text-main shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Status Info */}
      <div className="flex items-center gap-4 shrink-0 text-sm text-main">
        <span className="whitespace-nowrap" data-testid="row-column-status">
          {rowCount} rows × {columnCount} columns
        </span>
        {duplicateGroups.length > 0 && (
          <span className="text-warning whitespace-nowrap">
            {duplicateGroups.reduce((sum, group) => sum + group.count, 0)}{" "}
            duplicate rows in {duplicateGroups.length} groups
          </span>
        )}
        <div className="flex items-center space-x-1">
          {isValid ? (
            <CheckCircle size={16} className="text-success" />
          ) : (
            <AlertTriangle size={16} className="text-warning" />
          )}
          <span className="text-xs whitespace-nowrap">
            {diagnostics.filter((d) => d.type === "error").length} errors,{" "}
            {diagnostics.filter((d) => d.type === "warning").length} warnings
          </span>
        </div>
      </div>
    </div>
  );
};
