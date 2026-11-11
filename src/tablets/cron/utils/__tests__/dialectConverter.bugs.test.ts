import { convertBetweenDialects } from "../dialectConverter";
import { CronExpression } from "../../types";

/**
 * Bug-confirmation tests: each of these describes CORRECT behaviour and is
 * expected to FAIL against the current implementation.
 */

const expr = (dayOfWeek: string, dayOfMonth = "*"): CronExpression => ({
  second: "0",
  minute: "0",
  hour: "9",
  dayOfMonth,
  month: "*",
  dayOfWeek,
  year: "*",
  raw: "",
});

describe("dialectConverter - confirmed bugs", () => {
  describe("step values in day-of-week are renumbered like day values", () => {
    test("unix -> quartz keeps the step of */2 (every other day)", () => {
      const out = convertBetweenDialects(expr("*/2"), "unix", "quartz");
      expect(out.dayOfWeek).toBe("*/2");
    });

    test("unix 1-5/2 (Mon,Wed,Fri) -> quartz 2-6/2, step unchanged", () => {
      const out = convertBetweenDialects(expr("1-5/2"), "unix", "quartz");
      expect(out.dayOfWeek).toBe("2-6/2");
    });

    test("quartz -> unix keeps the step of 2-6/2", () => {
      const out = convertBetweenDialects(expr("2-6/2", "?"), "quartz", "unix");
      expect(out.dayOfWeek).toBe("1-5/2");
    });
  });

  describe("quartz nth-weekday (#) syntax", () => {
    test("quartz 6#3 (third Friday) -> unix 5#3, the nth must not be renumbered", () => {
      const out = convertBetweenDialects(expr("6#3", "?"), "quartz", "unix");
      expect(out.dayOfWeek).toBe("5#3");
    });

    test("unix 5#3 (third Friday) -> quartz 6#3", () => {
      const out = convertBetweenDialects(expr("5#3"), "unix", "quartz");
      expect(out.dayOfWeek).toBe("6#3");
    });
  });

  describe("AWS EventBridge", () => {
    // EventBridge numbers days 1-7 = SUN-SAT (same as Quartz), and requires
    // exactly one of day-of-month / day-of-week to be "?".
    test("unix Monday (1) becomes AWS Monday (2)", () => {
      const out = convertBetweenDialects(expr("1"), "unix", "aws");
      expect(out.dayOfWeek).toBe("2");
    });

    test("unix 'every Monday' must use ? for day-of-month in AWS", () => {
      const out = convertBetweenDialects(expr("1"), "unix", "aws");
      expect(out.dayOfMonth).toBe("?");
    });
  });

  describe("other day-of-week forms are converted correctly", () => {
    test("lists renumber every day but keep names, e.g. unix 1,3,5 -> quartz 2,4,6", () => {
      expect(convertBetweenDialects(expr("1,3,5"), "unix", "quartz").dayOfWeek).toBe("2,4,6");
    });

    test("day names are left alone", () => {
      expect(convertBetweenDialects(expr("MON-FRI"), "unix", "quartz").dayOfWeek).toBe("MON-FRI");
    });

    test("quartz last-weekday 6L (last Friday) -> unix 5L", () => {
      expect(convertBetweenDialects(expr("6L", "?"), "quartz", "unix").dayOfWeek).toBe("5L");
    });

    test("unix Sunday 0 and 7 both become quartz 1", () => {
      expect(convertBetweenDialects(expr("0"), "unix", "quartz").dayOfWeek).toBe("1");
      expect(convertBetweenDialects(expr("7"), "unix", "quartz").dayOfWeek).toBe("1");
    });

    test("unix -> quartz -> unix round-trips steps and ranges", () => {
      for (const dow of ["*/2", "1-5/2", "1-5", "1,3,5", "5#3"]) {
        const q = convertBetweenDialects(expr(dow), "unix", "quartz");
        const back = convertBetweenDialects(q, "quartz", "unix");
        expect(back.dayOfWeek).toBe(dow);
      }
    });

    test("quartz <-> aws share numbering, so day-of-week is unchanged", () => {
      const out = convertBetweenDialects(expr("2-6", "?"), "quartz", "aws");
      expect(out.dayOfWeek).toBe("2-6");
      expect(out.dayOfMonth).toBe("?");
    });

    test("aws -> unix converts back and turns ? into *", () => {
      const out = convertBetweenDialects(expr("2", "?"), "aws", "unix");
      expect(out.dayOfWeek).toBe("1");
      expect(out.dayOfMonth).toBe("*");
    });
  });
});
