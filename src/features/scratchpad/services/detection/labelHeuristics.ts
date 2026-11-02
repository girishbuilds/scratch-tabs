import type { SecretSpan } from "../../types";
import { spanFor } from "./spanUtils";

const STRONG_LABEL_WORDS = /(?:^|[^a-z])(?:secret|token|passw(?:or)?d|passwd|pwd|passphrase)(?:[^a-z]|$)/i;
const STRONG_LABEL_CAMEL = /[a-z](?:Secret|Token|Password|Passwd)(?:[^A-Za-z]|$)/;
const WEAK_LABEL_WORDS = /(?:^|[^a-z])(?:key|pass|creds?|credentials?|auth|bearer|apikey|pat|otp)(?:[^a-z]|$)/i;
const WEAK_LABEL_CAMEL = /[a-z](?:Key|Auth)(?:[^A-Za-z]|$)/;

export type LabelStrength = "strong" | "weak" | "none";

/** How strongly a label (e.g. "Prod-Key", "dbPassword") suggests its value is secret. */
export function getLabelStrength(label: string): LabelStrength {
  if (STRONG_LABEL_WORDS.test(label) || STRONG_LABEL_CAMEL.test(label)) return "strong";
  if (WEAK_LABEL_WORDS.test(label) || WEAK_LABEL_CAMEL.test(label)) return "weak";
  return "none";
}

const MIN_WEAK_VALUE = 6;
const MIN_STRONG_VALUE = 4;

const LABELLED_LINE =
  /^(\s*(?:export\s+|set\s+|\$env:)?)(["']?)([^:=\n"']{1,60}?)\2(\s*[:=]\s*)(.*)$/;
/** `cmd --password=x` is handled by the inline CLI-flag rule, not as a label. */
const FLAG_IN_LABEL = /(?:^|\s)-{1,2}[A-Za-z]/;

/** `label: value` / `LABEL=value` lines whose label suggests a secret. */
export function detectLabelledValues(text: string): SecretSpan[] {
  const spans: SecretSpan[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const match = LABELLED_LINE.exec(line);
    if (match) {
      const [, prefix, quote, label, separator, rest] = match;
      const strength = FLAG_IN_LABEL.test(label) ? "none" : getLabelStrength(label);
      if (strength !== "none") {
        const strong = strength === "strong";
        let value = rest.replace(/[\s,;]+$/, "");
        let start = offset + prefix.length + quote.length + label.length + quote.length + separator.length;
        const quoted = /^(["'])(.*)\1$/.exec(value);
        if (quoted) {
          value = quoted[2];
          start += 1;
        }
        const singleToken = !/\s/.test(value);
        const longEnough = value.length >= (strong ? MIN_STRONG_VALUE : MIN_WEAK_VALUE);
        if (longEnough && (singleToken || strong || quoted)) spans.push(...spanFor(start, value));
      }
    }
    offset += line.length + 1;
  }
  return spans;
}
