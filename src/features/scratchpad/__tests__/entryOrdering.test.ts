import {
  canMove,
  compareEntries,
  moveEntries,
  orderChanges,
  sortEntries,
  type MoveTarget,
} from "../services/entryOrdering";
import type { ScratchListItem } from "../types";

const item = (
  id: string,
  createdAt: number,
  batchIndex = 0,
  pinned = false,
  order?: number,
): ScratchListItem => ({
  id,
  kind: "unreadable",
  createdAt,
  batchIndex,
  pinned,
  order,
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

  describe("hand-placed entries", () => {
    it("orders placed entries by their position, not their age", () => {
      const sorted = sortEntries([item("a", 9, 0, false, 1), item("b", 1, 0, false, 0)]);
      expect(ids(sorted)).toEqual(["b", "a"]);
    });

    it("puts entries that were never placed above placed ones, newest first", () => {
      const sorted = sortEntries([
        item("placed", 1, 0, false, 0),
        item("fresh-old", 5),
        item("fresh-new", 8),
      ]);
      expect(ids(sorted)).toEqual(["fresh-new", "fresh-old", "placed"]);
    });

    it("keeps pinned entries above everything, placed or not", () => {
      const sorted = sortEntries([item("fresh", 9), item("pinned", 1, 0, true, 5)]);
      expect(ids(sorted)).toEqual(["pinned", "fresh"]);
    });

    it("orders pinned entries by position", () => {
      const sorted = sortEntries([item("p1", 9, 0, true, 1), item("p2", 1, 0, true, 0)]);
      expect(ids(sorted)).toEqual(["p2", "p1"]);
    });

    it("falls back to age when two entries share a position", () => {
      expect(ids(sortEntries([item("old", 1, 0, false, 3), item("new", 2, 0, false, 3)]))).toEqual(["new", "old"]);
    });
  });
});

const list = (...entries: [string, boolean?][]): ScratchListItem[] =>
  entries.map(([id, pinned], i) => item(id, 100 - i, 0, pinned ?? false, i));

describe("moveEntries", () => {
  const abcde = list(["a"], ["b"], ["c"], ["d"], ["e"]);
  const move = (items: ScratchListItem[], chosen: string[], target: MoveTarget) =>
    moveEntries(items, chosen, target).join("");

  it.each([
    [["c"], "top", "cabde"],
    [["c"], "up", "acbde"],
    [["c"], "down", "abdce"],
    [["c"], "bottom", "abdec"],
  ] as const)("moves %j %s", (chosen, target, expected) => {
    expect(move(abcde, [...chosen], target)).toBe(expected);
  });

  it("leaves the top entry where it is when moved up or to the top", () => {
    expect(move(abcde, ["a"], "up")).toBe("abcde");
    expect(move(abcde, ["a"], "top")).toBe("abcde");
  });

  it("leaves the bottom entry where it is when moved down or to the bottom", () => {
    expect(move(abcde, ["e"], "down")).toBe("abcde");
    expect(move(abcde, ["e"], "bottom")).toBe("abcde");
  });

  describe("several at once", () => {
    it("moves them to the top keeping their relative order, however they were chosen", () => {
      expect(move(abcde, ["d", "b"], "top")).toBe("bdace");
    });

    it("moves them to the bottom keeping their relative order", () => {
      expect(move(abcde, ["d", "b"], "bottom")).toBe("acebd");
    });

    it("moves a contiguous block up one step", () => {
      expect(move(abcde, ["c", "d"], "up")).toBe("acdbe");
    });

    it("moves a contiguous block down one step", () => {
      expect(move(abcde, ["b", "c"], "down")).toBe("adbce");
    });

    it("moves a scattered selection up, each past its neighbour", () => {
      expect(move(abcde, ["b", "d"], "up")).toBe("badce");
    });

    it("stops entries at the edge but still moves the others", () => {
      expect(move(abcde, ["a", "c"], "up")).toBe("acbde");
      expect(move(abcde, ["c", "e"], "down")).toBe("abdce");
    });

    it("keeps a block that already touches the edge in place", () => {
      expect(move(abcde, ["a", "b"], "up")).toBe("abcde");
      expect(move(abcde, ["d", "e"], "down")).toBe("abcde");
    });
  });

  describe("pinned groups", () => {
    const mixed = list(["p1", true], ["p2", true], ["p3", true], ["u1"], ["u2"], ["u3"]);

    it("moves within the entry's own group", () => {
      expect(move(mixed, ["p3"], "top")).toBe("p3p1p2u1u2u3");
      expect(move(mixed, ["u3"], "top")).toBe("p1p2p3u3u1u2");
    });

    it("never moves an unpinned entry above a pinned one", () => {
      expect(move(mixed, ["u1"], "up")).toBe("p1p2p3u1u2u3");
    });

    it("never moves a pinned entry below an unpinned one", () => {
      expect(move(mixed, ["p3"], "down")).toBe("p1p2p3u1u2u3");
      expect(move(mixed, ["p1"], "bottom")).toBe("p2p3p1u1u2u3");
    });

    it("moves a selection that spans both groups within each", () => {
      expect(move(mixed, ["p2", "u2"], "top")).toBe("p2p1p3u2u1u3");
    });
  });

  it("returns the list unchanged for no ids or unknown ids", () => {
    expect(move(abcde, [], "top")).toBe("abcde");
    expect(move(abcde, ["zzz"], "bottom")).toBe("abcde");
  });
});

describe("canMove", () => {
  const abc = list(["a"], ["b"], ["c"]);

  it("is false when nothing would change", () => {
    expect(canMove(abc, ["a"], "up")).toBe(false);
    expect(canMove(abc, ["a"], "top")).toBe(false);
    expect(canMove(abc, ["c"], "down")).toBe(false);
    expect(canMove(abc, ["c"], "bottom")).toBe(false);
    expect(canMove(abc, ["a", "b"], "up")).toBe(false);
  });

  it("is true when something would move", () => {
    expect(canMove(abc, ["b"], "up")).toBe(true);
    expect(canMove(abc, ["b"], "bottom")).toBe(true);
    expect(canMove(abc, ["a", "c"], "down")).toBe(true);
  });

  it("is false with nothing chosen", () => {
    expect(canMove(abc, [], "top")).toBe(false);
  });

  it("is false for an entry that is not in the list", () => {
    expect(canMove(abc, ["zzz"], "top")).toBe(false);
  });
});

describe("orderChanges", () => {
  it("lists only the entries whose position changes", () => {
    const items = list(["a"], ["b"], ["c"]);
    expect(orderChanges(items, ["b", "a", "c"])).toEqual([
      { id: "b", order: 0 },
      { id: "a", order: 1 },
    ]);
  });

  it("numbers every entry the first time, since none has a position yet", () => {
    const fresh = [item("a", 3), item("b", 2)];
    expect(orderChanges(fresh, ["a", "b"])).toEqual([
      { id: "a", order: 0 },
      { id: "b", order: 1 },
    ]);
  });

  it("is empty when positions already match", () => {
    expect(orderChanges(list(["a"], ["b"]), ["a", "b"])).toEqual([]);
  });
});
