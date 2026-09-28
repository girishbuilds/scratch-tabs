import * as React from "react";
import { ListFilter, X } from "lucide-react";
import { CsvColumn } from "../types";
import { FacetValue } from "../utils/facets";
import { FACET_MAX_VISIBLE_VALUES } from "../utils/filterWidgetModel";

interface FacetFilterPopoverProps {
  column: CsvColumn;
  values: FacetValue[];
  /** Values currently selected via an `in` filter; null means all. */
  selection: string[] | null;
  onSelectionChange: (selectedValues: string[]) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

/**
 * Excel-style checkbox list of distinct values for one column with live
 * counts. Selecting every listed value clears the facet filter.
 */
export const FacetFilterPopover: React.FC<FacetFilterPopoverProps> = ({
  column,
  values,
  selection,
  onSelectionChange,
  onClose,
  position,
}) => {
  const selected = React.useMemo(
    () =>
      new Set(
        (selection ?? values.map((facet) => facet.value)).filter((value) =>
          values.some((facet) => facet.value === value),
        ),
      ),
    [selection, values],
  );

  const visible = values.slice(0, FACET_MAX_VISIBLE_VALUES);
  const hiddenCount = values.length - visible.length;
  const allSelected = selected.size >= visible.length;

  const emit = (next: Set<string>) => onSelectionChange([...next]);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    emit(next);
  };

  const selectAll = () =>
    emit(allSelected ? new Set() : new Set(visible.map((f) => f.value)));

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        data-testid="facet-popover"
        className="fixed bg-surface border border-base rounded-lg shadow-xl z-50 w-64 flex flex-col max-h-72"
        style={{ left: position.x, top: position.y }}
        role="dialog"
        aria-label={`Filter ${column.name} by value`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-base">
          <span className="flex items-center gap-1 text-sm font-medium text-main min-w-0">
            <ListFilter size={14} className="flex-none" />
            <span className="truncate">{column.name}</span>
          </span>
          <button
            onClick={onClose}
            aria-label={`Close ${column.name} value list`}
            title="Close"
            className="rounded hover:bg-element-hover p-0.5"
            data-testid="facet-close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-2 py-1 border-b border-base">
          <label className="flex items-center gap-2 px-1 py-1 text-xs text-main rounded hover:bg-element-hover cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                allSelected ? emit(new Set()) : selectAll()
              }
              data-testid="facet-select-all"
              aria-label={`Select all ${column.name} values`}
            />
            <span>(Select all)</span>
          </label>
        </div>
        <div className="overflow-auto custom-scrollbar">
          {visible.map((facet) => (
            <div
              key={facet.value}
              className="flex items-center gap-2 px-3 py-1 text-xs text-main rounded hover:bg-element-hover"
              data-testid={`facet-option-${facet.value}`}
            >
              <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(facet.value)}
                  onChange={() => toggle(facet.value)}
                  aria-label={`Filter by ${column.name} = ${facet.value}`}
                />
                <span className="flex-1 truncate" title={facet.value}>
                  {facet.value}
                </span>
                <span className="text-secondary tabular-nums">{facet.count}</span>
              </label>
              <button
                type="button"
                onClick={() => emit(new Set([facet.value]))}
                aria-label={`Show only ${facet.value} in ${column.name}`}
                title={`Show only ${facet.value}`}
                className="flex-none rounded px-1 py-0.5 text-primary hover:bg-primary/20"
              >
                Only
              </button>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="px-3 py-2 text-xs text-secondary">No values</p>
          )}
          {hiddenCount > 0 && (
            <p
              className="px-3 py-2 text-xs text-secondary border-t border-base"
              data-testid="facet-hidden-values"
            >
              +{hiddenCount} more values not listed
            </p>
          )}
        </div>
      </div>
    </>
  );
};
