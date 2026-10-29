import { useEffect, useState } from "react";

/** Turns true only after `flag` has stayed true for `delayMs`; turns false immediately. */
export function useDelayedFlag(flag: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!flag) { setElapsed(false); return; }
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [flag, delayMs]);

  return flag && elapsed;
}
