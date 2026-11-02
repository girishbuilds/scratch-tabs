import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FEATURE_ROOT = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const importSpecifiers = (source: string) =>
  [...source.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);

describe("Scratch feature isolation", () => {
  const files = sourceFiles(FEATURE_ROOT);

  it("finds the feature's source files", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [f.slice(FEATURE_ROOT.length + 1), f]))(
    "%s does not import from tablets",
    (_name, file) => {
      const offending = importSpecifiers(readFileSync(file, "utf8")).filter((spec) =>
        /(^|\/)tablets(\/|$)/.test(spec),
      );
      expect(offending).toEqual([]);
    },
  );
});
