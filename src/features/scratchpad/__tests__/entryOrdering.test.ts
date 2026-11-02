import { compareEntries, sortEntries } from "../services/entryOrdering";
import type { ScratchListItem } from "../types";

const item = (id: string, createdAt: number, batchIndex = 0, pinned = false): ScratchListItem => ({
  id,
  kind: "unreadable",
  createdAt,
  batchIndex,
  pinned,
});

const ids = (items: ScratchListItem[]) => items.map((i) => i.id);

describe("entry ordering", () => {
  it("puts newest first", () => {
    expect(ids(sortEntries([item("old", 1), item("new", 2)]))).toEqual(["new", "old"]);
  });

  it("keeps the order of a paste within the same moment", () => {
    expect(ids(sortEntries([item("b", 5, 1), item("a", 5, 0)]))).toEqual(["a", "b"]);
  });

  it("puts pinned entries above newer unpinned ones", () => {
    const sorted = sortEntries([item("new", 9), item("pinned-old", 1, 0, true)]);
    expect(ids(sorted)).toEqual(["pinned-old", "new"]);
  });

  it("orders pinned entries among themselves by recency", () => {
    const sorted = sortEntries([item("p1", 1, 0, true), item("p2", 2, 0, true)]);
    expect(ids(sorted)).toEqual(["p2", "p1"]);
  });

  it("does not mutate its input", () => {
    const input = [item("a", 1), item("b", 2)];
    sortEntries(input);
    expect(ids(input)).toEqual(["a", "b"]);
  });

  it("compares equal entries as equal", () => {
    expect(compareEntries(item("a", 1), item("b", 1))).toBe(0);
  });
});
