import { act, renderHook } from "@testing-library/react";
import { useEntrySelection } from "../hooks/useEntrySelection";

const ORDER = ["a", "b", "c", "d", "e"];
const ids = (selected: ReadonlySet<string>) => [...selected].sort();

describe("useEntrySelection", () => {
  it("starts inactive with nothing selected", () => {
    const { result } = renderHook(() => useEntrySelection());
    expect(result.current.active).toBe(false);
    expect(result.current.selected.size).toBe(0);
  });

  it("start enters the mode without selecting anything", () => {
    const { result } = renderHook(() => useEntrySelection());
    act(() => result.current.start());
    expect(result.current.active).toBe(true);
    expect(result.current.selected.size).toBe(0);
  });

  it("selecting an entry enters the mode and toggles it", () => {
    const { result } = renderHook(() => useEntrySelection());
    act(() => result.current.select("b", false, ORDER));
    expect(result.current.active).toBe(true);
    expect(ids(result.current.selected)).toEqual(["b"]);
    act(() => result.current.select("b", false, ORDER));
    expect(ids(result.current.selected)).toEqual([]);
    expect(result.current.active).toBe(true);
  });

  it("shift selects the range from the last click, adding to what is selected", () => {
    const { result } = renderHook(() => useEntrySelection());
    act(() => result.current.select("a", false, ORDER));
    act(() => result.current.select("e", false, ORDER));
    act(() => result.current.select("c", false, ORDER));
    act(() => result.current.select("b", true, ORDER));
    expect(ids(result.current.selected)).toEqual(["a", "b", "c", "e"]);
  });

  it("shift with no earlier click just toggles the entry", () => {
    const { result } = renderHook(() => useEntrySelection());
    act(() => result.current.select("c", true, ORDER));
    expect(ids(result.current.selected)).toEqual(["c"]);
  });

  it("selectAll and clear replace the selection but stay in the mode", () => {
    const { result } = renderHook(() => useEntrySelection());
    act(() => result.current.start());
    act(() => result.current.selectAll(["a", "b"]));
    expect(ids(result.current.selected)).toEqual(["a", "b"]);
    act(() => result.current.clear());
    expect(result.current.selected.size).toBe(0);
    expect(result.current.active).toBe(true);
  });

  it("retain drops entries that are no longer shown", () => {
    const { result } = renderHook(() => useEntrySelection());
    act(() => result.current.selectAll(["a", "b", "c"]));
    act(() => result.current.retain(["b"]));
    expect(ids(result.current.selected)).toEqual(["b"]);
  });

  it("exit leaves the mode, clears the selection and forgets the range anchor", () => {
    const { result } = renderHook(() => useEntrySelection());
    act(() => result.current.select("a", false, ORDER));
    act(() => result.current.exit());
    expect(result.current.active).toBe(false);
    expect(result.current.selected.size).toBe(0);
    act(() => result.current.select("c", true, ORDER));
    expect(ids(result.current.selected)).toEqual(["c"]);
  });
});
