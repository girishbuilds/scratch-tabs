import { compareCsvValues } from "../sorting";

const sort = (values: string[]) => [...values].sort(compareCsvValues);

describe("compareCsvValues", () => {
  it("sorts integers numerically, not as text", () => {
    expect(sort(["10", "9", "100", "2"])).toEqual(["2", "9", "10", "100"]);
  });

  it("sorts decimals and negatives numerically", () => {
    expect(sort(["1.25", "1.5", "-5", "0", "-0.5"])).toEqual(["-5", "-0.5", "0", "1.25", "1.5"]);
  });

  it("handles exponents and signs", () => {
    expect(sort(["1e3", "+7", "999"])).toEqual(["+7", "999", "1e3"]);
  });

  it("sorts numbers before text and text naturally", () => {
    expect(sort(["b", "10", "a2", "a10", "3"])).toEqual(["3", "10", "a2", "a10", "b"]);
  });

  it("compares text case-insensitively", () => {
    expect(compareCsvValues("apple", "Banana")).toBeLessThan(0);
  });

  it("treats empty values as text that sorts consistently", () => {
    expect(sort(["5", "", "1"])).toEqual(["1", "5", ""]);
  });
});
