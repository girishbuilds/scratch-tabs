import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ScratchDrawer } from "../components/ScratchDrawer";
import { ScratchToggleButton } from "../components/ScratchToggleButton";
import { MASK_TEXT } from "../components/MaskedSegments";
import { FIXTURES } from "../testing/inMemory";
import * as clipboard from "../utils/copyToClipboard";
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
    act(() => useScratchpadStore.setState({ ...initial, isOpen: false, items: [], notice: null, error: null, status: "idle" }));
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
