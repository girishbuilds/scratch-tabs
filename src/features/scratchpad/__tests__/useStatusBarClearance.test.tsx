import { act, renderHook } from "@testing-library/react";
import { useStatusBarClearance } from "../hooks/useStatusBarClearance";

const addStatusBar = (top: number) => {
  const bar = document.createElement("div");
  bar.setAttribute("data-testid", "status-bar");
  bar.getBoundingClientRect = () => ({ top }) as DOMRect;
  document.body.appendChild(bar);
  return bar;
};

describe("useStatusBarClearance", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is zero when there is no status bar (welcome screen, some tablets)", () => {
    const { result } = renderHook(() => useStatusBarClearance(true));
    expect(result.current).toBe(0);
  });

  it("is the height of the status bar", () => {
    addStatusBar(871);
    const { result } = renderHook(() => useStatusBarClearance(true));
    expect(result.current).toBe(29);
  });

  it("uses the highest bar when the view is split", () => {
    addStatusBar(871);
    addStatusBar(860);
    const { result } = renderHook(() => useStatusBarClearance(true));
    expect(result.current).toBe(40);
  });

  it("does not measure while the drawer is closed", () => {
    addStatusBar(871);
    const { result } = renderHook(() => useStatusBarClearance(false));
    expect(result.current).toBe(0);
  });

  it("follows the status bar as it appears and disappears", async () => {
    const { result } = renderHook(() => useStatusBarClearance(true));
    expect(result.current).toBe(0);
    let bar!: HTMLElement;
    await act(async () => {
      bar = addStatusBar(871);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    });
    expect(result.current).toBe(29);
    await act(async () => {
      bar.remove();
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    });
    expect(result.current).toBe(0);
  });
});
