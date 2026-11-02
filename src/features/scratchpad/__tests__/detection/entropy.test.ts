import { calculateShannonEntropy, isHighEntropy } from "../../services/detection/entropy";

describe("calculateShannonEntropy", () => {
  it("is 0 for empty and single-symbol strings", () => {
    expect(calculateShannonEntropy("")).toBe(0);
    expect(calculateShannonEntropy("aaaa")).toBe(0);
  });

  it("is 1 bit for two equally likely symbols", () => {
    expect(calculateShannonEntropy("abab")).toBeCloseTo(1);
  });

  it("grows with the number of distinct symbols", () => {
    expect(calculateShannonEntropy("abcdefgh")).toBeCloseTo(3);
  });
});

describe("isHighEntropy", () => {
  it("rejects short strings", () => {
    expect(isHighEntropy("aB3dE6gH9jK2")).toBe(false);
  });

  it("ignores surrounding whitespace", () => {
    expect(isHighEntropy("  short  ")).toBe(false);
  });

  it("accepts long varied hex", () => {
    expect(isHighEntropy("3f9a1c7e5b2d4086a9e1c3b5d7f90246")).toBe(true);
  });

  it("rejects long repetitive hex and hex that is too short", () => {
    expect(isHighEntropy("a".repeat(40))).toBe(false);
    expect(isHighEntropy("3f9a1c7e5b2d4086a9e1")).toBe(false);
  });

  it("accepts long varied base64-ish text", () => {
    expect(isHighEntropy("q8Zk3Lp0Xv9RtYw2Nc7Ud4Hs6Jb1MgFe5aBo")).toBe(true);
  });

  it("rejects repetitive base64-ish text", () => {
    expect(isHighEntropy("abcabcabcabcabcabcabcabcabc")).toBe(false);
  });

  it("applies a stricter bar to other character sets", () => {
    expect(isHighEntropy("Aa1!Bb2@Cc3#Dd4$Ee5%Ff6^Gg7&")).toBe(true);
    expect(isHighEntropy("a b a b a b a b a b a b a b a b")).toBe(false);
  });
});
