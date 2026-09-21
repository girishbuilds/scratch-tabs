import type {
  MergeEligibility,
  MergeInput,
  MergeOptions,
  MergeResult,
  MergeStrategy,
  MergeValidationError,
} from "../types";
import {
  deepMergeJsonValues,
  type JsonConflictPolicy,
  sanitizeJsonValue,
} from "./mergeUtils";

type JsonRootKind = "array" | "object";

interface ParsedInput {
  input: Readonly<MergeInput>;
  value: unknown[] | Record<string, unknown>;
  rootKind: JsonRootKind;
}

const invalid = (
  code: string,
  message: string,
  paths?: string[],
): MergeValidationError => ({
  ok: false,
  error: { code, message, ...(paths?.length ? { paths } : {}) },
});

export const jsonConflictPolicy = (
  options: MergeOptions,
): JsonConflictPolicy => {
  const policy = options.conflictPolicy;
  return policy === "later" || policy === "earlier" ? policy : "stop";
};

const parseInputs = (
  inputs: ReadonlyArray<Readonly<MergeInput>>,
): ParsedInput[] | MergeValidationError => {
  if (inputs.length < 2) {
    return invalid("json_too_few_inputs", "Select at least two JSON tabs.");
  }

  const parsed: ParsedInput[] = [];
  for (const input of inputs) {
    if (input.language !== "json") {
      return invalid(
        "json_wrong_language",
        `${input.title} is not marked as JSON.`,
      );
    }

    let value: unknown;
    try {
      value = JSON.parse(input.content);
    } catch (error) {
      return invalid(
        "json_parse_error",
        `Could not parse ${input.title}: ${error instanceof Error ? error.message : "Invalid JSON."}`,
      );
    }

    if (Array.isArray(value)) {
      parsed.push({ input, value, rootKind: "array" });
    } else if (value !== null && typeof value === "object") {
      parsed.push({
        input,
        value: value as Record<string, unknown>,
        rootKind: "object",
      });
    } else {
      return invalid(
        "json_scalar_root",
        `${input.title} has a scalar root. JSON merges require arrays or objects.`,
      );
    }
  }

  const expectedKind = parsed[0].rootKind;
  const mismatch = parsed.find((input) => input.rootKind !== expectedKind);
  if (mismatch) {
    return invalid(
      "json_mixed_roots",
      `JSON root shapes differ: ${parsed[0].input.title} is an ${expectedKind}, while ${mismatch.input.title} is an ${mismatch.rootKind}.`,
    );
  }
  return parsed;
};

export const jsonMergeStrategy: MergeStrategy = {
  canMerge(inputs): MergeEligibility {
    const parsed = parseInputs(inputs);
    return Array.isArray(parsed)
      ? { canMerge: true }
      : { canMerge: false, reason: parsed.error.message };
  },

  getOptionsUI: () => import("./JsonMergeOptions"),

  merge(inputs, options): MergeResult {
    const parsed = parseInputs(inputs);
    if (!Array.isArray(parsed)) return parsed;

    if (parsed[0].rootKind === "array") {
      const items = parsed.flatMap((source) =>
        (source.value as unknown[]).map(sanitizeJsonValue),
      );
      return {
        ok: true,
        content: JSON.stringify(items, null, 2),
        language: "json",
        warnings: [],
        conflicts: [],
        counts: { sources: inputs.length, items: items.length },
      };
    }

    const policy = jsonConflictPolicy(options);
    let value = sanitizeJsonValue(parsed[0].value);
    const conflicts = new Set<string>();
    for (const source of parsed.slice(1)) {
      const merged = deepMergeJsonValues(value, source.value, policy);
      value = merged.value;
      merged.conflicts.forEach((path) => conflicts.add(path));
    }
    const conflictPaths = [...conflicts];
    if (policy === "stop" && conflictPaths.length > 0) {
      return invalid(
        "json_conflicts",
        `${conflictPaths.length} JSON conflict${conflictPaths.length === 1 ? "" : "s"} found. Choose which tab should win or edit the sources.`,
        conflictPaths,
      );
    }

    return {
      ok: true,
      content: JSON.stringify(value, null, 2),
      language: "json",
      warnings: [],
      conflicts: conflictPaths,
      counts: {
        sources: inputs.length,
        keys: Object.keys(value as Record<string, unknown>).length,
        conflicts: conflictPaths.length,
      },
    };
  },
};
