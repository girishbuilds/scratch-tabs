import { act, renderHook } from "@testing-library/react";
import { ReconcileListener } from "../reconcileRunner";
import { reconcileRunner } from "../sharedReconcileRunner";
import { emptyResult, useReconciliation } from "../useReconciliation";
import { ReconcileInput, ReconcileResponse } from "../types";

jest.mock("../sharedReconcileRunner", () => ({
  reconcileRunner: { peek: jest.fn(), run: jest.fn(), clear: jest.fn() },
}));

const runner = reconcileRunner as jest.Mocked<typeof reconcileRunner>;
const options: ReconcileInput["options"] = {
  mode: "line",
  normalization: { trim: true, ignoreCase: false, collapseWhitespace: false },
  scopeA: { kind: "all" },
  scopeB: { kind: "all" },
  keyPairs: [],
};
const inputA: ReconcileInput = { a: "a", b: "b", options };
const inputB: ReconcileInput = { a: "b", b: "b", options };
const success: ReconcileResponse = { result: { ...emptyResult, onlyA: [{ source: "A", rowNumber: 1, text: "x" }] } };

describe("useReconciliation", () => {
  let listeners: ReconcileListener[];
  const release = jest.fn();

  beforeEach(() => {
    listeners = [];
    release.mockClear();
    runner.peek.mockReset().mockReturnValue(undefined);
    // Like the real runner, a cached input is delivered synchronously.
    runner.run.mockReset().mockImplementation((candidate, listener) => {
      const cached = runner.peek(candidate);
      if (cached) listener(cached); else listeners.push(listener);
      return { release };
    });
  });

  it("is idle without an input", () => {
    const { result } = renderHook(() => useReconciliation(null));
    expect(result.current).toEqual({ result: { ...emptyResult, headers: undefined }, error: null, hasResponse: false, isProcessing: false });
    expect(runner.run).not.toHaveBeenCalled();
  });

  it("reports processing until the runner responds, then exposes the result", () => {
    const { result } = renderHook(() => useReconciliation(inputA));
    expect(result.current.isProcessing).toBe(true);
    expect(result.current.hasResponse).toBe(false);

    act(() => listeners[0](success));

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.hasResponse).toBe(true);
    expect(result.current.result).toBe(success.result);
    expect(result.current.error).toBeNull();
  });

  it("exposes an error response together with its headers", () => {
    const { result } = renderHook(() => useReconciliation(inputA));
    act(() => listeners[0]({ error: "bad", headers: { a: ["id"], b: [] } }));

    expect(result.current.error).toBe("bad");
    expect(result.current.result).toEqual({ ...emptyResult, headers: { a: ["id"], b: [] } });
  });

  it("starts with a cached response and no processing flash", () => {
    runner.peek.mockReturnValue(success);
    const { result } = renderHook(() => useReconciliation(inputA));

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.result).toBe(success.result);
  });

  it("keeps the previous result visible while a new input is processed", () => {
    const { result, rerender } = renderHook(({ value }) => useReconciliation(value), { initialProps: { value: inputA } });
    act(() => listeners[0](success));
    rerender({ value: inputB });

    expect(result.current.isProcessing).toBe(true);
    expect(result.current.result).toBe(success.result);
  });

  it("releases its subscription when the input changes or the hook unmounts", () => {
    const { rerender, unmount } = renderHook(({ value }) => useReconciliation(value), { initialProps: { value: inputA } });
    rerender({ value: inputB });
    expect(release).toHaveBeenCalledTimes(1);
    unmount();
    expect(release).toHaveBeenCalledTimes(2);
  });

  it("clears the response when the input is removed", () => {
    const { result, rerender } = renderHook(({ value }: { value: ReconcileInput | null }) => useReconciliation(value), { initialProps: { value: inputA as ReconcileInput | null } });
    act(() => listeners[0](success));
    rerender({ value: null });

    expect(result.current.hasResponse).toBe(false);
    expect(result.current.isProcessing).toBe(false);
  });
});
