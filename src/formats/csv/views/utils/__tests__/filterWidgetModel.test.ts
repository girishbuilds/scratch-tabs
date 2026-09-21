import { ColumnFilter } from "../filtering";
import {
  booleanToFilter,
  describeFilter,
  facetSelectionToFilter,
  quickFilterFromCell,
  QuickFilterAction,
  rangeToFilter,
  textToFilter,
  toBooleanSelection,
  toFacetSelection,
  toRangeValues,
  toTextValues,
} from "../filterWidgetModel";

describe("filterWidgetModel", () => {
  describe("toRangeValues", () => {
    it("returns empty values when there is no filter", () => {
      expect(toRangeValues(undefined)).toEqual({ min: "", max: "" });
    });

    it("maps unrelated operators to empty values", () => {
      const filter: ColumnFilter = {
        columnId: "amount",
        operator: "contains",
        value: "5",
      };
      expect(toRangeValues(filter)).toEqual({ min: "", max: "" });
    });

    it("reads a min-only (gte) filter", () => {
      expect(toRangeValues({ columnId: "amount", operator: "gte", value: 10 })).toEqual({
        min: "10",
        max: "",
      });
    });

    it("reads a max-only (lte) filter", () => {
      expect(toRangeValues({ columnId: "amount", operator: "lte", value: 25 })).toEqual({
        min: "",
        max: "25",
      });
    });

    it("reads a between filter", () => {
      expect(
        toRangeValues({
          columnId: "created",
          operator: "between",
          value: ["2024-01-01", "2024-02-01"],
        }),
      ).toEqual({ min: "2024-01-01", max: "2024-02-01" });
    });

    it("tolerates malformed between values", () => {
      expect(
        toRangeValues({
          columnId: "amount",
          operator: "between",
          value: [5] as unknown as [string, string],
        }),
      ).toEqual({ min: "", max: "" });
    });
  });

  describe("rangeToFilter", () => {
    it("returns undefined when both bounds are blank", () => {
      expect(rangeToFilter("col", "", "")).toBeUndefined();
      expect(rangeToFilter("col", "   ", "")).toBeUndefined();
    });

    it("builds a gte filter for a min-only bound", () => {
      expect(rangeToFilter("col", "10", "")).toEqual({
        columnId: "col",
        operator: "gte",
        value: "10",
      });
    });

    it("builds an lte filter for a max-only bound", () => {
      expect(rangeToFilter("col", "", "20")).toEqual({
        columnId: "col",
        operator: "lte",
        value: "20",
      });
    });

    it("builds a between filter for two bounds", () => {
      expect(rangeToFilter("col", "1", "9")).toEqual({
        columnId: "col",
        operator: "between",
        value: ["1", "9"],
      });
    });

    it("swaps inverted bounds so the range is always valid", () => {
      expect(rangeToFilter("col", "50", "10")).toEqual({
        columnId: "col",
        operator: "between",
        value: ["10", "50"],
      });
    });

    it("swaps inverted date bounds lexicographically", () => {
      expect(
        rangeToFilter("col", "2024-03-01", "2024-01-01"),
      ).toMatchObject({ operator: "between", value: ["2024-01-01", "2024-03-01"] });
    });

    it("round-trips through toRangeValues", () => {
      const filter = rangeToFilter("col", "3", "");
      expect(filter).toBeDefined();
      expect(toRangeValues(filter)).toEqual({ min: "3", max: "" });
    });
  });

  describe("text widget conversions", () => {
    it("defaults to contains with an empty value", () => {
      expect(toTextValues(undefined)).toEqual({
        operator: "contains",
        value: "",
      });
    });

    it("keeps supported operators and their value", () => {
      expect(
        toTextValues({ columnId: "name", operator: "startsWith", value: "Ap" }),
      ).toEqual({ operator: "startsWith", value: "Ap" });
      expect(
        toTextValues({ columnId: "name", operator: "notEquals", value: "Pear" }),
      ).toEqual({ operator: "notEquals", value: "Pear" });
      expect(
        toTextValues({ columnId: "name", operator: "notContains", value: "err" }),
      ).toEqual({ operator: "notContains", value: "err" });
      expect(
        toTextValues({ columnId: "name", operator: "regex", value: "^a" }),
      ).toEqual({ operator: "regex", value: "^a" });
    });

    it("falls back to contains for unsupported operators", () => {
      expect(
        toTextValues({ columnId: "name", operator: "gt", value: 5 }),
      ).toEqual({ operator: "contains", value: "" });
    });

    it("returns undefined for blank input", () => {
      expect(textToFilter("name", "contains", "")).toBeUndefined();
      expect(textToFilter("name", "equals", "   ")).toBeUndefined();
    });

    it("builds a filter from non-blank input", () => {
      expect(textToFilter("name", "contains", "an")).toEqual({
        columnId: "name",
        operator: "contains",
        value: "an",
      });
    });
  });

  describe("boolean widget conversions", () => {
    it("maps missing or unrecognized filters to any", () => {
      expect(toBooleanSelection(undefined)).toBe("any");
      expect(
        toBooleanSelection({ columnId: "active", operator: "isEmpty" }),
      ).toBe("any");
    });

    it("recognizes equals true/false case-insensitively", () => {
      expect(
        toBooleanSelection({ columnId: "active", operator: "equals", value: "TRUE" }),
      ).toBe("true");
      expect(
        toBooleanSelection({ columnId: "active", operator: "equals", value: "false" }),
      ).toBe("false");
    });

    it("any clears the filter, true/false build equals filters", () => {
      expect(booleanToFilter("active", "any")).toBeUndefined();
      expect(booleanToFilter("active", "true")).toEqual({
        columnId: "active",
        operator: "equals",
        value: "true",
      });
      expect(booleanToFilter("active", "false")).toEqual({
        columnId: "active",
        operator: "equals",
        value: "false",
      });
    });
  });

  describe("describeFilter", () => {
    it("falls back to the column id when no name is given", () => {
      expect(describeFilter({ columnId: "amount", operator: "gt", value: 100 })).toBe(
        "amount > 100",
      );
    });

    it("uses the column name when provided", () => {
      expect(
        describeFilter(
          { columnId: "amount", operator: "gte", value: "10" },
          "Amount",
        ),
      ).toBe("Amount ≥ 10");
    });

    it("describes ordered and equality operators", () => {
      expect(describeFilter({ columnId: "a", operator: "lt", value: 5 }, "A")).toBe("A < 5");
      expect(describeFilter({ columnId: "a", operator: "lte", value: 5 }, "A")).toBe("A ≤ 5");
      expect(describeFilter({ columnId: "a", operator: "notEquals", value: "x" }, "A")).toBe(
        "A ≠ x",
      );
    });

    it("describes textual operators in words", () => {
      expect(
        describeFilter({ columnId: "a", operator: "contains", value: "oo" }, "Name"),
      ).toBe("Name contains oo");
      expect(
        describeFilter({ columnId: "a", operator: "notContains", value: "oo" }, "Name"),
      ).toBe("Name does not contain oo");
      expect(
        describeFilter({ columnId: "a", operator: "startsWith", value: "Ap" }, "Name"),
      ).toBe("Name starts with Ap");
    });

    it("describes emptiness without a value", () => {
      expect(describeFilter({ columnId: "a", operator: "isEmpty" }, "Name")).toBe(
        "Name is empty",
      );
      expect(describeFilter({ columnId: "a", operator: "isNotEmpty" }, "Name")).toBe(
        "Name is not empty",
      );
    });

    it("describes ranges, lists and regexes", () => {
      expect(
        describeFilter(
          { columnId: "created", operator: "between", value: ["2024-01-01", "2024-02-01"] },
          "Created",
        ),
      ).toBe("Created 2024-01-01 - 2024-02-01");
      expect(
        describeFilter({ columnId: "a", operator: "in", value: ["x", "y"] }, "A"),
      ).toBe("A in (x, y)");
      expect(describeFilter({ columnId: "a", operator: "regex", value: "^b" }, "A")).toBe(
        "A /^b/",
      );
    });

    it("handles malformed between values gracefully", () => {
      expect(
        describeFilter({
          columnId: "a",
          operator: "between",
          value: [] as unknown as [string, string],
        }),
      ).toBe("a between");
    });
  });

  describe("facet selection conversions", () => {
    it("maps missing or non-in filters to no restriction", () => {
      expect(toFacetSelection(undefined)).toBeNull();
      expect(
        toFacetSelection({ columnId: "region", operator: "equals", value: "east" }),
      ).toBeNull();
      expect(
        toFacetSelection({ columnId: "region", operator: "in", value: "oops" }),
      ).toBeNull();
    });

    it("reads the selected values from an in filter", () => {
      expect(
        toFacetSelection({
          columnId: "region",
          operator: "in",
          value: ["east", "west"],
        }),
      ).toEqual(["east", "west"]);
    });

    it("clears the filter when nothing or everything is selected", () => {
      expect(facetSelectionToFilter("region", [], 3)).toBeUndefined();
      expect(
        facetSelectionToFilter("region", ["a", "b", "c"], 3),
      ).toBeUndefined();
      // duplicates are collapsed before comparing against the total
      expect(facetSelectionToFilter("region", ["a", "a", "b", "c"], 3)).toBeUndefined();
    });

    it("builds an in filter for a partial selection", () => {
      expect(facetSelectionToFilter("region", ["east"], 2)).toEqual({
        columnId: "region",
        operator: "in",
        value: ["east"],
      });
    });
  });

  describe("quickFilterFromCell", () => {
    it.each<QuickFilterAction>(["equals", "notEquals", "gt", "lt"])(
      "builds a %s filter from the cell value",
      (action) => {
        expect(quickFilterFromCell(action, "amount", "42")).toEqual({
          columnId: "amount",
          operator: action,
          value: "42",
        });
      },
    );

    it("returns undefined for blank or missing cell values", () => {
      expect(quickFilterFromCell("equals", "name", "")).toBeUndefined();
      expect(quickFilterFromCell("equals", "name", "   ")).toBeUndefined();
      expect(quickFilterFromCell("gt", "amount", undefined)).toBeUndefined();
    });

    it("trims the cell value", () => {
      expect(quickFilterFromCell("equals", "name", " Apple ")).toEqual({
        columnId: "name",
        operator: "equals",
        value: "Apple",
      });
    });
  });
});
