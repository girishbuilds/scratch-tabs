import { fireEvent, render, screen } from "@testing-library/react";
import type { MergeInput, MergeOptions } from "../../types";
import CsvMergeOptions from "../CsvMergeOptions";
import { csvMergeStrategy } from "../mergeStrategy";

const input = (id: string, title: string, content: string): MergeInput => ({
  id,
  title,
  content,
  language: "csv",
});

const merge = (inputs: MergeInput[], options: MergeOptions = {}) =>
  csvMergeStrategy.merge(inputs, options);

describe("CSV / TSV merge strategy", () => {
  it("includes repeated headers once and preserves duplicate data rows", () => {
    const result = merge([
      input("one", "One", "name,age\nAda,36\nAda,36\n,"),
      input("two", "Two", "name,age\nGrace,44\nAda,36"),
    ]);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        content: "name,age\nAda,36\nAda,36\n,\nGrace,44\nAda,36",
        language: "csv",
        counts: { sources: 2, rows: 5, columns: 2 },
      }),
    );
  });

  it("parses and serializes quoted delimiters and embedded newlines", () => {
    const result = merge([
      input("one", "One", 'name,note\nAda,"comma, inside"'),
      input("two", "Two", 'name,note\nGrace,"two\nlines"'),
    ]);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        content: 'name,note\nAda,"comma, inside"\nGrace,"two\nlines"',
      }),
    );
  });

  it("uses the first source delimiter for TSV output", () => {
    const result = merge([
      input("one", "One", "name\tage\nAda\t36"),
      input("two", "Two", "name,age\nGrace,44"),
    ]);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        content: "name\tage\nAda\t36\nGrace\t44",
      }),
    );
  });

  it("rejects reordered headers by default and aligns them when requested", () => {
    const inputs = [
      input("one", "One", "name,age\nAda,36"),
      input("two", "Two", "age,name\n44,Grace"),
    ];

    expect(merge(inputs)).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "csv_header_order",
        message: expect.stringContaining("Align columns by name"),
      }),
    });
    expect(merge(inputs, { alignColumnsByName: true })).toEqual(
      expect.objectContaining({
        ok: true,
        content: "name,age\nAda,36\nGrace,44",
      }),
    );
  });

  it("rejects missing and extra named columns when aligning", () => {
    const missing = merge(
      [
        input("one", "One", "name,age,city\nAda,36,London"),
        input("two", "Two", "name,age,country\nGrace,44,US"),
      ],
      { alignColumnsByName: true },
    );

    expect(missing).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "csv_incompatible_headers",
        message: expect.stringMatching(/missing "city".*extra "country"/),
      }),
    });
  });

  it("rejects rows and sources with missing or extra columns", () => {
    expect(
      merge([
        input("one", "One", "name,age\nAda,36"),
        input("two", "Two", "name,age\nGrace"),
      ]),
    ).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "csv_unequal_columns",
        message: expect.stringContaining("1 missing"),
      }),
    });

    expect(
      merge([
        input("one", "One", "name,age\nAda,36"),
        input("two", "Two", "name,age,city\nGrace,44,London"),
      ]),
    ).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "csv_incompatible_columns",
        message: expect.stringContaining("1 extra"),
      }),
    });
  });

  it("rejects duplicate header names", () => {
    const result = merge([
      input("one", "One", "name,name\nAda,Lovelace"),
      input("two", "Two", "name,name\nGrace,Hopper"),
    ]);

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "csv_duplicate_headers",
        message: expect.stringContaining('"name"'),
      }),
    });
  });

  it("treats every row as data when inputs are declared headerless", () => {
    const result = merge(
      [
        input("one", "One", "Ada,36\nGrace,44"),
        input("two", "Two", "Linus,54\nMargaret,87"),
      ],
      { hasHeader: { one: false, two: false } },
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        content: "Ada,36\nGrace,44\nLinus,54\nMargaret,87",
        counts: { sources: 2, rows: 4, columns: 2 },
      }),
    );
  });

  it("rejects malformed CSV with the source name and row", () => {
    const inputs = [
      input("one", "One", "name,note\nAda,ok"),
      input("two", "Two", 'name,note\nGrace,"unterminated'),
    ];

    expect(csvMergeStrategy.canMerge(inputs)).toEqual({
      canMerge: false,
      reason: expect.stringMatching(/Two.*row 2.*unterminated/i),
    });
    expect(merge(inputs)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "csv_ineligible" }),
    });
  });

  it("requires CSV language IDs", () => {
    const inputs = [
      input("one", "One", "name,age\nAda,36"),
      { ...input("two", "Two", "name,age\nGrace,44"), language: "plaintext" },
    ];

    expect(csvMergeStrategy.canMerge(inputs)).toEqual({
      canMerge: false,
      reason: "Two is not marked as CSV / TSV.",
    });
  });
});

describe("CSV merge options", () => {
  it("defaults every source to a header and reports option changes", () => {
    const onOptionsChange = jest.fn();
    const inputs = [
      input("one", "One", "name,age\nAda,36"),
      input("two", "Two", "name,age\nGrace,44"),
    ];
    render(
      <CsvMergeOptions
        inputs={inputs}
        options={{}}
        onOptionsChange={onOptionsChange}
      />,
    );

    expect(screen.getByLabelText("One has a header")).toBeChecked();
    expect(screen.getByLabelText("Two has a header")).toBeChecked();
    expect(screen.getByLabelText("Align columns by name")).not.toBeChecked();

    fireEvent.click(screen.getByLabelText("Two has a header"));
    expect(onOptionsChange).toHaveBeenCalledWith({
      hasHeader: { two: false },
    });
    fireEvent.click(screen.getByLabelText("Align columns by name"));
    expect(onOptionsChange).toHaveBeenCalledWith({
      alignColumnsByName: true,
    });
  });
});
