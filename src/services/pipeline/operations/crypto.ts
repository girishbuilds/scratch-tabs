import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

// === RIPEMD-160 pure JS (browser fallback) ===
// Used when Node.js crypto is unavailable (browser environment).
function ripemd160Pure(bytes: Uint8Array): string {
    const RL = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13];
    const RR = [5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11];
    const SL = [11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6];
    const SR = [8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];
    const KL = [0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
    const KR = [0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

    const len = bytes.length;
    const extra = len % 64;
    const padLen = extra < 56 ? 56 - extra : 120 - extra;
    const total = len + padLen + 8;
    const padded = new Uint8Array(total);
    padded.set(bytes);
    padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(total - 8, (len * 8) >>> 0, true);
    dv.setUint32(total - 4, Math.floor((len * 8) / 0x100000000) >>> 0, true);

    let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;
    const add = (...a: number[]) => a.reduce((s, v) => (s + v) >>> 0, 0);
    const f = (j: number, b: number, c: number, d: number): number => {
        if (j < 16) return (b ^ c ^ d) >>> 0;
        if (j < 32) return ((b & c) | (~b & d)) >>> 0;
        if (j < 48) return ((b | ~c) ^ d) >>> 0;
        if (j < 64) return ((b & d) | (c & ~d)) >>> 0;
        return (b ^ (c | ~d)) >>> 0;
    };

    for (let blk = 0; blk < total; blk += 64) {
        const X: number[] = [];
        for (let i = 0; i < 16; i++) X[i] = dv.getUint32(blk + i * 4, true);
        let al = h0, bl = h1, cl = h2, dl = h3, el = h4;
        let ar = h0, br = h1, cr = h2, dr = h3, er = h4;
        for (let j = 0; j < 80; j++) {
            const rnd = (j / 16) | 0;
            let T = add(al, f(j, bl, cl, dl), X[RL[j]], KL[rnd]);
            T = add(rotl(T, SL[j]), el);
            al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = T;
            T = add(ar, f(79 - j, br, cr, dr), X[RR[j]], KR[rnd]);
            T = add(rotl(T, SR[j]), er);
            ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = T;
        }
        const T = add(h1, cl, dr);
        h1 = add(h2, dl, er); h2 = add(h3, el, ar); h3 = add(h4, al, br); h4 = add(h0, bl, cr); h0 = T;
    }

    const out = new Uint8Array(20);
    const ov = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach((w, i) => ov.setUint32(i * 4, w, true));
    return Array.from(out).map(b => b.toString(16).padStart(2, '0')).join('');
}

// === Keccak-256 pure JS (Ethereum SHA3 variant — distinct from FIPS SHA3-256) ===
const KC_RC: bigint[] = [
    0x0000000000000001n, 0x0000000000008082n, 0x800000000000808An, 0x8000000080008000n,
    0x000000000000808Bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
    0x000000000000008An, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000An,
    0x000000008000808Bn, 0x800000000000008Bn, 0x8000000000008089n, 0x8000000000008003n,
    0x8000000000008002n, 0x8000000000000080n, 0x000000000000800An, 0x800000008000000An,
    0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const KC_RHO = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14];
const KC_PI  = [0,10,20,5,15,16,1,11,21,6,7,17,2,12,22,23,8,18,3,13,14,24,9,19,4];
const MASK64 = (1n << 64n) - 1n;

function keccakF1600(st: bigint[]): void {
    for (let r = 0; r < 24; r++) {
        const C = [0,1,2,3,4].map(x => st[x] ^ st[x+5] ^ st[x+10] ^ st[x+15] ^ st[x+20]);
        const D = [0,1,2,3,4].map(x => C[(x+4)%5] ^ (((C[(x+1)%5] << 1n) | (C[(x+1)%5] >> 63n)) & MASK64));
        for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) st[x+y*5] = (st[x+y*5] ^ D[x]) & MASK64;
        const tmp = st.slice();
        for (let i = 0; i < 25; i++) {
            const s = BigInt(KC_RHO[i]);
            st[KC_PI[i]] = ((tmp[i] << s) | (tmp[i] >> (64n - s))) & MASK64;
        }
        for (let y = 0; y < 5; y++) {
            const row = st.slice(y*5, y*5+5);
            for (let x = 0; x < 5; x++) st[y*5+x] = (row[x] ^ ((~row[(x+1)%5] & MASK64) & row[(x+2)%5])) & MASK64;
        }
        st[0] = (st[0] ^ KC_RC[r]) & MASK64;
    }
}

function keccak256Pure(input: string): string {
    const RATE = 136;
    const msgBytes = typeof TextEncoder !== 'undefined'
        ? new TextEncoder().encode(input)
        : Uint8Array.from(Array.from(input).map(c => c.charCodeAt(0)));
    const padLen = RATE - (msgBytes.length % RATE);
    const padded = new Uint8Array(msgBytes.length + padLen);
    padded.set(msgBytes);
    padded[msgBytes.length] = 0x01;   // Keccak padding (SHA3 uses 0x06)
    padded[padded.length - 1] |= 0x80;
    const st: bigint[] = new Array(25).fill(0n);
    for (let off = 0; off < padded.length; off += RATE) {
        for (let i = 0; i < RATE / 8; i++) {
            let w = 0n;
            for (let j = 0; j < 8; j++) w |= BigInt(padded[off + i*8 + j]) << BigInt(j*8);
            st[i] ^= w;
        }
        keccakF1600(st);
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = Number((st[Math.floor(i/8)] >> BigInt((i%8)*8)) & 0xFFn);
    return Array.from(out).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cryptography & Math Pipeline Operations
 *
 * Operations for cryptographic functions and number base conversions.
 */
export const cryptoOperations: OperationDefinition[] = [
    // === BASE CONVERSION ===
    {
        id: "math.base-convert",
        name: "Convert Number Base",
        description: "Convert numbers between Binary, Octal, Decimal, and Hexadecimal",
        categories: ["utilities", "encoding"],
        parameters: [
            {
                name: "fromBase",
                label: "From Base",
                type: "select",
                default: "10",
                options: [
                    { value: "2", label: "Binary (2)" },
                    { value: "8", label: "Octal (8)" },
                    { value: "10", label: "Decimal (10)" },
                    { value: "16", label: "Hexadecimal (16)" }
                ]
            },
            {
                name: "toBase",
                label: "To Base",
                type: "select",
                default: "16",
                options: [
                    { value: "2", label: "Binary (2)" },
                    { value: "8", label: "Octal (8)" },
                    { value: "10", label: "Decimal (10)" },
                    { value: "16", label: "Hexadecimal (16)" }
                ]
            },
            {
                name: "prefix",
                label: "Add Prefix",
                type: "boolean",
                default: true,
                description: "Add 0b/0o/0x prefix to output"
            }
        ],
        processingMode: "configurable",
        execute: (input, params) => {
            const fromBase = parseInt((params.fromBase as string) ?? "10");
            const toBase = parseInt((params.toBase as string) ?? "16");
            const addPrefix = params.prefix ?? true;

            const prefixes: Record<number, string> = { 2: '0b', 8: '0o', 16: '0x' };
            const digitChars = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, fromBase);
            const validDigits = new RegExp(`^[${digitChars}]+$`, 'i');

            // Clean input - remove whitespace, sign, and only the prefix that belongs to the source base
            // (for hex input "0B1F" is the number 0x0B1F, not a binary prefix followed by "1F")
            let cleanInput = input.trim();
            let negative = false;
            if (cleanInput.startsWith('-')) {
                negative = true;
                cleanInput = cleanInput.slice(1);
            } else if (cleanInput.startsWith('+')) {
                cleanInput = cleanInput.slice(1);
            }
            const prefix = prefixes[fromBase];
            if (prefix && cleanInput.toLowerCase().startsWith(prefix) && cleanInput.length > prefix.length) {
                cleanInput = cleanInput.slice(prefix.length);
            }

            try {
                if (!validDigits.test(cleanInput)) {
                    throw new Error('Invalid number for specified base');
                }

                // Parse with BigInt so values above 2^53 keep full precision
                const base = BigInt(fromBase);
                let value = 0n;
                for (const ch of cleanInput.toLowerCase()) {
                    value = value * base + BigInt(parseInt(ch, 36));
                }
                if (negative) value = -value;

                // Convert to target base
                let result = value.toString(toBase).toUpperCase();

                // Add prefix if requested
                if (addPrefix) {
                    const outPrefix = prefixes[toBase];
                    if (outPrefix) {
                        result = result.startsWith('-')
                            ? '-' + outPrefix + result.slice(1)
                            : outPrefix + result;
                    }
                }

                return result;
            } catch (e: any) {
                throw new Error(`Failed to convert: ${e.message}`);
            }
        },
        keywords: ["base", "binary", "octal", "decimal", "hex", "hexadecimal", "convert", "number"],
        source: "core",
    },

    // === HASH DIGEST ===
    {
        id: "hash.digest",
        name: "Hash / Digest",
        description: "Generate a cryptographic hash of the input (SHA-1, SHA-256, SHA-384, SHA-512)",
        categories: ["hashing"],
        parameters: [
            {
                name: "algorithm",
                label: "Algorithm",
                type: "select",
                default: "SHA-256",
                options: [
                    { value: "SHA-1", label: "SHA-1 (160-bit)" },
                    { value: "SHA-256", label: "SHA-256 (256-bit)" },
                    { value: "SHA-384", label: "SHA-384 (384-bit)" },
                    { value: "SHA-512", label: "SHA-512 (512-bit)" },
                ]
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "hex",
                options: [
                    { value: "hex", label: "Hexadecimal" },
                    { value: "base64", label: "Base64" },
                ]
            }
        ],
        processingMode: "configurable",
        execute: async (input, params) => {
            const algorithm = (params.algorithm as string) || "SHA-256";
            const outputFormat = (params.outputFormat as string) || "hex";

            const hasWebCrypto = typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined';

            if (hasWebCrypto) {
                const data = new TextEncoder().encode(input);
                const hashBuffer = await crypto.subtle.digest(algorithm, data);
                const hashArray = new Uint8Array(hashBuffer);

                if (outputFormat === 'base64') {
                    let binary = '';
                    hashArray.forEach(byte => { binary += String.fromCharCode(byte); });
                    return btoa(binary);
                }
                return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                const nodeCrypto = await import(/* @vite-ignore */ 'crypto');
                const algoMap: Record<string, string> = {
                    'SHA-1': 'sha1',
                    'SHA-256': 'sha256',
                    'SHA-384': 'sha384',
                    'SHA-512': 'sha512',
                };
                const hash = nodeCrypto.createHash(algoMap[algorithm] || 'sha256');
                hash.update(input);
                return hash.digest(outputFormat === 'base64' ? 'base64' : 'hex');
            }
        },
        keywords: ["hash", "digest", "sha", "sha256", "sha512", "checksum", "fingerprint", "crypto"],
        source: "core",
    },

    // === HMAC ===
    {
        id: "crypto.hmac",
        name: "Generate HMAC",
        description: "Generate Hash-based Message Authentication Code using a secret key",
        categories: ["hashing", "encryption"],
        parameters: [
            {
                name: "key",
                label: "Secret Key",
                type: "string",
                default: "",
                required: true,
                description: "Secret key for HMAC generation"
            },
            {
                name: "algorithm",
                label: "Algorithm",
                type: "select",
                default: "SHA-256",
                options: [
                    { value: "SHA-1", label: "SHA-1" },
                    { value: "SHA-256", label: "SHA-256" },
                    { value: "SHA-384", label: "SHA-384" },
                    { value: "SHA-512", label: "SHA-512" }
                ]
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "hex",
                options: [
                    { value: "hex", label: "Hexadecimal" },
                    { value: "base64", label: "Base64" }
                ]
            }
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const key = (params.key as string) ?? "";
            const algorithm = (params.algorithm as string) ?? "SHA-256";
            const outputFormat = (params.outputFormat as string) ?? "hex";

            if (!key) {
                throw new Error('Secret key is required for HMAC generation');
            }

            try {
                // Try Web Crypto API first (supported in modern Node.js 15+ and all browsers)
                // Falls back to Node.js crypto if TextEncoder or crypto.subtle is not available
                const hasWebCrypto = typeof crypto !== 'undefined' &&
                                    crypto.subtle &&
                                    typeof TextEncoder !== 'undefined';

                if (hasWebCrypto) {
                    const encoder = new TextEncoder();
                    const keyBuffer = encoder.encode(key);
                    const dataBuffer = encoder.encode(input);

                    // Import the key
                    const cryptoKey = await crypto.subtle.importKey(
                        'raw',
                        keyBuffer,
                        { name: 'HMAC', hash: algorithm },
                        false,
                        ['sign']
                    );

                    // Generate HMAC
                    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);

                    // Convert to requested format
                    const signatureArray = new Uint8Array(signature);

                    if (outputFormat === 'base64') {
                        // Convert to base64
                        let binary = '';
                        signatureArray.forEach(byte => {
                            binary += String.fromCharCode(byte);
                        });
                        return btoa(binary);
                    } else {
                        // Convert to hex
                        return Array.from(signatureArray)
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('');
                    }
                } else {
                    // Fallback to Node.js crypto (for test environments or old Node versions)
                    const nodeCrypto = await import(/* @vite-ignore */ 'crypto');

                    // Map algorithm names to Node.js format
                    const algoMap: Record<string, string> = {
                        'SHA-1': 'sha1',
                        'SHA-256': 'sha256',
                        'SHA-384': 'sha384',
                        'SHA-512': 'sha512'
                    };

                    const hmac = nodeCrypto.createHmac(algoMap[algorithm] || 'sha256', key);
                    hmac.update(input);

                    if (outputFormat === 'base64') {
                        return hmac.digest('base64');
                    } else {
                        return hmac.digest('hex');
                    }
                }
            } catch (e: any) {
                throw new Error(`Failed to generate HMAC: ${e.message}`);
            }
        },
        keywords: ["hmac", "hash", "mac", "signature", "crypto", "auth", "webhook"],
        source: "core",
    },

    // === AES-GCM ===
    {
        id: "crypto.aes-encrypt",
        name: "AES Encrypt",
        description:
            "Encrypt text with AES-256-GCM. Output is Base64 or hex-encoded (salt + IV + ciphertext + auth tag). Key is derived from the passphrase via PBKDF2-SHA256.",
        categories: ["encryption"],
        parameters: [
            {
                name: "passphrase",
                label: "Passphrase",
                type: "string",
                default: "",
                required: true,
                placeholder: "Enter passphrase…",
                description: "Used to derive the 256-bit encryption key via PBKDF2.",
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "base64",
                options: [
                    { value: "base64", label: "Base64" },
                    { value: "hex", label: "Hexadecimal" },
                ],
            },
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const passphrase = (params.passphrase as string) ?? "";
            const outputFormat = (params.outputFormat as string) ?? "base64";

            if (!passphrase) throw new Error("Passphrase is required");

            const hasWebCrypto =
                typeof crypto !== "undefined" &&
                !!crypto.subtle &&
                typeof TextEncoder !== "undefined";

            let combined: Uint8Array;

            if (hasWebCrypto) {
                const enc = new TextEncoder();
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const iv = crypto.getRandomValues(new Uint8Array(12));

                const keyMaterial = await crypto.subtle.importKey(
                    "raw",
                    enc.encode(passphrase),
                    "PBKDF2",
                    false,
                    ["deriveKey"],
                );
                const key = await crypto.subtle.deriveKey(
                    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
                    keyMaterial,
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["encrypt"],
                );
                // Web Crypto appends the 16-byte auth tag at the end of the ciphertext buffer
                const ciphertextAndTag = new Uint8Array(
                    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(input)),
                );
                combined = new Uint8Array(16 + 12 + ciphertextAndTag.byteLength);
                combined.set(salt, 0);
                combined.set(iv, 16);
                combined.set(ciphertextAndTag, 28);
            } else {
                const nc = await import(/* @vite-ignore */ "crypto");
                const salt = nc.randomBytes(16);
                const iv = nc.randomBytes(12);
                const key = nc.pbkdf2Sync(passphrase, salt, 100_000, 32, "sha256");
                const cipher = nc.createCipheriv("aes-256-gcm", key, iv);
                const ciphertext = Buffer.concat([cipher.update(input, "utf8"), cipher.final()]);
                // Store ciphertext first, then auth tag — matches Web Crypto layout
                const authTag = cipher.getAuthTag();
                const buf = Buffer.concat([salt, iv, ciphertext, authTag]);
                combined = new Uint8Array(buf);
            }

            if (outputFormat === "hex") {
                return Array.from(combined)
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
            }
            return bytesToBase64(combined);
        },
        keywords: ["aes", "encrypt", "gcm", "symmetric", "cipher", "passphrase", "pbkdf2", "secret"],
        source: "core",
    },
    {
        id: "crypto.aes-decrypt",
        name: "AES Decrypt",
        description:
            "Decrypt AES-256-GCM ciphertext produced by AES Encrypt. Accepts Base64 or hex input.",
        categories: ["encryption"],
        parameters: [
            {
                name: "passphrase",
                label: "Passphrase",
                type: "string",
                default: "",
                required: true,
                placeholder: "Enter passphrase…",
            },
            {
                name: "inputFormat",
                label: "Input Format",
                type: "select",
                default: "base64",
                options: [
                    { value: "base64", label: "Base64" },
                    { value: "hex", label: "Hexadecimal" },
                ],
            },
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const passphrase = (params.passphrase as string) ?? "";
            const inputFormat = (params.inputFormat as string) ?? "base64";

            if (!passphrase) throw new Error("Passphrase is required");

            let bytes: Uint8Array;
            if (inputFormat === "hex") {
                const hex = input.trim().replace(/\s/g, "");
                if (hex.length % 2 !== 0) throw new Error("Invalid hex input: odd length");
                bytes = new Uint8Array(hex.length / 2);
                for (let i = 0; i < hex.length; i += 2)
                    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
            } else {
                const bin = atob(input.trim());
                bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            }

            // Minimum: salt(16) + iv(12) + authTag(16) = 44 bytes; plaintext may be 0 bytes
            if (bytes.length < 44)
                throw new Error("Ciphertext too short — expected at least 44 bytes");

            const salt = bytes.slice(0, 16);
            const iv = bytes.slice(16, 28);
            // Remaining bytes: ciphertext + 16-byte auth tag (appended at end)
            const ciphertextAndTag = bytes.slice(28);

            const hasWebCrypto =
                typeof crypto !== "undefined" &&
                !!crypto.subtle &&
                typeof TextEncoder !== "undefined";

            if (hasWebCrypto) {
                const enc = new TextEncoder();
                const keyMaterial = await crypto.subtle.importKey(
                    "raw",
                    enc.encode(passphrase),
                    "PBKDF2",
                    false,
                    ["deriveKey"],
                );
                const key = await crypto.subtle.deriveKey(
                    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
                    keyMaterial,
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["decrypt"],
                );
                try {
                    const plaintext = await crypto.subtle.decrypt(
                        { name: "AES-GCM", iv },
                        key,
                        ciphertextAndTag,
                    );
                    return new TextDecoder().decode(plaintext);
                } catch {
                    throw new Error("Decryption failed — wrong passphrase or corrupted ciphertext");
                }
            } else {
                const nc = await import(/* @vite-ignore */ "crypto");
                const key = nc.pbkdf2Sync(passphrase, salt, 100_000, 32, "sha256");
                const authTag = Buffer.from(ciphertextAndTag.slice(ciphertextAndTag.length - 16));
                const ciphertext = Buffer.from(ciphertextAndTag.slice(0, ciphertextAndTag.length - 16));
                const decipher = nc.createDecipheriv("aes-256-gcm", key, Buffer.from(iv));
                decipher.setAuthTag(authTag);
                try {
                    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
                } catch {
                    throw new Error("Decryption failed — wrong passphrase or corrupted ciphertext");
                }
            }
        },
        keywords: ["aes", "decrypt", "gcm", "symmetric", "cipher", "passphrase", "pbkdf2", "secret"],
        source: "core",
    },

    // === RIPEMD-160 ===
    {
        id: "hash.ripemd160",
        name: "RIPEMD-160",
        description: "Generate a RIPEMD-160 hash (160-bit digest). Commonly used in Bitcoin address derivation.",
        categories: ["hashing"],
        parameters: [
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "hex",
                options: [
                    { value: "hex", label: "Hexadecimal" },
                    { value: "base64", label: "Base64" },
                ],
            },
        ],
        processingMode: "configurable",
        execute: async (input, params) => {
            const outputFormat = (params.outputFormat as string) || "hex";

            // RIPEMD-160 is not in WebCrypto — use Node.js crypto where available,
            // fall back to a pure JS implementation for browser environments.
            try {
                const nodeCrypto = await import(/* @vite-ignore */ "crypto");
                if (typeof nodeCrypto.createHash === "function") {
                    const hash = nodeCrypto.createHash("ripemd160");
                    hash.update(input);
                    return hash.digest(outputFormat === "base64" ? "base64" : "hex");
                }
            } catch {
                // Browser environment — fall through to pure JS
            }

            const bytes = typeof TextEncoder !== "undefined"
                ? new TextEncoder().encode(input)
                : Uint8Array.from(Array.from(input).map(c => c.charCodeAt(0)));
            const hex = ripemd160Pure(bytes);
            if (outputFormat === "base64") {
                const raw = new Uint8Array(20);
                for (let i = 0; i < 20; i++) raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
                let bin = "";
                raw.forEach(b => { bin += String.fromCharCode(b); });
                return btoa(bin);
            }
            return hex;
        },
        keywords: ["ripemd", "ripemd160", "hash", "digest", "bitcoin", "crypto", "160"],
        source: "core",
    },

    // === KECCAK-256 ===
    {
        id: "hash.keccak",
        name: "Keccak-256",
        description: "Generate a Keccak-256 hash (Ethereum's SHA3 variant — distinct from FIPS SHA3-256).",
        categories: ["hashing"],
        parameters: [
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "hex",
                options: [
                    { value: "hex", label: "Hexadecimal" },
                    { value: "base64", label: "Base64" },
                ],
            },
        ],
        processingMode: "configurable",
        execute: async (input, params) => {
            const outputFormat = (params.outputFormat as string) || "hex";
            const hex = keccak256Pure(input);
            if (outputFormat === "base64") {
                const raw = new Uint8Array(32);
                for (let i = 0; i < 32; i++) raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
                let bin = "";
                raw.forEach(b => { bin += String.fromCharCode(b); });
                return btoa(bin);
            }
            return hex;
        },
        keywords: ["keccak", "keccak256", "sha3", "ethereum", "hash", "digest", "web3", "solidity"],
        source: "core",
    },

    // === RSA-OAEP ===
    {
        id: "crypto.rsa-encrypt",
        name: "RSA Encrypt",
        description:
            "Encrypt text with RSA-OAEP (SHA-256) using a PEM public key (SPKI format). Output is Base64 ciphertext.",
        categories: ["encryption"],
        parameters: [
            {
                name: "publicKey",
                label: "Public Key (PEM)",
                type: "textarea",
                default: "",
                required: true,
                placeholder: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq…\n-----END PUBLIC KEY-----",
                description: "PEM-encoded SubjectPublicKeyInfo key ('BEGIN PUBLIC KEY')",
            },
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const pem = ((params.publicKey as string) ?? "").trim();
            if (!pem) throw new Error("Public key (PEM) is required");

            const hasWebCrypto =
                typeof crypto !== "undefined" &&
                !!crypto.subtle &&
                typeof TextEncoder !== "undefined";

            if (hasWebCrypto) {
                try {
                    const key = await crypto.subtle.importKey(
                        "spki",
                        pemToDer(pem),
                        { name: "RSA-OAEP", hash: "SHA-256" },
                        false,
                        ["encrypt"],
                    );
                    const ciphertext = await crypto.subtle.encrypt(
                        { name: "RSA-OAEP" },
                        key,
                        new TextEncoder().encode(input),
                    );
                    return bytesToBase64(new Uint8Array(ciphertext));
                } catch (e) {
                    if (isPkcs1Label(pem)) {
                        throw new Error(
                            "PKCS#1 keys ('BEGIN RSA PUBLIC KEY') are not supported — convert to SPKI ('BEGIN PUBLIC KEY')",
                        );
                    }
                    throw new Error(
                        `RSA encryption failed: ${e instanceof Error ? e.message : String(e)}`,
                    );
                }
            }

            const nc = await import(/* @vite-ignore */ "crypto");
            const encrypted = nc.publicEncrypt(
                {
                    key: nc.createPublicKey(pem),
                    padding: nc.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: "sha256",
                },
                Buffer.from(input, "utf8"),
            );
            return encrypted.toString("base64");
        },
        keywords: ["rsa", "encrypt", "oaep", "asymmetric", "public key", "pem", "cipher"],
        source: "core",
    },
    {
        id: "crypto.rsa-decrypt",
        name: "RSA Decrypt",
        description:
            "Decrypt Base64 RSA-OAEP (SHA-256) ciphertext using a PEM private key (PKCS#8 format).",
        categories: ["encryption"],
        parameters: [
            {
                name: "privateKey",
                label: "Private Key (PEM)",
                type: "textarea",
                default: "",
                required: true,
                placeholder: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN…\n-----END PRIVATE KEY-----",
                description: "PEM-encoded PKCS#8 key ('BEGIN PRIVATE KEY')",
            },
            {
                name: "inputFormat",
                label: "Input Format",
                type: "select",
                default: "base64",
                options: [
                    { value: "base64", label: "Base64" },
                    { value: "hex", label: "Hexadecimal" },
                ],
            },
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const pem = ((params.privateKey as string) ?? "").trim();
            if (!pem) throw new Error("Private key (PEM) is required");

            const inputFormat = (params.inputFormat as string) ?? "base64";
            let cipherBytes: Uint8Array;
            if (inputFormat === "hex") {
                const hex = input.trim().replace(/\s/g, "");
                if (hex.length % 2 !== 0) throw new Error("Invalid hex input: odd length");
                cipherBytes = new Uint8Array(hex.length / 2);
                for (let i = 0; i < hex.length; i += 2)
                    cipherBytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
            } else {
                cipherBytes = base64ToBytes(input.trim());
            }

            const hasWebCrypto =
                typeof crypto !== "undefined" &&
                !!crypto.subtle &&
                typeof TextDecoder !== "undefined";

            if (hasWebCrypto) {
                try {
                    const key = await crypto.subtle.importKey(
                        "pkcs8",
                        pemToDer(pem),
                        { name: "RSA-OAEP", hash: "SHA-256" },
                        false,
                        ["decrypt"],
                    );
                    const plaintext = await crypto.subtle.decrypt(
                        { name: "RSA-OAEP" },
                        key,
                        cipherBytes,
                    );
                    return new TextDecoder().decode(plaintext);
                } catch (e) {
                    if (isPkcs1Label(pem)) {
                        throw new Error(
                            "PKCS#1 keys ('BEGIN RSA PRIVATE KEY') are not supported — convert to PKCS#8 ('BEGIN PRIVATE KEY')",
                        );
                    }
                    throw new Error(
                        `RSA decryption failed: ${e instanceof Error ? e.message : String(e)}`,
                    );
                }
            }

            const nc = await import(/* @vite-ignore */ "crypto");
            const decrypted = nc.privateDecrypt(
                {
                    key: nc.createPrivateKey(pem),
                    padding: nc.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: "sha256",
                },
                Buffer.from(cipherBytes),
            );
            return decrypted.toString("utf8");
        },
        keywords: ["rsa", "decrypt", "oaep", "asymmetric", "private key", "pem", "cipher"],
        source: "core",
    },
];

function isPkcs1Label(pem: string): boolean {
    return /-----BEGIN RSA (PUBLIC|PRIVATE) KEY-----/.test(pem);
}

function pemToDer(pem: string): Uint8Array {
    const body = pem
        .replace(/-----BEGIN [^-]+-----/, "")
        .replace(/-----END [^-]+-----/, "")
        .replace(/\s+/g, "");
    if (!body) throw new Error("Invalid PEM: no key data found");
    return base64ToBytes(body);
}

function base64ToBytes(base64: string): Uint8Array {
    let binary: string;
    try {
        binary = atob(base64);
    } catch {
        throw new Error("Invalid Base64 input");
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

// Self-register all operations
cryptoOperations.forEach(op => operationRegistry.register(op));

export default cryptoOperations;
