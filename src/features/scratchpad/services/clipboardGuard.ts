export interface ClipboardGuard {
  /** Clears the clipboard after `ms`, replacing any pending clear. */
  protect(ms: number): void;
  /** Drops a pending clear (e.g. the user has since copied something harmless). */
  cancel(): void;
}

/**
 * Schedules clearing the clipboard after a secret was copied. Only one clear
 * is ever pending. We cannot read the clipboard without a permission prompt,
 * so a clear may overwrite something copied elsewhere in the meantime; that is
 * why callers make this a user setting.
 */
export function createClipboardGuard(clearClipboard: () => Promise<boolean>): ClipboardGuard {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return {
    cancel,
    protect(ms) {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        void clearClipboard();
      }, ms);
    },
  };
}
