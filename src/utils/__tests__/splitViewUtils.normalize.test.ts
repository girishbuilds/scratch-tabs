import {
  applyCombinedTabOrder,
  normalizeSplitViewTabLists,
} from "../splitViewUtils";

const sv = (over: Record<string, unknown> = {}) => ({
  isSplit: true,
  leftTabs: ["a"],
  rightTabs: ["b"],
  activeLeftTabId: "a" as string | null,
  activeRightTabId: "b" as string | null,
  leftTabHistory: ["a"],
  rightTabHistory: ["b"],
  ...over,
});

describe("normalizeSplitViewTabLists", () => {
  it("returns the same object when already valid", () => {
    const input = sv();
    const { value, changed } = normalizeSplitViewTabLists(input);
    expect(changed).toBe(false);
    expect(value).toBe(input);
  });

  it("keeps the right-pane entry and drops the left duplicate", () => {
    const { value, changed } = normalizeSplitViewTabLists(
      sv({ leftTabs: ["b", "a", "b"], rightTabs: ["b"] }),
    );
    expect(changed).toBe(true);
    expect(value.leftTabs).toEqual(["a"]);
    expect(value.rightTabs).toEqual(["b"]);
  });

  it("keeps the left pane populated when every left id is also on the right", () => {
    const { value } = normalizeSplitViewTabLists(
      sv({ leftTabs: ["b"], rightTabs: ["b", "c"], activeLeftTabId: "b" }),
    );
    expect(value.leftTabs).toEqual(["b"]);
    expect(value.rightTabs).toEqual(["c"]);
  });

  it("removes duplicates inside a single pane", () => {
    const { value } = normalizeSplitViewTabLists(
      sv({ leftTabs: ["a", "x", "a"], rightTabs: ["b", "b"] }),
    );
    expect(value.leftTabs).toEqual(["a", "x"]);
    expect(value.rightTabs).toEqual(["b"]);
  });

  it("repairs active ids and histories that point at the removed entry", () => {
    const { value } = normalizeSplitViewTabLists(
      sv({
        leftTabs: ["b", "a"],
        rightTabs: ["b"],
        activeLeftTabId: "b",
        leftTabHistory: ["b", "a"],
      }),
    );
    expect(value.activeLeftTabId).toBe("a");
    expect(value.leftTabHistory).toEqual(["a"]);
    expect(value.activeRightTabId).toBe("b");
  });

  it("tolerates records with missing histories", () => {
    const { value, changed } = normalizeSplitViewTabLists({
      isSplit: true,
      leftTabs: ["b", "a"],
      rightTabs: ["b"],
      activeLeftTabId: "a",
      activeRightTabId: "b",
    });
    expect(changed).toBe(true);
    expect(value.leftTabHistory).toBeUndefined();
  });
});

describe("applyCombinedTabOrder", () => {
  it("reorders a non-split workspace freely", () => {
    expect(
      applyCombinedTabOrder({ leftTabs: ["a", "b", "c"], rightTabs: [] }, [
        "c",
        "a",
        "b",
      ]),
    ).toEqual({ leftTabs: ["c", "a", "b"], rightTabs: [] });
  });

  it("never moves a tab across panes (the reported bug)", () => {
    expect(
      applyCombinedTabOrder({ leftTabs: ["a"], rightTabs: ["b"] }, ["b", "a"]),
    ).toEqual({ leftTabs: ["a"], rightTabs: ["b"] });
  });

  it("reorders within each pane of a split workspace", () => {
    expect(
      applyCombinedTabOrder(
        { leftTabs: ["a", "b"], rightTabs: ["c", "d"] },
        ["b", "a", "d", "c"],
      ),
    ).toEqual({ leftTabs: ["b", "a"], rightTabs: ["d", "c"] });
  });

  it("ignores stale ids and keeps ids missing from the new order", () => {
    expect(
      applyCombinedTabOrder({ leftTabs: ["a", "b"], rightTabs: ["c"] }, [
        "ghost",
        "b",
      ]),
    ).toEqual({ leftTabs: ["b", "a"], rightTabs: ["c"] });
  });
});
