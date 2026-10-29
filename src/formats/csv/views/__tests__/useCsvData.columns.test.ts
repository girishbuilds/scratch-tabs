import { renderHook, act, waitFor } from "@testing-library/react";
import { useCsvData } from "../hooks/useCsvData";

const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;

describe("useCsvData column operations", () => {
  // Fresh mock per hook: a debounced sync from an earlier test must not leak
  // into a later test's assertions.
  let onContentChange: jest.Mock;

  beforeEach(() => {
    onContentChange = jest.fn();
  });

  const setup = () => {
    const callback = onContentChange;
    return renderHook(() => useCsvData(sampleCsv, callback));
  };

  const columnNames = (result: ReturnType<typeof setup>["result"]) =>
    result.current.columns.map((column) => column.name);

  describe("duplicateColumn", () => {
    it("inserts a copy right after the original with the same values", () => {
      const { result } = setup();

      act(() => {
        result.current.duplicateColumn(result.current.columns[1].id);
      });

      expect(columnNames(result)).toEqual(["Name", "Age", "Age Copy", "City"]);
      expect(result.current.data[0].cells.map((c) => c.value)).toEqual([
        "John Doe",
        "28",
        "28",
        "New York",
      ]);
    });

    it("is a no-op for an unknown column", () => {
      const { result } = setup();

      act(() => {
        result.current.duplicateColumn("missing");
      });

      expect(columnNames(result)).toEqual(["Name", "Age", "City"]);
      expect(result.current.canUndo).toBe(false);
    });

    it("can be undone and redone as a single step", () => {
      const { result } = setup();

      act(() => {
        result.current.duplicateColumn(result.current.columns[1].id);
      });
      act(() => {
        result.current.undo();
      });
      expect(columnNames(result)).toEqual(["Name", "Age", "City"]);

      act(() => {
        result.current.redo();
      });
      expect(columnNames(result)).toEqual(["Name", "Age", "Age Copy", "City"]);
    });

    it("syncs the new column back to the content", async () => {
      const { result } = setup();

      act(() => {
        result.current.duplicateColumn(result.current.columns[1].id);
      });

      await waitFor(() => expect(onContentChange).toHaveBeenCalled());
      expect(onContentChange.mock.calls[0][0].split(/\r?\n/)[0]).toBe(
        "Name,Age,Age Copy,City",
      );
    });
  });

  describe("moveColumn", () => {
    it("moves a column to the requested index", () => {
      const { result } = setup();

      act(() => {
        result.current.moveColumn(result.current.columns[0].id, 2);
      });

      expect(columnNames(result)).toEqual(["Age", "City", "Name"]);
      expect(result.current.data[0].cells.map((c) => c.value)).toEqual([
        "28",
        "New York",
        "John Doe",
      ]);
    });

    it("is a no-op, with no history entry, when nothing would change", () => {
      const { result } = setup();

      act(() => {
        result.current.moveColumn(result.current.columns[1].id, 1);
      });

      expect(columnNames(result)).toEqual(["Name", "Age", "City"]);
      expect(result.current.canUndo).toBe(false);
      expect(onContentChange).not.toHaveBeenCalled();
    });

    it("can be undone and redone", () => {
      const { result } = setup();

      act(() => {
        result.current.moveColumn(result.current.columns[2].id, 0);
      });
      expect(columnNames(result)).toEqual(["City", "Name", "Age"]);

      act(() => {
        result.current.undo();
      });
      expect(columnNames(result)).toEqual(["Name", "Age", "City"]);

      act(() => {
        result.current.redo();
      });
      expect(columnNames(result)).toEqual(["City", "Name", "Age"]);
    });

    it("syncs the new column order back to the content", async () => {
      const { result } = setup();

      act(() => {
        result.current.moveColumn(result.current.columns[0].id, 2);
      });

      await waitFor(() => expect(onContentChange).toHaveBeenCalled());
      expect(onContentChange.mock.calls[0][0].split(/\r?\n/).slice(0, 2)).toEqual([
        "Age,City,Name",
        "28,New York,John Doe",
      ]);
    });
  });

  describe("addColumnsFromTable", () => {
    const source = {
      headers: ["Name", "Score"],
      rows: [
        ["Bob Johnson", "70"],
        ["John Doe", "90"],
      ],
    };

    it("adds columns matched by key", () => {
      const { result } = setup();

      act(() => {
        result.current.addColumnsFromTable(source, {
          sourceColumns: [1],
          match: {
            mode: "key",
            targetColumnId: result.current.columns[0].id,
            sourceColumnIndex: 0,
          },
        });
      });

      expect(columnNames(result)).toEqual(["Name", "Age", "City", "Score"]);
      expect(result.current.data.map((row) => row.cells[3].value)).toEqual([
        "90",
        "",
        "70",
      ]);
    });

    it("adds columns matched by row position after a chosen column", () => {
      const { result } = setup();

      act(() => {
        result.current.addColumnsFromTable(source, {
          sourceColumns: [1],
          match: { mode: "position" },
          insertAfterColumnId: result.current.columns[0].id,
        });
      });

      expect(columnNames(result)).toEqual(["Name", "Score", "Age", "City"]);
      expect(result.current.data.map((row) => row.cells[1].value)).toEqual([
        "70",
        "90",
        "",
      ]);
    });

    it("is a no-op when the request is invalid", () => {
      const { result } = setup();

      act(() => {
        result.current.addColumnsFromTable(source, {
          sourceColumns: [],
          match: { mode: "position" },
        });
      });

      expect(columnNames(result)).toEqual(["Name", "Age", "City"]);
      expect(result.current.canUndo).toBe(false);
    });

    it("is undone as a single step", () => {
      const { result } = setup();

      act(() => {
        result.current.addColumnsFromTable(source, {
          sourceColumns: [0, 1],
          match: { mode: "position" },
        });
      });
      expect(result.current.columns).toHaveLength(5);

      act(() => {
        result.current.undo();
      });
      expect(columnNames(result)).toEqual(["Name", "Age", "City"]);
    });

    it("syncs the added columns back to the content", async () => {
      const { result } = setup();

      act(() => {
        result.current.addColumnsFromTable(source, {
          sourceColumns: [1],
          match: { mode: "position" },
        });
      });

      await waitFor(() => expect(onContentChange).toHaveBeenCalled());
      expect(onContentChange.mock.calls[0][0].split(/\r?\n/)[0]).toBe(
        "Name,Age,City,Score",
      );
    });
  });
});
