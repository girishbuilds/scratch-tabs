/**
 * Scratch Drawer types.
 *
 * Persisted records only ever hold ciphertext. The in-memory view model
 * (`ScratchEntryView`) never contains secret values: secret spans are
 * represented by index and are decrypted on demand (reveal / copy).
 */

export type ScratchEntryKind = "secret" | "command" | "url" | "note";

/** Half-open [start, end) character range inside a block's text. */
export interface SecretSpan {
  start: number;
  end: number;
}

/** What is encrypted at rest. */
export interface ScratchPayload {
  v: 1;
  text: string;
  kind: ScratchEntryKind;
  secrets: SecretSpan[];
}

/** What is stored in IndexedDB. Only metadata is plaintext. */
export interface ScratchEntryRecord {
  id: string;
  v: 1;
  createdAt: number;
  updatedAt: number;
  /** Position of the block within the paste that created it (ties on createdAt). */
  batchIndex: number;
  /** Plaintext on purpose: pinning is organisational metadata, not content. */
  pinned?: boolean;
  iv: Uint8Array;
  ct: Uint8Array;
}

export interface ScratchKeyRecord {
  id: string;
  key: CryptoKey;
}

export type ScratchSegment =
  | { type: "text"; text: string }
  | { type: "secret"; index: number };

/** What an entry's main Copy button copies: just the secret value, or everything. */
export type ScratchCopyTarget = "value" | "all";

export interface ScratchEntryView {
  id: string;
  kind: ScratchEntryKind;
  copyTarget: ScratchCopyTarget;
  segments: ScratchSegment[];
  createdAt: number;
  batchIndex: number;
  pinned: boolean;
  secretCount: number;
}

/** An entry that could not be decrypted (wrong/missing key, corrupt row). */
export interface ScratchUnreadableView {
  id: string;
  kind: "unreadable";
  createdAt: number;
  batchIndex: number;
  pinned: boolean;
}

export type ScratchListItem = ScratchEntryView | ScratchUnreadableView;
