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

/** Raw pasted/typed text -> one analysed payload per entry (not yet encrypted). */
export function createPayloads(raw: string): ScratchPayload[] {
  if (raw.length > MAX_SCRATCH_INPUT_CHARS) throw new ScratchInputTooLargeError();
  return splitIntoBlocks(raw).map((block) =>
    buildPayload(block, detectSecretSpans(block)),
  );
}
