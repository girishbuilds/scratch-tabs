import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ScratchDrawer } from "../components/ScratchDrawer";
import { ScratchToggleButton } from "../components/ScratchToggleButton";
import { MASK_TEXT } from "../components/MaskedSegments";
import { FIXTURES } from "../testing/inMemory";
import * as clipboard from "../utils/copyToClipboard";
import { useScratchpadStore } from "../stores/useScratchpadStore";
import { useScratchSettingsStore } from "../stores/scratchSettingsStore";

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

const pasteIntoInput = (text: string) => {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData: { getData: () => string };
  };
  event.clipboardData = { getData: () => text };
  fireEvent(screen.getByTestId("scratch-input"), event);
};

const openDrawer = async () => {
  render(<ScratchDrawer />);
  await act(async () => {
    await useScratchpadStore.getState().open();
  });
};

const PASTE = `${FIXTURES.uatKeyLine}\n${FIXTURES.prodKeyLine}\n\n${FIXTURES.mvn}`;

describe("ScratchDrawer", () => {
  beforeEach(async () => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle", query: "", isPresenting: false }));
  });

  it("renders nothing while closed", () => {
    render(<ScratchDrawer />);
    expect(screen.queryByTestId("scratch-drawer")).toBeNull();
  });

  it("shows an explanatory empty state when open with no entries", async () => {
    await openDrawer();
    expect(screen.getByTestId("scratch-empty")).toHaveTextContent(/masked and encrypted automatically/i);
  });

  it("focuses the input when opened", async () => {
    await openDrawer();
    expect(screen.getByTestId("scratch-input")).toHaveFocus();
  });

  it("turns a paste into entries with secrets masked and never in the DOM", async () => {
    await openDrawer();
    await act(async () => pasteIntoInput(PASTE));
    await waitFor(() => expect(screen.getAllByTestId("scratch-entry")).toHaveLength(3));

    const drawer = screen.getByTestId("scratch-drawer");
    expect(screen.getAllByTestId("scratch-mask")).toHaveLength(2);
    expect(drawer.textContent).toContain(`UAT key: ${MASK_TEXT}`);
    expect(drawer.textContent).toContain(`Prod-Key: ${MASK_TEXT}`);
    expect(drawer.textContent).toContain(FIXTURES.mvn);
    expect(drawer.innerHTML).not.toContain(FIXTURES.uatKeyValue);
    expect(drawer.innerHTML).not.toContain(FIXTURES.prodKeyValue);
    expect((screen.getByTestId("scratch-input") as HTMLTextAreaElement).value).toBe("");
  });

  it("summarises what was added and masked", async () => {
    await openDrawer();
    await act(async () => pasteIntoInput(PASTE));
    expect(await screen.findByTestId("scratch-notice")).toHaveTextContent("3 added - 2 masked");
  });

  it("omits the masked count when nothing was masked", async () => {
    await openDrawer();
    await act(async () => pasteIntoInput(FIXTURES.mvn));
    expect(await screen.findByTestId("scratch-notice")).toHaveTextContent(/^1 added\s*Undo$/);
  });

  it("undoes the last paste", async () => {
    await openDrawer();
    await act(async () => pasteIntoInput(PASTE));
    await screen.findByTestId("scratch-notice");
    await act(async () => {
      fireEvent.click(screen.getByTestId("scratch-undo"));
    });
    await waitFor(() => expect(screen.queryAllByTestId("scratch-entry")).toHaveLength(0));
    expect(screen.queryByTestId("scratch-notice")).toBeNull();
  });

  it("reveals a secret only on request and masks it again", async () => {
    await openDrawer();
    await act(async () => pasteIntoInput(FIXTURES.uatKeyLine));
    const row = await screen.findByTestId("scratch-entry");
    await act(async () => {
      fireEvent.click(within(row).getByTestId("scratch-reveal"));
    });
    expect(await within(row).findByTestId("scratch-secret-revealed")).toHaveTextContent(FIXTURES.uatKeyValue);
    await act(async () => {
      fireEvent.click(within(row).getByTestId("scratch-reveal"));
    });
    await waitFor(() => expect(row.textContent).not.toContain(FIXTURES.uatKeyValue));
  });

  it("copies just the secret value from a labelled entry", async () => {
    const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
    await openDrawer();
    await act(async () => pasteIntoInput(FIXTURES.uatKeyLine));
    const row = await screen.findByTestId("scratch-entry");
    fireEvent.click(within(row).getByTestId("scratch-copy"));
    await waitFor(() => expect(write).toHaveBeenCalledWith(FIXTURES.uatKeyValue));
    write.mockRestore();
  });

  it("copies only the token when its mask is clicked, and the whole command from the row button", async () => {
    const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
    const curl = FIXTURES.curl.replace("your-token-here", "abcdef123456xyz");
    await openDrawer();
    await act(async () => pasteIntoInput(curl));
    const row = await screen.findByTestId("scratch-entry");

    expect(within(row).getByTestId("scratch-copy")).toHaveAttribute("aria-label", "Copy entry");
    fireEvent.click(within(row).getByTestId("scratch-mask"));
    await waitFor(() => expect(write).toHaveBeenCalledWith("abcdef123456xyz"));

    fireEvent.click(within(row).getByTestId("scratch-copy"));
    await waitFor(() => expect(write).toHaveBeenCalledWith(curl));
    write.mockRestore();
  });

  it("deletes an entry after confirmation", async () => {
    await openDrawer();
    await act(async () => pasteIntoInput(FIXTURES.mvn));
    const row = await screen.findByTestId("scratch-entry");
    fireEvent.click(within(row).getByTestId("scratch-more"));
    fireEvent.click(within(row).getByTestId("scratch-delete"));
    fireEvent.click(within(row).getByTestId("scratch-delete"));
    await waitFor(() => expect(screen.queryAllByTestId("scratch-entry")).toHaveLength(0));
  });

  it("shows save errors as an alert", async () => {
    await openDrawer();
    await act(async () => pasteIntoInput("x".repeat(200_001)));
    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/i);
  });

  it("closes with Escape and with the close button", async () => {
    await openDrawer();
    fireEvent.keyDown(screen.getByTestId("scratch-drawer"), { key: "Escape" });
    expect(screen.queryByTestId("scratch-drawer")).toBeNull();

    await openDrawer();
    fireEvent.click(screen.getAllByTestId("scratch-close")[0]);
    expect(useScratchpadStore.getState().isOpen).toBe(false);
  });

  it("toggles with Cmd+Shift+Y even when focus is elsewhere", async () => {
    render(<ScratchDrawer />);
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "y", metaKey: true, shiftKey: true });
    });
    await waitFor(() => expect(screen.getByTestId("scratch-drawer")).toBeInTheDocument());
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "y", metaKey: true, shiftKey: true });
    });
    expect(screen.queryByTestId("scratch-drawer")).toBeNull();
  });

  it("returns focus to the previously focused element on close", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await openDrawer();
    expect(outside).not.toHaveFocus();
    act(() => useScratchpadStore.getState().close());
    expect(outside).toHaveFocus();
    outside.remove();
  });
});

const addEntries = async (...texts: string[]) => {
  for (const text of texts) {
    await act(async () => {
      await useScratchpadStore.getState().addFromText(text);
    });
  }
};

describe("ScratchDrawer search", () => {
  beforeEach(() => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle", query: "", isPresenting: false }));
  });

  it("hides the search box until there is something to search", async () => {
    await openDrawer();
    expect(screen.queryByTestId("scratch-search")).toBeNull();
    await addEntries(FIXTURES.mvn);
    expect(screen.getByTestId("scratch-search")).toBeInTheDocument();
  });

  it("filters entries by their visible text", async () => {
    await openDrawer();
    await addEntries(FIXTURES.mvn, FIXTURES.todo);
    fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "allow list" } });
    const rows = screen.getAllByTestId("scratch-entry");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("TODO: Make allow list");
  });

  it("does not find an entry by its secret value", async () => {
    await openDrawer();
    await addEntries(FIXTURES.uatKeyLine);
    fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: FIXTURES.uatKeyValue } });
    expect(screen.queryAllByTestId("scratch-entry")).toHaveLength(0);
    expect(screen.getByTestId("scratch-no-matches")).toHaveTextContent(/secret values are not searched/i);
  });

  it("does not show the no-matches message without a query", async () => {
    await openDrawer();
    await addEntries(FIXTURES.mvn);
    expect(screen.queryByTestId("scratch-no-matches")).toBeNull();
  });

  it("does not show the empty-state message while a search has no results", async () => {
    await openDrawer();
    await addEntries(FIXTURES.mvn);
    fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "zzz" } });
    expect(screen.queryByTestId("scratch-empty")).toBeNull();
  });

  it("clears the search when the drawer closes", async () => {
    await openDrawer();
    await addEntries(FIXTURES.mvn);
    fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "mvn" } });
    act(() => useScratchpadStore.getState().close());
    expect(useScratchpadStore.getState().query).toBe("");
  });
});

describe("ScratchDrawer pinning", () => {
  beforeEach(() => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle", query: "", isPresenting: false }));
  });

  it("moves a pinned entry to the top and back", async () => {
    await openDrawer();
    await addEntries(FIXTURES.todo, FIXTURES.mvn);
    const firstText = () => screen.getAllByTestId("scratch-entry")[0].textContent;
    expect(firstText()).toContain("mvn");

    await act(async () => {
      fireEvent.click(within(screen.getAllByTestId("scratch-entry")[1]).getByTestId("scratch-pin"));
    });
    await waitFor(() => expect(firstText()).toContain("TODO"));
    expect(screen.getAllByTestId("scratch-entry")[0]).toHaveAttribute("data-pinned", "true");

    await act(async () => {
      fireEvent.click(within(screen.getAllByTestId("scratch-entry")[0]).getByTestId("scratch-pin"));
    });
    await waitFor(() => expect(firstText()).toContain("mvn"));
  });
});

describe("ScratchDrawer secret corrections", () => {
  beforeEach(() => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle", query: "", isPresenting: false }));
  });

  it("unmasks a false positive after revealing it", async () => {
    await openDrawer();
    await addEntries(FIXTURES.uatKeyLine);
    const row = await screen.findByTestId("scratch-entry");
    await act(async () => {
      fireEvent.click(within(row).getByTestId("scratch-reveal"));
    });
    const notSecret = await within(row).findByTestId("scratch-not-secret");
    await act(async () => {
      fireEvent.click(notSecret);
    });
    await waitFor(() => expect(screen.queryByTestId("scratch-mask")).toBeNull());
    expect(screen.getByTestId("scratch-entry")).toHaveAttribute("data-kind", "note");
    expect(screen.queryByTestId("scratch-reveal")).toBeNull();
    expect(screen.getByTestId("scratch-entry")).toHaveTextContent(FIXTURES.uatKeyLine);
  });

  it("masks a selected range that detection missed", async () => {
    const text = "deploy pw is plainword now";
    const from = text.indexOf("plainword");
    await openDrawer();
    await addEntries(text);
    const row = await screen.findByTestId("scratch-entry");
    expect(within(row).queryByTestId("scratch-mask")).toBeNull();

    fireEvent.click(within(row).getByTestId("scratch-more"));
    await act(async () => {
      fireEvent.click(within(row).getByTestId("scratch-mask-mode"));
    });
    const area = (await within(row).findByTestId("scratch-mask-text")) as HTMLTextAreaElement;
    expect(area.value).toBe(text);
    act(() => {
      area.setSelectionRange(from, from + "plainword".length);
      fireEvent.select(area);
    });
    await act(async () => {
      fireEvent.click(within(row).getByTestId("scratch-mask-selection"));
    });

    await waitFor(() => expect(within(row).getByTestId("scratch-mask")).toBeInTheDocument());
    expect(row.textContent).toContain(`deploy pw is ${MASK_TEXT} now`);
    expect(row.innerHTML).not.toContain("plainword");
    expect(within(row).queryByTestId("scratch-mask-editor")).toBeNull();
  });
});

describe("ScratchDrawer presenting mode", () => {
  beforeEach(() => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle", query: "", isPresenting: false }));
  });

  it("removes reveal controls and hides anything already revealed", async () => {
    await openDrawer();
    await addEntries(FIXTURES.uatKeyLine);
    const row = await screen.findByTestId("scratch-entry");
    await act(async () => {
      fireEvent.click(within(row).getByTestId("scratch-reveal"));
    });
    expect(await within(row).findByTestId("scratch-secret-revealed")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("scratch-presenting"));
    await waitFor(() => expect(within(row).queryByTestId("scratch-secret-revealed")).toBeNull());
    expect(within(row).queryByTestId("scratch-reveal")).toBeNull();
    fireEvent.click(within(row).getByTestId("scratch-more"));
    expect(within(row).queryByTestId("scratch-mask-mode")).toBeNull();
    expect(screen.getByTestId("scratch-presenting")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("scratch-drawer").innerHTML).not.toContain(FIXTURES.uatKeyValue);
  });

  it("still lets you copy while presenting", async () => {
    const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
    await openDrawer();
    await addEntries(FIXTURES.uatKeyLine);
    fireEvent.click(screen.getByTestId("scratch-presenting"));
    fireEvent.click(screen.getByTestId("scratch-copy"));
    await waitFor(() => expect(write).toHaveBeenCalledWith(FIXTURES.uatKeyValue));
    write.mockRestore();
  });

  it("brings the controls back when presenting stops", async () => {
    await openDrawer();
    await addEntries(FIXTURES.uatKeyLine);
    fireEvent.click(screen.getByTestId("scratch-presenting"));
    fireEvent.click(screen.getByTestId("scratch-presenting"));
    expect(screen.getByTestId("scratch-reveal")).toBeInTheDocument();
  });
});

describe("ScratchDrawer settings and clear all", () => {
  beforeEach(() => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle", query: "", isPresenting: false }));
    useScratchSettingsStore.setState({ clipboardAutoClear: true });
  });

  it("toggles clipboard auto-clear", async () => {
    await openDrawer();
    fireEvent.click(screen.getByTestId("scratch-settings"));
    expect(screen.getByTestId("scratch-clipboard-clear")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByTestId("scratch-clipboard-clear"));
    expect(useScratchSettingsStore.getState().clipboardAutoClear).toBe(false);
    fireEvent.click(screen.getByTestId("scratch-settings"));
    expect(screen.getByTestId("scratch-clipboard-clear")).toHaveAttribute("aria-checked", "false");
  });

  it("disables clear all when empty", async () => {
    await openDrawer();
    fireEvent.click(screen.getByTestId("scratch-settings"));
    expect(screen.getByTestId("scratch-clear-all")).toBeDisabled();
  });

  it("asks before deleting everything, then deletes", async () => {
    await openDrawer();
    await addEntries(FIXTURES.mvn, FIXTURES.todo);
    fireEvent.click(screen.getByTestId("scratch-settings"));
    fireEvent.click(screen.getByTestId("scratch-clear-all"));
    expect(screen.getByTestId("confirmation-dialog")).toHaveTextContent("Delete all 2 Scratch entries?");
    expect(screen.getAllByTestId("scratch-entry")).toHaveLength(2);

    await act(async () => {
      fireEvent.click(screen.getByText("Delete all"));
    });
    await waitFor(() => expect(screen.queryAllByTestId("scratch-entry")).toHaveLength(0));
    expect(screen.queryByTestId("confirmation-dialog")).toBeNull();
    expect(screen.getByTestId("scratch-empty")).toBeInTheDocument();
  });

  it("keeps everything when the confirmation is cancelled", async () => {
    await openDrawer();
    await addEntries(FIXTURES.mvn);
    fireEvent.click(screen.getByTestId("scratch-settings"));
    fireEvent.click(screen.getByTestId("scratch-clear-all"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByTestId("confirmation-dialog")).toBeNull();
    expect(screen.getAllByTestId("scratch-entry")).toHaveLength(1);
  });
});

describe("ScratchDrawer width", () => {
  const innerWidth = window.innerWidth;
  // jsdom has no PointerEvent, so pointer events would lose their coordinates.
  const originalPointerEvent = window.PointerEvent;
  beforeAll(() => {
    window.PointerEvent = class extends MouseEvent {} as unknown as typeof PointerEvent;
  });
  afterAll(() => {
    window.PointerEvent = originalPointerEvent;
  });
  beforeEach(() => {
    const { __repository } = jest.requireMock("../stores/useScratchpadStore");
    __repository.records.clear();
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle", query: "", isPresenting: false }));
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });
    useScratchSettingsStore.setState({ drawerWidth: 380 });
  });
  afterEach(() => Object.defineProperty(window, "innerWidth", { value: innerWidth, configurable: true }));

  it("uses the saved width", async () => {
    useScratchSettingsStore.setState({ drawerWidth: 500 });
    await openDrawer();
    expect(screen.getByTestId("scratch-drawer")).toHaveStyle({ width: "500px" });
  });

  it("widens by dragging the left edge and saves the result on release", async () => {
    await openDrawer();
    const handle = screen.getByTestId("scratch-resize");
    fireEvent.pointerDown(handle, { clientX: 1020, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 800, pointerId: 1 });
    expect(screen.getByTestId("scratch-drawer")).toHaveStyle({ width: "600px" });
    expect(useScratchSettingsStore.getState().drawerWidth).toBe(380);
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(useScratchSettingsStore.getState().drawerWidth).toBe(600);
  });

  it("resizes with the arrow keys and resets on double-click", async () => {
    await openDrawer();
    const handle = screen.getByTestId("scratch-resize");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(screen.getByTestId("scratch-drawer")).toHaveStyle({ width: "396px" });
    fireEvent.doubleClick(handle);
    expect(screen.getByTestId("scratch-drawer")).toHaveStyle({ width: "380px" });
  });
});

describe("ScratchToggleButton", () => {
  beforeEach(() => {
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [] }));
  });

  it("reflects and toggles the drawer state", async () => {
    render(<ScratchToggleButton className="x" />);
    const button = screen.getByTestId("icon-scratch");
    expect(button).toHaveAttribute("aria-pressed", "false");
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await act(async () => {
      fireEvent.click(button);
    });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
