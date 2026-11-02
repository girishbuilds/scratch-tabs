import { useEffect } from "react";
import type { RefObject } from "react";

/** Calls `onDismiss` on a mouse press outside `ref` while `active`. */
export function useDismissOnOutsidePress(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const handler = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, active, onDismiss]);
}
