import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchSelectionBar } from "../components/ScratchSelectionBar";

function renderBar(props: Partial<React.ComponentProps<typeof ScratchSelectionBar>> = {}) {
  const handlers = {
    onMove: jest.fn(),
    onToggleAll: jest.fn(),
    onTogglePin: jest.fn(),
    onDelete: jest.fn(),
    onDone: jest.fn(),
  };
  render(
    <ScratchSelectionBar
      count={2}
      state="some"
      allPinned={false}
      canMove={() => true}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("ScratchSelectionBar", () => {
  it("shows how many entries are selected", () => {
    renderBar({ count: 3 });
    expect(screen.getByTestId("scratch-selected-count")).toHaveTextContent("3 selected");
  });

  it("prompts to pick entries when none are selected and disables the actions", () => {
    renderBar({ count: 0, state: "none" });
    expect(screen.getByTestId("scratch-selected-count")).toHaveTextContent("Select entries");
    expect(screen.getByTestId("scratch-bulk-pin")).toBeDisabled();
    expect(screen.getByTestId("scratch-bulk-delete")).toBeDisabled();
  });

  it("shows select-all as indeterminate for a partial selection", () => {
    renderBar({ state: "some" });
    const box = screen.getByTestId("scratch-select-all") as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box.checked).toBe(false);
  });

  it("shows select-all as checked when everything is selected", () => {
    renderBar({ state: "all", count: 4 });
    const box = screen.getByTestId("scratch-select-all") as HTMLInputElement;
    expect(box.indeterminate).toBe(false);
    expect(box.checked).toBe(true);
  });

  it("offers Pin, or Unpin when every selected entry is pinned", () => {
    renderBar();
    expect(screen.getByTestId("scratch-bulk-pin")).toHaveAttribute("aria-label", "Pin selected");
  });

  it("switches to Unpin when everything selected is pinned", () => {
    renderBar({ allPinned: true });
    expect(screen.getByTestId("scratch-bulk-pin")).toHaveAttribute("aria-label", "Unpin selected");
  });

  it("wires every control to its handler", () => {
    const h = renderBar();
    fireEvent.click(screen.getByTestId("scratch-select-all"));
    fireEvent.click(screen.getByTestId("scratch-bulk-pin"));
    fireEvent.click(screen.getByTestId("scratch-bulk-delete"));
    fireEvent.click(screen.getByTestId("scratch-select-done"));
    expect(h.onToggleAll).toHaveBeenCalledTimes(1);
    expect(h.onTogglePin).toHaveBeenCalledTimes(1);
    expect(h.onDelete).toHaveBeenCalledTimes(1);
    expect(h.onDone).toHaveBeenCalledTimes(1);
  });

  describe("move", () => {
    it("moves the selection to the chosen place", () => {
      const h = renderBar();
      fireEvent.click(screen.getByTestId("scratch-bulk-move"));
      fireEvent.click(screen.getByTestId("scratch-bulk-move-top"));
      expect(h.onMove).toHaveBeenCalledWith("top");
    });

    it("disables the moves that would change nothing", () => {
      renderBar({ canMove: (target) => target !== "up" });
      fireEvent.click(screen.getByTestId("scratch-bulk-move"));
      expect(screen.getByTestId("scratch-bulk-move-up")).toBeDisabled();
      expect(screen.getByTestId("scratch-bulk-move-down")).toBeEnabled();
    });

    it("is disabled until something is selected", () => {
      renderBar({ count: 0, state: "none" });
      expect(screen.getByTestId("scratch-bulk-move")).toBeDisabled();
      expect(screen.getByTestId("scratch-bulk-move")).toHaveAttribute("title", "Select entries to move");
    });

    it("is disabled with the given reason, e.g. while searching", () => {
      renderBar({ moveDisabledReason: "Clear the search to reorder" });
      expect(screen.getByTestId("scratch-bulk-move")).toBeDisabled();
      expect(screen.getByTestId("scratch-bulk-move")).toHaveAttribute("title", "Clear the search to reorder");
    });
  });
});
