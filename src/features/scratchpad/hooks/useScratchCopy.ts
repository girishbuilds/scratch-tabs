import { useCallback } from "react";
import { clipboardGuard } from "../services/defaultClipboardGuard";
import {
  CLIPBOARD_CLEAR_MS,
  useScratchSettingsStore,
} from "../stores/scratchSettingsStore";
import { copyToClipboard } from "../utils/copyToClipboard";

/**
 * Copy to the clipboard. Copying something sensitive schedules a clipboard
 * clear (if enabled); copying anything else cancels a pending clear so a
 * harmless copy is not wiped.
 */
export function useScratchCopy() {
  const autoClear = useScratchSettingsStore((s) => s.clipboardAutoClear);

  return useCallback(
    async (text: string, options: { sensitive: boolean }): Promise<boolean> => {
      if (!(await copyToClipboard(text))) return false;
      if (options.sensitive && autoClear) clipboardGuard.protect(CLIPBOARD_CLEAR_MS);
      else clipboardGuard.cancel();
      return true;
    },
    [autoClear],
  );
}
