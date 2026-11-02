const PLACEHOLDER =
  /^(?:<.*>|\{\{.*\}\}|\$\{.*\}|\$[A-Za-z_]\w*|%\w+%|x{3,}|\*{3,}|•+|\.{3,}|changeme|change-me|your[-_ ].*|my[-_ ].*|example.*|placeholder.*|redacted.*|todo|tbd|null|none|undefined|true|false)$/i;

/** Values that stand in for a secret rather than being one (`<token>`, `your-key-here`). */
export function isPlaceholder(value: string): boolean {
  const v = value.trim();
  return PLACEHOLDER.test(v) || /(?:^|[-_])here$/i.test(v);
}
