import { useCallback, useEffect } from "react";
import type { ScratchEntryView } from "../types";
import type { ScratchEntryActions } from "../components/entryActions";
import { useExpiringValue } from "./useExpiringValue";
import { useScratchCopy } from "./useScratchCopy";
import { useSecretReveal } from "./useSecretReveal";
import { useTransientFlag } from "./useTransientFlag";

/** How long the entry's glyph shows a tick after a copy. */
export const COPIED_TICK_MS = 2000;

/**
 * Everything one readable entry can do and the short-lived state it needs:
 * copying, revealing secrets, correcting masks. Plaintext lives here only
 * while revealed / being edited and is dropped on a timer, on blur and while
 * presenting.
 */
export function useEntryController(
  item: ScratchEntryView,
  actions: ScratchEntryActions,
  presenting: boolean,
) {
  const copy = useScratchCopy();
  const [copied, flashCopied] = useTransientFlag(COPIED_TICK_MS);

  const loadSecrets = useCallback(() => actions.revealSecrets(item.id), [actions, item.id]);
  const loadText = useCallback(() => actions.getEditableText(item.id), [actions, item.id]);
  const reveal = useSecretReveal(loadSecrets);
  const editor = useExpiringValue(loadText);
  const { hide: hideReveal } = reveal;
  const { hide: hideEditor } = editor;

  useEffect(() => {
    if (!presenting) return;
    hideReveal();
    hideEditor();
  }, [presenting, hideReveal, hideEditor]);

  const copyEntry = useCallback(async () => {
    const text = await actions.getCopyText(item.id);
    if (await copy(text, { sensitive: item.secretCount > 0 })) flashCopied();
  }, [actions, copy, flashCopied, item.id, item.secretCount]);

  const copySecret = useCallback(
    async (index: number) => {
      const ok = await copy(await actions.getSecretValue(item.id, index), { sensitive: true });
      if (ok) flashCopied();
      return ok;
    },
    [actions, copy, flashCopied, item.id],
  );

  const markNotSecret = useCallback(
    async (index: number) => {
      hideReveal();
      await actions.markNotSecret(item.id, index);
    },
    [actions, hideReveal, item.id],
  );

  const maskSelection = useCallback(
    async (start: number, end: number) => {
      hideEditor();
      hideReveal();
      await actions.maskRange(item.id, start, end);
    },
    [actions, hideEditor, hideReveal, item.id],
  );

  return { copied, copyEntry, copySecret, reveal, editor, markNotSecret, maskSelection };
}
