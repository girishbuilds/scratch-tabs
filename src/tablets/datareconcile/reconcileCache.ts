import { ReconcileInput, ReconcileResponse } from "./types";

export interface ReconcileCache {
  get(input: ReconcileInput): ReconcileResponse | undefined;
  set(input: ReconcileInput, response: ReconcileResponse): void;
  clear(): void;
}

export const isSameInput = (x: ReconcileInput, y: ReconcileInput): boolean =>
  x.a === y.a && x.b === y.b && JSON.stringify(x.options) === JSON.stringify(y.options);

/** Small least-recently-used cache of finished comparisons, so revisiting a tab does not recompute. */
export function createReconcileCache(limit: number): ReconcileCache {
  let entries: Array<{ input: ReconcileInput; response: ReconcileResponse }> = [];
  return {
    get(input) {
      const hit = entries.find((entry) => isSameInput(entry.input, input));
      if (!hit) return undefined;
      entries = [...entries.filter((entry) => entry !== hit), hit];
      return hit.response;
    },
    set(input, response) {
      entries = [...entries.filter((entry) => !isSameInput(entry.input, input)), { input, response }].slice(-limit);
    },
    clear() {
      entries = [];
    },
  };
}
