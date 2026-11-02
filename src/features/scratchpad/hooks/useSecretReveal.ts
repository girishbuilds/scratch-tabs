import { EXPIRY_TTL_MS, useExpiringValue } from "./useExpiringValue";

export const REVEAL_TTL_MS = EXPIRY_TTL_MS;

/** Decrypted secret values of an entry, kept only while revealed. */
export function useSecretReveal(
  load: () => Promise<string[]>,
  ttlMs: number = REVEAL_TTL_MS,
) {
  const { value, isActive, toggle, hide } = useExpiringValue(load, ttlMs);
  return { values: value, isRevealed: isActive, toggle, hide };
}
