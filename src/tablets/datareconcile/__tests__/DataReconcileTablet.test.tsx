import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { TabletState } from "../../types";
import { ReconcileInput, ReconcileResponse } from "../types";
import "@testing-library/jest-dom";
import { DataReconcileTablet } from "../DataReconcileTablet";
import { reconcileRunner } from "../sharedReconcileRunner";

const mockHandleNewPopulatedTab = jest.fn().mockResolvedValue("new-tab");

type MockWorker = {
  onmessage: ((event: { data: ReconcileResponse }) => void) | null;
  onerror: (() => void) | null;
  postMessage(input: ReconcileInput): void;
  terminate: jest.Mock;
};

// Workers answer synchronously unless a test sets `deferWorkers`, which holds the reply until `flushWorkers`.
let deferWorkers = false;
let pendingReplies: Array<() => void> = [];
const createdWorkers: MockWorker[] = [];

jest.mock("../reconcileWorkerClient", () => ({
  createReconcileWorker: () => {
    const worker: MockWorker = {
      onmessage: null,
      onerror: null,
      postMessage(input) {
        const { createReconcileResponse } = jest.requireActual<typeof import("../engine")>("../engine");
        const reply = () => worker.onmessage?.({ data: createReconcileResponse(input) });
        if (deferWorkers) pendingReplies.push(reply); else reply();
      },
      terminate: jest.fn(),
    };
    createdWorkers.push(worker);
    return worker;
  },
}));

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 36, size: 36 })),
    getTotalSize: () => count * 36,
  }),
}));

const flushWorkers = () => act(() => { pendingReplies.splice(0).forEach((reply) => reply()); });

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
    reconcileRunner.clear();
    deferWorkers = false;
    pendingReplies = [];
    createdWorkers.length = 0;
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

    expect(screen.getByRole("alert")).toHaveTextContent("No shared CSV headers");
    fireEvent.click(screen.getByRole("radio", { name: "Choose columns manually" }));
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
    fireEvent.click(screen.getByRole("radio", { name: "Choose columns manually" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Source B" }), { target: { value: "c" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Choose valid CSV key columns");
    expect(columnOptions("B")).toEqual(["Missing: description", "note", "code"]);
    expect(screen.queryByRole("button", { name: "Copy selected lines" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Key column B 1" }), { target: { value: "code" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Key column A 1" }), { target: { value: "id" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Lines from A also in B" })).toBeInTheDocument();
  });

  it("allows manual mapping after the second source is selected", () => {
    setCsvSources();
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", csvMode: true })} />);
    fireEvent.click(screen.getByRole("radio", { name: "Choose columns manually" }));
    expect(screen.queryByRole("combobox", { name: "Key column A 1" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Source B" }), { target: { value: "b" } });
    fireEvent.click(screen.getByRole("button", { name: "Add column pair" }));

    expect(columnOptions("A")).toEqual(["label", "id"]);
    expect(columnOptions("B")).toEqual(["description", "ref"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Key column A 1" }), { target: { value: "id" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Key column B 1" }), { target: { value: "ref" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Lines from A also in B" })).toBeInTheDocument();
  });

  it("shows the auto-matched shared key columns and counts rows against a wider CSV", () => {
    mockTabs[0].content = "id,code\n1,X\n2,Y";
    mockTabs[1].content = "id,code,note\n1,X,hello\n2,Y,world";
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b", csvMode: true })} />);

    expect(screen.getByTestId("csv-key-columns")).toHaveTextContent("id → id");
    expect(screen.getByTestId("csv-key-columns")).toHaveTextContent("code → code");
    expect(screen.getByRole("button", { name: "2 Lines from A also in B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0 A rows changed in B" })).toBeInTheDocument();
  });

  it("shows no unmatched A rows for a CSV with a trailing blank line", () => {
    mockTabs[0].content = "ID,Name\n1,John\n2,Jane\n\n";
    mockTabs[1].content = "ID\n1\n2\n3\n";
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b", csvMode: true })} />);

    expect(screen.getByRole("button", { name: "0 Lines from A not in B" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Lines from B not in A" })).toBeInTheDocument();
  });

  it("lets shared key columns be removed and restored without silently changing modes", () => {
    mockTabs[0].content = "id,code\n1,X";
    mockTabs[1].content = "id,code,note\n1,Y,hello";
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b", csvMode: true })} />);

    expect(screen.getByRole("button", { name: "0 A rows changed in B" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Choose columns manually" }));

    expect(screen.getByRole("combobox", { name: "Key column A 1" })).toHaveValue("id");
    expect(screen.getByRole("combobox", { name: "Key column B 1" })).toHaveValue("id");
    expect(screen.getByRole("combobox", { name: "Key column A 2" })).toHaveValue("code");
    expect(screen.getByRole("combobox", { name: "Key column B 2" })).toHaveValue("code");
    fireEvent.click(screen.getByRole("button", { name: "Remove key column pair 2" }));
    expect(screen.getByRole("radio", { name: "Choose columns manually" })).toBeChecked();
    expect(screen.getByRole("button", { name: "1 A rows changed in B" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove key column pair 1" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Add at least one CSV key column pair");
    expect(screen.getByRole("radio", { name: "Choose columns manually" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Add column pair" }));
    expect(screen.getByRole("combobox", { name: "Key column A 1" })).toHaveValue("id");
    fireEvent.click(screen.getByRole("radio", { name: "Use shared header names" }));
    expect(screen.getByTestId("csv-key-columns")).toHaveTextContent("id → id");
    expect(screen.getByTestId("csv-key-columns")).toHaveTextContent("code → code");
    expect(screen.getByRole("button", { name: "0 A rows changed in B" })).toBeInTheDocument();
  });

  it("adds an unused pair in manual mode", () => {
    mockTabs[0].content = "id,code\n1,X";
    mockTabs[1].content = "id,ref\n1,X";
    render(<StatefulTablet initialState={DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b", csvMode: true })} />);
    fireEvent.click(screen.getByRole("radio", { name: "Choose columns manually" }));
    fireEvent.click(screen.getByRole("button", { name: "Add column pair" }));
    expect(screen.getByRole("combobox", { name: "Key column A 2" })).toHaveValue("code");
    expect(screen.getByRole("combobox", { name: "Key column B 2" })).toHaveValue("ref");
    expect(screen.getByRole("button", { name: "Add column pair" })).toBeDisabled();
  });

  it("creates CSV-aware initial state and safely restores serialized state", () => {
    expect(DataReconcileTablet.createInitialState({ sourceAId: "a", csvMode: true })).toMatchObject({ type: "datareconcile", data: { sourceAId: "a", options: { mode: "csv" }, selectedResult: "aInB" } });
    expect(DataReconcileTablet.deserializeState("invalid")).toMatchObject({ type: "datareconcile" });
    expect(DataReconcileTablet.deserializeState(JSON.stringify({
      type: "datareconcile",
      data: { ...DataReconcileTablet.createInitialState().data, selectedResult: "onlyB" },
    }))).toMatchObject({ data: { selectedResult: "bNotInA" } });
  });

  it("fills the full width of the tab instead of a centred, width-capped column", () => {
    const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
    render(<>{DataReconcileTablet.render(state, jest.fn())}</>);

    const root = screen.getByTestId("data-reconcile-tablet");
    const content = root.firstElementChild as HTMLElement;

    expect(content).toHaveClass("w-full");
    expect(content.className).not.toMatch(/max-w-|mx-auto/);
    expect(root.className).not.toMatch(/max-w-|mx-auto|sm:p-/);
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

  it("previews the selected lines in the virtualized table", async () => {
    render(<>{DataReconcileTablet.render(DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" }), jest.fn())}</>);

    const table = await screen.findByRole("table", { name: "Selected lines" });
    expect(within(table).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["A", "1", "same"]);
  });

  describe("while a large comparison is processing", () => {
    beforeEach(() => {
      deferWorkers = true;
      jest.useFakeTimers();
    });
    afterEach(() => jest.useRealTimers());

    it("shows a progress notice only after a short delay, then the results", () => {
      render(<>{DataReconcileTablet.render(DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" }), jest.fn())}</>);

      expect(screen.queryByTestId("reconcile-progress")).not.toBeInTheDocument();
      act(() => { jest.advanceTimersByTime(150); });
      expect(screen.getByRole("status")).toHaveTextContent("Comparing sources...");
      expect(screen.queryByRole("button", { name: /Lines from A also in B/ })).not.toBeInTheDocument();

      flushWorkers();

      expect(screen.queryByTestId("reconcile-progress")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 Lines from A also in B" })).toBeInTheDocument();
    });

    it("never flashes the notice when the comparison finishes quickly", () => {
      render(<>{DataReconcileTablet.render(DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" }), jest.fn())}</>);
      act(() => { jest.advanceTimersByTime(100); });
      flushWorkers();
      act(() => { jest.advanceTimersByTime(500); });

      expect(screen.queryByTestId("reconcile-progress")).not.toBeInTheDocument();
    });

    it("keeps the previous results visible but disabled while recomputing", () => {
      const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
      render(<StatefulTablet initialState={state} />);
      flushWorkers();

      fireEvent.click(screen.getByRole("checkbox", { name: "Ignore case" }));
      act(() => { jest.advanceTimersByTime(150); });

      expect(screen.getByRole("status")).toBeInTheDocument();
      const results = screen.getByRole("button", { name: "1 Lines from A also in B" }).closest("[aria-busy]");
      expect(results).toHaveAttribute("aria-busy", "true");
      expect(results).toHaveClass("pointer-events-none");
      flushWorkers();
      expect(results).toHaveAttribute("aria-busy", "false");
    });

    it("keeps working through a tab switch and reuses the result on return", () => {
      const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
      const first = render(<>{DataReconcileTablet.render(state, jest.fn())}</>);
      first.unmount();

      expect(createdWorkers[0].terminate).not.toHaveBeenCalled();
      flushWorkers();

      deferWorkers = false;
      render(<>{DataReconcileTablet.render(state, jest.fn())}</>);

      expect(createdWorkers).toHaveLength(1);
      expect(screen.queryByTestId("reconcile-progress")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 Lines from A also in B" })).toBeInTheDocument();
    });
  });
});
