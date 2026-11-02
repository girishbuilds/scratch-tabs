import type { SecretSpan } from "../types";
import { detectInlineSecrets } from "./detection/inlinePatterns";
import { detectLabelledValues } from "./detection/labelHeuristics";
import { detectProviderTokens } from "./detection/providerPatterns";
import { mergeSpans } from "./detection/spanUtils";
import { detectBareToken, detectHighEntropyTokens } from "./detection/tokenHeuristics";

/**
 * Scratch-pad secret detection.
 *
 * A scratch pad has a different cost model from an audit tool: masking
 * something harmless costs one click, while leaving a real key visible defeats
 * the feature. So detection is deliberately generous (label-driven heuristics
 * on top of known credential formats) and fails closed: if any detector
 * throws, the whole block is masked.
 */
export type SpanDetector = (text: string) => SecretSpan[];

export const DEFAULT_DETECTORS: readonly SpanDetector[] = [
  detectProviderTokens,
  detectLabelledValues,
  detectInlineSecrets,
  detectHighEntropyTokens,
  detectBareToken,
];

/** Returns sorted, non-overlapping secret spans for one block of text. */
export function detectSecretSpans(
  text: string,
  detectors: readonly SpanDetector[] = DEFAULT_DETECTORS,
): SecretSpan[] {
  if (!text.trim()) return [];
  try {
    return mergeSpans(detectors.flatMap((detect) => detect(text)));
  } catch (error) {
    console.warn("Secret detection failed; masking entire block", error);
    return [{ start: 0, end: text.length }];
  }
}

export { getLabelStrength } from "./detection/labelHeuristics";
export { isPlaceholder } from "./detection/placeholders";
