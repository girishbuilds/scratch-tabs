import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useColumnSourceTabs } from "../hooks/useColumnSourceTabs";
import { useTabsStore } from "../../../../stores/tabsStore";
import { modelManager } from "../../../../services/modelManager";
import { Tab } from "../../../../types";

const makeTab = (overrides: Partial<Tab>): Tab => ({
  id: "t",
  title: "Tab",
  content: "",
  language: "csv",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 0,
  lastModified: 0,
  workspaceId: "default",
  ...overrides,
});

const setTabs = (tabs: Tab[]) =>
  act(() => {
    useTabsStore.setState({ tabs });
  });

describe("useColumnSourceTabs", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setTabs([]);
  });

  it("lists only the other CSV tabs", () => {
    setTabs([
      makeTab({ id: "current", title: "Current" }),
      makeTab({ id: "other", title: "Other" }),
      makeTab({ id: "json", title: "Json", language: "json" }),
      makeTab({ id: "text", title: "Text", language: "plaintext" }),
      makeTab({ id: "tablet", title: "Tablet", isTablet: true }),
      makeTab({ id: "rich", title: "Rich", isRich: true }),
    ]);

    const { result } = renderHook(() => useColumnSourceTabs("current"));

    expect(result.current.tabs).toEqual([{ id: "other", title: "Other" }]);
  });

  it("returns no tabs when there are no other CSV tabs", () => {
    setTabs([
      makeTab({ id: "current" }),
      makeTab({ id: "json", language: "json" }),
    ]);

    const { result } = renderHook(() => useColumnSourceTabs("current"));

    expect(result.current.tabs).toEqual([]);
  });

  it("parses a tab's stored content into a header + rows table", () => {
    setTabs([
      makeTab({ id: "current" }),
      makeTab({ id: "other", content: "Name,Score\nJohn,90" }),
    ]);

    const { result } = renderHook(() => useColumnSourceTabs("current"));

    expect(result.current.loadSource("other")).toEqual({
      headers: ["Name", "Score"],
      rows: [["John", "90"]],
    });
  });

  it("prefers the live editor model content over stored content", () => {
    setTabs([
      makeTab({ id: "current" }),
      makeTab({ id: "other", content: "Old\n1" }),
    ]);
    jest.spyOn(modelManager, "getContent").mockReturnValue("Live\n2");

    const { result } = renderHook(() => useColumnSourceTabs("current"));

    expect(result.current.loadSource("other")).toEqual({
      headers: ["Live"],
      rows: [["2"]],
    });
  });

  it("returns an empty table for an unknown tab", () => {
    setTabs([makeTab({ id: "current" })]);

    const { result } = renderHook(() => useColumnSourceTabs("current"));

    expect(result.current.loadSource("missing")).toEqual({
      headers: [],
      rows: [],
    });
  });
});
