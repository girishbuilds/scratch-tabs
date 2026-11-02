import { useCallback, useEffect, useRef, useState } from "react";

export const EXPIRY_TTL_MS = 10_000;

/**
 * Holds a value (decrypted plaintext) only briefly: it is discarded after a
 * timeout, when the window loses focus, on `hide`, and on unmount.
 */
export function useExpiringValue<T>(
  load: () => Promise<T>,
  ttlMs: number = EXPIRY_TTL_MS,
) {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped whenever the value must be discarded, so a load still in flight
  // cannot put plaintext back after a hide, blur or unmount.
  const generation = useRef(0);

  const hide = useCallback(() => {
    generation.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setValue(null);
  }, []);

  const show = useCallback(async () => {
    const requested = ++generation.current;
    const invalidate = () => {
      generation.current += 1;
    };
    window.addEventListener("blur", invalidate);
    let loaded: T;
    try {
      loaded = await load();
    } finally {
      window.removeEventListener("blur", invalidate);
    }
    if (generation.current !== requested) return;
    setValue(loaded);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, ttlMs);
  }, [load, hide, ttlMs]);

  const toggle = useCallback(async () => {
    if (value !== null) hide();
    else await show();
  }, [value, hide, show]);

  useEffect(() => {
    if (value === null) return;
    window.addEventListener("blur", hide);
    return () => window.removeEventListener("blur", hide);
  }, [value, hide]);

  useEffect(
    () => () => {
      generation.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { value, isActive: value !== null, show, hide, toggle };
}
