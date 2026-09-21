import React, { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ColumnFilterInput } from "../ColumnFilterInput";
import { CsvColumn } from "../../types";
import { ColumnFilter } from "../../utils/filtering";

function makeColumn(
  overrides: Partial<CsvColumn> & Pick<CsvColumn, "type">,
): CsvColumn {
  return {
    id: "col_0",
    name: "Name",
    index: 0,
    ...overrides,
  };
}

/** Holds the filter in state like the real viewer so controlled inputs update. */
function Harness({
  column,
  initialFilter,
  onChange,
}: {
  column: CsvColumn;
  initialFilter?: ColumnFilter;
  onChange?: (filter?: ColumnFilter) => void;
}) {
  const [filter, setFilter] = useState<ColumnFilter | undefined>(initialFilter);
  const update = React.useCallback(
    (next?: ColumnFilter) => {
      setFilter(next);
      onChange?.(next);
    },
    [onChange],
  );
  return <ColumnFilterInput column={column} filter={filter} onChange={update} />;
}

describe("ColumnFilterInput", () => {
  it("renders an operator select and text input for text columns", () => {
    render(<ColumnFilterInput column={makeColumn({ type: "text" })} />);

    expect(screen.getByTestId("filter-input-Name")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Filter operator for Name"),
    ).toHaveValue("contains");
    expect(screen.getByLabelText("Filter Name")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "does not contain" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "does not equal" }),
    ).toBeInTheDocument();
  });

  it("debounces commits while typing and clears when emptied", () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    render(<Harness column={makeColumn({ type: "text" })} onChange={onChange} />);
    const input = screen.getByLabelText("Filter Name");

    fireEvent.change(input, { target: { value: "a" } });
    expect(onChange).not.toHaveBeenCalled();

    // Typing again within the debounce window replaces the pending commit
    fireEvent.change(input, { target: { value: "an" } });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onChange).toHaveBeenLastCalledWith({
      columnId: "col_0",
      operator: "contains",
      value: "an",
    });

    // Emptying the field commits a cleared filter
    fireEvent.change(input, { target: { value: "" } });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    jest.useRealTimers();
  });

  it("clears the text filter immediately on Escape", () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    render(
      <Harness
        column={makeColumn({ type: "text" })}
        initialFilter={{ columnId: "col_0", operator: "contains", value: "an" }}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Filter Name");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(input).toHaveValue("");

    // No late commit resurrects the cleared filter
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    jest.useRealTimers();
  });

  it("emits the selected text operator", () => {
    const onChange = jest.fn();
    render(
      <Harness
        column={makeColumn({ type: "text" })}
        initialFilter={{ columnId: "col_0", operator: "contains", value: "an" }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filter operator for Name"), {
      target: { value: "startsWith" },
    });
    expect(onChange).toHaveBeenCalledWith({
      columnId: "col_0",
      operator: "startsWith",
      value: "an",
    });
  });

  it("emits negative text operators", () => {
    const onChange = jest.fn();
    render(
      <Harness
        column={makeColumn({ type: "text" })}
        initialFilter={{ columnId: "col_0", operator: "contains", value: "an" }}
        onChange={onChange}
      />,
    );

    const select = screen.getByLabelText("Filter operator for Name");
    fireEvent.change(select, { target: { value: "notContains" } });
    expect(onChange).toHaveBeenLastCalledWith({
      columnId: "col_0",
      operator: "notContains",
      value: "an",
    });

    fireEvent.change(select, { target: { value: "notEquals" } });
    expect(onChange).toHaveBeenLastCalledWith({
      columnId: "col_0",
      operator: "notEquals",
      value: "an",
    });
  });

  it("prefills widget values from an existing filter", () => {
    render(
      <ColumnFilterInput
        column={makeColumn({ type: "text" })}
        filter={{ columnId: "col_0", operator: "equals", value: "Apple" }}
      />,
    );

    expect(screen.getByLabelText("Filter operator for Name")).toHaveValue("equals");
    expect(screen.getByLabelText("Filter Name")).toHaveValue("Apple");
  });

  it("renders min/max inputs for number columns", () => {
    render(<ColumnFilterInput column={makeColumn({ type: "number", name: "Age", id: "col_1" })} />);

    expect(screen.getByTestId("filter-input-Age")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter Age from")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("Filter Age to")).toHaveAttribute("type", "number");
  });

  it("builds a between filter from min and max number bounds", () => {
    const onChange = jest.fn();
    render(
      <Harness
        column={makeColumn({ type: "number", name: "Age", id: "col_1" })}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filter Age from"), {
      target: { value: "10" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      columnId: "col_1",
      operator: "gte",
      value: "10",
    });

    fireEvent.change(screen.getByLabelText("Filter Age to"), {
      target: { value: "20" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      columnId: "col_1",
      operator: "between",
      value: ["10", "20"],
    });
  });

  it("renders date inputs for date columns", () => {
    render(
      <ColumnFilterInput
        column={makeColumn({ type: "date", name: "Created", id: "col_2" })}
        filter={{
          columnId: "col_2",
          operator: "between",
          value: ["2024-01-01", "2024-02-01"],
        }}
      />,
    );

    expect(screen.getByLabelText("Filter Created from")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("Filter Created from")).toHaveValue("2024-01-01");
    expect(screen.getByLabelText("Filter Created to")).toHaveValue("2024-02-01");
  });

  it("renders an any/true/false select for boolean columns", () => {
    const onChange = jest.fn();
    render(
      <ColumnFilterInput
        column={makeColumn({ type: "boolean", name: "Active", id: "col_3" })}
        onChange={onChange}
      />,
    );

    const select = screen.getByLabelText("Filter Active");
    expect(select).toHaveValue("any");

    fireEvent.change(select, { target: { value: "true" } });
    expect(onChange).toHaveBeenCalledWith({
      columnId: "col_3",
      operator: "equals",
      value: "true",
    });
  });

  it("stops keydown events from bubbling to the table", () => {
    const onKeyDown = jest.fn();
    render(
      <div onKeyDown={onKeyDown}>
        <ColumnFilterInput column={makeColumn({ type: "text" })} />
        <ColumnFilterInput column={makeColumn({ type: "number", name: "Age", id: "col_1" })} />
      </div>,
    );

    fireEvent.keyDown(screen.getByLabelText("Filter Name"), { key: "Enter" });
    fireEvent.keyDown(screen.getByLabelText("Filter Age from"), { key: "ArrowDown" });
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("clears a min bound on Escape in range inputs", () => {
    const onChange = jest.fn();
    render(
      <Harness
        column={makeColumn({ type: "number", name: "Age", id: "col_1" })}
        initialFilter={{ columnId: "col_1", operator: "between", value: ["10", "20"] }}
        onChange={onChange}
      />,
    );

    fireEvent.keyDown(screen.getByLabelText("Filter Age from"), { key: "Escape" });
    expect(onChange).toHaveBeenLastCalledWith({
      columnId: "col_1",
      operator: "lte",
      value: "20",
    });
  });
});
