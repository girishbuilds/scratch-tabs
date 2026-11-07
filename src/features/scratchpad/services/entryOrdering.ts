import type { ScratchListItem } from "../types";

export type MoveTarget = "top" | "up" | "down" | "bottom";

/**
 * Pinned entries first. Then entries that have never been placed by hand
 * (newest first, then the order of the original paste), then the hand-placed
 * ones in their chosen order. Unplaced entries sort first so a new paste lands
 * at the top even after the list has been rearranged.
 */
export const compareEntries = (a: ScratchListItem, b: ScratchListItem): number => {
  const aPlaced = a.order !== undefined;
  const bPlaced = b.order !== undefined;
  return (
    Number(b.pinned) - Number(a.pinned) ||
    Number(aPlaced) - Number(bPlaced) ||
    (aPlaced && bPlaced ? a.order! - b.order! : 0) ||
    b.createdAt - a.createdAt ||
    a.batchIndex - b.batchIndex
  );
};

export const sortEntries = (items: readonly ScratchListItem[]): ScratchListItem[] =>
  [...items].sort(compareEntries);

/** Moves the chosen ids within one sequence. Chosen ids keep their relative order. */
function moveWithin(sequence: string[], chosen: ReadonlySet<string>, target: MoveTarget): string[] {
  const picked = sequence.filter((id) => chosen.has(id));
  if (picked.length === 0) return sequence;
  const rest = sequence.filter((id) => !chosen.has(id));
  if (target === "top") return [...picked, ...rest];
  if (target === "bottom") return [...rest, ...picked];

  // One step: every chosen entry swaps past the unchosen one next to it. A chosen
  // block already touching the edge stays where it is.
  const out = [...sequence];
  if (target === "up") {
    for (let i = 1; i < out.length; i++) {
      if (chosen.has(out[i]) && !chosen.has(out[i - 1])) [out[i - 1], out[i]] = [out[i], out[i - 1]];
    }
  } else {
    for (let i = out.length - 2; i >= 0; i--) {
      if (chosen.has(out[i]) && !chosen.has(out[i + 1])) [out[i], out[i + 1]] = [out[i + 1], out[i]];
    }
  }
  return out;
}

/**
 * The whole list's ids after moving `ids`. `items` must already be in display
 * order. Pinned entries stay above unpinned ones, so each group is moved within
 * itself: "top" means the top of the group the entry is in.
 */
export function moveEntries(
  items: readonly ScratchListItem[],
  ids: readonly string[],
  target: MoveTarget,
): string[] {
  const chosen = new Set(ids);
  const pinned = items.filter((item) => item.pinned).map((item) => item.id);
  const unpinned = items.filter((item) => !item.pinned).map((item) => item.id);
  return [...moveWithin(pinned, chosen, target), ...moveWithin(unpinned, chosen, target)];
}

/** Whether moving `ids` would change the list at all (false for e.g. "up" on the top entry). */
export function canMove(
  items: readonly ScratchListItem[],
  ids: readonly string[],
  target: MoveTarget,
): boolean {
  if (ids.length === 0) return false;
  const next = moveEntries(items, ids, target);
  return next.some((id, index) => id !== items[index].id);
}

/** The entries whose stored position must change for the list to read as `orderedIds`. */
export function orderChanges(
  items: readonly ScratchListItem[],
  orderedIds: readonly string[],
): { id: string; order: number }[] {
  const current = new Map(items.map((item) => [item.id, item.order]));
  return orderedIds.flatMap((id, order) => (current.get(id) === order ? [] : [{ id, order }]));
}
