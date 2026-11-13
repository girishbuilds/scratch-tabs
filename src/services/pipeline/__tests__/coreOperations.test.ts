/**
 * Unit Tests for Core Pipeline Operations
 *
 * Tests each operation's execute function independently.
 */

import { executeSingleOperation } from "../pipelineExecutor";

// Import the operations file to register them
import "../operations/coreOperations";
import { operationRegistry } from "../OperationRegistry";

describe("Core Pipeline Operations", () => {

    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
        applyPerLine?: boolean,
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params, applyPerLine);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.output;
    };

    describe("Whitespace & Cleanup Operations", () => {
        describe("text.trim", () => {
            it("should trim leading and trailing whitespace from each line", async () => {
                const input = "  hello  \n  world  ";
                const result = await execute("text.trim", input);
                expect(result).toBe("hello\nworld");
            });

            it("should handle empty input", async () => {
                const result = await execute("text.trim", "");
                expect(result).toBe("");
            });

            it("should preserve internal spaces", async () => {
                const input = "  hello world  ";
                const result = await execute("text.trim", input);
                expect(result).toBe("hello world");
            });
        });

        describe("text.remove-blank-lines", () => {
            it("should remove all blank lines", async () => {
                const input = "line1\n\nline2\n   \nline3";
                const result = await execute("text.remove-blank-lines", input);
                expect(result).toBe("line1\nline2\nline3");
            });

            it("should handle input with no blank lines", async () => {
                const input = "line1\nline2\nline3";
                const result = await execute("text.remove-blank-lines", input);
                expect(result).toBe("line1\nline2\nline3");
            });
        });

        describe("text.remove-extra-blank-lines", () => {
            it("should collapse consecutive blank lines", async () => {
                const input = "line1\n\n\n\nline2\n\nline3";
                const result = await execute("text.remove-extra-blank-lines", input);
                expect(result).toBe("line1\n\nline2\n\nline3");
            });
        });

        describe("text.remove-extra-whitespace", () => {
            it("should collapse multiple spaces to single space in preserve-single mode", async () => {
                const input = "hello   world\n  multiple    spaces  ";
                const result = await execute("text.remove-extra-whitespace", input, {
                    mode: "preserve-single",
                }, true);
                expect(result).toBe("hello world\n multiple spaces ");
            });

            it("should remove all whitespace in remove-all mode", async () => {
                const input = "hello   world\n  multiple    spaces  ";
                const result = await execute("text.remove-extra-whitespace", input, {
                    mode: "remove-all",
                }, true);
                expect(result).toBe("helloworld\nmultiplespaces");
            });
        });
    });

    describe("Case Conversion Operations", () => {
        describe("text.uppercase", () => {
            it("should convert text to uppercase", async () => {
                const result = await execute("text.uppercase", "Hello World");
                expect(result).toBe("HELLO WORLD");
            });

            it("should handle mixed case input", async () => {
                const result = await execute("text.uppercase", "HeLLo WoRLd 123");
                expect(result).toBe("HELLO WORLD 123");
            });
        });

        describe("text.lowercase", () => {
            it("should convert text to lowercase", async () => {
                const result = await execute("text.lowercase", "Hello World");
                expect(result).toBe("hello world");
            });
        });

        describe("text.title-case", () => {
            it("should capitalize first letter of each word", async () => {
                const result = await execute("text.title-case", "hello world");
                expect(result).toBe("Hello World");
            });

            it("should handle already capitalized text", async () => {
                const result = await execute("text.title-case", "HELLO WORLD");
                expect(result).toBe("Hello World");
            });
        });

        describe("text.sentence-case", () => {
            it("should capitalize the first letter of the text", async () => {
                const result = await execute("text.sentence-case", "hello world. how ARE YOU?");
                expect(result).toBe("Hello world. how are you?");
            });
        });

        describe("text.camel-case", () => {
            it("should convert to camelCase", async () => {
                const result = await execute("text.camel-case", "hello world");
                expect(result).toBe("helloWorld");
            });

            it("should handle PascalCase input", async () => {
                const result = await execute("text.camel-case", "HelloWorld");
                expect(result).toBe("helloWorld");
            });

            it("should preserve newlines", async () => {
                const result = await execute("text.camel-case", "hello world\nfoo bar");
                expect(result).toBe("helloWorld\nfooBar");
            });
        });

        describe("text.pascal-case", () => {
            it("should convert to PascalCase", async () => {
                const result = await execute("text.pascal-case", "hello world");
                expect(result).toBe("HelloWorld");
            });
        });

        describe("text.kebab-case", () => {
            it("should convert to kebab-case", async () => {
                const result = await execute("text.kebab-case", "Hello World");
                expect(result).toBe("hello-world");
            });
        });

        describe("text.snake-case", () => {
            it("should convert to snake_case", async () => {
                const result = await execute("text.snake-case", "Hello World");
                expect(result).toBe("hello_world");
            });
        });

        describe("text.screaming-snake-case", () => {
            it("should convert to SCREAMING_SNAKE_CASE", async () => {
                const result = await execute("text.screaming-snake-case", "hello world");
                expect(result).toBe("HELLO_WORLD");
            });

            it("should handle camelCase boundaries", async () => {
                const result = await execute("text.screaming-snake-case", "camelCaseVariableName");
                expect(result).toBe("CAMEL_CASE_VARIABLE_NAME");
            });
        });

        describe("text.invert-case", () => {
            it("should invert the case of each character", async () => {
                const result = await execute("text.invert-case", "Hello World 123");
                expect(result).toBe("hELLO wORLD 123");
            });
        });

        describe("text.alternating-case", () => {
            it("should alternate the case of characters", async () => {
                const result = await execute("text.alternating-case", "hello world");
                expect(result).toBe("hElLo wOrLd");
            });
        });
    });

    describe("Duplicates Operations", () => {
        describe("text.remove-duplicates", () => {
            it("should remove duplicate lines", async () => {
                const input = "apple\nbanana\napple\ncherry\nbanana";
                const result = await execute("text.remove-duplicates", input);
                expect(result).toBe("apple\nbanana\ncherry");
            });

            it("should preserve order of first occurrence", async () => {
                const input = "c\na\nb\na\nc";
                const result = await execute("text.remove-duplicates", input);
                expect(result).toBe("c\na\nb");
            });

            it("should handle empty input", async () => {
                const result = await execute("text.remove-duplicates", "");
                expect(result).toBe("");
            });
        });
    });

    describe("Sorting Operations", () => {
        describe("text.sort", () => {

            it("should sort lines alphabetically ascending", async () => {
                const input = "cherry\napple\nbanana";
                const result = await execute("text.sort", input, { mode: "asc" });
                expect(result).toBe("apple\nbanana\ncherry");
            });

            it("should sort lines alphabetically descending", async () => {
                const input = "apple\nbanana\ncherry";
                const result = await execute("text.sort", input, { mode: "desc" });
                expect(result).toBe("cherry\nbanana\napple");
            });

            it("should perform natural sort", async () => {
                const input = "item10\nitem2\nitem1";
                const result = await execute("text.sort", input, { mode: "natural" });
                expect(result).toBe("item1\nitem2\nitem10");
            });

            it("should perform numeric ascending sort", async () => {
                const input = "10\n2\n100\n1";
                const result = await execute("text.sort", input, { mode: "numeric-asc" });
                expect(result).toBe("1\n2\n10\n100");
            });

            it("should perform numeric descending sort", async () => {
                const input = "10\n2\n100\n1";
                const result = await execute("text.sort", input, { mode: "numeric-desc" });
                expect(result).toBe("100\n10\n2\n1");
            });

            it("should sort by line length", async () => {
                const input = "short\nlongest_line\nmedium";
                const result = await execute("text.sort", input, { mode: "length" });
                expect(result).toBe("short\nmedium\nlongest_line");
            });
        });

        describe("text.reverse-lines", () => {
            it("should reverse line order", async () => {
                const input = "first\nsecond\nthird";
                const result = await execute("text.reverse-lines", input);
                expect(result).toBe("third\nsecond\nfirst");
            });
        });

        describe("text.shuffle-lines", () => {
            it("should shuffle lines", async () => {
                const input = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10";
                const result = await execute("text.shuffle-lines", input);
                expect(result).not.toBe(input); // Random, but extremely likely to be different
                expect(result.split("\n").sort()).toEqual(input.split("\n").sort());
            });
        });
    });

    describe("Join/Split Operations", () => {
        describe("text.join-lines", () => {
            it("should join lines with default separator", async () => {
                const input = "a\nb\nc";
                const result = await execute("text.join-lines", input);
                expect(result).toBe("a, b, c");
            });

            it("should join lines with custom separator", async () => {
                const input = "a\nb\nc";
                const result = await execute("text.join-lines", input, {
                    separator: " | ",
                });
                expect(result).toBe("a | b | c");
            });

            it("should handle empty separator", async () => {
                const input = "a\nb\nc";
                const result = await execute("text.join-lines", input, { separator: "" });
                expect(result).toBe("abc");
            });
        });

        describe("text.split-lines", () => {
            it("should split by default separator", async () => {
                const input = "a, b, c";
                const result = await execute("text.split-lines", input);
                expect(result).toBe("a\nb\nc");
            });

            it("should split by custom separator", async () => {
                const input = "a|b|c";
                const result = await execute("text.split-lines", input, {
                    separator: "|",
                });
                expect(result).toBe("a\nb\nc");
            });
        });
    });

    describe("Line Numbering & Wrapping", () => {
        describe("text.add-line-numbers", () => {
            const input = "line1\nline2\nline3";

            it("should add numeric line numbers", async () => {
                const result = await execute("text.add-line-numbers", input, { style: "numeric" });
                expect(result).toBe("1. line1\n2. line2\n3. line3");
            });

            it("should add roman line numbers", async () => {
                const result = await execute("text.add-line-numbers", input, { style: "roman" });
                expect(result).toBe("I. line1\nII. line2\nIII. line3");
            });

            it("should add alpha line numbers", async () => {
                const result = await execute("text.add-line-numbers", input, { style: "alpha" });
                expect(result).toBe("A. line1\nB. line2\nC. line3");
            });
        });

        describe("text.wrap-lines", () => {
            it("should wrap lines at specific width", async () => {
                const input = "This is a long line that should be wrapped.";
                const result = await execute("text.wrap-lines", input, { width: 10 });
                expect(result).toBe("This is a\nlong line\nthat\nshould be\nwrapped.");
            });
        });

        describe("text.remove-line-numbers", () => {
            it("should remove numeric dot-separated line numbers (add-line-numbers complement)", async () => {
                const input = "1. line1\n2. line2\n3. line3";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("line1\nline2\nline3");
            });

            it("should remove roman numeral line numbers", async () => {
                const input = "I. line1\nII. line2\nIII. line3";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("line1\nline2\nline3");
            });

            it("should remove single-letter line numbers", async () => {
                const input = "A. line1\nB. line2\nC. line3";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("line1\nline2\nline3");
            });

            it("should remove parenthesis-style numbering", async () => {
                const input = "1) first\n2) second\n3) third";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("first\nsecond\nthird");
            });

            it("should remove colon-style numbering", async () => {
                const input = "1: first\n2: second";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("first\nsecond");
            });

            it("should remove zero-padded line numbers", async () => {
                const input = "01. first\n02. second\n10. tenth";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("first\nsecond\ntenth");
            });

            it("should not modify lines without numbering", async () => {
                const input = "plain line\nanother line";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("plain line\nanother line");
            });

            it("should not strip version-like strings (v1.2)", async () => {
                const input = "v1.2 release notes";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("v1.2 release notes");
            });

            it("should not strip URLs (http://)", async () => {
                const input = "http://example.com";
                const result = await execute("text.remove-line-numbers", input);
                expect(result).toBe("http://example.com");
            });

            it("should handle empty input", async () => {
                const result = await execute("text.remove-line-numbers", "");
                expect(result).toBe("");
            });

            it("should roundtrip with add-line-numbers (numeric)", async () => {
                const original = "alpha\nbeta\ngamma";
                const numbered = await execute("text.add-line-numbers", original, { style: "numeric" });
                const restored = await execute("text.remove-line-numbers", numbered);
                expect(restored).toBe(original);
            });

            it("should roundtrip with add-line-numbers (roman)", async () => {
                const original = "alpha\nbeta\ngamma";
                const numbered = await execute("text.add-line-numbers", original, { style: "roman" });
                const restored = await execute("text.remove-line-numbers", numbered);
                expect(restored).toBe(original);
            });

            it("should roundtrip with add-line-numbers (alpha)", async () => {
                const original = "alpha\nbeta\ngamma";
                const numbered = await execute("text.add-line-numbers", original, { style: "alpha" });
                const restored = await execute("text.remove-line-numbers", numbered);
                expect(restored).toBe(original);
            });
        });

        describe("text.column-align", () => {
            it("should align whitespace-separated columns", async () => {
                const input = "foo bar baz\nlonger shorter x";
                const result = await execute("text.column-align", input, { delimiter: "whitespace", padding: 2 });
                const lines = result.split("\n");
                expect(lines).toHaveLength(2);
                // Both lines should have the same total length up to the last column
                const cols0 = lines[0].split(/  +/);
                const cols1 = lines[1].split(/  +/);
                expect(cols0).toHaveLength(3);
                expect(cols1).toHaveLength(3);
            });

            it("should pad columns to the width of the widest value", async () => {
                const input = "a b\nlonger short\nc d";
                const result = await execute("text.column-align", input, { delimiter: "whitespace", padding: 2 });
                const lines = result.split("\n");
                // "longer" is widest col-0, so "a" and "c" should be padded to 6 chars
                expect(lines[0]).toMatch(/^a\s{5,}/);
                expect(lines[2]).toMatch(/^c\s{5,}/);
            });

            it("should split on tab delimiter", async () => {
                const input = "col1\tcol2\tcol3\nlong\ts\tx";
                const result = await execute("text.column-align", input, { delimiter: "tab", padding: 2 });
                const lines = result.split("\n");
                expect(lines).toHaveLength(2);
                // First column: "col1" (4) vs "long" (4) — equal widths
                expect(lines[0]).toMatch(/^col1/);
                expect(lines[1]).toMatch(/^long/);
            });

            it("should respect custom padding", async () => {
                const input = "a b\nc d";
                const result1 = await execute("text.column-align", input, { delimiter: "whitespace", padding: 1 });
                const result4 = await execute("text.column-align", input, { delimiter: "whitespace", padding: 4 });
                // padding=4 should produce a wider separator
                expect(result4.length).toBeGreaterThan(result1.length);
            });

            it("should handle single-column input unchanged", async () => {
                const input = "one\ntwo\nthree";
                const result = await execute("text.column-align", input);
                expect(result).toBe("one\ntwo\nthree");
            });

            it("should handle empty lines", async () => {
                const input = "a b\n\nc d";
                const result = await execute("text.column-align", input, { delimiter: "whitespace", padding: 2 });
                const lines = result.split("\n");
                expect(lines).toHaveLength(3);
                expect(lines[1]).toBe("");
            });

            it("should leave the last column unpadded", async () => {
                const input = "a short\nb longer-value";
                const result = await execute("text.column-align", input, { delimiter: "whitespace", padding: 2 });
                const lines = result.split("\n");
                // Last column should not have trailing spaces
                expect(lines[0]).toMatch(/short$/);
                expect(lines[1]).toMatch(/longer-value$/);
            });
        });
    });

    describe("Prefix/Suffix Operations", () => {
        describe("text.add-prefix", () => {
            it("should add prefix to each line", async () => {
                const input = "line1\nline2\nline3";
                const result = await execute("text.add-prefix", input, {
                    prefix: ">> ",
                });
                expect(result).toBe(">> line1\n>> line2\n>> line3");
            });

            it("should handle empty prefix (no change)", async () => {
                const input = "line1\nline2";
                const result = await execute("text.add-prefix", input, { prefix: "" });
                expect(result).toBe("line1\nline2");
            });
        });

        describe("text.add-suffix", () => {
            it("should add suffix to each line", async () => {
                const input = "line1\nline2\nline3";
                const result = await execute("text.add-suffix", input, {
                    suffix: " <<",
                });
                expect(result).toBe("line1 <<\nline2 <<\nline3 <<");
            });

            it("should handle empty suffix (no change)", async () => {
                const input = "line1\nline2";
                const result = await execute("text.add-suffix", input, { suffix: "" });
                expect(result).toBe("line1\nline2");
            });

            it("should add suffix per line for CRLF input without inserting extra lines", async () => {
                const input = "line1\r\nline2\r\nline3";
                const result = await execute("text.add-suffix", input, { suffix: " <<" });
                expect(result.split("\n")).toHaveLength(3);
                expect(result).toBe("line1 <<\r\nline2 <<\r\nline3 <<");
            });

            it("should add suffix per line for CR-only input", async () => {
                const input = "line1\rline2\rline3";
                const result = await execute("text.add-suffix", input, { suffix: " <<" });
                expect(result).toBe("line1 <<\rline2 <<\rline3 <<");
            });
        });

        describe("text.add-prefix with non-LF line endings", () => {
            it("should add prefix per line for CRLF input", async () => {
                const input = "line1\r\nline2";
                const result = await execute("text.add-prefix", input, { prefix: ">> " });
                expect(result).toBe(">> line1\r\n>> line2");
            });

            it("should add prefix per line for CR-only input", async () => {
                const input = "line1\rline2";
                const result = await execute("text.add-prefix", input, { prefix: ">> " });
                expect(result).toBe(">> line1\r>> line2");
            });
        });
    });

    describe("text.remove-chars", () => {
        it("is registered with count and from parameters", () => {
            const op = operationRegistry.getById("text.remove-chars");
            expect(op).toBeDefined();
            expect(op?.processingMode).toBe("line");
            expect(op?.parameters?.map((p) => p.name)).toEqual(["count", "from"]);
        });

        describe("from start", () => {
            it("removes N characters from the start of each line", async () => {
                const result = await execute("text.remove-chars", "abcdef\nghijkl", { count: 2, from: "start" });
                expect(result).toBe("cdef\nijkl");
            });

            it("defaults to removing 1 character from the start", async () => {
                const result = await execute("text.remove-chars", "abc\ndef");
                expect(result).toBe("bc\nef");
            });

            it("defaults to start when from is omitted", async () => {
                const result = await execute("text.remove-chars", "abcdef", { count: 3 });
                expect(result).toBe("def");
            });

            it("falls back to start for an unknown from value", async () => {
                const result = await execute("text.remove-chars", "abcdef", { count: 2, from: "bogus" });
                expect(result).toBe("cdef");
            });
        });

        describe("from end", () => {
            it("removes N characters from the end of each line", async () => {
                const result = await execute("text.remove-chars", "abcdef\nghijkl", { count: 2, from: "end" });
                expect(result).toBe("abcd\nghij");
            });

            it("removes a single character from the end", async () => {
                const result = await execute("text.remove-chars", "abc\ndef", { count: 1, from: "end" });
                expect(result).toBe("ab\nde");
            });
        });

        describe("from both ends", () => {
            it("removes N characters from each end of each line", async () => {
                const result = await execute("text.remove-chars", "[abc]\n(def)", { count: 1, from: "both" });
                expect(result).toBe("abc\ndef");
            });

            it("removes N from each end, not N in total", async () => {
                const result = await execute("text.remove-chars", "12abcdef34", { count: 2, from: "both" });
                expect(result).toBe("abcdef");
            });

            it("returns an empty line when the line is exactly 2N long", async () => {
                const result = await execute("text.remove-chars", "abcd", { count: 2, from: "both" });
                expect(result).toBe("");
            });

            it("returns an empty line when the line is shorter than 2N", async () => {
                const result = await execute("text.remove-chars", "abc", { count: 5, from: "both" });
                expect(result).toBe("");
            });

            it("leaves a single character when the line is 2N + 1 long", async () => {
                const result = await execute("text.remove-chars", "abcde", { count: 2, from: "both" });
                expect(result).toBe("c");
            });
        });

        describe("short and empty lines", () => {
            it("empties lines shorter than N when removing from start", async () => {
                const result = await execute("text.remove-chars", "ab\nabcdef", { count: 4, from: "start" });
                expect(result).toBe("\nef");
            });

            it("empties lines shorter than N when removing from end", async () => {
                const result = await execute("text.remove-chars", "ab\nabcdef", { count: 4, from: "end" });
                expect(result).toBe("\nab");
            });

            it("empties a line whose length equals N", async () => {
                expect(await execute("text.remove-chars", "abc", { count: 3, from: "start" })).toBe("");
                expect(await execute("text.remove-chars", "abc", { count: 3, from: "end" })).toBe("");
            });

            it("handles empty input", async () => {
                expect(await execute("text.remove-chars", "", { count: 2, from: "start" })).toBe("");
                expect(await execute("text.remove-chars", "", { count: 2, from: "end" })).toBe("");
                expect(await execute("text.remove-chars", "", { count: 2, from: "both" })).toBe("");
            });

            it("keeps blank lines as blank lines", async () => {
                const result = await execute("text.remove-chars", "abc\n\ndef", { count: 1, from: "start" });
                expect(result).toBe("bc\n\nef");
            });
        });

        describe("count handling", () => {
            it("is a no-op when count is 0", async () => {
                for (const from of ["start", "end", "both"]) {
                    expect(await execute("text.remove-chars", "abc\ndef", { count: 0, from })).toBe("abc\ndef");
                }
            });

            it("is a no-op when count is negative", async () => {
                for (const from of ["start", "end", "both"]) {
                    expect(await execute("text.remove-chars", "abc\ndef", { count: -3, from })).toBe("abc\ndef");
                }
            });

            it("floors fractional counts", async () => {
                const result = await execute("text.remove-chars", "abcdef", { count: 2.9, from: "start" });
                expect(result).toBe("cdef");
            });

            it("is a no-op for NaN and Infinity counts", async () => {
                expect(await execute("text.remove-chars", "abc", { count: NaN, from: "start" })).toBe("abc");
                expect(await execute("text.remove-chars", "abc", { count: Infinity, from: "start" })).toBe("abc");
            });

            it("accepts a numeric string count", async () => {
                const result = await execute("text.remove-chars", "abcdef", { count: "2", from: "end" });
                expect(result).toBe("abcd");
            });

            it("empties every line when count exceeds all line lengths", async () => {
                const result = await execute("text.remove-chars", "ab\ncd", { count: 100, from: "start" });
                expect(result).toBe("\n");
            });
        });

        describe("character handling", () => {
            it("preserves whitespace that is not removed", async () => {
                const result = await execute("text.remove-chars", "  a b  ", { count: 1, from: "both" });
                expect(result).toBe(" a b ");
            });

            it("counts emoji as a single character", async () => {
                expect(await execute("text.remove-chars", "😀😁😂abc", { count: 1, from: "start" })).toBe("😁😂abc");
                expect(await execute("text.remove-chars", "abc😀😁😂", { count: 2, from: "end" })).toBe("abc😀");
                expect(await execute("text.remove-chars", "😀abc😂", { count: 1, from: "both" })).toBe("abc");
            });

            it("handles accented characters", async () => {
                const result = await execute("text.remove-chars", "éàüabc", { count: 3, from: "start" });
                expect(result).toBe("abc");
            });

            it("handles tabs as single characters", async () => {
                const result = await execute("text.remove-chars", "\t\tabc", { count: 2, from: "start" });
                expect(result).toBe("abc");
            });
        });

        describe("line endings", () => {
            it("preserves CRLF line endings", async () => {
                const result = await execute("text.remove-chars", "abc\r\ndef", { count: 1, from: "start" });
                expect(result).toBe("bc\r\nef");
            });

            it("does not remove the CRLF when removing from the end", async () => {
                const result = await execute("text.remove-chars", "abc\r\ndef", { count: 1, from: "end" });
                expect(result).toBe("ab\r\nde");
            });

            it("preserves CR-only line endings", async () => {
                const result = await execute("text.remove-chars", "abc\rdef", { count: 1, from: "end" });
                expect(result).toBe("ab\rde");
            });

            it("preserves a trailing newline", async () => {
                const result = await execute("text.remove-chars", "abc\ndef\n", { count: 1, from: "start" });
                expect(result).toBe("bc\nef\n");
            });
        });
    });

    describe("Find/Replace Operations", () => {
        describe("text.find-replace-regex", () => {
            it("should find and replace with regex", async () => {
                const input = "hello 123 world 456";
                const result = await execute("text.find-replace-regex", input, {
                    find: "\\d+",
                    replace: "NUM",
                    flags: "g",
                });
                expect(result).toBe("hello NUM world NUM");
            });

            it("should support capture groups", async () => {
                const input = "hello world";
                const result = await execute("text.find-replace-regex", input, {
                    find: "(\\w+) (\\w+)",
                    replace: "$2 $1",
                    flags: "g",
                });
                expect(result).toBe("world hello");
            });

            it("should return input unchanged if find pattern is empty", async () => {
                const input = "hello world";
                const result = await execute("text.find-replace-regex", input, {
                    find: "",
                    replace: "test",
                });
                expect(result).toBe("hello world");
            });

            it("should handle invalid regex gracefully", async () => {
                const input = "hello world";
                const result = await execute("text.find-replace-regex", input, {
                    find: "[invalid(",
                    replace: "test",
                });
                expect(result).toBe("hello world");
            });

            it("should support case-insensitive flag", async () => {
                const input = "Hello HELLO hello";
                const result = await execute("text.find-replace-regex", input, {
                    find: "hello",
                    replace: "hi",
                    flags: "gi",
                });
                expect(result).toBe("hi hi hi");
            });
        });
    });

    describe("Filtering & Selection Operations", () => {
        const input = "apple\nbanana\ncherry\ndate";

        describe("text.filter-regex", () => {
            it("should keep matching lines", async () => {
                const result = await execute("text.filter-regex", input, { pattern: "a", action: "keep" });
                expect(result).toBe("apple\nbanana\ndate");
            });

            it("should remove matching lines", async () => {
                const result = await execute("text.filter-regex", input, { pattern: "a", action: "remove" });
                expect(result).toBe("cherry");
            });
        });

        describe("text.filter-keyword", () => {
            it("should filter by contains", async () => {
                const result = await execute("text.filter-keyword", input, { keyword: "an", position: "contains" });
                expect(result).toBe("banana");
            });

            it("should filter by starts with", async () => {
                const result = await execute("text.filter-keyword", input, { keyword: "c", position: "starts" });
                expect(result).toBe("cherry");
            });
        });

        describe("text.keep-first-n", () => {
            it("should keep first N lines", async () => {
                const result = await execute("text.keep-first-n", input, { n: 2 });
                expect(result).toBe("apple\nbanana");
            });
        });

        describe("text.keep-last-n", () => {
            it("should keep last N lines", async () => {
                const result = await execute("text.keep-last-n", input, { n: 2 });
                expect(result).toBe("cherry\ndate");
            });
        });
    });

    describe("Formatting & Padding Operations", () => {
        describe("text.pad-lines", () => {
            it("should pad lines to the right", async () => {
                const input = "a\nbc";
                const result = await execute("text.pad-lines", input, { length: 3, align: "left", char: "." });
                expect(result).toBe("a..\nbc.");
            });

            it("should pad lines to the left", async () => {
                const input = "a\nbc";
                const result = await execute("text.pad-lines", input, { length: 3, align: "right", char: "." });
                expect(result).toBe("..a\n.bc");
            });

            it("should handle multi-character padding and truncate to length", async () => {
                const input = "abc";
                const result = await execute("text.pad-lines", input, { length: 10, align: "left", char: "- " });
                expect(result).toBe("abc- - - -");
                expect(result.length).toBe(10);
            });

            it("should handle multi-character center padding", async () => {
                const input = "abc";
                const result = await execute("text.pad-lines", input, { length: 10, align: "center", char: "- " });
                // total 7 pad chars. left = 3, right = 4.
                // left: "- -" (truncate - - to 3) -> "- -"
                // total: "- -abc- - -" (length 10)
                expect(result).toBe("- -abc- - ");
                expect(result.length).toBe(10);
            });
        });

        describe("text.change-indentation", () => {
            it("should add indentation", async () => {
                const input = "line";
                const result = await execute("text.change-indentation", input, { action: "add", amount: 2, type: "spaces" });
                expect(result).toBe("  line");
            });

            it("should remove indentation", async () => {
                const input = "  line";
                const result = await execute("text.change-indentation", input, { action: "remove", amount: 2, type: "spaces" });
                expect(result).toBe("line");
            });
        });

        describe("text.convert-tabs-spaces", () => {
            it("should convert tabs to spaces", async () => {
                const input = "\tline";
                const result = await execute("text.convert-tabs-spaces", input, { mode: "tabs-to-spaces" });
                expect(result).toBe("    line");
            });
        });

        describe("text.normalize-line-endings", () => {
            it("should normalize to LF", async () => {
                const input = "line1\r\nline2";
                const result = await execute("text.normalize-line-endings", input, { mode: "lf" });
                expect(result).toBe("line1\nline2");
            });
        });
    });

    describe("Line Duplication", () => {
        it("should duplicate each line", async () => {
            const input = "a\nb";
            const result = await execute("text.duplicate-lines", input, { count: 2 });
            expect(result).toBe("a\na\nb\nb");
        });
    });

    describe("Advanced Operations", () => {
        describe("text.apply-redaction", () => {
            it("should redact email addresses", async () => {
                const input = "contact me at test@example.com";
                const result = await execute("text.apply-redaction", input, { types: ["email"], mode: "mask" });
                expect(result).toBe("contact me at [REDACTED]");
            });

            it("should obfuscate email addresses", async () => {
                const input = "contact me at test@example.com";
                const result = await execute("text.apply-redaction", input, { types: ["email"], mode: "obfuscate" });
                expect(result).toContain("t***t@e***m");
            });
        });

        describe("text.javascript-snippet", () => {
            it("should execute custom JS", async () => {
                const input = "hello";
                const result = await execute("text.javascript-snippet", input, { code: "return input.toUpperCase();" });
                expect(result).toBe("HELLO");
            });

            it("should handle async scripts", async () => {
                const input = "hello";
                const result = await execute("text.javascript-snippet", input, { code: "return Promise.resolve(input + '!');" });
                expect(result).toBe("hello!");
            });
        });
    });

    describe("Integration with PipelineRunner", () => {
        // Test the full flow through createStep and runPipeline
        it("should work with prefix through createStep and runPipeline", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const step = createStep("text.add-prefix", { prefix: ">> " });
            const pipeline = createPipeline();
            pipeline.steps.push(step);

            const result = await runPipeline("line1\nline2\nline3", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe(">> line1\n>> line2\n>> line3");
        });

        it("should work with suffix through createStep and runPipeline", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const step = createStep("text.add-suffix", { suffix: " <<" });
            const pipeline = createPipeline();
            pipeline.steps.push(step);

            const result = await runPipeline("line1\nline2\nline3", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe("line1 <<\nline2 <<\nline3 <<");
        });

        it("should work with find-replace through createStep and runPipeline", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const step = createStep("text.find-replace-regex", {
                find: "\\d+",
                replace: "NUM",
                flags: "g",
            });
            const pipeline = createPipeline();
            pipeline.steps.push(step);

            const result = await runPipeline("test 123 hello 456", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe("test NUM hello NUM");
        });

        it("should chain multiple operations", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const pipeline = createPipeline();
            pipeline.steps.push(createStep("text.trim"));
            pipeline.steps.push(createStep("text.uppercase"));
            const prefixStep = createStep("text.add-prefix", { prefix: "> " });
            pipeline.steps.push(prefixStep);

            const result = await runPipeline("  hello world  ", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe("> HELLO WORLD");
        });
    });

    describe("Operation Registration", () => {
        it("should register all core operations", () => {
            const expectedOperations = [
                "text.trim",
                "text.remove-blank-lines",
                "text.remove-extra-blank-lines",
                "text.remove-extra-whitespace",
                "text.uppercase",
                "text.lowercase",
                "text.title-case",
                "text.sentence-case",
                "text.camel-case",
                "text.pascal-case",
                "text.kebab-case",
                "text.snake-case",
                "text.screaming-snake-case",
                "text.invert-case",
                "text.alternating-case",
                "text.remove-duplicates",
                "text.sort",
                "text.reverse-lines",
                "text.shuffle-lines",
                "text.join-lines",
                "text.split-lines",
                "text.add-line-numbers",
                "text.wrap-lines",
                "text.add-prefix",
                "text.add-suffix",
                "text.find-replace-regex",
                "text.filter-regex",
                "text.filter-keyword",
                "text.keep-first-n",
                "text.keep-last-n",
                "text.pad-lines",
                "text.change-indentation",
                "text.convert-tabs-spaces",
                "text.normalize-line-endings",
                "text.duplicate-lines",
                "text.apply-redaction",
                "text.javascript-snippet",
            ];

            for (const id of expectedOperations) {
                const op = operationRegistry.getById(id);
                expect(op).toBeDefined();
                expect(op?.id).toBe(id);
            }
        });

        it("should have valid parameter definitions", () => {
            const opsWithParams = [
                "text.remove-extra-whitespace",
                "text.sort",
                "text.join-lines",
                "text.split-lines",
                "text.add-line-numbers",
                "text.wrap-lines",
                "text.add-prefix",
                "text.add-suffix",
                "text.find-replace-regex",
                "text.filter-regex",
                "text.filter-keyword",
                "text.keep-first-n",
                "text.keep-last-n",
                "text.pad-lines",
                "text.change-indentation",
                "text.convert-tabs-spaces",
                "text.normalize-line-endings",
                "text.duplicate-lines",
                "text.apply-redaction",
                "text.javascript-snippet",
            ];

            for (const id of opsWithParams) {
                const op = operationRegistry.getById(id);
                expect(op).toBeDefined();
                expect(op!.parameters.length).toBeGreaterThan(0);

                for (const param of op!.parameters) {
                    expect(param.name).toBeDefined();
                    expect(param.label).toBeDefined();
                    expect(param.type).toBeDefined();
                }
            }
        });
    });

    describe("Text Transformation Operations", () => {
        describe("text.slugify", () => {
            it("should convert text to URL-friendly slug with hyphens", async () => {
                const result = await execute("text.slugify", "Hello World!");
                expect(result).toBe("hello-world");
            });

            it("should use underscores when specified", async () => {
                const result = await execute("text.slugify", "Hello World!", { separator: "_" });
                expect(result).toBe("hello_world");
            });

            it("should remove special characters", async () => {
                const result = await execute("text.slugify", "Hello @#$% World!");
                expect(result).toBe("hello-world");
            });

            it("should remove diacritics", async () => {
                const result = await execute("text.slugify", "Café résumé");
                expect(result).toBe("cafe-resume");
            });

            it("should collapse multiple separators", async () => {
                const result = await execute("text.slugify", "Hello    World");
                expect(result).toBe("hello-world");
            });

            it("should trim leading and trailing separators", async () => {
                const result = await execute("text.slugify", "   Hello World   ");
                expect(result).toBe("hello-world");
            });

            it("should handle numbers", async () => {
                const result = await execute("text.slugify", "Article 123");
                expect(result).toBe("article-123");
            });

            it("should handle mixed case", async () => {
                const result = await execute("text.slugify", "HeLLo WoRLd");
                expect(result).toBe("hello-world");
            });

            it("should handle unicode characters", async () => {
                const result = await execute("text.slugify", "你好世界");
                expect(result).toBe("");
            });

            it("should handle empty input", async () => {
                const result = await execute("text.slugify", "");
                expect(result).toBe("");
            });

            it("should handle only special characters", async () => {
                const result = await execute("text.slugify", "@#$%^&*");
                expect(result).toBe("");
            });
        });

        describe("text.remove-diacritics", () => {
            it("should remove acute accents", async () => {
                const result = await execute("text.remove-diacritics", "é á í ó ú");
                expect(result).toBe("e a i o u");
            });

            it("should remove grave accents", async () => {
                const result = await execute("text.remove-diacritics", "è à ì ò ù");
                expect(result).toBe("e a i o u");
            });

            it("should remove circumflex accents", async () => {
                const result = await execute("text.remove-diacritics", "ê â î ô û");
                expect(result).toBe("e a i o u");
            });

            it("should remove umlaut/diaeresis", async () => {
                const result = await execute("text.remove-diacritics", "ë ä ï ö ü");
                expect(result).toBe("e a i o u");
            });

            it("should remove tilde", async () => {
                const result = await execute("text.remove-diacritics", "ñ õ ã");
                expect(result).toBe("n o a");
            });

            it("should handle common words with diacritics", async () => {
                const result = await execute("text.remove-diacritics", "Café résumé naïve");
                expect(result).toBe("Cafe resume naive");
            });

            it("should preserve case", async () => {
                const result = await execute("text.remove-diacritics", "CAFÉ Résumé");
                expect(result).toBe("CAFE Resume");
            });

            it("should handle empty input", async () => {
                const result = await execute("text.remove-diacritics", "");
                expect(result).toBe("");
            });

            it("should not affect ASCII characters", async () => {
                const result = await execute("text.remove-diacritics", "Hello World 123");
                expect(result).toBe("Hello World 123");
            });

            it("should handle multiline text", async () => {
                const result = await execute("text.remove-diacritics", "Café\nrésumé");
                expect(result).toBe("Cafe\nresume");
            });

            it("should handle mixed ASCII and accented characters", async () => {
                const result = await execute("text.remove-diacritics", "The café is très bon");
                expect(result).toBe("The cafe is tres bon");
            });
        });

        describe("text.frequency", () => {
            describe("Line mode", () => {
                it("should count line frequencies", async () => {
                    const input = "apple\nbanana\napple\norange\napple\nbanana";
                    const result = await execute("text.frequency", input, {
                        mode: "lines",
                        sortBy: "frequency",
                        outputFormat: "text"
                    });

                    expect(result).toContain("apple: 3");
                    expect(result).toContain("banana: 2");
                    expect(result).toContain("orange: 1");
                });

                it("should sort alphabetically when specified", async () => {
                    const input = "zebra\napple\nbanana";
                    const result = await execute("text.frequency", input, {
                        mode: "lines",
                        sortBy: "alphabetical",
                        outputFormat: "text"
                    });

                    const lines = result.split('\n');
                    expect(lines[0]).toContain("apple");
                    expect(lines[1]).toContain("banana");
                    expect(lines[2]).toContain("zebra");
                });
            });

            describe("Word mode", () => {
                it("should count word frequencies", async () => {
                    const input = "hello world hello test world hello";
                    const result = await execute("text.frequency", input, {
                        mode: "words",
                        sortBy: "frequency",
                        outputFormat: "text"
                    });

                    expect(result).toContain("hello: 3");
                    expect(result).toContain("world: 2");
                    expect(result).toContain("test: 1");
                });

                it("should handle multiple spaces", async () => {
                    const input = "word1    word2   word1";
                    const result = await execute("text.frequency", input, {
                        mode: "words",
                        sortBy: "frequency",
                        outputFormat: "text"
                    });

                    expect(result).toContain("word1: 2");
                    expect(result).toContain("word2: 1");
                });
            });

            describe("Character mode", () => {
                it("should count character frequencies", async () => {
                    const input = "hello";
                    const result = await execute("text.frequency", input, {
                        mode: "chars",
                        sortBy: "frequency",
                        outputFormat: "text"
                    });

                    expect(result).toContain("l: 2");
                    expect(result).toContain("h: 1");
                    expect(result).toContain("e: 1");
                    expect(result).toContain("o: 1");
                });

                it("should count spaces and special characters", async () => {
                    const input = "a b!";
                    const result = await execute("text.frequency", input, {
                        mode: "chars",
                        sortBy: "alphabetical",
                        outputFormat: "text"
                    });

                    expect(result).toContain(" : 1");
                    expect(result).toContain("!: 1");
                    expect(result).toContain("a: 1");
                    expect(result).toContain("b: 1");
                });
            });

            describe("Output formats", () => {
                it("should output as JSON", async () => {
                    const input = "apple\nbanana\napple";
                    const result = await execute("text.frequency", input, {
                        mode: "lines",
                        sortBy: "frequency",
                        outputFormat: "json"
                    });

                    const parsed = JSON.parse(result);
                    expect(parsed.apple).toBe(2);
                    expect(parsed.banana).toBe(1);
                });

                it("should output as CSV", async () => {
                    const input = "apple\nbanana\napple";
                    const result = await execute("text.frequency", input, {
                        mode: "lines",
                        sortBy: "frequency",
                        outputFormat: "csv"
                    });

                    expect(result).toContain("Item,Count");
                    expect(result).toContain("apple,2");
                    expect(result).toContain("banana,1");
                });

                it("should handle CSV with commas in items", async () => {
                    const input = "hello, world\ntest";
                    const result = await execute("text.frequency", input, {
                        mode: "lines",
                        sortBy: "frequency",
                        outputFormat: "csv"
                    });

                    expect(result).toContain('"hello, world",1');
                });

                it("should handle CSV with quotes in items", async () => {
                    const input = 'say "hello"\ntest';
                    const result = await execute("text.frequency", input, {
                        mode: "lines",
                        sortBy: "frequency",
                        outputFormat: "csv"
                    });

                    expect(result).toContain('""hello""');
                });
            });

            describe("Edge cases", () => {
                it("should handle empty input", async () => {
                    const result = await execute("text.frequency", "", {
                        mode: "lines",
                        sortBy: "frequency",
                        outputFormat: "text"
                    });

                    expect(result).toBe(": 1");
                });

                it("should handle single character", async () => {
                    const result = await execute("text.frequency", "a", {
                        mode: "chars",
                        sortBy: "frequency",
                        outputFormat: "text"
                    });

                    expect(result).toBe("a: 1");
                });

                it("should handle all same items", async () => {
                    const input = "test\ntest\ntest";
                    const result = await execute("text.frequency", input, {
                        mode: "lines",
                        sortBy: "frequency",
                        outputFormat: "text"
                    });

                    expect(result).toBe("test: 3");
                });
            });
        });
    });
});
