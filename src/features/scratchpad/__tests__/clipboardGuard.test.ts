import { createClipboardGuard } from "../services/clipboardGuard";

describe("clipboardGuard", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("clears the clipboard once the delay has passed", () => {
    const clear = jest.fn().mockResolvedValue(true);
    createClipboardGuard(clear).protect(1000);
    jest.advanceTimersByTime(999);
    expect(clear).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("restarts the delay when protecting again, clearing only once", () => {
    const clear = jest.fn().mockResolvedValue(true);
    const guard = createClipboardGuard(clear);
    guard.protect(1000);
    jest.advanceTimersByTime(800);
    guard.protect(1000);
    jest.advanceTimersByTime(800);
    expect(clear).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("does not clear after being cancelled", () => {
    const clear = jest.fn().mockResolvedValue(true);
    const guard = createClipboardGuard(clear);
    guard.protect(1000);
    guard.cancel();
    jest.advanceTimersByTime(5000);
    expect(clear).not.toHaveBeenCalled();
  });

  it("can be cancelled when nothing is pending", () => {
    expect(() => createClipboardGuard(jest.fn()).cancel()).not.toThrow();
  });

  it("can protect again after a clear has fired", () => {
    const clear = jest.fn().mockResolvedValue(true);
    const guard = createClipboardGuard(clear);
    guard.protect(100);
    jest.advanceTimersByTime(100);
    guard.protect(100);
    jest.advanceTimersByTime(100);
    expect(clear).toHaveBeenCalledTimes(2);
  });
});
