import { useCallback, useEffect, useRef, useState } from "react";

/** A boolean that turns itself off again after `ms` (e.g. "Copied!" feedback). */
export function useTransientFlag(ms: number = 1500): [boolean, () => void] {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback(() => {
    setActive(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(false), ms);
  }, [ms]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return [active, trigger];
}
