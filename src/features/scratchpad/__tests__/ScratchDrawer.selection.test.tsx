import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ScratchDrawer } from "../components/ScratchDrawer";
import { FIXTURES } from "../testing/inMemory";
import { useScratchpadStore } from "../stores/useScratchpadStore";

// In-memory store instead of IndexedDB.
jest.mock("../stores/useScratchpadStore", () => {
  const { createScratchpadStore } = jest.requireActual("../stores/scratchpadStore");
  const { InMemoryScratchRepository, newTestKey, sequentialIds } = jest.requireActual("../testing/inMemory");
  const repository = new InMemoryScratchRepository();
  let keyPromise: Promise<CryptoKey> | undefined;
  const store = createScratchpadStore({
    repository,
    getKey: () => (keyPromise ??= newTestKey()),
    newId: sequentialIds(),
  });
  return { useScratchpadStore: store, __repository: repository };
});

const initial = useScratchpadStore.getState();

const tick = () => new Promise((resolve) => setTimeout(resolve, 3));

/** Three entries, newest first: mvn, "second note", todo. Spaced out so their order is stable. */
const seed = async () => {
  const { addFromText } = useScratchpadStore.getState();
  await act(async () => {
    await addFromText(FIXTURES.todo);
    await tick();
    await addFromText("second note");
    await tick();
    await addFromText(FIXTURES.mvn);
  });
};

const openDrawer = async () => {
  render(<ScratchDrawer />);
  await act(async () => {
    await useScratchpadStore.getState().open();
  });
};

const rows = () => screen.getAllByTestId("scratch-entry");
const rowText = () => rows().map((r) => r.textContent ?? "");
const enterSelection = () => fireEvent.click(screen.getByTestId("scratch-select-toggle"));
const clickRow = (index: number, init: MouseEventInit = {}) => fireEvent.click(rows()[index], init);
const countText = () => screen.getByTestId("scratch-selected-count").textContent;

describe("ScratchDrawer selection", () => {
  beforeEach(() => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() =>
      useScratchpadStore.setState({
        ...initial,
        isOpen: false,
        items: [],
        notice: null,
        error: null,
        status: "idle",
        query: "",
        isPresenting: false,
      }),
    );
  });

  describe("entering and leaving", () => {
    it("offers Select only once there are entries", async () => {
      await openDrawer();
      expect(screen.queryByTestId("scratch-select-toggle")).toBeNull();
      await act(async () => useScratchpadStore.getState().addFromText(FIXTURES.mvn));
      expect(screen.getByTestId("scratch-select-toggle")).toBeInTheDocument();
    });

    it("swaps the capture box for the action bar", async () => {
      await seed();
      await openDrawer();
      expect(screen.getByTestId("scratch-input")).toBeInTheDocument();
      enterSelection();
      expect(screen.queryByTestId("scratch-input")).toBeNull();
      expect(screen.getByTestId("scratch-selection-bar")).toBeInTheDocument();
      expect(countText()).toBe("Select entries");
      expect(screen.getByTestId("scratch-select-toggle")).toHaveAttribute("aria-pressed", "true");
    });

    it("Done returns to the capture box and clears the selection", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      fireEvent.click(screen.getByTestId("scratch-select-done"));
      expect(screen.getByTestId("scratch-input")).toBeInTheDocument();
      expect(screen.queryByTestId("scratch-select-entry")).toBeNull();
      enterSelection();
      expect(countText()).toBe("Select entries");
    });

    it("the toggle button leaves the mode too", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      enterSelection();
      expect(screen.queryByTestId("scratch-selection-bar")).toBeNull();
    });

    it("Cmd/Ctrl+click on a row starts selecting with that row", async () => {
      await seed();
      await openDrawer();
      clickRow(1, { metaKey: true });
      expect(screen.getByTestId("scratch-selection-bar")).toBeInTheDocument();
      expect(countText()).toBe("1 selected");
      expect(rows()[1]).toHaveAttribute("data-selected", "true");
    });

    it("Escape leaves selection mode first and only then closes the drawer", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      fireEvent.keyDown(screen.getByTestId("scratch-drawer"), { key: "Escape" });
      expect(screen.queryByTestId("scratch-selection-bar")).toBeNull();
      expect(useScratchpadStore.getState().isOpen).toBe(true);
      fireEvent.keyDown(screen.getByTestId("scratch-drawer"), { key: "Escape" });
      expect(useScratchpadStore.getState().isOpen).toBe(false);
    });

    it("forgets the selection when the drawer is closed and reopened", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      act(() => useScratchpadStore.getState().close());
      await act(async () => useScratchpadStore.getState().open());
      expect(screen.getByTestId("scratch-input")).toBeInTheDocument();
      enterSelection();
      expect(countText()).toBe("Select entries");
    });

    it("hides the add notice while selecting", async () => {
      await openDrawer();
      await act(async () => useScratchpadStore.getState().addFromText(FIXTURES.mvn));
      expect(screen.getByTestId("scratch-notice")).toBeInTheDocument();
      enterSelection();
      expect(screen.queryByTestId("scratch-notice")).toBeNull();
    });
  });

  describe("choosing entries", () => {
    it("clicking rows toggles them and updates the count", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      clickRow(2);
      expect(countText()).toBe("2 selected");
      clickRow(0);
      expect(countText()).toBe("1 selected");
    });

    it("does not copy while selecting", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      expect(screen.queryByTestId("scratch-copied-tick")).toBeNull();
    });

    it("shift+click selects a range", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      clickRow(2, { shiftKey: true });
      expect(countText()).toBe("3 selected");
    });

    it("select-all is tri-state and toggles every shown entry", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      const all = screen.getByTestId("scratch-select-all") as HTMLInputElement;
      clickRow(0);
      expect(all.indeterminate).toBe(true);
      fireEvent.click(all);
      expect(countText()).toBe("3 selected");
      expect(all.checked).toBe(true);
      fireEvent.click(all);
      expect(countText()).toBe("Select entries");
    });

    it("select-all only covers entries matching the search, and a narrower search drops the rest", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      fireEvent.click(screen.getByTestId("scratch-select-all"));
      expect(countText()).toBe("3 selected");
      fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "second" } });
      expect(rows()).toHaveLength(1);
      expect(countText()).toBe("1 selected");
      fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "" } });
      expect(rows()).toHaveLength(3);
      expect(countText()).toBe("1 selected");
    });

    it("shows the total number of entries in the header", async () => {
      await seed();
      await openDrawer();
      expect(screen.getByTestId("scratch-count")).toHaveTextContent("3");
    });
  });

  describe("bulk delete", () => {
    it("asks once for all the selected entries and deletes only those", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      clickRow(2);
      fireEvent.click(screen.getByTestId("scratch-bulk-delete"));
      expect(screen.getByText("Delete 2 Scratch entries? This cannot be undone.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(rows()).toHaveLength(1));
      expect(rowText()[0]).toContain("second note");
      expect(countText()).toBe("Select entries");
      expect(screen.getByTestId("scratch-selection-bar")).toBeInTheDocument();
    });

    it("uses the singular for one entry", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(1);
      fireEvent.click(screen.getByTestId("scratch-bulk-delete"));
      expect(screen.getByText("Delete 1 Scratch entry? This cannot be undone.")).toBeInTheDocument();
    });

    it("deletes nothing when cancelled", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      fireEvent.click(screen.getByTestId("scratch-bulk-delete"));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(rows()).toHaveLength(3);
      expect(countText()).toBe("1 selected");
    });

    it("leaves selection mode once the last entry is deleted", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      fireEvent.click(screen.getByTestId("scratch-select-all"));
      fireEvent.click(screen.getByTestId("scratch-bulk-delete"));
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(screen.getByTestId("scratch-empty")).toBeInTheDocument());
      expect(screen.getByTestId("scratch-input")).toBeInTheDocument();
    });

    it("does not delete anything hidden by the search", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      fireEvent.click(screen.getByTestId("scratch-select-all"));
      const shownId = useScratchpadStore.getState().items.find((i) => i.kind !== "unreadable" && i.segments.some((seg) => seg.type === "text" && seg.text === "second note"))!.id;
      fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "second" } });
      fireEvent.click(screen.getByTestId("scratch-bulk-delete"));
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(useScratchpadStore.getState().items).toHaveLength(2));
      expect(useScratchpadStore.getState().items.map((i) => i.id)).not.toContain(shownId);
    });
  });

  describe("bulk pin", () => {
    it("pins the selection, which then reads as pinned so the button offers Unpin", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(1);
      clickRow(2);
      fireEvent.click(screen.getByTestId("scratch-bulk-pin"));
      await waitFor(() =>
        expect(screen.getByTestId("scratch-bulk-pin")).toHaveAttribute("aria-label", "Unpin selected"),
      );
      expect(rows().filter((r) => r.getAttribute("data-pinned") === "true")).toHaveLength(2);
    });

    it("unpins when every selected entry is already pinned", async () => {
      await seed();
      await openDrawer();
      const [first, second] = useScratchpadStore.getState().items.map((i) => i.id);
      await act(async () => useScratchpadStore.getState().setPinnedMany([first, second], true));
      enterSelection();
      fireEvent.click(screen.getByTestId("scratch-select-all"));
      // A mixed selection pins first...
      expect(screen.getByTestId("scratch-bulk-pin")).toHaveAttribute("aria-label", "Pin selected");
      fireEvent.click(screen.getByTestId("scratch-select-all"));
      clickRow(0);
      clickRow(1);
      // ...an all-pinned selection unpins.
      expect(screen.getByTestId("scratch-bulk-pin")).toHaveAttribute("aria-label", "Unpin selected");
      fireEvent.click(screen.getByTestId("scratch-bulk-pin"));
      await waitFor(() => expect(rows().every((r) => r.getAttribute("data-pinned") === "false")).toBe(true));
    });
  });

  it("keeps the action bar inside the drawer landmark", async () => {
    await seed();
    await openDrawer();
    enterSelection();
    expect(within(screen.getByRole("complementary")).getByRole("toolbar", { name: "Selected entries" })).toBeInTheDocument();
  });

  describe("moving", () => {
    const texts = () => rowText().map((t) => t.replace(/\s+/g, " "));
    const first = (list: string[]) => list[0];

    it("moves a single entry from its own menu", async () => {
      await seed();
      await openDrawer();
      expect(texts().map((t) => t.slice(0, 6))).toEqual(["mvn -B", "second", "TODO: "]);
      fireEvent.click(within(rows()[2]).getByTestId("scratch-move"));
      fireEvent.click(within(rows()[2]).getByTestId("scratch-move-top"));
      await waitFor(() => expect(first(texts())).toContain("TODO:"));
      expect(texts().map((t) => t.slice(0, 6))).toEqual(["TODO: ", "mvn -B", "second"]);
    });

    it("disables moves that would do nothing", async () => {
      await seed();
      await openDrawer();
      fireEvent.click(within(rows()[0]).getByTestId("scratch-move"));
      expect(within(rows()[0]).getByTestId("scratch-move-top")).toBeDisabled();
      expect(within(rows()[0]).getByTestId("scratch-move-up")).toBeDisabled();
      expect(within(rows()[0]).getByTestId("scratch-move-down")).toBeEnabled();
    });

    it("moves the whole selection together, keeping its order", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      clickRow(1);
      fireEvent.click(screen.getByTestId("scratch-bulk-move"));
      fireEvent.click(screen.getByTestId("scratch-bulk-move-bottom"));
      await waitFor(() => expect(first(texts())).toContain("TODO:"));
      expect(texts().map((t) => t.slice(0, 6))).toEqual(["TODO: ", "mvn -B", "second"]);
      // The selection is kept so the move can be repeated.
      expect(countText()).toBe("2 selected");
    });

    it("disables bulk moves that would do nothing", async () => {
      await seed();
      await openDrawer();
      enterSelection();
      clickRow(0);
      fireEvent.click(screen.getByTestId("scratch-bulk-move"));
      expect(screen.getByTestId("scratch-bulk-move-top")).toBeDisabled();
      expect(screen.getByTestId("scratch-bulk-move-down")).toBeEnabled();
    });

    it("waits for the search to clear before allowing a move", async () => {
      await seed();
      await openDrawer();
      fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "second" } });
      expect(within(rows()[0]).getByTestId("scratch-move")).toBeDisabled();
      expect(within(rows()[0]).getByTestId("scratch-move")).toHaveAttribute("title", "Clear the search to reorder");
      enterSelection();
      clickRow(0);
      expect(screen.getByTestId("scratch-bulk-move")).toBeDisabled();
      fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "" } });
      expect(screen.getByTestId("scratch-bulk-move")).toBeEnabled();
    });

    it("keeps pinned entries above, so a move stays inside the pinned group", async () => {
      await seed();
      await openDrawer();
      await act(async () => useScratchpadStore.getState().togglePin(useScratchpadStore.getState().items[2].id));
      expect(rows()[0]).toHaveAttribute("data-pinned", "true");
      // "second" goes to the top of the unpinned group, not above the pinned entry.
      fireEvent.click(within(rows()[2]).getByTestId("scratch-move"));
      fireEvent.click(within(rows()[2]).getByTestId("scratch-move-top"));
      await waitFor(() => expect(texts().map((t) => t.slice(0, 6))).toEqual(["TODO: ", "second", "mvn -B"]));
    });

    it("puts a new paste on top after the list has been rearranged", async () => {
      await seed();
      await openDrawer();
      fireEvent.click(within(rows()[0]).getByTestId("scratch-move"));
      fireEvent.click(within(rows()[0]).getByTestId("scratch-move-bottom"));
      await waitFor(() => expect(texts()[2]).toContain("mvn -B"));
      await act(async () => useScratchpadStore.getState().addFromText("fresh entry"));
      expect(texts()[0]).toContain("fresh entry");
      expect(texts()[3]).toContain("mvn -B");
    });
  });
});
