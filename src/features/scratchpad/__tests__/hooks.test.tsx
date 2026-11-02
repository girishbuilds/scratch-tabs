import { act, renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { isScratchHotkey, useScratchHotkey } from "../hooks/useScratchHotkey";
import { REVEAL_TTL_MS, useSecretReveal } from "../hooks/useSecretReveal";
import { useTransientFlag } from "../hooks/useTransientFlag";
import { copyToClipboard } from "../utils/copyToClipboard";

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", { key: "y", ...init });

describe("isScratchHotkey", () => {
  it.each([
    ["Cmd+Shift+Y", { metaKey: true, shiftKey: true }, true],
    ["Ctrl+Shift+Y", { ctrlKey: true, shiftKey: true }, true],
    ["uppercase Y", { metaKey: true, shiftKey: true, key: "Y" }, true],
    ["without shift", { metaKey: true }, false],
    ["without a modifier", { shiftKey: true }, false],
    ["with alt", { metaKey: true, shiftKey: true, altKey: true }, false],
    ["another key", { metaKey: true, shiftKey: true, key: "k" }, false],
  ])("%s -> %s", (_name, init, expected) => {
    expect(isScratchHotkey(key(init))).toBe(expected);
  });
});

describe("useScratchHotkey", () => {
  it("calls the handler and stops the event before other listeners", () => {
    const onToggle = jest.fn();
    const downstream = jest.fn();
    document.body.addEventListener("keydown", downstream);
    renderHook(() => useScratchHotkey(onToggle));
    const event = key({ metaKey: true, shiftKey: true, bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(event);
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(downstream).not.toHaveBeenCalled();
    document.body.removeEventListener("keydown", downstream);
  });

  it("ignores unrelated keys and stops listening after unmount", () => {
    const onToggle = jest.fn();
    const { unmount } = renderHook(() => useScratchHotkey(onToggle));
    fireEvent.keyDown(document.body, { key: "a", metaKey: true, shiftKey: true });
    expect(onToggle).not.toHaveBeenCalled();
    unmount();
    fireEvent.keyDown(document.body, { key: "y", metaKey: true, shiftKey: true });
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("useSecretReveal", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("is hidden until toggled, then exposes the loaded values", async () => {
    const load = jest.fn().mockResolvedValue(["s3cret"]);
    const { result } = renderHook(() => useSecretReveal(load));
    expect(result.current).toMatchObject({ values: null, isRevealed: false });
    await act(async () => result.current.toggle());
    expect(result.current).toMatchObject({ values: ["s3cret"], isRevealed: true });
  });

  it("hides again when toggled a second time", async () => {
    const { result } = renderHook(() => useSecretReveal(async () => ["x"]));
    await act(async () => result.current.toggle());
    await act(async () => result.current.toggle());
    expect(result.current.values).toBeNull();
  });

  it("auto-hides after the TTL", async () => {
    const { result } = renderHook(() => useSecretReveal(async () => ["x"]));
    await act(async () => result.current.toggle());
    act(() => {
      jest.advanceTimersByTime(REVEAL_TTL_MS - 1);
    });
    expect(result.current.isRevealed).toBe(true);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.isRevealed).toBe(false);
  });

  it("hides when the window loses focus", async () => {
    const { result } = renderHook(() => useSecretReveal(async () => ["x"]));
    await act(async () => result.current.toggle());
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(result.current.isRevealed).toBe(false);
  });

  it("does not hold a timer or blur listener after unmount", async () => {
    const { result, unmount } = renderHook(() => useSecretReveal(async () => ["x"]));
    await act(async () => result.current.toggle());
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("honours a custom TTL", async () => {
    const { result } = renderHook(() => useSecretReveal(async () => ["x"], 50));
    await act(async () => result.current.toggle());
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(result.current.isRevealed).toBe(false);
  });
});

describe("useTransientFlag", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("turns on when triggered and off after the delay", () => {
    const { result } = renderHook(() => useTransientFlag(100));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current[0]).toBe(false);
  });

  it("restarts the delay when triggered again", () => {
    const { result } = renderHook(() => useTransientFlag(100));
    act(() => result.current[1]());
    act(() => {
      jest.advanceTimersByTime(60);
    });
    act(() => result.current[1]());
    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(result.current[0]).toBe(true);
  });

  it("clears its timer on unmount", () => {
    const { result, unmount } = renderHook(() => useTransientFlag(100));
    act(() => result.current[1]());
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("copyToClipboard", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  afterEach(() => {
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else delete (navigator as unknown as { clipboard?: unknown }).clipboard;
  });

  it("returns true when the clipboard write succeeds", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await copyToClipboard("abc")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  it("returns false when the browser refuses", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    expect(await copyToClipboard("abc")).toBe(false);
  });

  it("returns false when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    expect(await copyToClipboard("abc")).toBe(false);
  });
});
