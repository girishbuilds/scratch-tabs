/** Anything before this (2001-09-09) cannot be a real mail time. */
const MIN_PLAUSIBLE_EPOCH_SECONDS = 1_000_000_000;

/**
 * Guerrilla Mail sends `mail_timestamp` as a string, and its welcome message
 * carries a placeholder (0 or empty) that renders as 01:00:00 in some time
 * zones. Return a real epoch-seconds value, falling back to when we first saw
 * the message.
 */
export function normalizeMailTimestamp(
  raw: unknown,
  nowMs: number = Date.now(),
): number {
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= MIN_PLAUSIBLE_EPOCH_SECONDS) {
    return seconds;
  }
  return Math.floor(nowMs / 1000);
}

/** "14:05:09" for today, "3 Nov, 14:05:09" for earlier days. */
export function formatMailTime(
  timestampSeconds: number,
  nowMs: number = Date.now(),
): string {
  const date = new Date(timestampSeconds * 1000);
  const now = new Date(nowMs);
  const time = date.toLocaleTimeString();
  if (date.toDateString() === now.toDateString()) return time;
  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${day}, ${time}`;
}
