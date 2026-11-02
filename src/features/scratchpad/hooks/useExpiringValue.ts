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

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setValue(null);
  }, []);

  const show = useCallback(async () => {
    const loaded = await load();
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
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { value, isActive: value !== null, show, hide, toggle };
}
