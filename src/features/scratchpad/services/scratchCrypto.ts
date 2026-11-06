import type { ScratchPayload } from "../types";

/**
 * AES-GCM helpers for Global Scratchpad entries.
 *
 * Threat model (tier 0): the key is a random, non-extractable CryptoKey kept in
 * IndexedDB next to the ciphertext. This keeps plaintext out of DevTools,
 * exports, backups and casual inspection. It does NOT protect against someone
 * who can copy the whole browser profile, nor against script running in the
 * page (it can still use the key). A passphrase/passkey-wrapped key is the
 * planned upgrade path.
 */

const ALGORITHM = "AES-GCM";
const IV_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * WebCrypto (`crypto.subtle`) only exists in secure contexts: https, or
 * http://localhost / 127.0.0.1. Opened via a LAN IP or custom hostname over
 * plain http it is undefined, so fail with an actionable message instead of
 * "Cannot read properties of undefined (reading 'generateKey')".
 */
export const SECURE_CONTEXT_ERROR =
  "Scratch needs encryption, which your browser only allows on https or " +
  "localhost. Open the app at http://localhost (or over https) and try again.";

export async function generateScratchKey(): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error(SECURE_CONTEXT_ERROR);
  return subtle.generateKey({ name: ALGORITHM, length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Entry id is bound as additional authenticated data, so a ciphertext copied
 * onto another row fails to decrypt instead of silently showing wrong content.
 */
export async function encryptPayload(
  key: CryptoKey,
  entryId: string,
  payload: ScratchPayload,
): Promise<{ iv: Uint8Array; ct: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, additionalData: encoder.encode(entryId) },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return { iv, ct: new Uint8Array(cipher) };
}

export async function decryptPayload(
  key: CryptoKey,
  entryId: string,
  record: { iv: Uint8Array; ct: Uint8Array },
): Promise<ScratchPayload> {
  const plain = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: record.iv, additionalData: encoder.encode(entryId) },
    key,
    record.ct,
  );
  const parsed = JSON.parse(decoder.decode(plain)) as ScratchPayload;
  if (parsed?.v !== 1 || typeof parsed.text !== "string") {
    throw new Error("Unsupported scratch payload");
  }
  return parsed;
}

/**
 * Where the key lives. `putIfAbsent` must be atomic across browser tabs so two
 * tabs racing on first use end up sharing one key (otherwise entries written
 * with the losing key would be unreadable).
 */
export interface ScratchKeyStore {
  get(): Promise<CryptoKey | undefined>;
  putIfAbsent(key: CryptoKey): Promise<CryptoKey>;
}

export function createKeyProvider(
  store: ScratchKeyStore,
  generate: () => Promise<CryptoKey> = generateScratchKey,
): { getKey: () => Promise<CryptoKey> } {
  let pending: Promise<CryptoKey> | null = null;

  const resolveKey = async (): Promise<CryptoKey> => {
    const existing = await store.get();
    if (existing) return existing;
    // Generate outside any DB transaction (WebCrypto promises are not
    // transaction-aware), then let the store pick the winner atomically.
    return store.putIfAbsent(await generate());
  };

  return {
    getKey: () => {
      if (!pending) {
        pending = resolveKey().catch((error) => {
          pending = null; // allow retry after a transient failure
          throw error;
        });
      }
      return pending;
    },
  };
}
