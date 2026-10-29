import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CsvAddColumnsPanel } from "../CsvAddColumnsPanel";
import { CsvColumn } from "../../types";
import { ColumnSource } from "../../utils/columnOperations";

const columns: CsvColumn[] = [
  { id: "c_name", name: "Name", type: "text", index: 0 },
  { id: "c_age", name: "Age", type: "text", index: 1 },
];

const scores: ColumnSource = {
  headers: ["Name", "Score", "Team"],
  rows: [["John", "90", "Blue"]],
};
const unrelated: ColumnSource = {
  headers: ["Foo", "Bar"],
  rows: [["1", "2"]],
};

const tabs = [
  { id: "t_scores", title: "Scores" },
  { id: "t_other", title: "Other" },
];

const loadSource = (tabId: string): ColumnSource =>
  tabId === "t_scores" ? scores : unrelated;

const setup = (props: Partial<React.ComponentProps<typeof CsvAddColumnsPanel>> = {}) => {
  const onApply = jest.fn();
  const onClose = jest.fn();
  render(
    <CsvAddColumnsPanel
      tabs={tabs}
      columns={columns}
      loadSource={loadSource}
      onApply={onApply}
      onClose={onClose}
      {...props}
    />,
  );
  return { onApply, onClose };
};

const chooseTab = (id: string) =>
  fireEvent.change(screen.getByTestId("add-columns-source-tab"), {
    target: { value: id },
  });

const toggleColumn = (index: number) =>
  fireEvent.click(screen.getByTestId(`add-columns-source-column-${index}`));

describe("CsvAddColumnsPanel", () => {
  it("lists the available tabs", () => {
    setup();

    const select = screen.getByTestId("add-columns-source-tab");
    expect(select).toHaveTextContent("Scores");
    expect(select).toHaveTextContent("Other");
  });

  it("says when no CSV tabs were found", () => {
    setup({ tabs: [] });

    expect(screen.getByTestId("add-columns-no-tabs")).toHaveTextContent(
      "No CSV tabs found",
    );
    expect(screen.queryByTestId("add-columns-source-tab")).not.toBeInTheDocument();
  });

  it("disables Add until a tab and at least one column are chosen", () => {
    setup();
    const apply = screen.getByTestId("add-columns-apply");
    expect(apply).toBeDisabled();

    chooseTab("t_scores");
    expect(apply).toBeDisabled();

    toggleColumn(1);
    expect(apply).toBeEnabled();

    toggleColumn(1);
    expect(apply).toBeDisabled();
  });

  it("shows the source tab's columns once a tab is chosen", () => {
    setup();
    expect(screen.queryByTestId("add-columns-source-column-0")).not.toBeInTheDocument();

    chooseTab("t_scores");

    expect(screen.getByTestId("add-columns-source-column-0")).toBeInTheDocument();
    expect(screen.getByLabelText("Score")).toBeInTheDocument();
    expect(screen.getByLabelText("Team")).toBeInTheDocument();
  });

  it("defaults to matching on a shared column name", () => {
    const { onApply } = setup();
    chooseTab("t_scores");
    toggleColumn(1);

    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onApply).toHaveBeenCalledWith(scores, {
      sourceColumns: [1],
      match: { mode: "key", targetColumnId: "c_name", sourceColumnIndex: 0 },
      insertAfterColumnId: undefined,
    });
  });

  it("defaults to row position when no column names are shared", () => {
    const { onApply } = setup();
    chooseTab("t_other");
    toggleColumn(0);

    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onApply).toHaveBeenCalledWith(unrelated, {
      sourceColumns: [0],
      match: { mode: "position" },
      insertAfterColumnId: undefined,
    });
  });

  it("lets the user switch between key and position matching", () => {
    const { onApply } = setup();
    chooseTab("t_scores");
    toggleColumn(2);

    fireEvent.click(screen.getByTestId("add-columns-match-position"));
    expect(screen.queryByTestId("add-columns-key-target")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onApply.mock.calls[0][1].match).toEqual({ mode: "position" });
  });

  it("lets the user choose the key columns", () => {
    const { onApply } = setup();
    chooseTab("t_scores");
    toggleColumn(1);
    fireEvent.click(screen.getByTestId("add-columns-match-key"));

    fireEvent.change(screen.getByTestId("add-columns-key-target"), {
      target: { value: "c_age" },
    });
    fireEvent.change(screen.getByTestId("add-columns-key-source"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onApply.mock.calls[0][1].match).toEqual({
      mode: "key",
      targetColumnId: "c_age",
      sourceColumnIndex: 2,
    });
  });

  it("applies the selected columns in source order", () => {
    const { onApply } = setup();
    chooseTab("t_scores");
    toggleColumn(2);
    toggleColumn(1);

    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onApply.mock.calls[0][1].sourceColumns).toEqual([1, 2]);
  });

  it("clears the chosen columns when switching to a different tab", () => {
    setup();
    chooseTab("t_scores");
    toggleColumn(1);

    chooseTab("t_other");

    expect(screen.getByTestId("add-columns-apply")).toBeDisabled();
  });

  it("inserts after the anchor column by default and lets the user change it", () => {
    const { onApply } = setup({ anchorColumnId: "c_name" });
    chooseTab("t_other");
    toggleColumn(0);
    expect(screen.getByTestId("add-columns-position")).toHaveValue("c_name");

    fireEvent.change(screen.getByTestId("add-columns-position"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onApply.mock.calls[0][1].insertAfterColumnId).toBeUndefined();
  });

  it("passes the chosen anchor to onApply", () => {
    const { onApply } = setup({ anchorColumnId: "c_age" });
    chooseTab("t_other");
    toggleColumn(0);

    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onApply.mock.calls[0][1].insertAfterColumnId).toBe("c_age");
  });

  it("closes after applying", () => {
    const { onClose } = setup();
    chooseTab("t_other");
    toggleColumn(0);

    fireEvent.click(screen.getByTestId("add-columns-apply"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes without applying when dismissed", () => {
    const { onApply, onClose } = setup();

    fireEvent.click(screen.getByTestId("add-columns-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });
});
