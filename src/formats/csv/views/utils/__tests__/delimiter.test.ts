import { detectDelimiter } from "../delimiter";

describe("detectDelimiter", () => {
  it("detects commas", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });

  it("detects tabs", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("detects semicolons", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
  });

  it("detects pipes", () => {
    expect(detectDelimiter("a|b|c\n1|2|3")).toBe("|");
  });

  it("only inspects the first line", () => {
    expect(detectDelimiter("a,b\n1;2;3;4;5")).toBe(",");
  });

  it("picks the most frequent delimiter in the first line", () => {
    expect(detectDelimiter("a;b;c,d")).toBe(";");
  });

  it("defaults to comma when no delimiter is present", () => {
    expect(detectDelimiter("single")).toBe(",");
    expect(detectDelimiter("")).toBe(",");
  });
});
