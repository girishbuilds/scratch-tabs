import { createReconcileResponse, reconcile } from "../engine";
import { ReconcileInput } from "../types";

const input = (a: string, b: string, overrides: Partial<ReconcileInput["options"]> = {}): ReconcileInput => ({
  a, b, options: { mode: "line", normalization: { trim: true, ignoreCase: false, collapseWhitespace: false }, scopeA: { kind: "all" }, scopeB: { kind: "all" }, keyPairs: [], ...overrides },
});

describe("reconcile", () => {
  it("matches unordered lines and preserves duplicate occurrences", () => {
    const result = reconcile(input("one\ntwo\none", "one\nthree"));
    expect(result.inBoth).toHaveLength(1);
    expect(result.onlyA.map((row) => row.text)).toEqual(["two", "one"]);
    expect(result.onlyB.map((row) => row.text)).toEqual(["three"]);
  });

  it("applies normalisation and regex scopes", () => {
    const result = reconcile(input(" Alpha   beta \nignore", "alpha beta", {
      normalization: { trim: true, ignoreCase: true, collapseWhitespace: true },
      scopeA: { kind: "matching", pattern: "Alpha" },
    }));
    expect(result.inBoth).toHaveLength(1);
    expect(result.onlyA).toHaveLength(0);
  });

  it("reports invalid regex scopes as actionable errors", () => {
    expect(() => reconcile(input("a", "a", { scopeA: { kind: "matching", pattern: "[" } }))).toThrow("scope regular expression");
  });

  it("compares CSV rows by independently mapped key columns and reports changed fields", () => {
    const result = reconcile(input("email,name,role\na@example.com,Ada,admin\nb@example.com,Bob,user", "user_email,name,role\nb@example.com,Bob,editor\na@example.com,Ada,admin\nc@example.com,Cia,user", {
      mode: "csv", keyPairs: [{ a: "email", b: "user_email" }],
    }));
    expect(result.inBoth).toHaveLength(1);
    expect(result.changed).toHaveLength(1);
    expect(result.changed[0].differences).toEqual([{ column: "role", a: "user", b: "editor" }]);
    expect(result.onlyB.map((row) => row.values?.user_email)).toEqual(["c@example.com"]);
  });

  it("validates malformed or ambiguous CSV headers", () => {
    expect(() => reconcile(input("email,email\na,b", "email\na", { mode: "csv" }))).toThrow("duplicate header");
  });

  it("ignores non-key columns present on only one CSV source", () => {
    const result = reconcile(input("id,name,extra\n1,Ada,yes", "id,name\n1,Ada", { mode: "csv", keyPairs: [{ a: "id", b: "id" }] }));
    expect(result.changed).toHaveLength(0);
    expect(result.inBoth).toHaveLength(1);
  });

  it("counts rows as in both when every non-key column is missing from one CSV source", () => {
    const result = reconcile(input("id,code\n1,X\n2,Y", "id,code,note\n1,X,hello\n2,Y,world", { mode: "csv" }));
    expect(result.inBoth).toHaveLength(2);
    expect(result.changed).toHaveLength(0);
    expect(result.onlyA).toHaveLength(0);
    expect(result.onlyB).toHaveLength(0);
  });

  it("still reports differences for non-key columns shared by both CSV sources", () => {
    const result = reconcile(input("id,code,note\n1,X,hello", "id,code,note\n1,X,goodbye", { mode: "csv", keyPairs: [{ a: "id", b: "id" }] }));
    expect(result.inBoth).toHaveLength(0);
    expect(result.changed[0].differences).toEqual([{ column: "note", a: "hello", b: "goodbye" }]);
  });

  it("supports set semantics when requested", () => {
    const result = reconcile(input("same\nsame", "same\nsame", { treatDuplicatesAsOne: true }));
    expect(result.inBoth).toHaveLength(1);
    expect(result.onlyA).toHaveLength(0);
    expect(result.onlyB).toHaveLength(0);
  });
});

describe("createReconcileResponse", () => {
  it("returns headers and error for disjoint CSV headers with no keyPairs", () => {
    const response = createReconcileResponse(input("id,name\n1,Ada", "ref,title\n9,Guide", { mode: "csv" }));
    expect(response.result).toBeUndefined();
    expect(response.error).toBe("No shared CSV headers found. Choose columns manually to match these files.");
    expect(response.headers).toEqual({ a: ["id", "name"], b: ["ref", "title"] });
  });

  it("returns result and parsed headers for explicit mapped keys", () => {
    const response = createReconcileResponse(input("email,name\na@x,Ada", "user_email,name\na@x,Ada", {
      mode: "csv", keyPairs: [{ a: "email", b: "user_email" }],
    }));
    expect(response.error).toBeUndefined();
    expect(response.result?.onlyA).toHaveLength(0);
    expect(response.result?.onlyB).toHaveLength(0);
    expect(response.result?.inBoth).toHaveLength(1);
    expect(response.headers).toEqual({ a: ["email", "name"], b: ["user_email", "name"] });
  });

  it("returns current headers when keyPairs reference stale columns", () => {
    const response = createReconcileResponse(input("email,name\na@x,Ada", "user_email,name\na@x,Ada", {
      mode: "csv", keyPairs: [{ a: "email", b: "legacy_email" }],
    }));
    expect(response.result).toBeUndefined();
    expect(response.error).toBe("Choose valid CSV key columns for both sources.");
    expect(response.headers).toEqual({ a: ["email", "name"], b: ["user_email", "name"] });
  });

  it("preserves headers when scope validation fails", () => {
    const response = createReconcileResponse(input("id,name\n1,Ada", "id,name\n1,Ada", {
      mode: "csv", scopeA: { kind: "matching", pattern: "[" },
    }));
    expect(response.result).toBeUndefined();
    expect(response.error).toBe("The scope regular expression is invalid.");
    expect(response.headers).toEqual({ a: ["id", "name"], b: ["id", "name"] });
  });

  it("preserves valid other source headers when one CSV source is malformed", () => {
    const response = createReconcileResponse(input("id,email\n1,\"unterminated", "ref,title\n9,Guide", { mode: "csv" }));
    expect(response.result).toBeUndefined();
    expect(response.error).toContain("Unable to parse CSV A");
    expect(response.headers).toEqual({ a: [], b: ["ref", "title"] });
  });

  it("preserves valid other source headers when one CSV source has duplicate headers", () => {
    const response = createReconcileResponse(input("id,id\n1,2", "ref,title\n9,Guide", { mode: "csv" }));
    expect(response.result).toBeUndefined();
    expect(response.error).toContain("duplicate header names");
    expect(response.headers).toEqual({ a: [], b: ["ref", "title"] });
  });

  it("preserves valid other source headers when one CSV source is empty", () => {
    const response = createReconcileResponse(input("", "ref,title\n9,Guide", { mode: "csv" }));
    expect(response.result).toBeUndefined();
    expect(response.error).toContain("Unable to parse CSV A");
    expect(response.headers).toEqual({ a: [], b: ["ref", "title"] });
  });

  it("returns a successful CSV response with headers", () => {
    const response = createReconcileResponse(input("id,name,city\n1,Ada,London", "id,name,city\n1,Ada,Paris", { mode: "csv", keyPairs: [{ a: "id", b: "id" }] }));
    expect(response.error).toBeUndefined();
    expect(response.result?.inBoth).toHaveLength(0);
    expect(response.result?.changed).toHaveLength(1);
    expect(response.result?.changed[0].differences).toEqual([{ column: "city", a: "London", b: "Paris" }]);
    expect(response.headers).toEqual({ a: ["id", "name", "city"], b: ["id", "name", "city"] });
  });

  it("returns line mode results without headers on success", () => {
    const response = createReconcileResponse(input("one", "one"));
    expect(response.error).toBeUndefined();
    expect(response.result?.inBoth).toHaveLength(1);
    expect(response.headers).toBeUndefined();
  });

  it("returns error without headers for line mode scope failures", () => {
    const response = createReconcileResponse(input("one", "one", { scopeB: { kind: "matching", pattern: "[" } }));
    expect(response.result).toBeUndefined();
    expect(response.error).toBe("The scope regular expression is invalid.");
    expect(response.headers).toBeUndefined();
  });
});
