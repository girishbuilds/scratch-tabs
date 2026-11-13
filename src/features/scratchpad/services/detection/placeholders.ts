/** Generic words that appear in stand-in values such as `your-api-key` or `example_token_1`. */
const WORD =
  "(?:secret|password|passwd|pass|pwd|token|key|apikey|api|value|string|here|id|user|username|name|access|private|public|auth|credentials?|code|data|text|test|sample|real|actual|new|old|app|client)";

/**
 * Whole-value patterns only: a value that merely starts with `my-` or `example`
 * (`my_Dog-Rex1985!`, `examplePass#9917`) is a real secret, not a placeholder.
 */
const PLACEHOLDER = new RegExp(
  "^(?:" +
    [
      "<.*>",
      "\\{\\{.*\\}\\}",
      "\\$\\{.*\\}",
      "\\$[A-Za-z_]\\w*",
      "%\\w+%",
      "x{3,}",
      "\\*{3,}",
      "•+",
      "\\.{3,}",
      "changeme",
      "change-me",
      `(?:your|my)(?:[-_ ]${WORD})+`,
      `(?:example|placeholder|redacted)(?:[-_ ]${WORD})*(?:[-_ ]?\\d{1,3})?`,
      "todo",
      "tbd",
      "null",
      "none",
      "undefined",
      "true",
      "false",
    ].join("|") +
    ")$",
  "i",
);

/** Values that stand in for a secret rather than being one (`<token>`, `your-key-here`). */
export function isPlaceholder(value: string): boolean {
  const v = value.trim();
  return PLACEHOLDER.test(v) || /(?:^|[-_])here$/i.test(v);
}
