import { act, renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { isScratchHotkey, useScratchHotkey } from "../hooks/useScratchHotkey";
import { REVEAL_TTL_MS, useSecretReveal } from "../hooks/useSecretReveal";
import { useTransientFlag } from "../hooks/useTransientFlag";
import { useDrawerResize } from "../hooks/useDrawerResize";
import { useExpiringValue } from "../hooks/useExpiringValue";
import { clearClipboard, copyToClipboard } from "../utils/copyToClipboard";

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

describe("clearClipboard", () => {
  const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  afterEach(() => {
    if (original) Object.defineProperty(navigator, "clipboard", original);
    else delete (navigator as unknown as { clipboard?: unknown }).clipboard;
  });

  it("overwrites the clipboard with an empty string", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await clearClipboard()).toBe(true);
    expect(writeText).toHaveBeenCalledWith("");
  });

  it("reports false when the page isn't allowed to write (e.g. not focused)", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockRejectedValue(new Error("not focused")) },
      configurable: true,
    });
    expect(await clearClipboard()).toBe(false);
  });
});

describe("useExpiringValue", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = (load = jest.fn().mockResolvedValue("plain"), ttl = 1000) =>
    renderHook(() => useExpiringValue(load, ttl));

  it("holds nothing until shown", () => {
    const { result } = setup();
    expect(result.current).toMatchObject({ value: null, isActive: false });
  });

  it("loads the value when shown", async () => {
    const load = jest.fn().mockResolvedValue("plain");
    const { result } = setup(load);
    await act(() => result.current.show());
    expect(result.current).toMatchObject({ value: "plain", isActive: true });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("treats an empty string as an active value", async () => {
    const { result } = setup(jest.fn().mockResolvedValue(""));
    await act(() => result.current.show());
    expect(result.current.isActive).toBe(true);
  });

  it("discards the value after the TTL", async () => {
    const { result } = setup();
    await act(() => result.current.show());
    act(() => void jest.advanceTimersByTime(999));
    expect(result.current.isActive).toBe(true);
    act(() => void jest.advanceTimersByTime(1));
    expect(result.current.value).toBeNull();
  });

  it("restarts the TTL when shown again", async () => {
    const { result } = setup();
    await act(() => result.current.show());
    act(() => void jest.advanceTimersByTime(800));
    await act(() => result.current.show());
    act(() => void jest.advanceTimersByTime(800));
    expect(result.current.isActive).toBe(true);
  });

  it("discards the value when the window loses focus", async () => {
    const { result } = setup();
    await act(() => result.current.show());
    act(() => void window.dispatchEvent(new Event("blur")));
    expect(result.current.value).toBeNull();
  });

  it("toggles between shown and hidden", async () => {
    const { result } = setup();
    await act(() => result.current.toggle());
    expect(result.current.isActive).toBe(true);
    await act(() => result.current.toggle());
    expect(result.current.isActive).toBe(false);
  });

  it("hides explicitly and cancels the timer", async () => {
    const { result } = setup();
    await act(() => result.current.show());
    act(() => result.current.hide());
    expect(result.current.value).toBeNull();
    expect(jest.getTimerCount()).toBe(0);
  });

  describe("while a load is still in flight", () => {
    const deferred = () => {
      let resolve!: (value: string) => void;
      const promise = new Promise<string>((r) => (resolve = r));
      return { promise, resolve };
    };

    it("does not show the value if it was hidden before the load finished", async () => {
      const d = deferred();
      const { result } = setup(jest.fn().mockReturnValue(d.promise));
      let shown!: Promise<void>;
      act(() => {
        shown = result.current.show();
      });
      act(() => result.current.hide());
      await act(async () => {
        d.resolve("plain");
        await shown;
      });
      expect(result.current.value).toBeNull();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("does not show the value if the window lost focus before the load finished", async () => {
      const d = deferred();
      const { result } = setup(jest.fn().mockReturnValue(d.promise));
      let shown!: Promise<void>;
      act(() => {
        shown = result.current.show();
      });
      act(() => void window.dispatchEvent(new Event("blur")));
      await act(async () => {
        d.resolve("plain");
        await shown;
      });
      expect(result.current.value).toBeNull();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("does not start a timer or set state if unmounted before the load finished", async () => {
      const d = deferred();
      const { result, unmount } = setup(jest.fn().mockReturnValue(d.promise));
      let shown!: Promise<void>;
      act(() => {
        shown = result.current.show();
      });
      unmount();
      d.resolve("plain");
      await shown;
      expect(jest.getTimerCount()).toBe(0);
    });

    it("stops listening for blur once the load fails", async () => {
      const spy = jest.spyOn(window, "removeEventListener");
      const { result } = setup(jest.fn().mockRejectedValue(new Error("nope")));
      await act(async () => {
        await expect(result.current.show()).rejects.toThrow("nope");
      });
      expect(spy).toHaveBeenCalledWith("blur", expect.any(Function));
      spy.mockRestore();
    });
  });

  it("does not leave a timer or listener behind on unmount", async () => {
    const { result, unmount } = setup();
    await act(() => result.current.show());
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("useDrawerResize", () => {
  const originalWidth = window.innerWidth;
  beforeEach(() => Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true }));
  afterEach(() => Object.defineProperty(window, "innerWidth", { value: originalWidth, configurable: true }));

  const pointer = (clientX: number) =>
    ({ clientX, pointerId: 1, currentTarget: { setPointerCapture: jest.fn() } }) as never;
  const key = (k: string, shiftKey = false) =>
    ({ key: k, shiftKey, preventDefault: jest.fn() }) as never;

  it("reports the stored width when idle", () => {
    const { result } = renderHook(() => useDrawerResize(380, jest.fn()));
    expect(result.current).toMatchObject({ width: 380, isDragging: false });
  });

  it("tracks the pointer while dragging and commits once on release", () => {
    const commit = jest.fn();
    const { result } = renderHook(() => useDrawerResize(380, commit));
    act(() => result.current.handleProps.onPointerDown(pointer(1000)));
    expect(result.current).toMatchObject({ width: 400, isDragging: true });
    act(() => result.current.handleProps.onPointerMove(pointer(700)));
    expect(result.current.width).toBe(700);
    expect(commit).not.toHaveBeenCalled();
    act(() => result.current.handleProps.onPointerUp());
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith(700);
    expect(result.current.isDragging).toBe(false);
  });

  it("clamps the dragged width", () => {
    const { result } = renderHook(() => useDrawerResize(380, jest.fn()));
    act(() => result.current.handleProps.onPointerDown(pointer(1000)));
    act(() => result.current.handleProps.onPointerMove(pointer(0)));
    expect(result.current.width).toBe(800);
    act(() => result.current.handleProps.onPointerMove(pointer(1390)));
    expect(result.current.width).toBe(320);
  });

  it("works without pointer capture support", () => {
    const { result } = renderHook(() => useDrawerResize(380, jest.fn()));
    act(() =>
      result.current.handleProps.onPointerDown({ clientX: 1000, pointerId: 1, currentTarget: {} } as never),
    );
    expect(result.current.isDragging).toBe(true);
  });

  it("ignores moves when not dragging", () => {
    const { result } = renderHook(() => useDrawerResize(380, jest.fn()));
    act(() => result.current.handleProps.onPointerMove(pointer(700)));
    expect(result.current.width).toBe(380);
  });

  it("does not commit when released without a drag", () => {
    const commit = jest.fn();
    const { result } = renderHook(() => useDrawerResize(380, commit));
    act(() => result.current.handleProps.onPointerCancel());
    expect(commit).not.toHaveBeenCalled();
  });

  it("widens with ArrowLeft and narrows with ArrowRight, faster with Shift", () => {
    const commit = jest.fn();
    const { result } = renderHook(() => useDrawerResize(400, commit));
    const left = key("ArrowLeft");
    result.current.handleProps.onKeyDown(left);
    expect(commit).toHaveBeenLastCalledWith(416);
    expect((left as { preventDefault: jest.Mock }).preventDefault).toHaveBeenCalled();
    result.current.handleProps.onKeyDown(key("ArrowRight"));
    expect(commit).toHaveBeenLastCalledWith(384);
    result.current.handleProps.onKeyDown(key("ArrowLeft", true));
    expect(commit).toHaveBeenLastCalledWith(448);
  });

  it("ignores other keys", () => {
    const commit = jest.fn();
    const { result } = renderHook(() => useDrawerResize(400, commit));
    const other = key("a");
    result.current.handleProps.onKeyDown(other);
    expect(commit).not.toHaveBeenCalled();
    expect((other as { preventDefault: jest.Mock }).preventDefault).not.toHaveBeenCalled();
  });

  it("resets to the default width on double-click", () => {
    const commit = jest.fn();
    const { result } = renderHook(() => useDrawerResize(600, commit));
    result.current.handleProps.onDoubleClick();
    expect(commit).toHaveBeenCalledWith(380);
  });
});
