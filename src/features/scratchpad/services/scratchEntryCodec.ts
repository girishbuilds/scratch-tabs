import type {
  ScratchEntryRecord,
  ScratchEntryView,
  ScratchPayload,
  ScratchUnreadableView,
} from "../types";
import { buildSegments, getCopyTarget } from "./blockSegmenter";
import { decryptPayload, encryptPayload } from "./scratchCrypto";

/** Converts between payloads, encrypted records and secret-free view models. */

export interface EntryMeta {
  id: string;
  createdAt: number;
  batchIndex: number;
}

export async function sealEntry(
  key: CryptoKey,
  meta: EntryMeta,
  payload: ScratchPayload,
  now: number = meta.createdAt,
): Promise<ScratchEntryRecord> {
  const { iv, ct } = await encryptPayload(key, meta.id, payload);
  return {
    id: meta.id,
    v: 1,
    createdAt: meta.createdAt,
    updatedAt: now,
    batchIndex: meta.batchIndex,
    iv,
    ct,
  };
}

export function openEntry(
  key: CryptoKey,
  record: ScratchEntryRecord,
): Promise<ScratchPayload> {
  return decryptPayload(key, record.id, record);
}

export function toEntryView(
  record: ScratchEntryRecord,
  payload: ScratchPayload,
): ScratchEntryView {
  return {
    id: record.id,
    kind: payload.kind,
    copyTarget: getCopyTarget(payload),
    segments: buildSegments(payload),
    createdAt: record.createdAt,
    batchIndex: record.batchIndex,
    secretCount: payload.secrets.length,
  };
}

export function toUnreadableView(record: ScratchEntryRecord): ScratchUnreadableView {
  return {
    id: record.id,
    kind: "unreadable",
    createdAt: record.createdAt,
    batchIndex: record.batchIndex,
  };
}
