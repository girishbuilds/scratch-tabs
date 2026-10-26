import type { SplitViewState } from "../../../types";
import { findPreviousTabId, getSideView } from "../splitViewSide";

const splitView = {
  activeLeftTabId: "l2",
  activeRightTabId: "r1",
  leftTabs: ["l1", "l2"],
  rightTabs: ["r1"],
  leftTabHistory: ["l1", "l2"],
  rightTabHistory: ["r1"],
} as SplitViewState;

describe("getSideView", () => {
  it("reads the left side and treats the right active tab as the other", () => {
    expect(getSideView(splitView, "left")).toEqual({
      activeTabId: "l2",
      otherActiveTabId: "r1",
      tabs: ["l1", "l2"],
      history: ["l1", "l2"],
    });
  });

  it("reads the right side and treats the left active tab as the other", () => {
    expect(getSideView(splitView, "right")).toEqual({
      activeTabId: "r1",
      otherActiveTabId: "l2",
      tabs: ["r1"],
      history: ["r1"],
    });
  });

  it("defaults missing tab lists to empty arrays", () => {
    const sparse = {
      ...splitView,
      leftTabs: undefined,
      leftTabHistory: undefined,
    } as unknown as SplitViewState;

    expect(getSideView(sparse, "left")).toMatchObject({ tabs: [], history: [] });
  });
});

describe("findPreviousTabId", () => {
  const view = (history: string[]) => ({
    activeTabId: "b",
    otherActiveTabId: null,
    tabs: [],
    history,
  });

  it("returns the first history entry that is not the current tab", () => {
    expect(findPreviousTabId(view(["a", "b"]), "b")).toBe("a");
  });

  it("returns undefined when the history only holds the current tab", () => {
    expect(findPreviousTabId(view(["b"]), "b")).toBeUndefined();
  });

  it("returns undefined for an empty history", () => {
    expect(findPreviousTabId(view([]), "b")).toBeUndefined();
  });
});
