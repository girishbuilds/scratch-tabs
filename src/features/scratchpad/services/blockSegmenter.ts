import type {
  ScratchCopyTarget,
  ScratchEntryKind,
  ScratchPayload,
  ScratchSegment,
  SecretSpan,
} from "../types";

/**
 * Splits pasted text into independent scratch entries.
 *
 * Blank lines always separate entries. Within a paragraph each line is its own
 * entry unless it clearly continues the previous one: a trailing `\`, `&&`,
 * `||` or `|`, leading indentation, an open bracket, or a PEM block.
 */
export function splitIntoBlocks(raw: string): string[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let depth = 0;
  let inPem = false;

  const flush = () => {
    const block = current.join("\n").trimEnd();
    if (block.trim()) blocks.push(block);
    current = [];
    depth = 0;
    inPem = false;
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }

    if (current.length > 0) {
      const previous = current[current.length - 1].trimEnd();
      const continues =
        inPem ||
        depth > 0 ||
        /(?:\\|&&|\|\||\|)$/.test(previous) ||
        /^\s/.test(line);
      if (!continues) flush();
    }

    current.push(line);
    if (/^-----BEGIN /.test(line)) inPem = true;
    if (/^-----END /.test(line)) inPem = false;
    depth = Math.max(
      0,
      depth + (line.match(/[{[(]/g)?.length ?? 0) - (line.match(/[}\])]/g)?.length ?? 0),
    );
  }
  flush();

  return blocks;
}

const COMMAND_WORDS = new Set([
  "curl", "wget", "git", "npm", "npx", "yarn", "pnpm", "bun", "node", "deno",
  "mvn", "gradle", "./gradlew", "./mvnw", "java", "javac", "dotnet", "cargo",
  "go", "python", "python3", "pip", "pip3", "bundle", "rake", "rails", "php",
  "composer", "make", "docker", "docker-compose", "kubectl", "helm",
  "terraform", "aws", "gcloud", "az", "ssh", "scp", "rsync", "sudo", "cd",
  "ls", "cat", "grep", "find", "echo", "export", "kill", "chmod", "chown",
  "tar", "unzip", "openssl", "brew", "apt", "apt-get", "psql", "mysql",
  "redis-cli",
]);

export function classifyKind(text: string, hasSecrets: boolean): ScratchEntryKind {
  if (hasSecrets) return "secret";
  const trimmed = text.trim();
  if (!trimmed.includes("\n") && /^https?:\/\/\S+$/i.test(trimmed)) return "url";
  const firstLine = trimmed.split("\n", 1)[0].replace(/^[$>]\s+/, "");
  const firstWord = firstLine.split(/\s+/, 1)[0];
  if (COMMAND_WORDS.has(firstWord) || firstWord.startsWith("./")) return "command";
  return "note";
}

export function buildPayload(text: string, secrets: SecretSpan[]): ScratchPayload {
  return { v: 1, text, kind: classifyKind(text, secrets.length > 0), secrets };
}

/** Splits text around secret spans; secret segments carry only an index. */
export function buildSegments(payload: ScratchPayload): ScratchSegment[] {
  const segments: ScratchSegment[] = [];
  let cursor = 0;
  payload.secrets.forEach((span, index) => {
    if (span.start > cursor) {
      segments.push({ type: "text", text: payload.text.slice(cursor, span.start) });
    }
    segments.push({ type: "secret", index });
    cursor = span.end;
  });
  if (cursor < payload.text.length) {
    segments.push({ type: "text", text: payload.text.slice(cursor) });
  }
  return segments;
}

export function getSecretValues(payload: ScratchPayload): string[] {
  return payload.secrets.map((span) => payload.text.slice(span.start, span.end));
}

/**
 * What the primary Copy button copies. A single-line `label: value` secret
 * copies just the value (what you actually paste into a form or header);
 * anything else (commands with an embedded token, several secrets, multi-line
 * text) copies the whole entry. Individual secrets can always be copied by
 * clicking their mask.
 */
export function getCopyTarget(payload: ScratchPayload): ScratchCopyTarget {
  if (payload.secrets.length !== 1 || payload.text.includes("\n")) return "all";
  const { start, end } = payload.secrets[0];
  const before = payload.text.slice(0, start);
  const after = payload.text.slice(end);
  const isLabelOnly = /^[^\n]*[:=]\s*["']?$/.test(before) && /^["']?[\s,;]*$/.test(after);
  return isLabelOnly ? "value" : "all";
}

export function getPrimaryCopyText(payload: ScratchPayload): string {
  if (getCopyTarget(payload) === "value") {
    const { start, end } = payload.secrets[0];
    return payload.text.slice(start, end);
  }
  return payload.text;
}
