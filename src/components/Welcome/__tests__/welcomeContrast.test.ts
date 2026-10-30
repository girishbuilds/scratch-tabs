import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * `base` is also a colour token (border-base), so Tailwind emits `text-base`
 * as a text colour as well as a font size. That colour is near-white in light
 * mode, which made card titles vanish. Welcome components must size text with
 * another utility (text-sm, text-lg, ...).
 */
describe("welcome components", () => {
  const dir = join(__dirname, "..");
  const sources = readdirSync(dir)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => ({ file, content: readFileSync(join(dir, file), "utf8") }));

  it.each(sources.map(({ file, content }) => [file, content]))(
    "%s does not use the text-base utility",
    (_file, content) => {
      expect(content).not.toMatch(/(^|[\s"'`:])text-base(?![\w-])/);
    },
  );
});
