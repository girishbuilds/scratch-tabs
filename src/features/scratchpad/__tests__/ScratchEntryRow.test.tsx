import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScratchEntryRow } from "../components/ScratchEntryRow";
import type { RowSelection } from "../components/ScratchEntryShell";
import type { ScratchListItem } from "../types";
import * as clipboard from "../utils/copyToClipboard";
import { createActions, plainEntry } from "../testing/entryFixtures";

function renderRow(
  item: ScratchListItem,
  presenting = false,
  selection?: RowSelection,
  move?: React.ComponentProps<typeof ScratchEntryRow>["move"],
) {
  const actions = createActions();
  render(
    <ul>
      <ScratchEntryRow item={item} actions={actions} presenting={presenting} selection={selection} move={move} />
    </ul>,
  );
  return actions;
}

// Spies on the clipboard must not leak their call history into the next test.
afterEach(() => jest.restoreAllMocks());

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

  describe("kind icon", () => {
    it.each([
      [plainEntry, "command"],
      [{ ...plainEntry, kind: "url" as const }, "url"],
      [{ ...plainEntry, kind: "note" as const }, "note"],
      [{ ...plainEntry, kind: "secret" as const }, "secret"],
      [{ id: "u", kind: "unreadable" as const, createdAt: 1, batchIndex: 0, pinned: false }, "unreadable"],
    ])("shows an icon for %# (%s)", (item, kind) => {
      renderRow(item as ScratchListItem);
      expect(screen.getByTestId("scratch-kind-icon")).toHaveAttribute("data-kind", kind);
    });
  });

  describe("selection mode", () => {
    const select = (over: Partial<RowSelection> = {}): RowSelection => ({
      active: true,
      selected: false,
      onSelect: jest.fn(),
      ...over,
    });
    const row = () => screen.getByTestId("scratch-entry");

    it("shows a checkbox instead of the kind icon and hides the hover toolbar", () => {
      renderRow(plainEntry, false, select());
      expect(screen.getByTestId("scratch-select-entry")).not.toBeChecked();
      expect(screen.queryByTestId("scratch-kind-icon")).toBeNull();
      expect(screen.queryByTestId("scratch-toolbar")).toBeNull();
    });

    it("reflects the selected state on the checkbox, the row and for tests", () => {
      renderRow(plainEntry, false, select({ selected: true }));
      expect(screen.getByTestId("scratch-select-entry")).toBeChecked();
      expect(row()).toHaveAttribute("data-selected", "true");
    });

    it("toggles instead of copying when the row is clicked", () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      const selection = select();
      renderRow(plainEntry, false, selection);
      fireEvent.click(row());
      expect(selection.onSelect).toHaveBeenCalledWith(false);
      expect(write).not.toHaveBeenCalled();
    });

    it("passes shift through so a range can be selected", () => {
      const selection = select();
      renderRow(plainEntry, false, selection);
      fireEvent.click(row(), { shiftKey: true });
      expect(selection.onSelect).toHaveBeenCalledWith(true);
    });

    it("toggles when the checkbox itself is clicked, exactly once", () => {
      const selection = select();
      renderRow(plainEntry, false, selection);
      fireEvent.click(screen.getByTestId("scratch-select-entry"));
      expect(selection.onSelect).toHaveBeenCalledTimes(1);
    });

    it("makes the content inert so a masked secret cannot be copied by a click", () => {
      renderRow({ ...plainEntry, kind: "secret" }, false, select());
      expect(screen.getByTestId("scratch-row-content")).toHaveClass("pointer-events-none");
    });

    it("works for entries that cannot be decrypted", () => {
      const selection = select();
      renderRow({ id: "u", kind: "unreadable", createdAt: 1, batchIndex: 0, pinned: false }, false, selection);
      fireEvent.click(row());
      expect(selection.onSelect).toHaveBeenCalledTimes(1);
    });

    it("keeps a pinned marker visible", () => {
      renderRow({ ...plainEntry, pinned: true }, false, select());
      expect(screen.getByTestId("scratch-pinned-marker")).not.toHaveClass("group-hover:opacity-0");
    });

    it("does not advertise click-to-copy", () => {
      renderRow(plainEntry, false, select());
      expect(row()).not.toHaveAttribute("title");
    });
  });

  describe("Cmd/Ctrl+click outside selection mode", () => {
    const idle = (): RowSelection => ({ active: false, selected: false, onSelect: jest.fn() });

    it.each([["metaKey"], ["ctrlKey"]])("starts a selection with %s instead of copying", (modifier) => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      const selection = idle();
      renderRow(plainEntry, false, selection);
      fireEvent.click(screen.getByTestId("scratch-entry"), { [modifier]: true });
      expect(selection.onSelect).toHaveBeenCalledWith(false);
      expect(write).not.toHaveBeenCalled();
    });

    it("a plain click still copies and does not select", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      const selection = idle();
      renderRow(plainEntry, false, selection);
      fireEvent.click(screen.getByTestId("scratch-entry"));
      expect(selection.onSelect).not.toHaveBeenCalled();
      await waitFor(() => expect(write).toHaveBeenCalled());
    });

    it("keeps the toolbar and no checkbox while idle", () => {
      renderRow(plainEntry, false, idle());
      expect(screen.getByTestId("scratch-toolbar")).toBeInTheDocument();
      expect(screen.queryByTestId("scratch-select-entry")).toBeNull();
      expect(screen.getByTestId("scratch-entry")).not.toHaveAttribute("data-selected");
    });
  });

  describe("move menu", () => {
    const move = (over = {}) => ({ canMove: () => true, ...over });
    const unreadable: ScratchListItem = { id: "u", kind: "unreadable", createdAt: 1, batchIndex: 0, pinned: false };

    it("is absent when the list does not offer moving", () => {
      renderRow(plainEntry);
      expect(screen.queryByTestId("scratch-move")).toBeNull();
    });

    it("moves this entry, and only this entry, when an item is chosen", () => {
      const actions = renderRow(plainEntry, false, undefined, move());
      fireEvent.click(screen.getByTestId("scratch-move"));
      fireEvent.click(screen.getByTestId("scratch-move-bottom"));
      expect(actions.moveEntries).toHaveBeenCalledWith([plainEntry.id], "bottom");
    });

    it("works for entries that cannot be decrypted", () => {
      const actions = renderRow(unreadable, false, undefined, move());
      fireEvent.click(screen.getByTestId("scratch-move"));
      fireEvent.click(screen.getByTestId("scratch-move-top"));
      expect(actions.moveEntries).toHaveBeenCalledWith(["u"], "top");
    });

    it("disables the moves that would change nothing", () => {
      renderRow(plainEntry, false, undefined, move({ canMove: (t: string) => t === "down" }));
      fireEvent.click(screen.getByTestId("scratch-move"));
      expect(screen.getByTestId("scratch-move-up")).toBeDisabled();
      expect(screen.getByTestId("scratch-move-down")).toBeEnabled();
    });

    it("is disabled with an explanation while the list is filtered", () => {
      renderRow(plainEntry, false, undefined, move({ disabledReason: "Clear the search to reorder" }));
      expect(screen.getByTestId("scratch-move")).toBeDisabled();
      expect(screen.getByTestId("scratch-move")).toHaveAttribute("title", "Clear the search to reorder");
    });

    it("keeps the hover toolbar visible while the menu is open", () => {
      renderRow(plainEntry, false, undefined, move());
      const toolbar = screen.getByTestId("scratch-toolbar");
      expect(toolbar).toHaveClass("opacity-0");
      fireEvent.click(screen.getByTestId("scratch-move"));
      expect(toolbar).toHaveClass("opacity-100");
      expect(toolbar).not.toHaveClass("opacity-0");
      fireEvent.click(screen.getByTestId("scratch-move"));
      expect(toolbar).toHaveClass("opacity-0");
    });

    it("does not copy the entry when the menu is used", () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      renderRow(plainEntry, false, undefined, move());
      fireEvent.click(screen.getByTestId("scratch-move"));
      fireEvent.click(screen.getByTestId("scratch-move-up"));
      expect(write).not.toHaveBeenCalled();
    });
  });
});
