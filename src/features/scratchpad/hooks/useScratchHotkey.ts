import { useEffect } from "react";

/** Cmd/Ctrl+Shift+Y. (Cmd/Ctrl+Shift+K would collide with Monaco's Delete Line.) */
export function isScratchHotkey(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "y"
  );
}

/**
 * Listens in the capture phase so the shortcut still works while the Monaco
 * editor has focus, and stops the event from reaching it.
 */
export function useScratchHotkey(onToggle: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isScratchHotkey(event)) return;
      event.preventDefault();
      event.stopPropagation();
      onToggle();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [onToggle]);
}
