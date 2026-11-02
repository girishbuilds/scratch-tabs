import type { SecretSpan } from "../../types";
import { isPlaceholder } from "./placeholders";

/** A single span for `value` at `start`, or none if it is empty or a placeholder. */
export function spanFor(start: number, value: string): SecretSpan[] {
  if (!value || isPlaceholder(value)) return [];
  return [{ start, end: start + value.length }];
}

/** Sorts and merges overlapping spans into non-overlapping ones. */
export function mergeSpans(spans: SecretSpan[]): SecretSpan[] {
  const sorted = spans
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: SecretSpan[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  return merged;
}

/**
 * Runs `regex` over `text` and returns a span for the first defined capture
 * group of each match (the secret value), or the whole match if it has none.
 */
export function spansFromRegex(text: string, regex: RegExp): SecretSpan[] {
  const spans: SecretSpan[] = [];
  const re = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : `${regex.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = match.slice(1).find((g) => g !== undefined) ?? match[0];
    spans.push(...spanFor(match.index + match[0].lastIndexOf(value), value));
  }
  return spans;
}
