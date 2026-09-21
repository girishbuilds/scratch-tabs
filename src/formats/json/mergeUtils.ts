export type JsonConflictPolicy = "stop" | "later" | "earlier";

export interface JsonDeepMergeResult {
  value: unknown;
  conflicts: string[];
}

const unsafeJsonObjectKeys = new Set(["__proto__", "constructor", "prototype"]);

export const isSafeJsonObjectKey = (key: string): boolean =>
  !unsafeJsonObjectKeys.has(key);

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const sanitizeJsonValue = (value: unknown): unknown => {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeJsonValue);

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (isSafeJsonObjectKey(key)) {
      result[key] = sanitizeJsonValue(value[key]);
    }
  }
  return result;
};

const jsonValuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => jsonValuesEqual(value, right[index]))
    );
  }
  if (isJsonObject(left) && isJsonObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          jsonValuesEqual(left[key], right[key]),
      )
    );
  }
  return false;
};

const appendJsonPath = (path: string, key: string): string =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;

/**
 * Deep-merges JSON values without mutating either input. Unsafe object keys are
 * omitted here so both the pipeline operation and tab merge use one policy.
 */
export const deepMergeJsonValues = (
  earlier: unknown,
  later: unknown,
  policy: JsonConflictPolicy = "later",
  path = "$",
): JsonDeepMergeResult => {
  if (isJsonObject(earlier) && isJsonObject(later)) {
    const value: Record<string, unknown> = {};
    const conflicts: string[] = [];

    for (const key of Object.keys(earlier)) {
      if (isSafeJsonObjectKey(key)) {
        value[key] = sanitizeJsonValue(earlier[key]);
      }
    }

    for (const key of Object.keys(later)) {
      if (!isSafeJsonObjectKey(key)) continue;
      if (!Object.prototype.hasOwnProperty.call(earlier, key)) {
        value[key] = sanitizeJsonValue(later[key]);
        continue;
      }
      const merged = deepMergeJsonValues(
        earlier[key],
        later[key],
        policy,
        appendJsonPath(path, key),
      );
      value[key] = merged.value;
      conflicts.push(...merged.conflicts);
    }
    return { value, conflicts };
  }

  const sanitizedEarlier = sanitizeJsonValue(earlier);
  const sanitizedLater = sanitizeJsonValue(later);
  if (jsonValuesEqual(sanitizedEarlier, sanitizedLater)) {
    return { value: sanitizedEarlier, conflicts: [] };
  }
  return {
    value: policy === "later" ? sanitizedLater : sanitizedEarlier,
    conflicts: [path],
  };
};
