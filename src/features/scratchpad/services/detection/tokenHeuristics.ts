import type { SecretSpan } from "../../types";
import { calculateShannonEntropy, isHighEntropy } from "./entropy";
import { spanFor } from "./spanUtils";

/** Only rejects degenerate repetition; random short-alphabet strings score low. */
const MIN_BARE_TOKEN_ENTROPY = 2;

/** A lone opaque token such as `8d8sd89hsdh8-sdc0shc-sdcsdc-cdsc`. */
export function detectBareToken(text: string): SecretSpan[] {
  const trimmed = text.trim();
  if (trimmed.length < 20 || /\s/.test(trimmed)) return [];
  if (trimmed.includes("/") || trimmed.includes("://")) return [];
  const hasMixedSegment = trimmed
    .split(/[-_.]/)
    .some((seg) => seg.length >= 6 && /[a-z]/i.test(seg) && /\d/.test(seg));
  if (!hasMixedSegment) return [];
  if (calculateShannonEntropy(trimmed) < MIN_BARE_TOKEN_ENTROPY) return [];
  return spanFor(text.indexOf(trimmed), trimmed);
}

const TOKEN = /(?:^|[^\w/+\-.])([A-Za-z0-9_~+/.-]{24,500}={0,2})(?=$|[^\w/+\-.])/g;
const GIT_HASH = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;

const looksLikePathOrUrl = (v: string) =>
  v.startsWith("/") || v.startsWith("./") || v.startsWith("~/") || v.includes("://") || /^https?/i.test(v);

/** High-entropy blobs inside free text. Skips paths, URLs and git hashes. */
export function detectHighEntropyTokens(text: string): SecretSpan[] {
  const spans: SecretSpan[] = [];
  const re = new RegExp(TOKEN.source, TOKEN.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = match[1];
    if (looksLikePathOrUrl(value) || GIT_HASH.test(value) || !isHighEntropy(value)) continue;
    spans.push(...spanFor(match.index + match[0].indexOf(value), value));
  }
  return spans;
}
