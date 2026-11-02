import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScratchReadableEntry } from "../components/ScratchReadableEntry";
import { COPIED_TICK_MS } from "../hooks/useEntryController";
import { clipboardGuard } from "../services/defaultClipboardGuard";
import { useScratchSettingsStore } from "../stores/scratchSettingsStore";
import { createActions, plainEntry, secretEntry } from "../testing/entryFixtures";
import type { ScratchEntryView } from "../types";
import * as clipboard from "../utils/copyToClipboard";

function renderEntry(item: ScratchEntryView, presenting = false, actions = createActions()) {
  const view = render(
    <ul>
      <ScratchReadableEntry item={item} actions={actions} presenting={presenting} />
    </ul>,
  );
  return { actions, ...view };
}

const advance = (ms: number) => act(() => void jest.advanceTimersByTime(ms));
const click = (element: HTMLElement) =>
  act(async () => {
    fireEvent.click(element);
  });
const clickId = (testId: string) => click(screen.getByTestId(testId));
const row = () => screen.getByTestId("scratch-entry");

describe("ScratchReadableEntry", () => {
  beforeEach(() => {
    useScratchSettingsStore.setState({ clipboardAutoClear: true });
  });
  afterEach(() => {
    clipboardGuard.cancel();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe("reveal", () => {
    it("offers a reveal control only when the entry has secrets", () => {
      renderEntry(plainEntry);
      expect(screen.queryByTestId("scratch-reveal")).toBeNull();
    });

    it("reveals the decrypted value on demand and hides it again", async () => {
      const { actions } = renderEntry(secretEntry);
      fireEvent.click(screen.getByTestId("scratch-reveal"));
      expect(await screen.findByTestId("scratch-secret-revealed")).toHaveTextContent("3knd8dsuhds89hds");
      expect(actions.revealSecrets).toHaveBeenCalledWith("e1");
      expect(screen.getByLabelText("Hide secret")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("scratch-reveal"));
      await waitFor(() => expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull());
    });

    it("does not copy the entry when the reveal button is clicked", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      renderEntry(secretEntry);
      await clickId("scratch-reveal");
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe("copying", () => {
    it("copies the primary text when the row is clicked, without revealing the secret", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      const { actions } = renderEntry(secretEntry);
      await click(row());
      expect(actions.getCopyText).toHaveBeenCalledWith("e1");
      expect(write).toHaveBeenCalledWith("copied-text");
      expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull();
    });

    it("copies from the toolbar button too, exactly once", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      renderEntry(plainEntry);
      await clickId("scratch-copy");
      expect(write).toHaveBeenCalledTimes(1);
    });

    it("advertises that the row is clickable", () => {
      renderEntry(plainEntry);
      expect(row()).toHaveAttribute("title", "Click to copy");
      expect(row()).toHaveClass("cursor-pointer");
    });

    it("says what the copy button copies", () => {
      renderEntry(secretEntry);
      expect(screen.getByTestId("scratch-copy")).toHaveAttribute("aria-label", "Copy value");
    });

    it("says it copies the whole entry when it is not just a labelled value", () => {
      renderEntry(plainEntry);
      expect(screen.getByTestId("scratch-copy")).toHaveAttribute("aria-label", "Copy entry");
    });

    it("copies only the clicked secret, not the whole entry", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      const { actions } = renderEntry(secretEntry);
      await clickId("scratch-mask");
      expect(actions.getSecretValue).toHaveBeenCalledWith("e1", 0);
      expect(actions.getCopyText).not.toHaveBeenCalled();
      expect(write).toHaveBeenCalledTimes(1);
      expect(write).toHaveBeenCalledWith("3knd8dsuhds89hds");
      expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull();
    });

    it("does not copy when the user is selecting text", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      jest.spyOn(window, "getSelection").mockReturnValue({ toString: () => "mvn" } as Selection);
      renderEntry(plainEntry);
      await click(row());
      expect(write).not.toHaveBeenCalled();
    });

    it("keeps copying when the browser has no selection object", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      jest.spyOn(window, "getSelection").mockReturnValue(null);
      renderEntry(plainEntry);
      await click(row());
      expect(write).toHaveBeenCalled();
    });

    it("keeps copy available while presenting", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      renderEntry(secretEntry, true);
      await click(row());
      expect(write).toHaveBeenCalledWith("copied-text");
    });
  });

  describe("copied tick", () => {
    beforeEach(() => jest.useFakeTimers());

    it("shows the kind glyph at rest", () => {
      renderEntry(plainEntry);
      expect(screen.queryByTestId("scratch-copied-tick")).toBeNull();
      expect(row()).toHaveTextContent("$");
      expect(row()).toHaveAttribute("data-copied", "false");
    });

    it("replaces the glyph with a green tick for two seconds after a copy", async () => {
      jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      renderEntry(plainEntry);
      await click(row());
      const tick = screen.getByTestId("scratch-copied-tick");
      expect(tick).toHaveClass("text-success");
      expect(row()).toHaveAttribute("data-copied", "true");
      expect(row()).not.toHaveTextContent("$");

      await advance(COPIED_TICK_MS - 1);
      expect(screen.getByTestId("scratch-copied-tick")).toBeInTheDocument();
      await advance(1);
      expect(screen.queryByTestId("scratch-copied-tick")).toBeNull();
      expect(row()).toHaveTextContent("$");
    });

    it("lasts 2 seconds", () => {
      expect(COPIED_TICK_MS).toBe(2000);
    });

    it("ticks after copying a single secret too", async () => {
      jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      renderEntry(secretEntry);
      await clickId("scratch-mask");
      expect(screen.getByTestId("scratch-copied-tick")).toBeInTheDocument();
    });

    it("does not tick when the clipboard write fails", async () => {
      jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(false);
      renderEntry(plainEntry);
      await click(row());
      expect(screen.queryByTestId("scratch-copied-tick")).toBeNull();
    });

    it("does not tick when a secret can't be copied", async () => {
      jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(false);
      renderEntry(secretEntry);
      await clickId("scratch-mask");
      expect(screen.queryByTestId("scratch-copied-tick")).toBeNull();
    });
  });

  describe("clipboard auto-clear", () => {
    const fakeClipboard = () => {
      jest.useFakeTimers();
      jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      return jest.spyOn(clipboard, "clearClipboard").mockResolvedValue(true);
    };

    it("clears the clipboard 30s after copying an entry with a secret", async () => {
      const wipe = fakeClipboard();
      renderEntry(secretEntry);
      await click(row());
      await advance(29_999);
      expect(wipe).not.toHaveBeenCalled();
      await advance(1);
      expect(wipe).toHaveBeenCalledTimes(1);
    });

    it("clears after copying a single masked secret", async () => {
      const wipe = fakeClipboard();
      renderEntry(secretEntry);
      await clickId("scratch-mask");
      await advance(30_000);
      expect(wipe).toHaveBeenCalledTimes(1);
    });

    it("does not clear after copying an entry without secrets", async () => {
      const wipe = fakeClipboard();
      renderEntry(plainEntry);
      await click(row());
      await advance(60_000);
      expect(wipe).not.toHaveBeenCalled();
    });

    it("does not wipe a harmless copy made after a secret copy", async () => {
      const wipe = fakeClipboard();
      const first = renderEntry(secretEntry);
      await click(row());
      first.unmount();
      renderEntry(plainEntry);
      await click(row());
      await advance(60_000);
      expect(wipe).not.toHaveBeenCalled();
    });

    it("does nothing when the setting is off", async () => {
      const wipe = fakeClipboard();
      useScratchSettingsStore.setState({ clipboardAutoClear: false });
      renderEntry(secretEntry);
      await click(row());
      await advance(60_000);
      expect(wipe).not.toHaveBeenCalled();
    });
  });

  describe("not a secret", () => {
    it("is only offered once the secret is revealed", async () => {
      renderEntry(secretEntry);
      expect(screen.queryByTestId("scratch-not-secret")).toBeNull();
      await clickId("scratch-reveal");
      expect(screen.getByTestId("scratch-not-secret")).toBeInTheDocument();
    });

    it("unmasks that secret and hides the revealed value, without copying", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      const { actions } = renderEntry(secretEntry);
      await clickId("scratch-reveal");
      await clickId("scratch-not-secret");
      expect(actions.markNotSecret).toHaveBeenCalledWith("e1", 0);
      expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull();
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe("select to mask", () => {
    const openEditor = async () => {
      const view = renderEntry(plainEntry);
      fireEvent.click(screen.getByTestId("scratch-more"));
      await clickId("scratch-mask-mode");
      return view;
    };

    it("shows the raw text read-only in an editor and closes the menu", async () => {
      const { actions } = await openEditor();
      expect(actions.getEditableText).toHaveBeenCalledWith("e2");
      const text = screen.getByTestId("scratch-mask-text") as HTMLTextAreaElement;
      expect(text.value).toBe("UAT key: 3knd8dsuhds89hds");
      expect(text).toHaveAttribute("readonly");
      expect(screen.queryByRole("menu")).toBeNull();
    });

    it("cannot mask until something is selected", async () => {
      await openEditor();
      expect(screen.getByTestId("scratch-mask-selection")).toBeDisabled();
    });

    it("cannot mask a whitespace-only selection", async () => {
      await openEditor();
      const text = screen.getByTestId("scratch-mask-text") as HTMLTextAreaElement;
      act(() => {
        text.setSelectionRange(3, 4);
        fireEvent.select(text);
      });
      expect(screen.getByTestId("scratch-mask-selection")).toBeDisabled();
    });

    it("masks the selected range and closes the editor", async () => {
      const { actions } = await openEditor();
      const text = screen.getByTestId("scratch-mask-text") as HTMLTextAreaElement;
      act(() => {
        text.setSelectionRange(9, 25);
        fireEvent.select(text);
      });
      await clickId("scratch-mask-selection");
      expect(actions.maskRange).toHaveBeenCalledWith("e2", 9, 25);
      expect(screen.queryByTestId("scratch-mask-editor")).toBeNull();
    });

    it("closes without masking on Done", async () => {
      const { actions } = await openEditor();
      await clickId("scratch-mask-done");
      expect(screen.queryByTestId("scratch-mask-editor")).toBeNull();
      expect(actions.maskRange).not.toHaveBeenCalled();
    });

    it("does not copy the entry when clicking inside the editor", async () => {
      const write = jest.spyOn(clipboard, "copyToClipboard").mockResolvedValue(true);
      await openEditor();
      await clickId("scratch-mask-text");
      await clickId("scratch-mask-done");
      expect(write).not.toHaveBeenCalled();
    });
  });

  describe("presenting", () => {
    it("removes the reveal and mask-text controls", () => {
      renderEntry(secretEntry, true);
      expect(screen.queryByTestId("scratch-reveal")).toBeNull();
      fireEvent.click(screen.getByTestId("scratch-more"));
      expect(screen.queryByTestId("scratch-mask-mode")).toBeNull();
    });

    it("hides an already revealed secret when presenting starts", async () => {
      const actions = createActions();
      const { rerender } = renderEntry(secretEntry, false, actions);
      await clickId("scratch-reveal");
      expect(screen.getByTestId("scratch-secret-revealed")).toBeInTheDocument();
      rerender(
        <ul>
          <ScratchReadableEntry item={secretEntry} actions={actions} presenting />
        </ul>,
      );
      await waitFor(() => expect(screen.queryByTestId("scratch-secret-revealed")).toBeNull());
    });

    it("closes an open mask editor when presenting starts", async () => {
      const actions = createActions();
      const { rerender } = renderEntry(plainEntry, false, actions);
      fireEvent.click(screen.getByTestId("scratch-more"));
      await clickId("scratch-mask-mode");
      expect(screen.getByTestId("scratch-mask-editor")).toBeInTheDocument();
      rerender(
        <ul>
          <ScratchReadableEntry item={plainEntry} actions={actions} presenting />
        </ul>,
      );
      await waitFor(() => expect(screen.queryByTestId("scratch-mask-editor")).toBeNull());
    });
  });
});
