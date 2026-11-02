import type { SecretSpan } from "../../types";
import { spansFromRegex } from "./spanUtils";

/**
 * Well-known credential formats. Group 1 (or the whole match) is the secret.
 * Maintained locally for the Global Scratchpad; intentionally independent of any
 * tablet.
 */
export const PROVIDER_PATTERNS: ReadonlyArray<{ id: string; regex: RegExp }> = [
  // Group 1 is the whole armored block; group 2 (the key type) is only for the END back-reference.
  { id: "private-key-block", regex: /(-----BEGIN ((?:(?:RSA|DSA|EC|OPENSSH|PGP|ENCRYPTED) )?PRIVATE KEY(?: BLOCK)?)-----[\s\S]*?-----END \2-----)/g },
  { id: "aws-access-key-id", regex: /\b((?:AKIA|ASIA)[A-Z0-9]{16})\b/g },
  { id: "github-token", regex: /\b((?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,255})\b/g },
  { id: "gitlab-token", regex: /\b((?:glpat|glptt|glcbt)-[A-Za-z0-9_-]{20,100})\b/g },
  { id: "openai-or-anthropic-key", regex: /\b((?:sk|sess)-[A-Za-z0-9_-]{20,200})\b/g },
  { id: "google-api-key", regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g },
  { id: "google-oauth-token", regex: /\b(ya29\.[A-Za-z0-9_-]{20,500})\b/g },
  { id: "slack-token", regex: /\b((?:xox[baprs]|xapp)-[A-Za-z0-9-]{10,200})\b/g },
  { id: "slack-webhook", regex: /\b(https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+)\b/g },
  { id: "stripe-secret-key", regex: /\b((?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,120})\b/g },
  { id: "discord-webhook", regex: /\b(https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d{17,19}\/[A-Za-z0-9_-]+)\b/g },
  { id: "discord-bot-token", regex: /\b([MN][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27})\b/g },
  { id: "npm-token", regex: /\b(npm_[A-Za-z0-9]{36,120})\b/g },
  { id: "sendgrid-key", regex: /\b(SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,})\b/g },
  { id: "sentry-dsn", regex: /\b(https:\/\/[a-f0-9]{32}@[a-z0-9.-]+\/\d+)\b/gi },
  { id: "database-url", regex: /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|elasticsearch):\/\/(?:[^:\s/@]+)?:[^@\s]+@[^\s"'`<>]+)\b/gi },
  { id: "url-embedded-credentials", regex: /\b([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:[^@\s]+@[^\s"'`<>]+)\b/gi },
  { id: "jwt", regex: /\b(eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g },
];

export function detectProviderTokens(text: string): SecretSpan[] {
  return PROVIDER_PATTERNS.flatMap(({ regex }) => spansFromRegex(text, regex));
}
