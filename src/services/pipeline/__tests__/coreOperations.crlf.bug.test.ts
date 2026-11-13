/**
 * KNOWN-FAILING tests (see BUGS.md).
 *
 * The executor's per-line mode understands CRLF, but whole-input operations split on "\n" only,
 * so with Windows line endings every line except the last carries a trailing "\r". Monaco keeps
 * CRLF for tabs created from CRLF text (paste into a new tab, file drop, share link).
 */
import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/coreOperations";

const run = async (id: string, input: string, params: Record<string, unknown> = {}) => {
  const result = await executeSingleOperation(id, input, params);
  if (!result.success) throw new Error(result.error);
  return result.output;
};
const lf = (s: string) => s.replace(/\r\n/g, "\n");

describe("BUG: whole-input text operations mishandle CRLF line endings", () => {
  it("text.remove-duplicates removes a duplicate that is on the last line", async () => {
    expect(lf(await run("text.remove-duplicates", "apple\r\nbanana\r\napple"))).toBe("apple\nbanana");
  });

  it("text.sort does not leave a stray CR in the middle of the output", async () => {
    const out = await run("text.sort", "pear\r\napple");
    expect(lf(out)).toBe("apple\npear");
    expect(out).not.toMatch(/\r(?!\n)/);
  });

  it("text.reverse-lines keeps every line ending intact", async () => {
    const out = await run("text.reverse-lines", "one\r\ntwo\r\nthree");
    expect(lf(out)).toBe("three\ntwo\none");
    expect(out).not.toMatch(/\r(?!\n)/);
  });

  it("text.keep-first-n does not end with a dangling CR", async () => {
    expect(await run("text.keep-first-n", "one\r\ntwo\r\nthree", { n: 2, count: 2, lines: 2 })).not.toMatch(/\r$/);
  });
});
