import { filterEntries, getSearchableText } from "../services/searchEntries";
import type { ScratchEntryView, ScratchListItem } from "../types";

const view = (id: string, segments: ScratchEntryView["segments"]): ScratchEntryView => ({
  id,
  kind: "secret",
  copyTarget: "all",
  createdAt: 1,
  batchIndex: 0,
  pinned: false,
  secretCount: segments.filter((s) => s.type === "secret").length,
  segments,
});

const uat = view("uat", [
  { type: "text", text: "UAT key: " },
  { type: "secret", index: 0 },
]);
const mvn = view("mvn", [{ type: "text", text: "mvn clean verify" }]);
const bad: ScratchListItem = { id: "bad", kind: "unreadable", createdAt: 1, batchIndex: 0, pinned: false };

describe("getSearchableText", () => {
  it("joins only the non-secret text", () => {
    expect(getSearchableText(uat)).toBe("UAT key:  ");
  });

  it("has nothing to search in an unreadable entry", () => {
    expect(getSearchableText(bad)).toBe("");
  });
});

describe("filterEntries", () => {
  const all = [uat, mvn, bad];

  it("returns everything for an empty or blank query", () => {
    expect(filterEntries(all, "")).toEqual(all);
    expect(filterEntries(all, "   ")).toEqual(all);
  });

  it("matches case-insensitively on visible text", () => {
    expect(filterEntries(all, "uat KEY")).toEqual([uat]);
    expect(filterEntries(all, "VERIFY")).toEqual([mvn]);
  });

  it("trims the query", () => {
    expect(filterEntries(all, "  mvn ")).toEqual([mvn]);
  });

  it("never matches unreadable entries while searching", () => {
    expect(filterEntries(all, "!")).toEqual([]);
  });

  it("finds nothing for text that exists only inside a secret", () => {
    const secretValue = "3knd8dsuhds89hds";
    expect(filterEntries(all, secretValue)).toEqual([]);
  });

  it("returns a new array", () => {
    expect(filterEntries(all, "")).not.toBe(all);
  });
});
