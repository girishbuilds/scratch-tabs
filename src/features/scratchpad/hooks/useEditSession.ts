import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Open/close state for editing an entry's decrypted text. Unlike
 * `useExpiringValue` there is no timeout or blur-dismiss: the user is typing,
 * and losing a draft to a timer would be worse than showing text they asked
 * to edit. The text is dropped on `close`, on unmount, and by the caller when
 * presenting starts.
 */
export function useEditSession(load: () => Promise<string>) {
  const [text, setText] = useState<string | null>(null);
  // Bumped on close/unmount so a load still in flight cannot reopen the editor.
  const generation = useRef(0);

  const close = useCallback(() => {
    generation.current += 1;
    setText(null);
  }, []);

  const open = useCallback(async () => {
    const requested = ++generation.current;
    const loaded = await load();
    if (generation.current === requested) setText(loaded);
  }, [load]);

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  return { text, isOpen: text !== null, open, close };
}
