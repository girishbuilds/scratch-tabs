import type { ScratchListItem } from "../types";

/**
 * Search runs over the secret-free view models only. Secret values are never
 * decrypted for search, so searching for a secret finds nothing by design.
 */
export function getSearchableText(item: ScratchListItem): string {
  if (item.kind === "unreadable") return "";
  return item.segments
    .map((segment) => (segment.type === "text" ? segment.text : ""))
    .join(" ");
}

export function filterEntries(
  items: readonly ScratchListItem[],
  query: string,
): ScratchListItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) => getSearchableText(item).toLowerCase().includes(needle));
}
