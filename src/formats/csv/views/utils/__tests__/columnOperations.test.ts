import {
  CsvTableState,
  duplicateColumn,
  moveColumn,
  addColumnsFromTable,
} from "../columnOperations";
import { CsvColumn, CsvRow } from "../../types";

const makeColumn = (id: string, name: string, index: number): CsvColumn => ({
  id,
  name,
  type: "text",
  index,
});

const makeRow = (id: string, values: string[], originalIndex = 0): CsvRow => ({
  id,
  cells: values.map((value) => ({ value, isValid: true })),
  originalIndex,
  isValid: true,
});

const makeState = (): CsvTableState => ({
  columns: [
    makeColumn("c_name", "Name", 0),
    makeColumn("c_age", "Age", 1),
    makeColumn("c_city", "City", 2),
  ],
  data: [
    makeRow("r1", ["John", "28", "New York"], 0),
    makeRow("r2", ["Jane", "32", "Boston"], 1),
    makeRow("r3", ["Bob", "45", "Chicago"], 2),
  ],
});

const names = (state: CsvTableState) => state.columns.map((c) => c.name);
const rowValues = (state: CsvTableState) =>
  state.data.map((row) => row.cells.map((cell) => cell.value));

const sequentialIds = () => {
  let n = 0;
  return () => `new_${++n}`;
};

describe("duplicateColumn", () => {
  it("inserts a copy of the column directly after the original", () => {
    const result = duplicateColumn(makeState(), "c_age", sequentialIds());

    expect(names(result)).toEqual(["Name", "Age", "Age Copy", "City"]);
    expect(rowValues(result)).toEqual([
      ["John", "28", "28", "New York"],
      ["Jane", "32", "32", "Boston"],
      ["Bob", "45", "45", "Chicago"],
    ]);
  });

  it("gives the copy a fresh id and keeps the original type", () => {
    const state = makeState();
    state.columns[1] = { ...state.columns[1], type: "number" };

    const result = duplicateColumn(state, "c_age", sequentialIds());

    expect(result.columns[2].id).toBe("new_1");
    expect(result.columns[2].type).toBe("number");
  });

  it("re-indexes every column", () => {
    const result = duplicateColumn(makeState(), "c_name", sequentialIds());

    expect(result.columns.map((c) => c.index)).toEqual([0, 1, 2, 3]);
  });

  it("copies cells rather than sharing references", () => {
    const result = duplicateColumn(makeState(), "c_name", sequentialIds());

    expect(result.data[0].cells[0]).not.toBe(result.data[0].cells[1]);
  });

  it("fills missing cells in short rows with an empty cell", () => {
    const state = makeState();
    state.data[1] = makeRow("r2", ["Jane"], 1);

    const result = duplicateColumn(state, "c_city", sequentialIds());

    expect(result.data[1].cells.map((c) => c.value)).toEqual([
      "Jane",
      "",
      "",
      "",
    ]);
  });

  it("returns the same state when the column does not exist", () => {
    const state = makeState();

    expect(duplicateColumn(state, "missing", sequentialIds())).toBe(state);
  });

  it("does not mutate the input state", () => {
    const state = makeState();
    const snapshot = JSON.parse(JSON.stringify(state));

    duplicateColumn(state, "c_age", sequentialIds());

    expect(state).toEqual(snapshot);
  });
});

describe("moveColumn", () => {
  it("moves a column to a later position", () => {
    const result = moveColumn(makeState(), "c_name", 2);

    expect(names(result)).toEqual(["Age", "City", "Name"]);
    expect(rowValues(result)).toEqual([
      ["28", "New York", "John"],
      ["32", "Boston", "Jane"],
      ["45", "Chicago", "Bob"],
    ]);
  });

  it("moves a column to an earlier position", () => {
    const result = moveColumn(makeState(), "c_city", 0);

    expect(names(result)).toEqual(["City", "Name", "Age"]);
    expect(rowValues(result)[0]).toEqual(["New York", "John", "28"]);
  });

  it("keeps column ids stable and re-indexes", () => {
    const result = moveColumn(makeState(), "c_city", 0);

    expect(result.columns.map((c) => c.id)).toEqual([
      "c_city",
      "c_name",
      "c_age",
    ]);
    expect(result.columns.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it("clamps an out-of-range target index", () => {
    expect(names(moveColumn(makeState(), "c_name", 99))).toEqual([
      "Age",
      "City",
      "Name",
    ]);
    expect(names(moveColumn(makeState(), "c_city", -5))).toEqual([
      "City",
      "Name",
      "Age",
    ]);
  });

  it("returns the same state when the column is already at the target", () => {
    const state = makeState();

    expect(moveColumn(state, "c_age", 1)).toBe(state);
  });

  it("returns the same state when the column does not exist", () => {
    const state = makeState();

    expect(moveColumn(state, "missing", 0)).toBe(state);
  });

  it("keeps cells aligned with their column in short rows", () => {
    const state = makeState();
    state.data[1] = makeRow("r2", ["Jane", "32"], 1);

    const result = moveColumn(state, "c_name", 2);

    expect(result.data[1].cells.map((c) => c.value)).toEqual(["32", "", "Jane"]);
  });

  it("does not mutate the input state", () => {
    const state = makeState();
    const snapshot = JSON.parse(JSON.stringify(state));

    moveColumn(state, "c_name", 2);

    expect(state).toEqual(snapshot);
  });
});

describe("addColumnsFromTable", () => {
  const source = {
    headers: ["Name", "Score", "Team"],
    rows: [
      ["Bob", "70", "Red"],
      ["John", "90", "Blue"],
      ["Jane", "80", "Green"],
    ],
  };

  describe("matching by row position", () => {
    it("appends the chosen source columns in row order", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        { sourceColumns: [1, 2], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(names(result)).toEqual(["Name", "Age", "City", "Score", "Team"]);
      expect(rowValues(result)[0]).toEqual([
        "John",
        "28",
        "New York",
        "70",
        "Red",
      ]);
      expect(rowValues(result)[2]).toEqual([
        "Bob",
        "45",
        "Chicago",
        "80",
        "Green",
      ]);
    });

    it("fills with empty values when the source has fewer rows", () => {
      const shortSource = { headers: ["Score"], rows: [["70"]] };

      const result = addColumnsFromTable(
        makeState(),
        shortSource,
        { sourceColumns: [0], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(rowValues(result).map((r) => r[3])).toEqual(["70", "", ""]);
    });

    it("does not add rows when the source has more rows", () => {
      const longSource = {
        headers: ["Score"],
        rows: [["1"], ["2"], ["3"], ["4"]],
      };

      const result = addColumnsFromTable(
        makeState(),
        longSource,
        { sourceColumns: [0], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(result.data).toHaveLength(3);
    });
  });

  describe("matching by key", () => {
    const keyed = {
      sourceColumns: [1, 2],
      match: {
        mode: "key" as const,
        targetColumnId: "c_name",
        sourceColumnIndex: 0,
      },
    };

    it("looks values up by the key column regardless of source order", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        keyed,
        sequentialIds(),
      );

      expect(rowValues(result)).toEqual([
        ["John", "28", "New York", "90", "Blue"],
        ["Jane", "32", "Boston", "80", "Green"],
        ["Bob", "45", "Chicago", "70", "Red"],
      ]);
    });

    it("leaves cells empty when a row has no match", () => {
      const partial = {
        headers: source.headers,
        rows: [["John", "90", "Blue"]],
      };

      const result = addColumnsFromTable(
        makeState(),
        partial,
        keyed,
        sequentialIds(),
      );

      expect(rowValues(result)[1].slice(3)).toEqual(["", ""]);
    });

    it("uses the first source row when keys repeat", () => {
      const duplicated = {
        headers: source.headers,
        rows: [
          ["John", "90", "Blue"],
          ["John", "10", "Other"],
        ],
      };

      const result = addColumnsFromTable(
        makeState(),
        duplicated,
        keyed,
        sequentialIds(),
      );

      expect(rowValues(result)[0].slice(3)).toEqual(["90", "Blue"]);
    });

    it("ignores surrounding whitespace in keys", () => {
      const padded = {
        headers: source.headers,
        rows: [[" John ", "90", "Blue"]],
      };

      const result = addColumnsFromTable(
        makeState(),
        padded,
        keyed,
        sequentialIds(),
      );

      expect(rowValues(result)[0].slice(3)).toEqual(["90", "Blue"]);
    });

    it("does not match empty keys to each other", () => {
      const state = makeState();
      state.data[0] = makeRow("r1", ["", "28", "New York"], 0);
      const blankKey = {
        headers: source.headers,
        rows: [["", "90", "Blue"]],
      };

      const result = addColumnsFromTable(state, blankKey, keyed, sequentialIds());

      expect(rowValues(result)[0].slice(3)).toEqual(["", ""]);
    });

    it("returns the same state when the key column does not exist", () => {
      const state = makeState();

      const result = addColumnsFromTable(
        state,
        source,
        {
          sourceColumns: [1],
          match: { mode: "key", targetColumnId: "missing", sourceColumnIndex: 0 },
        },
        sequentialIds(),
      );

      expect(result).toBe(state);
    });

    it("returns the same state when the source key index is out of range", () => {
      const state = makeState();

      const result = addColumnsFromTable(
        state,
        source,
        {
          sourceColumns: [1],
          match: { mode: "key", targetColumnId: "c_name", sourceColumnIndex: 9 },
        },
        sequentialIds(),
      );

      expect(result).toBe(state);
    });
  });

  it("keeps new cells aligned with their column in short rows", () => {
    const state = makeState();
    state.data[1] = makeRow("r2", ["Jane"], 1);

    const result = addColumnsFromTable(
      state,
      source,
      { sourceColumns: [1], match: { mode: "position" } },
      sequentialIds(),
    );

    expect(result.data[1].cells.map((c) => c.value)).toEqual([
      "Jane",
      "",
      "",
      "90",
    ]);
  });

  describe("placement", () => {
    it("inserts after the given column", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        {
          sourceColumns: [1],
          match: { mode: "position" },
          insertAfterColumnId: "c_name",
        },
        sequentialIds(),
      );

      expect(names(result)).toEqual(["Name", "Score", "Age", "City"]);
      expect(rowValues(result)[0]).toEqual(["John", "70", "28", "New York"]);
    });

    it("appends when the anchor column does not exist", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        {
          sourceColumns: [1],
          match: { mode: "position" },
          insertAfterColumnId: "missing",
        },
        sequentialIds(),
      );

      expect(names(result)).toEqual(["Name", "Age", "City", "Score"]);
    });
  });

  describe("new columns", () => {
    it("assigns fresh ids, text type and re-indexes", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        { sourceColumns: [1, 2], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(result.columns.slice(3).map((c) => c.id)).toEqual([
        "new_1",
        "new_2",
      ]);
      expect(result.columns.slice(3).every((c) => c.type === "text")).toBe(true);
      expect(result.columns.map((c) => c.index)).toEqual([0, 1, 2, 3, 4]);
    });

    it("renames headers that clash with existing columns", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        { sourceColumns: [0], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(names(result)).toEqual(["Name", "Age", "City", "Name (2)"]);
    });

    it("renames clashes between the new columns themselves", () => {
      const clashing = { headers: ["X", "X"], rows: [["1", "2"]] };

      const result = addColumnsFromTable(
        makeState(),
        clashing,
        { sourceColumns: [0, 1], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(names(result).slice(3)).toEqual(["X", "X (2)"]);
    });

    it("names blank headers after their source position", () => {
      const blank = { headers: ["", "Score"], rows: [["a", "1"]] };

      const result = addColumnsFromTable(
        makeState(),
        blank,
        { sourceColumns: [0], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(names(result)[3]).toBe("Column 1");
    });

    it("preserves the order the source columns were requested in", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        { sourceColumns: [2, 1], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(names(result).slice(3)).toEqual(["Team", "Score"]);
    });
  });

  describe("invalid requests", () => {
    it("returns the same state when no source columns are chosen", () => {
      const state = makeState();

      expect(
        addColumnsFromTable(
          state,
          source,
          { sourceColumns: [], match: { mode: "position" } },
          sequentialIds(),
        ),
      ).toBe(state);
    });

    it("skips source column indexes that do not exist", () => {
      const result = addColumnsFromTable(
        makeState(),
        source,
        { sourceColumns: [1, 42], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(names(result)).toEqual(["Name", "Age", "City", "Score"]);
    });

    it("returns the same state when every chosen index is invalid", () => {
      const state = makeState();

      expect(
        addColumnsFromTable(
          state,
          source,
          { sourceColumns: [42], match: { mode: "position" } },
          sequentialIds(),
        ),
      ).toBe(state);
    });

    it("does not mutate the input state", () => {
      const state = makeState();
      const snapshot = JSON.parse(JSON.stringify(state));

      addColumnsFromTable(
        state,
        source,
        { sourceColumns: [1], match: { mode: "position" } },
        sequentialIds(),
      );

      expect(state).toEqual(snapshot);
    });
  });
});
