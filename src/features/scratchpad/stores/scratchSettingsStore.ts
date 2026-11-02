import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_DRAWER_WIDTH, clampDrawerWidth } from "../services/drawerWidth";

/** How long a copied secret stays on the clipboard before it is cleared. */
export const CLIPBOARD_CLEAR_MS = 30_000;

export interface ScratchSettingsState {
  /** Clear the clipboard shortly after copying something that contains a secret. */
  clipboardAutoClear: boolean;
  setClipboardAutoClear: (enabled: boolean) => void;
  /** Drawer width in px, as last chosen by dragging its edge. */
  drawerWidth: number;
  setDrawerWidth: (width: number) => void;
}

/** User preferences only; nothing here is content or a secret. */
export const useScratchSettingsStore = create<ScratchSettingsState>()(
  persist(
    (set) => ({
      clipboardAutoClear: true,
      setClipboardAutoClear: (enabled) => set({ clipboardAutoClear: enabled }),
      drawerWidth: DEFAULT_DRAWER_WIDTH,
      setDrawerWidth: (width) =>
        set({ drawerWidth: clampDrawerWidth(width, window.innerWidth) }),
    }),
    {
      name: "scratch-tabs-scratch-drawer-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
