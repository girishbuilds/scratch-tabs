import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FacetFilterPopover } from "../FacetFilterPopover";
import { CsvColumn } from "../../types";

const column: CsvColumn = {
  id: "col_1",
  name: "Region",
  type: "text",
  index: 1,
};

describe("FacetFilterPopover", () => {
  const values = [
    { value: "east", count: 3 },
    { value: "west", count: 1 },
  ];

  const renderPopover = (
    overrides: Partial<Parameters<typeof FacetFilterPopover>[0]> = {},
  ) => {
    const props = {
      column,
      values,
      selection: null as string[] | null,
      onSelectionChange: jest.fn(),
      onClose: jest.fn(),
      position: { x: 10, y: 20 },
      ...overrides,
    };
    render(<FacetFilterPopover {...props} />);
    return props;
  };

  it("lists each value with its live count", () => {
    renderPopover();

    expect(screen.getByTestId("facet-popover")).toBeInTheDocument();
    expect(screen.getByTestId("facet-option-east")).toHaveTextContent("east");
    expect(screen.getByTestId("facet-option-east")).toHaveTextContent("3");
    expect(screen.getByTestId("facet-option-west")).toHaveTextContent("1");
  });

  it("reflects the active in-filter selection", () => {
    renderPopover({ selection: ["west"] });

    expect(
      screen.getByLabelText("Filter by Region = west"),
    ).toBeChecked();
    expect(
      screen.getByLabelText("Filter by Region = east"),
    ).not.toBeChecked();
  });

  it("emits the remaining selection when a value is unticked", () => {
    const props = renderPopover({ selection: ["east", "west"] });

    fireEvent.click(screen.getByLabelText("Filter by Region = east"));
    expect(props.onSelectionChange).toHaveBeenCalledWith(["west"]);
  });

  it("emits the full selection when a value is ticked on", () => {
    const props = renderPopover({ selection: ["west"] });

    fireEvent.click(screen.getByLabelText("Filter by Region = east"));
    expect(props.onSelectionChange).toHaveBeenCalledWith(["west", "east"]);
  });

  it("shows only one value when its Only action is clicked", () => {
    const props = renderPopover({ selection: ["west"] });

    fireEvent.click(screen.getByRole("button", { name: "Show only east in Region" }));

    expect(props.onSelectionChange).toHaveBeenCalledWith(["east"]);
    expect(props.onSelectionChange).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("emits an empty selection when the last selected value is unticked", () => {
    const props = renderPopover({ selection: ["west"] });

    fireEvent.click(screen.getByLabelText("Filter by Region = west"));
    expect(props.onSelectionChange).toHaveBeenCalledWith([]);
  });

  it("selects every listed value via select all", () => {
    const props = renderPopover({ selection: ["west"] });

    fireEvent.click(screen.getByTestId("facet-select-all"));
    expect(props.onSelectionChange).toHaveBeenCalledWith(["east", "west"]);
  });

  it("clears the selection when select all is ticked while everything is selected", () => {
    const props = renderPopover();

    fireEvent.click(screen.getByTestId("facet-select-all"));
    expect(props.onSelectionChange).toHaveBeenCalledWith([]);
  });

  it("closes via the close button and overlay", () => {
    const props = renderPopover();

    fireEvent.click(screen.getByTestId("facet-close"));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("facet-popover").previousElementSibling!);
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("shows an empty state without values", () => {
    renderPopover({ values: [] });

    expect(screen.getByText("No values")).toBeInTheDocument();
  });

  it("lists at most the first 50 values and notes hidden ones", () => {
    const manyValues = Array.from({ length: 53 }, (_, i) => ({
      value: `v${i}`,
      count: 53 - i,
    }));
    renderPopover({ values: manyValues });

    expect(screen.getByTestId("facet-option-v0")).toBeInTheDocument();
    expect(screen.queryByTestId("facet-option-v50")).not.toBeInTheDocument();
    expect(screen.getByTestId("facet-hidden-values")).toHaveTextContent(
      "+3 more values not listed",
    );
  });
});
