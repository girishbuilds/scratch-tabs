import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchEntryRow } from "../components/ScratchEntryRow";
import type { ScratchListItem } from "../types";
import { createActions, plainEntry } from "../testing/entryFixtures";

function renderRow(item: ScratchListItem, presenting = false) {
  const actions = createActions();
  render(
    <ul>
      <ScratchEntryRow item={item} actions={actions} presenting={presenting} />
    </ul>,
  );
  return actions;
}

describe("ScratchEntryRow", () => {
  it("exposes the entry kind and pin state to tests and assistive tech", () => {
    renderRow({ ...plainEntry, pinned: true });
    const row = screen.getByTestId("scratch-entry");
    expect(row).toHaveAttribute("data-kind", "command");
    expect(row).toHaveAttribute("data-pinned", "true");
  });

  describe("toolbar", () => {
    it("is hidden at rest and revealed on hover or focus", () => {
      renderRow(plainEntry);
      const toolbar = screen.getByTestId("scratch-toolbar");
      expect(toolbar).toHaveClass("opacity-0", "group-hover:opacity-100", "focus-within:opacity-100");
    });

    it("shows Mask text and Delete as direct buttons", () => {
      renderRow(plainEntry);
      expect(screen.getByTestId("scratch-delete")).toBeInTheDocument();
      expect(screen.getByTestId("scratch-mask-mode")).toBeInTheDocument();
      expect(screen.queryByTestId("scratch-more")).toBeNull();
    });
  });

  describe("delete", () => {
    it("requires a second click", () => {
      const actions = renderRow(plainEntry);
      const item = screen.getByTestId("scratch-delete");
      fireEvent.click(item);
      expect(actions.remove).not.toHaveBeenCalled();
      expect(item).toHaveAttribute("aria-label", "Confirm delete");
      expect(item).toHaveAttribute("title", "Click again to delete");
      fireEvent.click(item);
      expect(actions.remove).toHaveBeenCalledWith("e2");
    });

    it("forgets a pending confirmation when the pointer leaves the toolbar", () => {
      const actions = renderRow(plainEntry);
      fireEvent.click(screen.getByTestId("scratch-delete"));
      fireEvent.mouseLeave(screen.getByTestId("scratch-toolbar"));
      const item = screen.getByTestId("scratch-delete");
      expect(item).toHaveAttribute("aria-label", "Delete entry");
      fireEvent.click(item);
      expect(actions.remove).not.toHaveBeenCalled();
    });
  });

  describe("pinning", () => {
    it("offers to pin an unpinned entry and shows no marker", () => {
      const actions = renderRow(plainEntry);
      const button = screen.getByTestId("scratch-pin");
      expect(button).toHaveAttribute("aria-label", "Pin entry");
      expect(button).toHaveAttribute("aria-pressed", "false");
      expect(screen.queryByTestId("scratch-pinned-marker")).toBeNull();
      fireEvent.click(button);
      expect(actions.togglePin).toHaveBeenCalledWith("e2");
    });

    it("offers to unpin a pinned entry and keeps a marker visible at rest", () => {
      renderRow({ ...plainEntry, pinned: true });
      const button = screen.getByTestId("scratch-pin");
      expect(button).toHaveAttribute("aria-label", "Unpin entry");
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByTestId("scratch-pinned-marker")).toBeInTheDocument();
    });
  });

  describe("unreadable entries", () => {
    const unreadable: ScratchListItem = {
      id: "bad",
      kind: "unreadable",
      createdAt: 1,
      batchIndex: 0,
      pinned: false,
    };

    it("explains why and offers no copy, reveal or mask", () => {
      renderRow(unreadable);
      expect(screen.getByText(/can no longer be decrypted/i)).toBeInTheDocument();
      expect(screen.queryByTestId("scratch-copy")).toBeNull();
      expect(screen.queryByTestId("scratch-reveal")).toBeNull();
      expect(screen.queryByTestId("scratch-mask-mode")).toBeNull();
    });

    it("does not copy when clicked", () => {
      const actions = renderRow(unreadable);
      fireEvent.click(screen.getByTestId("scratch-entry"));
      expect(actions.getCopyText).not.toHaveBeenCalled();
      expect(screen.getByTestId("scratch-entry")).not.toHaveAttribute("title");
    });

    it("can still be pinned and deleted", () => {
      const actions = renderRow(unreadable);
      fireEvent.click(screen.getByTestId("scratch-pin"));
      expect(actions.togglePin).toHaveBeenCalledWith("bad");
      fireEvent.click(screen.getByTestId("scratch-delete"));
      fireEvent.click(screen.getByTestId("scratch-delete"));
      expect(actions.remove).toHaveBeenCalledWith("bad");
    });
  });
});

describe("ScratchEntryRow - long entries", () => {
  const longEntry = (lines: number): ScratchListItem => ({
    ...plainEntry,
    segments: [{ type: "text", text: Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join("\n") }],
  });

  it("does not collapse short entries", () => {
    renderRow(longEntry(5));
    expect(screen.queryByTestId("scratch-expand")).toBeNull();
  });

  it("does not collapse when only one line would be hidden", () => {
    renderRow(longEntry(6));
    expect(screen.queryByTestId("scratch-expand")).toBeNull();
  });

  it("collapses tall entries and expands and collapses on demand", () => {
    renderRow(longEntry(20));
    const toggle = screen.getByTestId("scratch-expand");
    expect(screen.getByTestId("scratch-content")).toHaveAttribute("data-collapsed", "true");
    expect(toggle).toHaveTextContent("Show 15 more lines");
    fireEvent.click(toggle);
    expect(screen.getByTestId("scratch-content")).toHaveAttribute("data-collapsed", "false");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Show less");
    fireEvent.click(toggle);
    expect(screen.getByTestId("scratch-content")).toHaveAttribute("data-collapsed", "true");
  });

  it("does not copy the entry when the toggle is clicked", () => {
    const actions = renderRow(longEntry(20));
    fireEvent.click(screen.getByTestId("scratch-expand"));
    expect(actions.getCopyText).not.toHaveBeenCalled();
  });
});
