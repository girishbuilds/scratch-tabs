import { applyFilters, ColumnFilter } from "../filtering";
import { CsvColumn, CsvRow } from "../../types";

function makeColumns(
  defs: Array<Pick<CsvColumn, "id" | "type"> & { name?: string }>,
): CsvColumn[] {
  return defs.map((def, index) => ({
    id: def.id,
    name: def.name ?? def.id,
    type: def.type,
    index,
  }));
}

function makeRows(values: string[][]): CsvRow[] {
  return values.map((row, rowIndex) => ({
    id: `row_${rowIndex}`,
    cells: row.map((value) => ({ value, isValid: true })),
    originalIndex: rowIndex,
    isValid: true,
  }));
}

describe("filtering", () => {
  const columns = makeColumns([
    { id: "name", type: "text" },
    { id: "amount", type: "number" },
    { id: "created", type: "date" },
    { id: "active", type: "boolean" },
  ]);

  const rows = makeRows([
    ["Apple", "10", "2024-01-15", "true"],
    ["banana", "25.5", "2024-02-20", "false"],
    ["Cherry", "", "not-a-date", "true"],
    ["", "40", "2024-03-30", ""],
  ]);

  function filterRows(
    filter: ColumnFilter,
    testRows: CsvRow[] = rows,
  ): string[] {
    return applyFilters(testRows, [filter], columns).map(
      (row) => row.cells[0].value || "(empty)",
    );
  }

  it("returns all rows when no filters are given", () => {
    expect(applyFilters(rows, [], columns)).toEqual(rows);
  });

  describe("isEmpty / isNotEmpty (type independent)", () => {
    it("isEmpty matches blank and whitespace cells on a text column", () => {
      expect(filterRows({ columnId: "name", operator: "isEmpty" })).toEqual([
        "(empty)",
      ]);
    });

    it("isNotEmpty excludes blank cells", () => {
      expect(filterRows({ columnId: "name", operator: "isNotEmpty" })).toEqual([
        "Apple",
        "banana",
        "Cherry",
      ]);
    });

    it("isEmpty matches empty numeric cells", () => {
      expect(filterRows({ columnId: "amount", operator: "isEmpty" })).toEqual([
        "Cherry",
      ]);
    });

    it("isNotEmpty matches non-empty boolean cells", () => {
      expect(filterRows({ columnId: "active", operator: "isNotEmpty" })).toEqual(
        ["Apple", "banana", "Cherry"],
      );
    });
  });

  describe("text operators", () => {
    it("equals is case-insensitive by default", () => {
      expect(filterRows({ columnId: "name", operator: "equals", value: "apple" })).toEqual(["Apple"]);
    });

    it("equals honors caseSensitive", () => {
      expect(
        filterRows({
          columnId: "name",
          operator: "equals",
          value: "apple",
          caseSensitive: true,
        }),
      ).toEqual([]);
      expect(
        filterRows({
          columnId: "name",
          operator: "equals",
          value: "Apple",
          caseSensitive: true,
        }),
      ).toEqual(["Apple"]);
    });

    it("notEquals excludes only matching rows", () => {
      expect(filterRows({ columnId: "name", operator: "notEquals", value: "apple" })).toEqual([
        "banana",
        "Cherry",
        "(empty)",
      ]);
    });

    it("contains matches substrings case-insensitively", () => {
      expect(filterRows({ columnId: "name", operator: "contains", value: "AN" })).toEqual(["banana"]);
    });

    it("contains with caseSensitive requires exact casing", () => {
      expect(
        filterRows({ columnId: "name", operator: "contains", value: "AN", caseSensitive: true }),
      ).toEqual([]);
    });

    it("notContains excludes substring matches case-insensitively", () => {
      expect(
        filterRows({ columnId: "name", operator: "notContains", value: "AN" }),
      ).toEqual(["Apple", "Cherry", "(empty)"]);
    });

    it("notContains honors caseSensitive", () => {
      expect(
        filterRows({
          columnId: "name",
          operator: "notContains",
          value: "AN",
          caseSensitive: true,
        }),
      ).toEqual(["Apple", "banana", "Cherry", "(empty)"]);
    });

    it("startsWith matches prefixes", () => {
      expect(filterRows({ columnId: "name", operator: "startsWith", value: "ba" })).toEqual(["banana"]);
    });

    it("in matches any of the listed values", () => {
      expect(
        filterRows({ columnId: "name", operator: "in", value: ["Apple", "Cherry"] }),
      ).toEqual(["Apple", "Cherry"]);
    });

    it("in is case-insensitive by default", () => {
      expect(filterRows({ columnId: "name", operator: "in", value: ["APPLE"] })).toEqual(["Apple"]);
    });

    it("regex matches patterns without case sensitivity by default", () => {
      expect(filterRows({ columnId: "name", operator: "regex", value: "^a" })).toEqual(["Apple"]);
    });

    it("regex honors caseSensitive and anchors", () => {
      expect(
        filterRows({ columnId: "name", operator: "regex", value: "^a$", caseSensitive: false }),
      ).toEqual([]);
      expect(
        filterRows({ columnId: "name", operator: "regex", value: "^[A-Z]", caseSensitive: true }),
      ).toEqual(["Apple", "Cherry"]);
    });

    it("regex does not throw for invalid patterns", () => {
      expect(filterRows({ columnId: "name", operator: "regex", value: "(" })).toEqual([]);
    });
  });

  describe("numeric comparisons on number columns", () => {
    it("equals compares numerically, not lexically", () => {
      expect(filterRows({ columnId: "amount", operator: "equals", value: 25.5 })).toEqual(["banana"]);
      expect(filterRows({ columnId: "amount", operator: "equals", value: "10" })).toEqual(["Apple"]);
    });

    it("equals does not match non-numeric cells", () => {
      expect(filterRows({ columnId: "amount", operator: "equals", value: 0 })).toEqual([]);
    });

    it("notEquals keeps non-numeric cells", () => {
      expect(filterRows({ columnId: "amount", operator: "notEquals", value: 10 })).toEqual([
        "banana",
        "Cherry",
        "(empty)",
      ]);
    });

    it("gt / gte / lt / lte compare numerically", () => {
      const gt = { columnId: "amount", operator: "gt" as const, value: 10 };
      const gte = { columnId: "amount", operator: "gte" as const, value: 25.5 };
      const lt = { columnId: "amount", operator: "lt" as const, value: 25.5 };
      const lte = { columnId: "amount", operator: "lte" as const, value: 25.5 };
      expect(filterRows(gt)).toEqual(["banana", "(empty)"]);
      expect(filterRows(gte)).toEqual(["banana", "(empty)"]);
      expect(filterRows(lt)).toEqual(["Apple"]);
      expect(filterRows(lte)).toEqual(["Apple", "banana"]);
    });

    it("between is inclusive on both bounds", () => {
      expect(
        filterRows({ columnId: "amount", operator: "between", value: [10, 25.5] }),
      ).toEqual(["Apple", "banana"]);
    });

    it("between rejects malformed ranges and non-numeric cells", () => {
      expect(
        filterRows({ columnId: "amount", operator: "between", value: [25.5, 10] }),
      ).toEqual([]);
      expect(
        filterRows({ columnId: "amount", operator: "between", value: [0] as unknown as [number, number] }),
      ).toEqual([]);
    });
  });

  describe("date comparisons on date columns", () => {
    it("gt / lt compare chronologically", () => {
      expect(
        filterRows({ columnId: "created", operator: "gt", value: "2024-01-31" }),
      ).toEqual(["banana", "(empty)"]);
      expect(
        filterRows({ columnId: "created", operator: "lt", value: "2024-02-01" }),
      ).toEqual(["Apple"]);
    });

    it("gte / lte are inclusive", () => {
      expect(
        filterRows({ columnId: "created", operator: "gte", value: "2024-02-20" }),
      ).toEqual(["banana", "(empty)"]);
      expect(
        filterRows({ columnId: "created", operator: "lte", value: "2024-02-20" }),
      ).toEqual(["Apple", "banana"]);
    });

    it("between filters a date range inclusively", () => {
      expect(
        filterRows({
          columnId: "created",
          operator: "between",
          value: ["2024-01-15", "2024-02-20"],
        }),
      ).toEqual(["Apple", "banana"]);
    });

    it("equals matches exact date strings", () => {
      expect(
        filterRows({ columnId: "created", operator: "equals", value: "2024-01-15" }),
      ).toEqual(["Apple"]);
    });
  });

  describe("ordered operators fall back to string comparison on text columns", () => {
    it("gt uses lexicographic order honoring case sensitivity setting", () => {
      expect(filterRows({ columnId: "name", operator: "gt", value: "Banana" })).toEqual([
        "Cherry",
      ]);
      expect(
        filterRows({ columnId: "name", operator: "gt", value: "Banana", caseSensitive: true }),
      ).toEqual(["banana", "Cherry"]);
    });

    it("lte works lexicographically", () => {
      expect(filterRows({ columnId: "name", operator: "lte", value: "apple" })).toEqual([
        "Apple",
        "(empty)",
      ]);
    });
  });

  describe("composability", () => {
    it("ANDs multiple filters together", () => {
      const result = applyFilters(
        rows,
        [
          { columnId: "active", operator: "equals", value: "true" },
          { columnId: "amount", operator: "gte", value: 1 },
        ],
        columns,
      );
      expect(result.map((row) => row.cells[0].value)).toEqual(["Apple"]);
    });

    it("returns an empty array when filters contradict", () => {
      const result = applyFilters(
        rows,
        [
          { columnId: "active", operator: "equals", value: "true" },
          { columnId: "active", operator: "equals", value: "false" },
        ],
        columns,
      );
      expect(result).toEqual([]);
    });

    it("ORs multiple filters when match mode is or", () => {
      const result = applyFilters(
        rows,
        [
          { columnId: "name", operator: "equals", value: "apple" },
          { columnId: "name", operator: "equals", value: "cherry" },
        ],
        columns,
        { matchMode: "or" },
      );
      expect(result.map((row) => row.cells[0].value)).toEqual([
        "Apple",
        "Cherry",
      ]);
    });

    it("defaults to and regardless of option shape", () => {
      const filters = [
        { columnId: "active", operator: "equals" as const, value: "true" },
        { columnId: "amount", operator: "gte" as const, value: 100 },
      ];
      expect(applyFilters(rows, filters, columns)).toEqual([]);
      expect(applyFilters(rows, filters, columns, { matchMode: "and" })).toEqual([]);
    });
  });

  describe("robustness", () => {
    it("treats unknown columnIds as empty cells", () => {
      expect(filterRows({ columnId: "missing", operator: "isEmpty" })).toHaveLength(4);
      expect(filterRows({ columnId: "missing", operator: "isNotEmpty" })).toEqual([]);
    });

    it("handles rows shorter than the column count", () => {
      const shortRows = makeRows([["Apple"]]);
      expect(
        filterRows({ columnId: "amount", operator: "isEmpty" }, shortRows),
      ).toEqual(["Apple"]);
    });

    it("does not mutate the input array", () => {
      const snapshot = [...rows];
      applyFilters(rows, [{ columnId: "name", operator: "contains", value: "a" }], columns);
      expect(rows).toEqual(snapshot);
    });
  });
});
