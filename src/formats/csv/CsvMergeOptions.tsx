import type { MergeOptionsUIProps } from "../types";
import { csvAlignColumnsByName, csvInputHasHeader } from "./mergeStrategy";

const headerOptions = (options: MergeOptionsUIProps["options"]) => {
  const value = options.hasHeader;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
};

const CsvMergeOptions = ({
  inputs,
  options,
  onOptionsChange,
}: MergeOptionsUIProps) => (
  <div className="space-y-3 rounded border border-base p-3">
    <fieldset className="space-y-1">
      <legend className="font-medium">Header rows</legend>
      <p className="text-sm text-secondary">
        Choose whether the first row of each source is a header.
      </p>
      {inputs.map((input) => (
        <label key={input.id} className="block">
          <input
            type="checkbox"
            checked={csvInputHasHeader(options, input.id)}
            onChange={(event) =>
              onOptionsChange({
                ...options,
                hasHeader: {
                  ...headerOptions(options),
                  [input.id]: event.target.checked,
                },
              })
            }
          />{" "}
          {input.title} has a header
        </label>
      ))}
    </fieldset>
    <label className="block">
      <input
        type="checkbox"
        checked={csvAlignColumnsByName(options)}
        onChange={(event) =>
          onOptionsChange({
            ...options,
            alignColumnsByName: event.target.checked,
          })
        }
      />{" "}
      Align columns by name
    </label>
  </div>
);

export default CsvMergeOptions;
