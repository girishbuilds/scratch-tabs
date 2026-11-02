import { detectProviderTokens, PROVIDER_PATTERNS } from "../../services/detection/providerPatterns";
import { mergeSpans } from "../../services/detection/spanUtils";

// Built at runtime so this file never contains a literal credential-shaped
// string for repository secret scanners to flag. All values are fake.
const SAMPLES: Record<string, string> = {
  "private-key-block": ["-----BEGIN", "RSA PRIVATE KEY-----\nMIIabc123\n-----END", "RSA PRIVATE KEY-----"].join(" "),
  "aws-access-key-id": "AKIA" + "ABCDEFGHIJKLMNOP",
  "github-token": "ghp_" + "a1".repeat(15),
  "gitlab-token": "glpat-" + "a1b2".repeat(6),
  "openai-or-anthropic-key": "sk-" + "a1b2".repeat(6),
  "google-api-key": "AIza" + "A".repeat(35),
  "google-oauth-token": "ya29." + "a1b2".repeat(6),
  "slack-token": "xoxb-" + "1234567890-abcdef",
  "slack-webhook": "https://hooks.slack.com/services/T0000/B0000/abcd1234efgh",
  "stripe-secret-key": "sk_" + "live_" + "a1B2".repeat(5),
  "discord-webhook": "https://discord.com/api/webhooks/" + "1".repeat(18) + "/abcDEF_ghi-123",
  "discord-bot-token": "M" + "a".repeat(23) + "." + "b".repeat(6) + "." + "c".repeat(27),
  "npm-token": "npm_" + "a1".repeat(18),
  "sendgrid-key": "SG." + "a1b2".repeat(5) + "." + "c3d4".repeat(5),
  "sentry-dsn": "https://" + "a1".repeat(16) + "@o1.ingest.sentry.io/123",
  "database-url": "postgres://user:pass1234@db.internal:5432/app",
  "url-embedded-credentials": "https://bob:hunter22@example.com/path",
  jwt: "eyJhbGciOiJIUzI1" + "." + "eyJzdWIiOiIxMjM0" + "." + "abcdefgh12345678",
};

const valuesIn = (text: string) =>
  mergeSpans(detectProviderTokens(text)).map((s) => text.slice(s.start, s.end));

describe("detectProviderTokens", () => {
  it("has a sample for every pattern", () => {
    expect(PROVIDER_PATTERNS.map((p) => p.id).sort()).toEqual(Object.keys(SAMPLES).sort());
  });

  it.each(Object.entries(SAMPLES))("detects %s", (_id, sample) => {
    expect(valuesIn(`note: ${sample} end`)).toEqual([sample]);
  });

  it("detects several tokens in one block", () => {
    const text = `${SAMPLES["github-token"]}\n${SAMPLES["npm-token"]}`;
    expect(valuesIn(text)).toEqual([SAMPLES["github-token"], SAMPLES["npm-token"]]);
  });

  it("ignores ordinary text, commands and plain urls", () => {
    expect(detectProviderTokens("mvn -B clean verify")).toEqual([]);
    expect(detectProviderTokens("https://example.com/docs?page=2")).toEqual([]);
    expect(detectProviderTokens("sk-short")).toEqual([]);
  });

  it("is repeatable across calls", () => {
    const text = SAMPLES["github-token"];
    expect(detectProviderTokens(text)).toEqual(detectProviderTokens(text));
  });
});
