import {
  createKeyProvider,
  decryptPayload,
  encryptPayload,
  generateScratchKey,
  SECURE_CONTEXT_ERROR,
  type ScratchKeyStore,
} from "../services/scratchCrypto";
import type { ScratchPayload } from "../types";
import { newTestKey } from "../testing/inMemory";

const payload: ScratchPayload = {
  v: 1,
  text: "Prod-Key: 8d8sd89hsdh8-sdc0shc",
  kind: "secret",
  secrets: [{ start: 10, end: 30 }],
};

describe("encryptPayload / decryptPayload", () => {
  it("round-trips a payload", async () => {
    const key = await newTestKey();
    const sealed = await encryptPayload(key, "entry-1", payload);
    expect(await decryptPayload(key, "entry-1", sealed)).toEqual(payload);
  });

  it("round-trips unicode text", async () => {
    const key = await newTestKey();
    const unicode = { ...payload, text: "clé 🔑 пароль", secrets: [] };
    const sealed = await encryptPayload(key, "e", unicode);
    expect((await decryptPayload(key, "e", sealed)).text).toBe("clé 🔑 пароль");
  });

  it("does not contain the plaintext in the ciphertext", async () => {
    const key = await newTestKey();
    const { ct } = await encryptPayload(key, "entry-1", payload);
    const asText = new TextDecoder("latin1").decode(ct);
    expect(asText).not.toContain("8d8sd89hsdh8");
    expect(asText).not.toContain("Prod-Key");
  });

  it("uses a fresh IV each time", async () => {
    const key = await newTestKey();
    const a = await encryptPayload(key, "entry-1", payload);
    const b = await encryptPayload(key, "entry-1", payload);
    expect(a.iv).not.toEqual(b.iv);
    expect(a.ct).not.toEqual(b.ct);
  });

  it("rejects the wrong key", async () => {
    const sealed = await encryptPayload(await newTestKey(), "entry-1", payload);
    await expect(decryptPayload(await newTestKey(), "entry-1", sealed)).rejects.toBeDefined();
  });

  it("binds ciphertext to its entry id", async () => {
    const key = await newTestKey();
    const sealed = await encryptPayload(key, "entry-1", payload);
    await expect(decryptPayload(key, "entry-2", sealed)).rejects.toBeDefined();
  });

  it("detects tampering", async () => {
    const key = await newTestKey();
    const sealed = await encryptPayload(key, "entry-1", payload);
    const tampered = new Uint8Array(sealed.ct);
    tampered[0] ^= 0xff;
    await expect(
      decryptPayload(key, "entry-1", { iv: sealed.iv, ct: tampered }),
    ).rejects.toBeDefined();
  });

  it("rejects a payload that decrypts to something other than an object", async () => {
    const key = await newTestKey();
    const sealed = await encryptPayload(key, "e", null as unknown as ScratchPayload);
    await expect(decryptPayload(key, "e", sealed)).rejects.toThrow("Unsupported scratch payload");
  });

  it("rejects a payload with an unsupported version", async () => {
    const key = await newTestKey();
    const future = { ...payload, v: 2 } as unknown as ScratchPayload;
    const sealed = await encryptPayload(key, "e", future);
    await expect(decryptPayload(key, "e", sealed)).rejects.toThrow("Unsupported scratch payload");
  });
});

describe("generateScratchKey", () => {
  it("creates a non-extractable AES-GCM key", async () => {
    const key = await generateScratchKey();
    expect(key.extractable).toBe(false);
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toBeDefined();
  });
});

describe("createKeyProvider", () => {
  const makeStore = (initial?: CryptoKey) => {
    let stored = initial;
    const store: ScratchKeyStore = {
      get: jest.fn(async () => stored),
      putIfAbsent: jest.fn(async (key: CryptoKey) => {
        stored ??= key;
        return stored;
      }),
    };
    return store;
  };

  it("returns the existing key without generating a new one", async () => {
    const existing = await newTestKey();
    const generate = jest.fn(newTestKey);
    const provider = createKeyProvider(makeStore(existing), generate);
    expect(await provider.getKey()).toBe(existing);
    expect(generate).not.toHaveBeenCalled();
  });

  it("generates and stores a key on first use", async () => {
    const store = makeStore();
    const generated = await newTestKey();
    const provider = createKeyProvider(store, async () => generated);
    expect(await provider.getKey()).toBe(generated);
    expect(store.putIfAbsent).toHaveBeenCalledWith(generated);
  });

  it("uses the store's winner when another tab created a key first", async () => {
    const winner = await newTestKey();
    const store: ScratchKeyStore = {
      get: async () => undefined,
      putIfAbsent: async () => winner,
    };
    const provider = createKeyProvider(store, newTestKey);
    expect(await provider.getKey()).toBe(winner);
  });

  it("memoises concurrent calls into a single resolution", async () => {
    const store = makeStore();
    const generate = jest.fn(newTestKey);
    const provider = createKeyProvider(store, generate);
    const [a, b] = await Promise.all([provider.getKey(), provider.getKey()]);
    expect(a).toBe(b);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("allows a retry after a transient failure", async () => {
    const key = await newTestKey();
    const store: ScratchKeyStore = {
      get: jest
        .fn<Promise<CryptoKey | undefined>, []>()
        .mockRejectedValueOnce(new Error("idb unavailable"))
        .mockResolvedValue(key),
      putIfAbsent: jest.fn(),
    };
    const provider = createKeyProvider(store, newTestKey);
    await expect(provider.getKey()).rejects.toThrow("idb unavailable");
    expect(await provider.getKey()).toBe(key);
  });
});

describe("generateScratchKey in an insecure context", () => {
  it("throws an actionable error when crypto.subtle is unavailable", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { value: {}, configurable: true });
    try {
      await expect(generateScratchKey()).rejects.toThrow(SECURE_CONTEXT_ERROR);
    } finally {
      if (original) Object.defineProperty(globalThis, "crypto", original);
    }
  });
});
