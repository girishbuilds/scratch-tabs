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

const openMenu = () => fireEvent.click(screen.getByTestId("scratch-more"));

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

    it("stays visible while its menu is open", () => {
      renderRow(plainEntry);
      openMenu();
      expect(screen.getByTestId("scratch-toolbar")).toHaveClass("opacity-100");
      expect(screen.getByTestId("scratch-toolbar")).not.toHaveClass("opacity-0");
    });

    it("keeps Mask text and Delete out of the toolbar until the menu is opened", () => {
      renderRow(plainEntry);
      expect(screen.queryByTestId("scratch-delete")).toBeNull();
      expect(screen.queryByTestId("scratch-mask-mode")).toBeNull();
      openMenu();
      expect(screen.getByTestId("scratch-delete")).toBeInTheDocument();
      expect(screen.getByTestId("scratch-mask-mode")).toBeInTheDocument();
    });
  });

  describe("delete", () => {
    it("requires a second click", () => {
      const actions = renderRow(plainEntry);
      openMenu();
      const item = screen.getByTestId("scratch-delete");
      fireEvent.click(item);
      expect(actions.remove).not.toHaveBeenCalled();
      expect(item).toHaveAttribute("aria-label", "Confirm delete");
      expect(item).toHaveTextContent("Click again to delete");
      fireEvent.click(item);
      expect(actions.remove).toHaveBeenCalledWith("e2");
    });

    it("forgets a pending confirmation when the menu closes", () => {
      const actions = renderRow(plainEntry);
      openMenu();
      fireEvent.click(screen.getByTestId("scratch-delete"));
      openMenu();
      openMenu();
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
      openMenu();
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
      openMenu();
      fireEvent.click(screen.getByTestId("scratch-delete"));
      fireEvent.click(screen.getByTestId("scratch-delete"));
      expect(actions.remove).toHaveBeenCalledWith("bad");
    });
  });
});
