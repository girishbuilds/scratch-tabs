import { CronExpression, CronDialect } from "../types";

/**
 * Applies `convertDay` to the day numbers of a day-of-week field and leaves
 * everything else alone: step values (`*\/2`, `1-5/2`), the occurrence of an
 * nth-weekday (`6#3`), and `*` / `?` / day names are not day numbers.
 * Handles comma lists, ranges, steps, `5#3` and `5L`.
 */
function mapDayOfWeekNumbers(
  value: string,
  convertDay: (day: number) => number,
): string {
  const convert = (token: string): string =>
    /^\d+$/.test(token) ? String(convertDay(parseInt(token, 10))) : token;

  return value
    .split(",")
    .map((item) => {
      const [base, ...stepParts] = item.split("/");
      const step = stepParts.length > 0 ? `/${stepParts.join("/")}` : "";

      let converted: string;
      if (base.includes("#")) {
        // Quartz nth weekday: only the weekday is renumbered, not the occurrence
        const [day, nth] = base.split("#");
        converted = `${convert(day)}#${nth}`;
      } else if (/^\d+L$/i.test(base)) {
        // Quartz "last <weekday> of the month"
        converted = `${convert(base.slice(0, -1))}${base.slice(-1)}`;
      } else {
        converted = base.split("-").map(convert).join("-");
      }
      return converted + step;
    })
    .join(",");
}

/**
 * Converts day-of-week values between Unix and Quartz numbering systems
 * Unix: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday
 * Quartz: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
 */
function convertDayOfWeekUnixToQuartz(unixValue: string): string {
  if (unixValue === "*" || unixValue === "?") {
    return unixValue;
  }
  // Add 1, but Unix's alternative Sunday (7) is Quartz Sunday (1)
  return mapDayOfWeekNumbers(unixValue, (num) => (num === 7 ? 1 : num + 1));
}

/**
 * Converts day-of-week values from Quartz to Unix numbering systems
 */
function convertDayOfWeekQuartzToUnix(quartzValue: string): string {
  if (quartzValue === "*" || quartzValue === "?") {
    return quartzValue;
  }
  // Subtract 1, so Quartz Sunday (1) becomes Unix Sunday (0)
  return mapDayOfWeekNumbers(quartzValue, (num) => (num === 1 ? 0 : num - 1));
}

/**
 * Determines if a dialect uses Quartz-style day-of-week numbering (1=Sunday).
 * AWS EventBridge numbers days 1-7 = SUN-SAT, like Quartz.
 */
function usesQuartzDayOfWeek(dialect: CronDialect): boolean {
  return dialect === "quartz" || dialect === "spring" || dialect === "aws";
}

/**
 * Determines if a dialect requires ? for mutually exclusive day fields.
 * AWS EventBridge rejects expressions where day-of-month and day-of-week are
 * both set (or both `*`); one of them must be `?`.
 */
function requiresQuestionMark(dialect: CronDialect): boolean {
  return dialect === "quartz" || dialect === "spring" || dialect === "aws";
}

/**
 * Converts a cron expression from one dialect to another
 */
export function convertBetweenDialects(
  expression: CronExpression,
  fromDialect: CronDialect,
  toDialect: CronDialect,
): CronExpression {
  // If dialects are the same, return the original expression
  if (fromDialect === toDialect) {
    return { ...expression };
  }

  // Create a new expression object
  const newExpression: CronExpression = {
    minute: expression.minute,
    hour: expression.hour,
    dayOfMonth: expression.dayOfMonth,
    month: expression.month,
    dayOfWeek: expression.dayOfWeek,
    second: expression.second || "0",
    year: expression.year || "*",
    raw: "", // Will be set at the end
  };

  // Convert day-of-week numbering if needed
  const fromUsesQuartz = usesQuartzDayOfWeek(fromDialect);
  const toUsesQuartz = usesQuartzDayOfWeek(toDialect);

  if (fromUsesQuartz && !toUsesQuartz) {
    // Quartz/Spring to Unix/AWS: convert day-of-week numbering
    newExpression.dayOfWeek = convertDayOfWeekQuartzToUnix(
      newExpression.dayOfWeek,
    );
  } else if (!fromUsesQuartz && toUsesQuartz) {
    // Unix/AWS to Quartz/Spring: convert day-of-week numbering
    newExpression.dayOfWeek = convertDayOfWeekUnixToQuartz(
      newExpression.dayOfWeek,
    );
  }

  // Handle ? vs * conversions
  const fromRequiresQuestion = requiresQuestionMark(fromDialect);
  const toRequiresQuestion = requiresQuestionMark(toDialect);

  if (fromRequiresQuestion && !toRequiresQuestion) {
    // Quartz/Spring to Unix/AWS: convert ? to *
    if (newExpression.dayOfWeek === "?") {
      newExpression.dayOfWeek = "*";
    }
    if (newExpression.dayOfMonth === "?") {
      newExpression.dayOfMonth = "*";
    }
  } else if (!fromRequiresQuestion && toRequiresQuestion) {
    // Unix/AWS to Quartz/Spring: convert * to ? appropriately
    // In Quartz, either day-of-month or day-of-week must be '?'
    if (newExpression.dayOfMonth !== "*" && newExpression.dayOfWeek !== "*") {
      // Both are specified, set day-of-week to '?'
      newExpression.dayOfWeek = "?";
    } else if (
      newExpression.dayOfMonth === "*" &&
      newExpression.dayOfWeek !== "*"
    ) {
      // Only day-of-week is specified, set day-of-month to '?'
      newExpression.dayOfMonth = "?";
    } else if (
      newExpression.dayOfMonth !== "*" &&
      newExpression.dayOfWeek === "*"
    ) {
      // Only day-of-month is specified, set day-of-week to '?'
      newExpression.dayOfWeek = "?";
    } else {
      // Both are *, set day-of-month to ? (prefer monthly over weekly)
      newExpression.dayOfMonth = "?";
    }
  }

  // Build the raw string based on the target dialect
  let rawParts: string[] = [];

  switch (toDialect) {
    case "unix":
    case "crontab":
    case "jenkins":
      rawParts = [
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
      ];
      break;

    case "quartz":
      rawParts = [
        newExpression.second || "0",
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
        newExpression.year || "*",
      ];
      break;

    case "spring":
      rawParts = [
        newExpression.second || "0",
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
      ];
      break;

    case "aws":
      rawParts = [
        newExpression.minute,
        newExpression.hour,
        newExpression.dayOfMonth,
        newExpression.month,
        newExpression.dayOfWeek,
        newExpression.year || "*",
      ];
      break;
  }

  newExpression.raw = rawParts.join(" ");

  return newExpression;
}

/**
 * Normalizes a cron expression for a specific dialect
 */
export function normalizeExpression(
  expression: string,
  dialect: CronDialect,
): string {
  const parts = expression.trim().split(/\s+/);

  // Ensure the correct number of parts for the dialect
  switch (dialect) {
    case "unix":
    case "crontab":
    case "jenkins":
      // 5 parts: minute hour day-of-month month day-of-week
      if (parts.length < 5) {
        // Pad with * if needed
        while (parts.length < 5) {
          parts.push("*");
        }
      } else if (parts.length > 5) {
        // Truncate if too many
        parts.splice(5);
      }
      break;

    case "quartz":
      // 6 or 7 parts: second minute hour day-of-month month day-of-week [year]
      if (parts.length < 6) {
        // Add second field if missing
        parts.unshift("0");
      }
      if (parts.length < 7) {
        // Add year field if missing
        parts.push("*");
      } else if (parts.length > 7) {
        // Truncate if too many
        parts.splice(7);
      }
      break;

    case "spring":
      // 6 parts: second minute hour day-of-month month day-of-week
      if (parts.length < 6) {
        // Add second field if missing
        parts.unshift("0");
      } else if (parts.length > 6) {
        // Truncate if too many
        parts.splice(6);
      }
      break;

    case "aws":
      // 6 parts: minute hour day-of-month month day-of-week year
      if (parts.length < 6) {
        // Add year field if missing
        parts.push("*");
      } else if (parts.length > 6) {
        // Truncate if too many
        parts.splice(6);
      }
      break;
  }

  return parts.join(" ");
}
