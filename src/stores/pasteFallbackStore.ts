import { create } from "zustand";

interface PasteFallbackState {
  /** Set when reading the clipboard failed; the dialog offers a manual paste box. */
  request: { isRightSide: boolean; reason: string } | null;
  showPasteFallback: (isRightSide: boolean, reason?: string) => void;
  dismissPasteFallback: () => void;
}

export const usePasteFallbackStore = create<PasteFallbackState>((set) => ({
  request: null,
  showPasteFallback: (isRightSide, reason = "Clipboard access was blocked") =>
    set({ request: { isRightSide, reason } }),
  dismissPasteFallback: () => set({ request: null }),
}));
