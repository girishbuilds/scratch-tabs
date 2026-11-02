import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScratchEntryRow } from "../components/ScratchEntryRow";
import { MASK_TEXT } from "../components/MaskedSegments";
import type { ScratchEntryView, ScratchListItem } from "../types";
import * as clipboard from "../utils/copyToClipboard";

const secretEntry: ScratchEntryView = {
  id: "e1",
  kind: "secret",
  copyTarget: "value",
  createdAt: 1,
  batchIndex: 0,
  secretCount: 1,
  segments: [
    { type: "text", text: "UAT key: " },
    { type: "secret", index: 0 },
  ],
};
const plainEntry: ScratchEntryView = {
  id: "e2",
  kind: "command",
  copyTarget: "all",
  createdAt: 1,
  batchIndex: 0,
  secretCount: 0,
  segments: [{ type: "text", text: "mvn clean verify" }],
};

function renderRow(item: ScratchListItem, overrides: Partial<React.ComponentProps<typeof ScratchEntryRow>> = {}) {
  const props = {
    item,
    onRemove: jest.fn(),
    loadSecrets: jest.fn().mockResolvedValue(["3knd8dsuhds89hds"]),
    loadCopyText: jest.fn().mockResolvedValue("copied-text"),
    ...overrides,
  };
  render(<ul><ScratchEntryRow {...props} /></ul>);
  return props;
}

describe("ScratchEntryRow", () => {
  afterEach(() => jest.restoreAllMocks());

  it("shows masked secrets and the kind", () => {
    renderRow(secretEntry);
    expect(screen.getByTestId("scratch-entry")).toHaveAttribute("data-kind", "secret");
    expect(screen.getByTestId("scratch-entry").textContent).toContain(`UAT key: ${MASK_TEXT}`);
  });

  it("offers a reveal control only when the entry has secrets", () => {
    renderRow(plainEntry);
    expect(screen.queryByTestId("scratch-reveal")).toBeNull();
  });

  it("reveals the decrypted value on demand and hides it again", async () => {
    const { loadSecrets } = renderRow(secretEntry);
    fireEvent.click(screen.getByTestId("scratch-reveal"));
    expect(await screen.findByTestId("scratch-secret-revealed")).toHaveTextContent("3knd8dsuhds89hds");
    expect(loadSecrets).toHaveBeenCalledWith("e1");
    expect(screen.getByLabelText("Hide secret")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("scratch-reveal"));
    await waitFor(() => expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull());
    expect(screen.getByTestId("scratch-entry").textContent).not.toContain("3knd8dsuhds89hds");
  });

  it("copies the primary text without revealing the secret", async () => {
    const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
    const { loadCopyText } = renderRow(secretEntry);
    await act(async () => {
      fireEvent.click(screen.getByTestId("scratch-copy"));
    });
    expect(loadCopyText).toHaveBeenCalledWith("e1");
    expect(write).toHaveBeenCalledWith("copied-text");
    expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull();
  });

  it("says what the copy button copies", () => {
    renderRow(secretEntry);
    expect(screen.getByTestId("scratch-copy")).toHaveAttribute("aria-label", "Copy value");
  });

  it("says it copies the whole entry when it is not just a labelled value", () => {
    renderRow(plainEntry);
    expect(screen.getByTestId("scratch-copy")).toHaveAttribute("aria-label", "Copy entry");
  });

  it("copies only the clicked secret, without revealing it", async () => {
    const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
    const { loadSecrets } = renderRow(secretEntry, {
      loadSecrets: jest.fn().mockResolvedValue(["3knd8dsuhds89hds"]),
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("scratch-mask"));
    });
    expect(loadSecrets).toHaveBeenCalledWith("e1");
    expect(write).toHaveBeenCalledWith("3knd8dsuhds89hds");
    expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull();
  });

  it("does not copy anything if the secret can no longer be read", async () => {
    const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
    renderRow(secretEntry, { loadSecrets: jest.fn().mockResolvedValue([]) });
    await act(async () => {
      fireEvent.click(screen.getByTestId("scratch-mask"));
    });
    expect(write).not.toHaveBeenCalled();
  });

  it("does not flash copied feedback when the clipboard write fails", async () => {
    jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(false);
    renderRow(plainEntry);
    await act(async () => {
      fireEvent.click(screen.getByTestId("scratch-copy"));
    });
    expect(screen.getByTestId("scratch-copy").querySelector("svg.lucide-check")).toBeNull();
  });

  it("requires a second click to delete", () => {
    const { onRemove } = renderRow(plainEntry);
    const button = screen.getByTestId("scratch-delete");
    fireEvent.click(button);
    expect(onRemove).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-label", "Confirm delete");
    fireEvent.click(button);
    expect(onRemove).toHaveBeenCalledWith("e2");
  });

  it("cancels a pending delete when the button loses focus", () => {
    const { onRemove } = renderRow(plainEntry);
    const button = screen.getByTestId("scratch-delete");
    fireEvent.click(button);
    fireEvent.blur(button);
    expect(button).toHaveAttribute("aria-label", "Delete entry");
    fireEvent.click(button);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("explains unreadable entries and still allows deleting them", () => {
    const { onRemove } = renderRow({ id: "bad", kind: "unreadable", createdAt: 1, batchIndex: 0 });
    expect(screen.getByText(/can no longer be decrypted/i)).toBeInTheDocument();
    expect(screen.queryByTestId("scratch-copy")).toBeNull();
    fireEvent.click(screen.getByTestId("scratch-delete"));
    fireEvent.click(screen.getByTestId("scratch-delete"));
    expect(onRemove).toHaveBeenCalledWith("bad");
  });
});
