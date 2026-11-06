import type { ScratchPayload } from "../types";
import { buildPayload, splitIntoBlocks } from "./blockSegmenter";
import { detectSecretSpans } from "./secretDetection";

export const MAX_SCRATCH_INPUT_CHARS = 200_000;

export class ScratchInputTooLargeError extends Error {
  constructor() {
    super("That is too large for Scratch. Use a regular tab instead.");
    this.name = "ScratchInputTooLargeError";
  }
}

export class EmptyScratchEntryError extends Error {
  constructor() {
    super("An entry can't be empty. Delete it instead.");
    this.name = "EmptyScratchEntryError";
  }
}

const assertWithinLimit = (raw: string) => {
  if (raw.length > MAX_SCRATCH_INPUT_CHARS) throw new ScratchInputTooLargeError();
};

const analyse = (block: string): ScratchPayload =>
  buildPayload(block, detectSecretSpans(block));

/** Raw pasted/typed text -> one analysed payload per entry (not yet encrypted). */
export function createPayloads(raw: string): ScratchPayload[] {
  assertWithinLimit(raw);
  return splitIntoBlocks(raw).map(analyse);
}

/**
 * Text the user edited in place -> the single replacement payload for that
 * entry. Unlike a paste it is never split: it stays one entry. Secrets are
 * detected afresh, since the old spans no longer line up with the new text.
 */
export function createEditedPayload(text: string): ScratchPayload {
  assertWithinLimit(text);
  if (!text.trim()) throw new EmptyScratchEntryError();
  return analyse(text.replace(/\r\n?/g, "\n").trimEnd());
}
