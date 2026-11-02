import { useCallback, useEffect, useRef, useState } from "react";

export const REVEAL_TTL_MS = 10_000;

/**
 * Holds decrypted secret values only while revealed, then discards them:
 * after a timeout, when the window loses focus, and on unmount.
 */
export function useSecretReveal(
  load: () => Promise<string[]>,
  ttlMs: number = REVEAL_TTL_MS,
) {
  const [values, setValues] = useState<string[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setValues(null);
  }, []);

  const toggle = useCallback(async () => {
    if (values) {
      hide();
      return;
    }
    const revealed = await load();
    setValues(revealed);
    timer.current = setTimeout(hide, ttlMs);
  }, [values, hide, load, ttlMs]);

  useEffect(() => {
    if (!values) return;
    window.addEventListener("blur", hide);
    return () => window.removeEventListener("blur", hide);
  }, [values, hide]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { values, isRevealed: values !== null, toggle, hide };
}
