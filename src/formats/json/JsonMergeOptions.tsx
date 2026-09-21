import type { MergeOptionsUIProps } from "../types";
import { jsonConflictPolicy } from "./mergeStrategy";

const JsonMergeOptions = ({
  inputs,
  options,
  onOptionsChange,
}: MergeOptionsUIProps) => {
  const arraysOnly = inputs.every((input) => {
    try {
      return Array.isArray(JSON.parse(input.content));
    } catch {
      return false;
    }
  });

  if (arraysOnly) {
    return (
      <p className="rounded border border-base p-3 text-sm text-secondary">
        Arrays are concatenated in the selected tab order.
      </p>
    );
  }

  const policy = jsonConflictPolicy(options);
  return (
    <fieldset className="space-y-1 rounded border border-base p-3">
      <legend className="font-medium">Object conflict handling</legend>
      {[
        ["stop", "Stop on conflict"],
        ["later", "Later tab wins"],
        ["earlier", "Earlier tab wins"],
      ].map(([value, label]) => (
        <label key={value} className="block">
          <input
            type="radio"
            name="json-conflict-policy"
            value={value}
            checked={policy === value}
            onChange={() =>
              onOptionsChange({ ...options, conflictPolicy: value })
            }
          />{" "}
          {label}
        </label>
      ))}
    </fieldset>
  );
};

export default JsonMergeOptions;
