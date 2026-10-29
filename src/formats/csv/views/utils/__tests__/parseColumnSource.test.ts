import { parseColumnSource } from "../parseColumnSource";

describe("parseColumnSource", () => {
  it("treats the first row as headers", () => {
    expect(parseColumnSource("Name,Score\nJohn,90\nJane,80")).toEqual({
      headers: ["Name", "Score"],
      rows: [
        ["John", "90"],
        ["Jane", "80"],
      ],
    });
  });

  it("auto-detects the delimiter", () => {
    expect(parseColumnSource("Name\tScore\nJohn\t90")).toEqual({
      headers: ["Name", "Score"],
      rows: [["John", "90"]],
    });
  });

  it("trims whitespace around values", () => {
    expect(parseColumnSource("Name , Score\n John , 90 ")).toEqual({
      headers: ["Name", "Score"],
      rows: [["John", "90"]],
    });
  });

  it("handles quoted values containing the delimiter", () => {
    expect(parseColumnSource('Name,Note\nJohn,"a, b"').rows).toEqual([
      ["John", "a, b"],
    ]);
  });

  it("skips empty lines", () => {
    expect(parseColumnSource("A,B\n1,2\n\n3,4\n").rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("returns an empty table for blank content", () => {
    expect(parseColumnSource("")).toEqual({ headers: [], rows: [] });
    expect(parseColumnSource("  \n ")).toEqual({ headers: [], rows: [] });
  });

  it("returns only headers when there are no data rows", () => {
    expect(parseColumnSource("A,B")).toEqual({ headers: ["A", "B"], rows: [] });
  });
});
