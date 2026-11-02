import type { ScratchPayload, SecretSpan } from "../types";
import { buildPayload } from "./blockSegmenter";
import { mergeSpans } from "./detection/spanUtils";

/**
 * Pure edits to the set of masked spans of a payload. The text never changes;
 * the entry kind is re-derived so a command that stops containing secrets is
 * a command again.
 */

/** Narrows `range` to its non-whitespace core; null when nothing is left. */
function trimRange(text: string, { start, end }: SecretSpan): SecretSpan | null {
  const from = Math.max(0, Math.min(start, end));
  const to = Math.min(text.length, Math.max(start, end));
  const selected = text.slice(from, to);
  const leading = selected.length - selected.trimStart().length;
  const trailing = selected.length - selected.trimEnd().length;
  const trimmed = { start: from + leading, end: to - trailing };
  return trimmed.end > trimmed.start ? trimmed : null;
}

/** Masks a user-selected range (for what the detectors missed). */
export function markRangeAsSecret(
  payload: ScratchPayload,
  range: SecretSpan,
): ScratchPayload {
  const trimmed = trimRange(payload.text, range);
  if (!trimmed) return payload;
  return buildPayload(payload.text, mergeSpans([...payload.secrets, trimmed]));
}

/** Unmasks the secrets at `indexes` (for what the detectors got wrong). */
export function unmarkSecrets(
  payload: ScratchPayload,
  indexes: readonly number[],
): ScratchPayload {
  const drop = new Set(indexes);
  return buildPayload(
    payload.text,
    payload.secrets.filter((_, index) => !drop.has(index)),
  );
}
