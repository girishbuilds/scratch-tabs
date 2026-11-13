/**
 * Failing tests documenting confirmed bugs in pipeline operations.
 * Each test describes the CORRECT behaviour; they fail against current code.
 */
import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/coreOperations";
import "../operations/crypto";
import "../operations/encoding";
import "../operations/dataFormats";

const run = async (
    id: string,
    input: string,
    params: Record<string, unknown> = {},
): Promise<string> => {
    const result = await executeSingleOperation(id, input, params);
    if (!result.success) throw new Error(result.error);
    return result.output;
};

describe("BUG: math.base-convert", () => {
    it("keeps full precision for values above 2^53 (e.g. a uint64 max)", async () => {
        const out = await run("math.base-convert", "0xFFFFFFFFFFFFFFFF", {
            fromBase: "16",
            toBase: "10",
            prefix: false,
        });
        expect(out).toBe("18446744073709551615");
    });

    it("does not strip the leading '0b' from a hexadecimal number (0x0B1F is not 0x1F)", async () => {
        const out = await run("math.base-convert", "0B1F", {
            fromBase: "16",
            toBase: "10",
            prefix: false,
        });
        expect(out).toBe("2847"); // 0x0B1F
    });

    it("rejects input containing characters that are invalid for the source base", async () => {
        await expect(
            run("math.base-convert", "12abc", { fromBase: "10", toBase: "16" }),
        ).rejects.toThrow();
    });
});

describe("BUG: crypto.aes-encrypt on larger inputs", () => {
    it("encrypts a 300 KB payload to base64 (default format) without throwing", async () => {
        const big = "a".repeat(300_000);
        const out = await run("crypto.aes-encrypt", big, { passphrase: "pw" });
        const back = await run("crypto.aes-decrypt", out, { passphrase: "pw" });
        expect(back).toBe(big);
    }, 30000);
});

describe("BUG: text.unescape", () => {
    it("treats an escaped backslash followed by 'n' as a literal backslash + n, not a newline", async () => {
        // Input characters: C : \ \ n e w   (an escaped Windows path "C:\new")
        const out = await run("text.unescape", "C:\\\\new");
        expect(out).toBe("C:\\new");
    });

    it("does not decode \\\\u0041 (escaped backslash + u0041) as 'A'", async () => {
        const out = await run("text.unescape", "\\\\u0041");
        expect(out).toBe("\\u0041");
    });
});

describe("BUG: encoding.from-html-entity", () => {
    it("decodes '&amp;lt;' to the literal text '&lt;' (no double decoding)", async () => {
        const out = await run("encoding.from-html-entity", "&amp;lt;script&amp;gt;");
        expect(out).toBe("&lt;script&gt;");
    });

    it("decodes numeric entities outside the BMP (&#128512; is an emoji)", async () => {
        const out = await run("encoding.from-html-entity", "&#128512; &#x1F600;");
        expect(out).toBe("\u{1F600} \u{1F600}");
    });
});

describe("BUG: encoding.to-hex / from-hex lose non-ASCII data", () => {
    it("encodes an emoji as its UTF-8 bytes", async () => {
        const out = await run("encoding.to-hex", "\u{1F600}", { delimiter: "none" });
        expect(out.toUpperCase()).toBe("F09F9880");
    });

    it("round-trips non-ASCII text", async () => {
        const text = "caf\u00e9 \u20ac";
        const hex = await run("encoding.to-hex", text, { delimiter: "space" });
        const back = await run("encoding.from-hex", hex, { delimiter: "space" });
        expect(back).toBe(text);
    });
});

describe("BUG: csv.to-json", () => {
    it("does not turn zero-padded identifiers (zip codes) into numbers by default", async () => {
        const out = JSON.parse(await run("csv.to-json", "zip,name\n02134,Boston"));
        expect(out[0].zip).toBe("02134");
    });

    it("does not lose precision on integers above Number.MAX_SAFE_INTEGER", async () => {
        const out = JSON.parse(
            await run("csv.to-json", "id\n9007199254740993", {}),
        );
        // either kept as string or as exact value; must not silently become ...992
        expect(String(out[0].id)).toBe("9007199254740993");
    });

    it("supports quoted fields that contain newlines (RFC 4180)", async () => {
        const out = JSON.parse(await run("csv.to-json", 'id,note\n1,"line1\nline2"\n2,ok'));
        expect(out).toHaveLength(2);
        expect(out[0].note).toBe("line1\nline2");
    });

    it("round-trips json.to-csv output that has multi-line strings", async () => {
        const original = [{ id: 1, note: "a\nb" }];
        const csv = await run("json.to-csv", JSON.stringify(original));
        const back = JSON.parse(await run("csv.to-json", csv));
        expect(back).toEqual(original);
    });
});

describe("fix edge cases", () => {
    it("base-convert handles prefixes, negatives and binary input", async () => {
        expect(await run("math.base-convert", "0xFF", { fromBase: "16", toBase: "10" })).toBe("255");
        expect(await run("math.base-convert", "-255", { fromBase: "10", toBase: "16" })).toBe("-0xFF");
        expect(await run("math.base-convert", "0b101", { fromBase: "2", toBase: "10" })).toBe("5");
    });

    it("to-binary / from-binary round-trip UTF-8 text", async () => {
        const text = "hé \u{1F600}";
        const bin = await run("encoding.to-binary", text);
        expect(await run("encoding.from-binary", bin)).toBe(text);
    });

    it("to-charcode / from-charcode round-trip astral characters", async () => {
        const text = "a\u{1F600}";
        const codes = await run("encoding.to-charcode", text, { base: "10" });
        expect(codes).toBe("97 128512");
        expect(await run("encoding.from-charcode", codes)).toBe(text);
    });

    it("unescape still handles common escapes", async () => {
        expect(await run("text.unescape", "a\\tb\\nc \\x41 \\u0042 \\\"q\\\"")).toBe('a\tb\nc A B "q"');
    });

    it("html-entity decoding still handles named and numeric entities", async () => {
        expect(await run("encoding.from-html-entity", "&lt;a&gt; &quot;x&quot; &#65; &#x42;")).toBe('<a> "x" A B');
    });

    it("csv.to-json keeps CRLF rows, blank lines and ordinary numbers working", async () => {
        const out = JSON.parse(await run("csv.to-json", "a,b\r\n1,2.5\r\n\r\n3,x"));
        expect(out).toEqual([{ a: 1, b: 2.5 }, { a: 3, b: "x" }]);
    });
});
