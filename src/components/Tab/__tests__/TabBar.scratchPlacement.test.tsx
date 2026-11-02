/**
 * The Scratch toggle is a window-level control, so it must appear exactly once:
 * on the only pane when not split, and on the right pane when split (next to
 * the hamburger menu).
 */
import { render } from "@testing-library/react";
import React from "react";
import { TabBar } from "../TabBar";
import { useTabsStore } from "../../../stores/tabsStore";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import { useRootStore } from "../../../stores";
import { useWorkspaceStore } from "../../../stores/workspaceStore";

jest.mock("../../../stores/tabsStore");
jest.mock("../../../stores/splitViewStore");
jest.mock("../../../stores");
jest.mock("../../../stores/workspaceStore");

const mockTabActions = jest.fn();
jest.mock("../TabActions", () => ({
  TabActions: (props: { side?: string; showScratch?: boolean }) => {
    mockTabActions(props);
    return <div data-testid={`tab-actions-${props.side}`} />;
  },
}));
jest.mock("../TabContextMenu", () => ({ TabContextMenu: () => <div /> }));
jest.mock("../TabTooltip", () => ({ TabTooltip: () => <div /> }));
jest.mock("../../ToolSelector", () => ({ ToolSelectorModal: () => <div /> }));
jest.mock("../HamburgerMenu", () => ({
  HamburgerMenu: () => <div data-testid="hamburger" />,
}));
jest.mock("../SortableTabList", () => ({ SortableTabList: () => <div /> }));

const splitView = (isSplit: boolean) => ({
  id: "default-split",
  isSplit,
  leftTabs: ["1"],
  rightTabs: isSplit ? ["2"] : [],
  activeLeftTabId: "1",
  activeRightTabId: isSplit ? "2" : null,
  activeSide: "left" as const,
  splitRatio: 0.5,
  leftTabHistory: [],
  rightTabHistory: [],
  workspaceId: "default",
});

const renderBar = (side: "left" | "right", isSplit: boolean) => {
  (useSplitViewStore as unknown as jest.Mock).mockReturnValue({
    splitView: splitView(isSplit),
    setLeftScrollPosition: jest.fn(),
    setRightScrollPosition: jest.fn(),
  });
  return render(
    <TabBar side={side} onOpenDiffModal={jest.fn()} onOpenSummaryModal={jest.fn()} />,
  );
};

const lastShowScratch = () => mockTabActions.mock.calls.at(-1)?.[0].showScratch;

describe("TabBar Scratch toggle placement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTabsStore as unknown as jest.Mock).mockReturnValue({ tabs: [] });
    (useRootStore as unknown as jest.Mock).mockReturnValue({
      removeTab: jest.fn(),
      updateTabTitle: jest.fn(),
      setActiveLeftTab: jest.fn(),
      setActiveRightTab: jest.fn(),
      addTab: jest.fn(),
      canAddNewTab: jest.fn().mockReturnValue(true),
      reorderTabs: jest.fn(),
    });
    (useWorkspaceStore as unknown as jest.Mock).mockReturnValue({ activeWorkspaceId: "default" });
  });

  it("shows it on the only pane when not split", () => {
    const { queryByTestId } = renderBar("left", false);
    expect(lastShowScratch()).toBe(true);
    expect(queryByTestId("hamburger")).not.toBeNull();
  });

  it("does not show it on the left pane when split", () => {
    const { queryByTestId } = renderBar("left", true);
    expect(lastShowScratch()).toBe(false);
    expect(queryByTestId("hamburger")).toBeNull();
  });

  it("shows it on the right pane when split, alongside the hamburger menu", () => {
    const { queryByTestId } = renderBar("right", true);
    expect(lastShowScratch()).toBe(true);
    expect(queryByTestId("hamburger")).not.toBeNull();
  });
});
