import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { debounce } from "lodash";
import { CsvColumn } from "../types";
import { ColumnFilter, FilterOperator } from "../utils/filtering";
import {
  booleanToFilter,
  rangeToFilter,
  textToFilter,
  toBooleanSelection,
  toRangeValues,
  toTextValues,
} from "../utils/filterWidgetModel";

interface ColumnFilterInputProps {
  column: CsvColumn;
  filter?: ColumnFilter;
  onChange: (filter?: ColumnFilter) => void;
}

const TEXT_OPERATOR_OPTIONS: Array<{ value: FilterOperator; label: string }> = [
  { value: "contains", label: "contains" },
  { value: "notContains", label: "does not contain" },
  { value: "equals", label: "equals" },
  { value: "notEquals", label: "does not equal" },
  { value: "startsWith", label: "starts with" },
  { value: "regex", label: "matches" },
];

const BOOLEAN_OPTIONS: Array<{ value: "any" | "true" | "false"; label: string }> = [
  { value: "any", label: "Any" },
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

const inputClass =
  "bg-element text-main border border-base rounded px-1 py-0.5 text-xs placeholder-secondary focus:outline-none focus:border-focus min-w-0";

function stopKeyDown(e: React.KeyboardEvent) {
  e.stopPropagation();
}

/** Escape clears the field; typing keys never reach the table's key handler. */
function clearOnEscape(
  e: React.KeyboardEvent<HTMLInputElement>,
  clear: () => void,
) {
  e.stopPropagation();
  if (e.key === "Escape") {
    e.preventDefault();
    clear();
  }
}

export const ColumnFilterInput: React.FC<ColumnFilterInputProps> = ({
  column,
  filter,
  onChange,
}) => {
  const testId = `filter-input-${column.name}`;

  if (column.type === "boolean") {
    const selection = toBooleanSelection(filter);
    return (
      <div className="flex items-center px-1 py-1" data-testid={testId}>
        <select
          aria-label={`Filter ${column.name}`}
          className={`${inputClass} w-full cursor-pointer`}
          value={selection}
          onChange={(e) =>
            onChange(
              booleanToFilter(column.id, e.target.value as "any" | "true" | "false"),
            )
          }
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape" && selection !== "any") {
              onChange(undefined);
            }
          }}
        >
          {BOOLEAN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (column.type === "number" || column.type === "date") {
    const range = toRangeValues(filter);
    const inputType = column.type === "number" ? "number" : "date";
    const emit = (min: string, max: string) =>
      onChange(rangeToFilter(column.id, min, max));

    return (
      <div
        className="flex items-center gap-1 px-1 py-1"
        data-testid={testId}
      >
        <input
          type={inputType}
          aria-label={`Filter ${column.name} from`}
          placeholder="Min"
          className={`${inputClass} w-full`}
          value={range.min}
          onChange={(e) => emit(e.target.value, range.max)}
          onKeyDown={(e) =>
            clearOnEscape(e, () => {
              e.currentTarget.blur();
              emit("", range.max);
            })
          }
        />
        <input
          type={inputType}
          aria-label={`Filter ${column.name} to`}
          placeholder="Max"
          className={`${inputClass} w-full`}
          value={range.max}
          onChange={(e) => emit(range.min, e.target.value)}
          onKeyDown={(e) =>
            clearOnEscape(e, () => {
              e.currentTarget.blur();
              emit(range.min, "");
            })
          }
        />
      </div>
    );
  }

  return (
    <TextFilterInput
      columnId={column.id}
      columnName={column.name}
      filter={filter}
      operatorOptions={TEXT_OPERATOR_OPTIONS}
      testId={testId}
      onChange={onChange}
    />
  );
};

/**
 * Text branch of the filter widget. Keeps the keystroke in local state and
 * commits a debounced filter (~200ms) so large datasets are not re-filtered
 * on every character.
 */
const TextFilterInput: React.FC<{
  columnId: string;
  columnName: string;
  filter?: ColumnFilter;
  operatorOptions: Array<{ value: FilterOperator; label: string }>;
  testId: string;
  onChange: (filter?: ColumnFilter) => void;
}> = ({ columnId, columnName, filter, operatorOptions, testId, onChange }) => {
  const committed = toTextValues(filter);
  const [draftValue, setDraftValue] = useState(committed.value);

  // Re-sync the draft when the filter changes externally (preset applied,
  // chip removed, filters dropped after content change).
  useEffect(() => {
    setDraftValue(committed.value);
  }, [committed.value]);

  const commitRef = useRef(onChange);
  commitRef.current = onChange;

  const debouncedCommit = useMemo(
    () =>
      debounce((operator: FilterOperator, value: string) => {
        commitRef.current(textToFilter(columnId, operator, value));
      }, 200),
    [columnId],
  );

  useEffect(() => () => debouncedCommit.cancel(), [debouncedCommit]);

  const handleOperatorChange = (operator: FilterOperator) => {
    debouncedCommit.cancel();
    onChange(textToFilter(columnId, operator, draftValue));
  };

  const handleChange = (value: string) => {
    setDraftValue(value);
    debouncedCommit(committed.operator, value);
  };

  const handleClear = () => {
    debouncedCommit.cancel();
    setDraftValue("");
    onChange(undefined);
  };

  return (
    <div className="flex items-center gap-1 px-1 py-1" data-testid={testId}>
      <select
        aria-label={`Filter operator for ${columnName}`}
        className={`${inputClass} cursor-pointer`}
        value={committed.operator}
        onChange={(e) =>
          handleOperatorChange(e.target.value as FilterOperator)
        }
        onKeyDown={stopKeyDown}
      >
        {operatorOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        aria-label={`Filter ${columnName}`}
        placeholder="Filter..."
        className={`${inputClass} flex-1`}
        value={draftValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          stopKeyDown(e);
          if (e.key === "Escape" && draftValue !== "") {
            e.preventDefault();
            handleClear();
          }
        }}
      />
    </div>
  );
};
