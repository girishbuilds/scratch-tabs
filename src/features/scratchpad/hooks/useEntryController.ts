import { useCallback, useEffect } from "react";
import type { ScratchEntryView } from "../types";
import type { ScratchEntryActions } from "../components/entryActions";
import { useEditSession } from "./useEditSession";
import { useExpiringValue } from "./useExpiringValue";
import { useScratchCopy } from "./useScratchCopy";
import { useSecretReveal } from "./useSecretReveal";
import { useTransientFlag } from "./useTransientFlag";

/** How long the entry's glyph shows a tick after a copy. */
export const COPIED_TICK_MS = 2000;

/**
 * Everything one readable entry can do and the short-lived state it needs:
 * copying, revealing secrets, correcting masks, editing the text. Plaintext lives here only
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
  const edit = useEditSession(loadText);
  const { hide: hideReveal } = reveal;
  const { hide: hideEditor } = editor;
  const { close: closeEdit } = edit;

  useEffect(() => {
    if (!presenting) return;
    hideReveal();
    hideEditor();
    closeEdit();
  }, [presenting, hideReveal, hideEditor, closeEdit]);

  // The two plaintext editors are mutually exclusive.
  const startEdit = useCallback(async () => {
    hideEditor();
    await edit.open();
  }, [edit, hideEditor]);

  const startMasking = useCallback(async () => {
    closeEdit();
    await editor.show();
  }, [closeEdit, editor]);

  const saveEdit = useCallback(
    async (text: string) => {
      if (text !== edit.text) {
        await actions.updateText(item.id, text);
        hideReveal();
      }
      closeEdit();
    },
    [actions, closeEdit, edit.text, hideReveal, item.id],
  );

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

  return {
    copied,
    copyEntry,
    copySecret,
    reveal,
    editor,
    edit,
    startEdit,
    startMasking,
    saveEdit,
    markNotSecret,
    maskSelection,
  };
}
