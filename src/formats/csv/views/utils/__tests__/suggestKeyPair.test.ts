import { suggestKeyPair } from "../suggestKeyPair";
import { CsvColumn } from "../../types";

const col = (id: string, name: string, index: number): CsvColumn => ({
  id,
  name,
  type: "text",
  index,
});

const columns = [col("a", "Id", 0), col("b", "Name", 1), col("c", "City", 2)];

describe("suggestKeyPair", () => {
  it("pairs the first current column whose name appears in the source headers", () => {
    expect(suggestKeyPair(columns, ["Score", "Name", "City"])).toEqual({
      targetColumnId: "b",
      sourceColumnIndex: 1,
    });
  });

  it("matches names case-insensitively and ignoring whitespace", () => {
    expect(suggestKeyPair(columns, [" id ", "Score"])).toEqual({
      targetColumnId: "a",
      sourceColumnIndex: 0,
    });
  });

  it("returns null when no names are shared", () => {
    expect(suggestKeyPair(columns, ["Score", "Team"])).toBeNull();
  });

  it("returns null for empty inputs", () => {
    expect(suggestKeyPair([], ["Id"])).toBeNull();
    expect(suggestKeyPair(columns, [])).toBeNull();
  });

  it("ignores blank headers", () => {
    expect(suggestKeyPair([col("a", "", 0)], [""])).toBeNull();
  });
});
