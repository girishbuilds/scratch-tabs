/**
 * Pure selection helpers for the Scratch list. Kept free of React so the
 * rules (ranges, pruning, tri-state) are easy to test.
 */

export type SelectionState = "none" | "some" | "all";

/** Ids from `from` to `to` inclusive, in list order, whichever way round they are. */
export function idsBetween(ordered: readonly string[], from: string, to: string): string[] {
  const a = ordered.indexOf(from);
  const b = ordered.indexOf(to);
  if (a === -1 || b === -1) return b === -1 ? [] : [to];
  return ordered.slice(Math.min(a, b), Math.max(a, b) + 1);
}

/** Keeps only ids that are still in `allowed`. Returns the same set if nothing changed. */
export function retainIds(selected: ReadonlySet<string>, allowed: readonly string[]): ReadonlySet<string> {
  const allow = new Set(allowed);
  const kept = [...selected].filter((id) => allow.has(id));
  return kept.length === selected.size ? selected : new Set(kept);
}

export function selectionState(selectedCount: number, total: number): SelectionState {
  if (selectedCount === 0 || total === 0) return "none";
  return selectedCount >= total ? "all" : "some";
}
