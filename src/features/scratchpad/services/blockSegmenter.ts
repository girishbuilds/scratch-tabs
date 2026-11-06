import type {
  ScratchCopyTarget,
  ScratchEntryKind,
  ScratchPayload,
  ScratchSegment,
  SecretSpan,
} from "../types";

/** Net bracket depth change of a line, ignoring brackets inside "double quoted" strings. */
function depthDelta(line: string): number {
  let delta = 0;
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[" || ch === "(") delta++;
    else if (ch === "}" || ch === "]" || ch === ")") delta--;
  }
  return delta;
}

const indentOf = (line: string) => line.length - line.trimStart().length;

const startsStructure = (line: string) => /^\s*[{[]/.test(line) || /[{[(]\s*$/.test(line);

/** True when `line` starts a quote it does not close (e.g. `curl -d '{`). */
function opensUnclosedQuote(line: string): string | null {
  const first = line.trim().replace(/^[$>]\s+/, "").split(/\s+/, 1)[0];
  if (!COMMAND_WORDS.has(first) && !first.startsWith("./")) return null;
  for (const quote of ["'", '"']) {
    const count = (line.match(new RegExp(`(?<!\\\\)${quote}`, "g")) ?? []).length;
    if (count % 2 === 1) return quote;
  }
  return null;
}

/**
 * Splits pasted text into independent scratch entries.
 *
 * Blank lines always separate entries, and within a paragraph each line is its
 * own entry. A line only joins the entry above it when it is clearly part of
 * the same thing: a trailing `\`, `&&`, `||` or `|`, deeper indentation than
 * the entry's first line, a PEM block, or a bracketed / quoted structure
 * (JSON blob, `curl -d '...'`) that actually closes within the paragraph. A
 * stray `(` or `{` in a note never swallows the lines after it.
 */
export function splitIntoBlocks(raw: string): string[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let inPem = false;
  /** Lines still owed to a structure that was verified to close. */
  let structureEnd = -1;

  const flush = () => {
    const block = current.join("\n").trimEnd();
    if (block.trim()) blocks.push(block);
    current = [];
    inPem = false;
    structureEnd = -1;
  };

  /** Index of the line that closes a structure opened at `from`, or -1. */
  const findStructureEnd = (from: number): number => {
    let depth = 0;
    const quote = opensUnclosedQuote(lines[from]);
    for (let i = from; i < lines.length && lines[i].trim(); i++) {
      if (quote && i > from) {
        const count = (lines[i].match(new RegExp(`(?<!\\\\)${quote}`, "g")) ?? []).length;
        if (count % 2 === 1) return i;
      }
      depth += depthDelta(lines[i]);
      if (!quote && depth <= 0 && (i > from || startsStructure(lines[from]))) {
        return i > from ? i : -1;
      }
    }
    return -1;
  };

  lines.forEach((line, index) => {
    if (!line.trim()) {
      flush();
      return;
    }

    if (current.length > 0) {
      const previous = current[current.length - 1].trimEnd();
      const continues =
        inPem ||
        index <= structureEnd ||
        /(?:\\|&&|\|\||\|)$/.test(previous) ||
        indentOf(line) > indentOf(current[0]);
      if (!continues) flush();
    }

    if (current.length === 0 && (startsStructure(line) || opensUnclosedQuote(line))) {
      structureEnd = findStructureEnd(index);
    }

    current.push(line);
    if (/^-----BEGIN /.test(line)) inPem = true;
    if (/^-----END /.test(line)) inPem = false;
  });
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
