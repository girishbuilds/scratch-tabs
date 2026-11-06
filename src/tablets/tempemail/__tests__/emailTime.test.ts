import { normalizeMailTimestamp, formatMailTime } from "../emailTime";

describe("normalizeMailTimestamp", () => {
  const nowMs = Date.UTC(2026, 10, 3, 14, 5, 9);

  it("accepts a numeric string from the API", () => {
    expect(normalizeMailTimestamp("1762178709", nowMs)).toBe(1762178709);
  });

  it("accepts a number", () => {
    expect(normalizeMailTimestamp(1762178709, nowMs)).toBe(1762178709);
  });

  it.each([0, "0", "", undefined, null, "abc", 3600])(
    "falls back to the time we saw the message for placeholder %p",
    (raw) => {
      expect(normalizeMailTimestamp(raw, nowMs)).toBe(Math.floor(nowMs / 1000));
    },
  );
});

describe("formatMailTime", () => {
  it("shows only the time for today", () => {
    const now = new Date(2026, 10, 3, 15, 0, 0).getTime();
    const ts = new Date(2026, 10, 3, 14, 5, 9).getTime() / 1000;
    expect(formatMailTime(ts, now)).toBe(new Date(ts * 1000).toLocaleTimeString());
  });

  it("adds the day for earlier messages", () => {
    const now = new Date(2026, 10, 3, 15, 0, 0).getTime();
    const ts = new Date(2026, 10, 1, 9, 0, 0).getTime() / 1000;
    expect(formatMailTime(ts, now)).toContain(",");
    expect(formatMailTime(ts, now)).toContain(new Date(ts * 1000).toLocaleTimeString());
  });
});
