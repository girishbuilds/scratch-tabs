import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReconcilePreviewTable } from "../ReconcilePreviewTable";
import { ReconcileRow } from "../types";

const VISIBLE = 5;

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () => Array.from({ length: Math.min(count, VISIBLE) }, (_, index) => ({ index, key: index, start: index * estimateSize(), size: estimateSize() })),
    getTotalSize: () => count * estimateSize(),
  }),
}));

const rows = (count: number): ReconcileRow[] =>
  Array.from({ length: count }, (_, index) => ({ source: "A", rowNumber: index + 1, text: `line ${index + 1}` }));

describe("ReconcilePreviewTable", () => {
  it("shows the source, row number and text of each visible row", () => {
    render(<ReconcilePreviewTable rows={rows(2)} />);

    const table = screen.getByRole("table", { name: "Selected lines" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Source", "Row", "Preview"]);
    const [, first] = within(table).getAllByRole("row");
    expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["A", "1", "line 1"]);
  });

  it("renders only the virtualized window of a very large result set", () => {
    render(<ReconcilePreviewTable rows={rows(100000)} />);

    expect(screen.getAllByRole("row")).toHaveLength(VISIBLE + 1);
    expect(screen.getByRole("table")).toHaveAttribute("aria-rowcount", "100000");
    expect(screen.getByTestId("reconcile-preview-scroll").firstElementChild).toHaveStyle({ height: `${100000 * 36}px` });
    expect(screen.queryByText("line 100000")).not.toBeInTheDocument();
  });

  it("renders no body rows for an empty selection", () => {
    render(<ReconcilePreviewTable rows={[]} />);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
