import { createReconcileCache, isSameInput } from "../reconcileCache";
import { ReconcileInput, ReconcileResponse } from "../types";

const options: ReconcileInput["options"] = {
  mode: "line",
  normalization: { trim: true, ignoreCase: false, collapseWhitespace: false },
  scopeA: { kind: "all" },
  scopeB: { kind: "all" },
  keyPairs: [],
};
const input = (a: string, b = "b", opts = options): ReconcileInput => ({ a, b, options: opts });
const response = (label: string): ReconcileResponse => ({ error: label });

describe("isSameInput", () => {
  it("matches equal content and options even for distinct objects", () => {
    expect(isSameInput(input("a"), input("a", "b", { ...options }))).toBe(true);
  });

  it.each([
    ["source A", input("changed")],
    ["source B", input("a", "changed")],
    ["options", input("a", "b", { ...options, mode: "csv" })],
  ])("differs when %s differs", (_name, other) => {
    expect(isSameInput(input("a"), other)).toBe(false);
  });
});

describe("createReconcileCache", () => {
  it("returns undefined for an input it has not seen", () => {
    expect(createReconcileCache(2).get(input("a"))).toBeUndefined();
  });

  it("returns the stored response for an equal input", () => {
    const cache = createReconcileCache(2);
    cache.set(input("a"), response("one"));
    expect(cache.get(input("a"))).toEqual(response("one"));
  });

  it("replaces the response when the same input is stored again", () => {
    const cache = createReconcileCache(2);
    cache.set(input("a"), response("old"));
    cache.set(input("a"), response("new"));
    cache.set(input("b"), response("other"));
    expect(cache.get(input("a"))).toEqual(response("new"));
  });

  it("evicts the least recently used entry beyond the limit", () => {
    const cache = createReconcileCache(2);
    cache.set(input("a"), response("a"));
    cache.set(input("b"), response("b"));
    cache.get(input("a"));
    cache.set(input("c"), response("c"));

    expect(cache.get(input("b"))).toBeUndefined();
    expect(cache.get(input("a"))).toEqual(response("a"));
    expect(cache.get(input("c"))).toEqual(response("c"));
  });

  it("forgets everything on clear", () => {
    const cache = createReconcileCache(2);
    cache.set(input("a"), response("a"));
    cache.clear();
    expect(cache.get(input("a"))).toBeUndefined();
  });
});
