import {
  convertBetweenDialects,
  normalizeExpression,
} from "../dialectConverter";
import { CronExpression, CronDialect } from "../../types";

describe("dialectConverter", () => {
  describe("Day of Week Numbering", () => {
    // Unix: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
    // Quartz: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday

    test("converts Unix Monday (1) to Quartz Monday (2)", () => {
      const unixExpression: CronExpression = {
        minute: "0",
        hour: "9",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1", // Monday in Unix
        second: "0",
        year: "*",
        raw: "0 9 * * 1",
      };

      const quartzExpression = convertBetweenDialects(
        unixExpression,
        "unix",
        "quartz",
      );
      expect(quartzExpression.dayOfWeek).toBe("2"); // Should be Monday in Quartz
      expect(quartzExpression.raw).toBe("0 0 9 ? * 2 *");
    });

    test("converts Quartz Monday (2) to Unix Monday (1)", () => {
      const quartzExpression: CronExpression = {
        minute: "0",
        hour: "0",
        dayOfMonth: "?",
        month: "*",
        dayOfWeek: "2", // Monday in Quartz
        second: "0",
        year: "*",
        raw: "0 0 0 ? * 2 *",
      };

      const unixExpression = convertBetweenDialects(
        quartzExpression,
        "quartz",
        "unix",
      );
      expect(unixExpression.dayOfWeek).toBe("1"); // Should be Monday in Unix
      expect(unixExpression.raw).toBe("0 0 * * 1");
    });

    test("converts all weekdays from Unix to Quartz", () => {
      const testCases = [
        { unix: "0", quartz: "1", day: "Sunday" },
        { unix: "1", quartz: "2", day: "Monday" },
        { unix: "2", quartz: "3", day: "Tuesday" },
        { unix: "3", quartz: "4", day: "Wednesday" },
        { unix: "4", quartz: "5", day: "Thursday" },
        { unix: "5", quartz: "6", day: "Friday" },
        { unix: "6", quartz: "7", day: "Saturday" },
        { unix: "7", quartz: "1", day: "Sunday (alternative)" },
      ];

      testCases.forEach(({ unix, quartz, day }) => {
        const unixExpression: CronExpression = {
          minute: "0",
          hour: "9",
          dayOfMonth: "*",
          month: "*",
          dayOfWeek: unix,
          second: "0",
          year: "*",
          raw: `0 9 * * ${unix}`,
        };

        const result = convertBetweenDialects(unixExpression, "unix", "quartz");
        expect(result.dayOfWeek).toBe(quartz);
      });
    });

    test("converts all weekdays from Quartz to Unix", () => {
      const testCases = [
        { quartz: "1", unix: "0", day: "Sunday" },
        { quartz: "2", unix: "1", day: "Monday" },
        { quartz: "3", unix: "2", day: "Tuesday" },
        { quartz: "4", unix: "3", day: "Wednesday" },
        { quartz: "5", unix: "4", day: "Thursday" },
        { quartz: "6", unix: "5", day: "Friday" },
        { quartz: "7", unix: "6", day: "Saturday" },
      ];

      testCases.forEach(({ quartz, unix, day }) => {
        const quartzExpression: CronExpression = {
          minute: "0",
          hour: "0",
          dayOfMonth: "?",
          month: "*",
          dayOfWeek: quartz,
          second: "0",
          year: "*",
          raw: `0 0 0 ? * ${quartz} *`,
        };

        const result = convertBetweenDialects(
          quartzExpression,
          "quartz",
          "unix",
        );
        expect(result.dayOfWeek).toBe(unix);
      });
    });

    test("handles complex day of week expressions", () => {
      // Test range conversion (Monday-Friday)
      const unixRange: CronExpression = {
        minute: "0",
        hour: "9",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1-5", // Monday-Friday in Unix
        second: "0",
        year: "*",
        raw: "0 9 * * 1-5",
      };

      const quartzRange = convertBetweenDialects(unixRange, "unix", "quartz");
      expect(quartzRange.dayOfWeek).toBe("2-6"); // Monday-Friday in Quartz

      // Test list conversion (Monday,Wednesday,Friday)
      const unixList: CronExpression = {
        minute: "0",
        hour: "9",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1,3,5", // Mon,Wed,Fri in Unix
        second: "0",
        year: "*",
        raw: "0 9 * * 1,3,5",
      };

      const quartzList = convertBetweenDialects(unixList, "unix", "quartz");
      expect(quartzList.dayOfWeek).toBe("2,4,6"); // Mon,Wed,Fri in Quartz
    });
  });

  describe("Dialect-specific Features", () => {
    test("converts ? to * when going from Quartz to Unix", () => {
      const quartzExpression: CronExpression = {
        minute: "0",
        hour: "9",
        dayOfMonth: "?",
        month: "*",
        dayOfWeek: "2",
        second: "0",
        year: "*",
        raw: "0 0 9 ? * 2 *",
      };

      const unixExpression = convertBetweenDialects(
        quartzExpression,
        "quartz",
        "unix",
      );
      expect(unixExpression.dayOfMonth).toBe("*");
      expect(unixExpression.dayOfWeek).toBe("1"); // Monday
    });

    test("converts * to ? appropriately when going from Unix to Quartz", () => {
      const unixExpression: CronExpression = {
        minute: "0",
        hour: "9",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1",
        second: "0",
        year: "*",
        raw: "0 9 * * 1",
      };

      const quartzExpression = convertBetweenDialects(
        unixExpression,
        "unix",
        "quartz",
      );
      expect(quartzExpression.dayOfMonth).toBe("?"); // Should be ? in Quartz when dayOfWeek is specified
      expect(quartzExpression.dayOfWeek).toBe("2"); // Monday
    });
  });

  describe("Field Structure", () => {
    test("adds seconds field when converting from Unix to Quartz", () => {
      const unixExpression: CronExpression = {
        minute: "30",
        hour: "14",
        dayOfMonth: "15",
        month: "6",
        dayOfWeek: "*",
        second: "0",
        year: "*",
        raw: "30 14 15 6 *",
      };

      const quartzExpression = convertBetweenDialects(
        unixExpression,
        "unix",
        "quartz",
      );
      expect(quartzExpression.raw).toBe("0 30 14 15 6 ? *");
    });

    test("removes seconds and year when converting from Quartz to Unix", () => {
      const quartzExpression: CronExpression = {
        minute: "30",
        hour: "14",
        dayOfMonth: "15",
        month: "6",
        dayOfWeek: "?",
        second: "45",
        year: "2024",
        raw: "45 30 14 15 6 ? 2024",
      };

      const unixExpression = convertBetweenDialects(
        quartzExpression,
        "quartz",
        "unix",
      );
      expect(unixExpression.raw).toBe("30 14 15 6 *");
    });
  });

  describe("Spring Dialect", () => {
    test("converts Unix to Spring with day-of-week conversion", () => {
      const unixExpression: CronExpression = {
        minute: "0",
        hour: "8",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1", // Monday in Unix
        second: "0",
        year: "*",
        raw: "0 8 * * 1",
      };

      const springExpression = convertBetweenDialects(
        unixExpression,
        "unix",
        "spring",
      );
      expect(springExpression.dayOfWeek).toBe("2"); // Monday in Spring (same as Quartz)
      expect(springExpression.raw).toBe("0 0 8 ? * 2");
    });
  });

  describe("AWS Dialect", () => {
    test("converts Unix to AWS (renumbers day-of-week like Quartz, uses ? for day-of-month)", () => {
      const unixExpression: CronExpression = {
        minute: "0",
        hour: "8",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1", // Monday in Unix
        second: "0",
        year: "*",
        raw: "0 8 * * 1",
      };

      const awsExpression = convertBetweenDialects(
        unixExpression,
        "unix",
        "aws",
      );
      expect(awsExpression.dayOfWeek).toBe("2"); // EventBridge: 1=Sunday, so Monday is 2
      expect(awsExpression.dayOfMonth).toBe("?");
      expect(awsExpression.raw).toBe("0 8 ? * 2 *");
    });
  });

  describe("Edge Cases", () => {
    test("handles * dayOfWeek correctly", () => {
      const unixExpression: CronExpression = {
        minute: "0",
        hour: "8",
        dayOfMonth: "1",
        month: "*",
        dayOfWeek: "*",
        second: "0",
        year: "*",
        raw: "0 8 1 * *",
      };

      const quartzExpression = convertBetweenDialects(
        unixExpression,
        "unix",
        "quartz",
      );
      expect(quartzExpression.dayOfWeek).toBe("?"); // Should be ? when dayOfMonth is specified
      expect(quartzExpression.dayOfMonth).toBe("1");
    });

    test("preserves same dialect conversion", () => {
      const expression: CronExpression = {
        minute: "0",
        hour: "8",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1",
        second: "0",
        year: "*",
        raw: "0 8 * * 1",
      };

      const result = convertBetweenDialects(expression, "unix", "unix");
      expect(result).toEqual(expression);
    });
  });

  describe("User Reported Issues", () => {
    test('Quartz "0 0 0 ? * 2 *" should be Monday at midnight, not Tuesday', () => {
      // This is the specific case the user reported
      const quartzExpression: CronExpression = {
        minute: "0",
        hour: "0",
        dayOfMonth: "?",
        month: "*",
        dayOfWeek: "2", // Monday in Quartz (1=Sunday, 2=Monday)
        second: "0",
        year: "*",
        raw: "0 0 0 ? * 2 *",
      };

      // Convert to Unix to verify it's Monday
      const unixExpression = convertBetweenDialects(
        quartzExpression,
        "quartz",
        "unix",
      );
      expect(unixExpression.dayOfWeek).toBe("1"); // Monday in Unix (0=Sunday, 1=Monday)
      expect(unixExpression.raw).toBe("0 0 * * 1");

      // Convert back to Quartz to ensure round-trip works
      const backToQuartz = convertBetweenDialects(
        unixExpression,
        "unix",
        "quartz",
      );
      expect(backToQuartz.dayOfWeek).toBe("2"); // Should be Monday in Quartz
      expect(backToQuartz.raw).toBe("0 0 0 ? * 2 *");
    });

    test('Unix "0 0 * * 1" should convert to Quartz "0 0 0 ? * 2 *"', () => {
      // Monday at midnight in Unix
      const unixExpression: CronExpression = {
        minute: "0",
        hour: "0",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "1", // Monday in Unix
        second: "0",
        year: "*",
        raw: "0 0 * * 1",
      };

      const quartzExpression = convertBetweenDialects(
        unixExpression,
        "unix",
        "quartz",
      );
      expect(quartzExpression.dayOfWeek).toBe("2"); // Monday in Quartz
      expect(quartzExpression.raw).toBe("0 0 0 ? * 2 *");
    });
  });
});

describe("normalizeExpression", () => {
  test("normalizes Unix expression", () => {
    expect(normalizeExpression("0 8 * *", "unix")).toBe("0 8 * * *");
    expect(normalizeExpression("0 8 * * 1 extra", "unix")).toBe("0 8 * * 1");
  });

  test("normalizes Quartz expression", () => {
    expect(normalizeExpression("0 8 * * 1", "quartz")).toBe("0 0 8 * * 1 *");
    expect(normalizeExpression("45 30 14 15 6 ? 2024", "quartz")).toBe(
      "45 30 14 15 6 ? 2024",
    );
  });

  test("normalizes Spring expression", () => {
    expect(normalizeExpression("0 8 * * 1", "spring")).toBe("0 0 8 * * 1");
    expect(normalizeExpression("45 30 14 15 6 ? extra", "spring")).toBe(
      "45 30 14 15 6 ?",
    );
  });

  test("normalizes AWS expression", () => {
    expect(normalizeExpression("0 8 * * 1", "aws")).toBe("0 8 * * 1 *");
    expect(normalizeExpression("30 14 15 6 * 2024 extra", "aws")).toBe(
      "30 14 15 6 * 2024",
    );
  });
});
