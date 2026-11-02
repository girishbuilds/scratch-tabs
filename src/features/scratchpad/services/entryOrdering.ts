import type { ScratchListItem } from "../types";

/** Pinned entries first, then newest first, then the order of the original paste. */
export const compareEntries = (a: ScratchListItem, b: ScratchListItem): number =>
  Number(b.pinned) - Number(a.pinned) ||
  b.createdAt - a.createdAt ||
  a.batchIndex - b.batchIndex;

export const sortEntries = (items: readonly ScratchListItem[]): ScratchListItem[] =>
  [...items].sort(compareEntries);
