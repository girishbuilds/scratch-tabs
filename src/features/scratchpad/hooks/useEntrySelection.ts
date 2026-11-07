import { useCallback, useRef, useState } from "react";
import { idsBetween, retainIds } from "../services/entrySelection";

const NONE: ReadonlySet<string> = new Set();

/**
 * Multi-select state for the Scratch list. UI-only: nothing here is stored.
 * Selection mode is separate from the selection itself so that an empty
 * selection can stay in the mode.
 */
export function useEntrySelection() {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(NONE);
  const anchor = useRef<string | null>(null);

  const exit = useCallback(() => {
    setActive(false);
    setSelected(NONE);
    anchor.current = null;
  }, []);

  const start = useCallback(() => setActive(true), []);

  /** Toggles one entry, or with `range` selects everything from the last click to this one. */
  const select = useCallback((id: string, range: boolean, ordered: readonly string[]) => {
    setActive(true);
    setSelected((current) => {
      const next = new Set(current);
      if (range && anchor.current && anchor.current !== id) {
        idsBetween(ordered, anchor.current, id).forEach((rangeId) => next.add(rangeId));
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    anchor.current = id;
  }, []);

  const selectAll = useCallback((ids: readonly string[]) => setSelected(new Set(ids)), []);
  const clear = useCallback(() => setSelected(NONE), []);

  /** Drops ids that are no longer shown (filtered out or deleted). */
  const retain = useCallback(
    (ids: readonly string[]) => setSelected((current) => retainIds(current, ids)),
    [],
  );

  return { active, selected, start, exit, select, selectAll, clear, retain };
}
