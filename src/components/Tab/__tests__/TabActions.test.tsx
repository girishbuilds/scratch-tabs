import { fireEvent, render, screen } from "@testing-library/react";
import { TabActions } from "../TabActions";

const mockHandleNewTab = jest.fn();
const mockHandleNewTabFromPaste = jest.fn();
const mockHandleNewCanvas = jest.fn();

jest.mock("../../../stores", () => ({
  useRootStore: () => ({
    handleNewTab: mockHandleNewTab,
    handleNewTabFromPaste: mockHandleNewTabFromPaste,
    handleNewCanvas: mockHandleNewCanvas,
  }),
}));

jest.mock("../../../features/scratchpad", () => ({
  ScratchToggleButton: () => <button data-testid="icon-scratch" />,
}));

describe("TabActions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("hides the Scratch toggle unless asked to show it", () => {
    render(<TabActions onShowTabletSelector={jest.fn()} />);
    expect(screen.queryByTestId("icon-scratch")).not.toBeInTheDocument();
  });

  it("shows the Scratch toggle when showScratch is set, on either side", () => {
    const { rerender } = render(<TabActions showScratch onShowTabletSelector={jest.fn()} />);
    expect(screen.getByTestId("icon-scratch")).toBeVisible();
    rerender(<TabActions side="right" showScratch onShowTabletSelector={jest.fn()} />);
    expect(screen.getByTestId("icon-scratch")).toBeVisible();
  });

  it("renders New Tab, Import from Paste, Canvas, and Developer Tool as top-level buttons", () => {
    const onShowTabletSelector = jest.fn();
    render(<TabActions onShowTabletSelector={onShowTabletSelector} />);

    expect(screen.getByTestId("icon-new-tab")).toBeVisible();
    expect(screen.getByTestId("icon-new-tab-from-clipboard")).toBeVisible();
    expect(screen.getByTestId("icon-new-canvas")).toBeVisible();
    expect(screen.getByTestId("icon-new-tools")).toBeVisible();
    expect(
      screen.queryByTestId("new-document-menu-trigger"),
    ).not.toBeInTheDocument();
  });

  it("creates a new tab directly", () => {
    render(<TabActions onShowTabletSelector={jest.fn()} />);
    fireEvent.click(screen.getByTestId("icon-new-tab"));
    expect(mockHandleNewTab).toHaveBeenCalledWith(false);
  });

  it("imports from paste directly", () => {
    render(<TabActions onShowTabletSelector={jest.fn()} />);
    fireEvent.click(screen.getByTestId("icon-new-tab-from-clipboard"));
    expect(mockHandleNewTabFromPaste).toHaveBeenCalledWith(false);
  });

  it("creates a canvas directly", () => {
    render(<TabActions onShowTabletSelector={jest.fn()} />);
    fireEvent.click(screen.getByTestId("icon-new-canvas"));
    expect(mockHandleNewCanvas).toHaveBeenCalledWith(false);
  });

  it("opens the tablet selector directly", () => {
    const onShowTabletSelector = jest.fn();
    render(<TabActions onShowTabletSelector={onShowTabletSelector} />);
    fireEvent.click(screen.getByTestId("icon-new-tools"));
    expect(onShowTabletSelector).toHaveBeenCalledTimes(1);
  });

  it("passes the right side flag through to store actions", () => {
    render(<TabActions side="right" onShowTabletSelector={jest.fn()} />);
    fireEvent.click(screen.getByTestId("icon-new-tab"));
    fireEvent.click(screen.getByTestId("icon-new-tab-from-clipboard"));
    fireEvent.click(screen.getByTestId("icon-new-canvas"));

    expect(mockHandleNewTab).toHaveBeenCalledWith(true);
    expect(mockHandleNewTabFromPaste).toHaveBeenCalledWith(true);
    expect(mockHandleNewCanvas).toHaveBeenCalledWith(true);
  });
});
