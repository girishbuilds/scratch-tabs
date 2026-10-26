import { create } from "zustand";
import type { CanvasSendSource } from "../features/canvas/utils/canvasSendSource";

interface CanvasSendState {
  source: CanvasSendSource | null;
  side: "left" | "right";
  open: (source: CanvasSendSource, side: "left" | "right") => void;
  close: () => void;
}

/**
 * Holds the pending "send to canvas" request so that any surface (tab menu,
 * editor context menu, image smart view) can open the shared dialog.
 */
export const useCanvasSendStore = create<CanvasSendState>((set) => ({
  source: null,
  side: "left",

  open: (source, side) => set({ source, side }),

  close: () => set({ source: null }),
}));
