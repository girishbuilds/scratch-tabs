import { idsBetween, retainIds, selectionState } from "../services/entrySelection";

describe("entrySelection", () => {
  describe("idsBetween", () => {
    const list = ["a", "b", "c", "d", "e"];

    it("is inclusive and in list order", () => {
      expect(idsBetween(list, "b", "d")).toEqual(["b", "c", "d"]);
    });

    it("works backwards", () => {
      expect(idsBetween(list, "d", "b")).toEqual(["b", "c", "d"]);
    });

    it("returns the one id when both ends are the same", () => {
      expect(idsBetween(list, "c", "c")).toEqual(["c"]);
    });

    it("falls back to the target when the anchor is no longer shown", () => {
      expect(idsBetween(list, "gone", "c")).toEqual(["c"]);
    });

    it("returns nothing when the target is not shown", () => {
      expect(idsBetween(list, "a", "gone")).toEqual([]);
    });
  });

  describe("retainIds", () => {
    it("drops ids that are no longer allowed", () => {
      expect([...retainIds(new Set(["a", "b", "c"]), ["a", "c"])]).toEqual(["a", "c"]);
    });

    it("returns the same set when nothing is dropped, so state does not churn", () => {
      const selected = new Set(["a"]);
      expect(retainIds(selected, ["a", "b"])).toBe(selected);
    });
  });

  describe("selectionState", () => {
    it.each([
      [0, 3, "none"],
      [1, 3, "some"],
      [3, 3, "all"],
      [0, 0, "none"],
    ])("%i of %i is %s", (count, total, expected) => {
      expect(selectionState(count, total)).toBe(expected);
    });
  });
});
