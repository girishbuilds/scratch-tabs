import { act, renderHook } from "@testing-library/react";
import { useDelayedFlag } from "../useDelayedFlag";

describe("useDelayedFlag", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("stays false until the flag has been true for the delay", () => {
    const { result } = renderHook(() => useDelayedFlag(true, 150));
    expect(result.current).toBe(false);
    act(() => { jest.advanceTimersByTime(149); });
    expect(result.current).toBe(false);
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
  });

  it("never turns true when the flag clears before the delay", () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag, 150), { initialProps: { flag: true } });
    act(() => { jest.advanceTimersByTime(100); });
    rerender({ flag: false });
    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current).toBe(false);
  });

  it("turns false immediately once the flag clears", () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag, 150), { initialProps: { flag: true } });
    act(() => { jest.advanceTimersByTime(150); });
    expect(result.current).toBe(true);
    rerender({ flag: false });
    expect(result.current).toBe(false);
  });

  it("waits the full delay again when the flag turns on a second time", () => {
    const { result, rerender } = renderHook(({ flag }) => useDelayedFlag(flag, 150), { initialProps: { flag: true } });
    act(() => { jest.advanceTimersByTime(150); });
    rerender({ flag: false });
    rerender({ flag: true });
    expect(result.current).toBe(false);
    act(() => { jest.advanceTimersByTime(150); });
    expect(result.current).toBe(true);
  });
});
