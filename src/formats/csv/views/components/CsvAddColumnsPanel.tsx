import * as React from "react";
import { useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { CsvColumn } from "../types";
import { SourceTabOption } from "../hooks/useColumnSourceTabs";
import { AddColumnsOptions, ColumnSource } from "../utils/columnOperations";
import { suggestKeyPair } from "../utils/suggestKeyPair";

interface CsvAddColumnsPanelProps {
  tabs: SourceTabOption[];
  columns: CsvColumn[];
  /** Column the new columns are inserted after by default (appends when omitted). */
  anchorColumnId?: string;
  loadSource: (tabId: string) => ColumnSource;
  onApply: (source: ColumnSource, options: AddColumnsOptions) => void;
  onClose: () => void;
}

const selectClass =
  "bg-element text-main text-sm rounded border border-base px-2 py-1";

export const CsvAddColumnsPanel: React.FC<CsvAddColumnsPanelProps> = ({
  tabs,
  columns,
  anchorColumnId,
  loadSource,
  onApply,
  onClose,
}) => {
  const [sourceTabId, setSourceTabId] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<Set<number>>(new Set());
  const [matchMode, setMatchMode] = useState<"position" | "key">("position");
  const [keyTargetId, setKeyTargetId] = useState(columns[0]?.id ?? "");
  const [keySourceIndex, setKeySourceIndex] = useState(0);
  const [insertAfterId, setInsertAfterId] = useState(anchorColumnId ?? "");

  const source = useMemo(
    () => (sourceTabId ? loadSource(sourceTabId) : null),
    [sourceTabId, loadSource],
  );

  const handleTabChange = (tabId: string) => {
    setSourceTabId(tabId);
    setSelectedColumns(new Set());

    const suggestion = tabId ? suggestKeyPair(columns, loadSource(tabId).headers) : null;
    setMatchMode(suggestion ? "key" : "position");
    setKeyTargetId(suggestion?.targetColumnId ?? columns[0]?.id ?? "");
    setKeySourceIndex(suggestion?.sourceColumnIndex ?? 0);
  };

  const toggleColumn = (index: number) => {
    setSelectedColumns((previous) => {
      const next = new Set(previous);
      if (!next.delete(index)) next.add(index);
      return next;
    });
  };

  const canApply =
    source !== null &&
    selectedColumns.size > 0 &&
    (matchMode === "position" || keyTargetId !== "");

  const handleApply = () => {
    if (!source || !canApply) return;

    onApply(source, {
      sourceColumns: Array.from(selectedColumns).sort((a, b) => a - b),
      match:
        matchMode === "position"
          ? { mode: "position" }
          : {
              mode: "key",
              targetColumnId: keyTargetId,
              sourceColumnIndex: keySourceIndex,
            },
      insertAfterColumnId: insertAfterId || undefined,
    });
    onClose();
  };

  return (
    <div
      className="flex-none border-b border-base bg-surface/50 p-3"
      data-testid="csv-add-columns-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-main flex items-center gap-2">
          <Plus size={16} />
          Add columns from another tab
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-element-hover text-secondary"
          title="Close"
          data-testid="add-columns-close"
        >
          <X size={14} />
        </button>
      </div>

      {tabs.length === 0 ? (
        <p className="text-sm text-secondary" data-testid="add-columns-no-tabs">
          No CSV tabs found. Open another CSV tab to copy columns from it.
        </p>
      ) : (
        <div className="grid gap-3 text-sm text-main">
          <label className="flex items-center gap-2">
            <span className="w-24 text-secondary">From tab</span>
            <select
              className={selectClass}
              value={sourceTabId}
              onChange={(e) => handleTabChange(e.target.value)}
              data-testid="add-columns-source-tab"
            >
              <option value="">Select a tab...</option>
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.title}
                </option>
              ))}
            </select>
          </label>

          {source && (
            <>
              <fieldset className="flex items-start gap-2">
                <legend className="sr-only">Columns to add</legend>
                <span className="w-24 text-secondary">Columns</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {source.headers.map((header, index) => (
                    <label key={index} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedColumns.has(index)}
                        onChange={() => toggleColumn(index)}
                        data-testid={`add-columns-source-column-${index}`}
                      />
                      <span>{header || `Column ${index + 1}`}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-secondary">Match rows</span>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="add-columns-match"
                    checked={matchMode === "position"}
                    onChange={() => setMatchMode("position")}
                    data-testid="add-columns-match-position"
                  />
                  <span>By row position</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="add-columns-match"
                    checked={matchMode === "key"}
                    onChange={() => setMatchMode("key")}
                    data-testid="add-columns-match-key"
                  />
                  <span>By key column</span>
                </label>
                {matchMode === "key" && (
                  <>
                    <select
                      className={selectClass}
                      value={keyTargetId}
                      onChange={(e) => setKeyTargetId(e.target.value)}
                      aria-label="Key column in this tab"
                      data-testid="add-columns-key-target"
                    >
                      {columns.map((column) => (
                        <option key={column.id} value={column.id}>
                          {column.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-secondary">=</span>
                    <select
                      className={selectClass}
                      value={keySourceIndex}
                      onChange={(e) => setKeySourceIndex(Number(e.target.value))}
                      aria-label="Key column in the other tab"
                      data-testid="add-columns-key-source"
                    >
                      {source.headers.map((header, index) => (
                        <option key={index} value={index}>
                          {header || `Column ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              <label className="flex items-center gap-2">
                <span className="w-24 text-secondary">Insert</span>
                <select
                  className={selectClass}
                  value={insertAfterId}
                  onChange={(e) => setInsertAfterId(e.target.value)}
                  data-testid="add-columns-position"
                >
                  <option value="">At the end</option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      After {column.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleApply}
              disabled={!canApply}
              className="px-3 py-1 text-sm bg-primary/20 text-primary hover:bg-primary/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="add-columns-apply"
            >
              Add columns
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
