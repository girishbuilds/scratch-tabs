import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { TabletState } from "../../types";
import { ReconcileInput, ReconcileResponse } from "../types";
import "@testing-library/jest-dom";
import { DataReconcileTablet } from "../DataReconcileTablet";

const mockHandleNewPopulatedTab = jest.fn().mockResolvedValue("new-tab");

jest.mock("../reconcileWorkerClient", () => ({
  createReconcileWorker: () => ({
    onmessage: null as ((event: { data: ReconcileResponse }) => void) | null,
    postMessage(this: { onmessage: ((event: { data: ReconcileResponse }) => void) | null }, input: ReconcileInput) {
      const { createReconcileResponse } = jest.requireActual<typeof import("../engine")>("../engine");
      this.onmessage?.({ data: createReconcileResponse(input) });
    },
    terminate: jest.fn(),
  }),
}));

const mockTabs = [
  { id: "a", title: "A", content: "same\nonly-a", language: "plaintext", languageLocked: false, workspaceId: "w", dateCreated: 1, lastModified: 1, cursorPosition: { lineNumber: 1, column: 1 } },
  { id: "b", title: "B", content: "same\nonly-b", language: "plaintext", languageLocked: false, workspaceId: "w", dateCreated: 1, lastModified: 1, cursorPosition: { lineNumber: 1, column: 1 } },
];

jest.mock("../../../stores/tabsStore", () => ({ useTabsStore: (selector: (store: { tabs: typeof mockTabs }) => unknown) => selector({ tabs: mockTabs }) }));
jest.mock("../../../stores/rootStore", () => ({ useRootStore: (selector: (store: { handleNewPopulatedTab: typeof mockHandleNewPopulatedTab }) => unknown) => selector({ handleNewPopulatedTab: mockHandleNewPopulatedTab }) }));

const StatefulTablet = ({ initialState }: { initialState: TabletState }) => {
  const [state, setState] = React.useState(initialState);
  return <>{DataReconcileTablet.render(state, setState)}</>;
};

const columnOptions = (side: "A" | "B") => within(screen.getByRole("combobox", { name: `Key column ${side} 1` }))
  .queryAllByRole("option").map((option) => option.textContent);

const setCsvSources = () => {
  mockTabs[0].content = "label,id\n,1";
  mockTabs[1].content = "description,ref\n,1";
};

describe("DataReconcileTablet", () => {
  beforeEach(() => {
    mockTabs.splice(2);
    mockTabs[0].content = "same\nonly-a";
    mockTabs[1].content = "same\nonly-b";
    mockHandleNewPopulatedTab.mockClear();
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
    });
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  it("populates disjoint CSV columns and lets both keys be selected", () => {
    setCsvSources();
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b", csvMode: true })} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Choose valid CSV key columns");
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    expect(columnOptions("A")).toEqual(["label", "id"]);
    expect(columnOptions("B")).toEqual(["description", "ref"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Key column A 1" }), { target: { value: "id" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Key column B 1" }), { target: { value: "ref" } });

    expect(screen.getByRole("combobox", { name: "Key column A 1" })).toHaveValue("id");
    expect(screen.getByRole("combobox", { name: "Key column B 1" })).toHaveValue("ref");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Lines from A also in B" })).toBeInTheDocument();
  });

  it("refreshes columns after switching sources with a stale key mapping", () => {
    setCsvSources();
    mockTabs.push({ ...mockTabs[1], id: "c", title: "C", content: "note,code\n,1" });
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b", csvMode: true })} />);
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Source B" }), { target: { value: "c" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Choose valid CSV key columns");
    expect(columnOptions("B")).toEqual(["note", "code"]);
    expect(screen.queryByRole("button", { name: "Copy selected lines" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Key column B 1" }), { target: { value: "code" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Key column A 1" }), { target: { value: "id" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Lines from A also in B" })).toBeInTheDocument();
  });

  it("recovers empty key pairs added before both sources are selected", () => {
    setCsvSources();
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", csvMode: true })} />);
    fireEvent.click(screen.getByRole("button", { name: "Add column" }));
    expect(columnOptions("A")).toEqual([]);
    fireEvent.change(screen.getByRole("combobox", { name: "Source B" }), { target: { value: "b" } });

    expect(columnOptions("A")).toEqual(["label", "id"]);
    expect(columnOptions("B")).toEqual(["description", "ref"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Key column A 1" }), { target: { value: "id" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Key column B 1" }), { target: { value: "ref" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Lines from A also in B" })).toBeInTheDocument();
  });

  it("creates CSV-aware initial state and safely restores serialized state", () => {
    expect(DataReconcileTablet.createInitialState({ sourceAId: "a", csvMode: true })).toMatchObject({ type: "datareconcile", data: { sourceAId: "a", options: { mode: "csv" }, selectedResult: "aInB" } });
    expect(DataReconcileTablet.deserializeState("invalid")).toMatchObject({ type: "datareconcile" });
    expect(DataReconcileTablet.deserializeState(JSON.stringify({
      type: "datareconcile",
      data: { ...DataReconcileTablet.createInitialState().data, selectedResult: "onlyB" },
    }))).toMatchObject({ data: { selectedResult: "bNotInA" } });
  });

  it("shows explicit directional result sets and confirms copy for two seconds", async () => {
    jest.useFakeTimers();
    const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
    render(<>{DataReconcileTablet.render(state, jest.fn())}</>);

    expect(await screen.findByText("Lines from A also in B")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lines from A not in B/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lines from B also in A/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lines from B not in A/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cleaned copy/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("data-reconcile-tablet")).toHaveClass("custom-scrollbar");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy selected lines" })); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("same");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveClass("text-success");
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByRole("button", { name: "Copy selected lines" })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it.each([
    ["aInB", "same", "A - lines also in B"],
    ["aNotInB", "only-a", "A - lines not in B"],
    ["bInA", "same", "B - lines also in A"],
    ["bNotInA", "only-b", "B - lines not in A"],
  ] as const)("extracts the %s source lines into a clearly named new tab", async (selectedResult, content, title) => {
    const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
    state.data = { ...state.data, selectedResult };
    render(<>{DataReconcileTablet.render(state, jest.fn())}</>);

    fireEvent.click(await screen.findByRole("button", { name: "Open selected lines in new tab" }));

    expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(expect.objectContaining({
      title,
      content,
      language: "plaintext",
    }));
  });
});
