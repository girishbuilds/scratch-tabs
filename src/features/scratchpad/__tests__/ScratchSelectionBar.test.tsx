import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScratchSelectionBar } from "../components/ScratchSelectionBar";

function renderBar(props: Partial<React.ComponentProps<typeof ScratchSelectionBar>> = {}) {
  const handlers = {
    onMove: jest.fn(),
    onCopy: jest.fn().mockResolvedValue(true),
    onOpenInNewTab: jest.fn(),
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
    expect(screen.getByTestId("scratch-bulk-copy")).toBeDisabled();
    expect(screen.getByTestId("scratch-bulk-open-tab")).toBeDisabled();
  });

  it("opens the selection in a new tab", () => {
    const h = renderBar();
    fireEvent.click(screen.getByTestId("scratch-bulk-open-tab"));
    expect(h.onOpenInNewTab).toHaveBeenCalledTimes(1);
  });

  it("hides open-in-new-tab when it is not offered, e.g. while presenting", () => {
    renderBar({ onOpenInNewTab: undefined });
    expect(screen.queryByTestId("scratch-bulk-open-tab")).toBeNull();
  });

  it("copies the selection and ticks once it is on the clipboard", async () => {
    const h = renderBar();
    fireEvent.click(screen.getByTestId("scratch-bulk-copy"));
    expect(h.onCopy).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId("scratch-bulk-copy").querySelector(".text-success")).not.toBeNull(),
    );
  });

  it("does not tick when the copy fails", async () => {
    const onCopy = jest.fn().mockResolvedValue(false);
    renderBar({ onCopy });
    fireEvent.click(screen.getByTestId("scratch-bulk-copy"));
    await waitFor(() => expect(onCopy).toHaveBeenCalled());
    expect(screen.getByTestId("scratch-bulk-copy").querySelector(".text-success")).toBeNull();
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
