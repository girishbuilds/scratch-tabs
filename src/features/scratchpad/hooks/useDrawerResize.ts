import { useCallback, useState } from "react";
import type React from "react";
import {
  DEFAULT_DRAWER_WIDTH,
  clampDrawerWidth,
  widthFromPointer,
} from "../services/drawerWidth";

const KEY_STEP = 16;
const KEY_STEP_LARGE = 48;

/**
 * Drag (or arrow-key) resizing of a right-anchored drawer. While dragging the
 * width is local state, and it is committed once on release, so storage is
 * written once per resize instead of on every pointer move.
 */
export function useDrawerResize(width: number, commit: (width: number) => void) {
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragWidth(clampDrawerWidth(widthFromPointer(e.clientX, window.innerWidth), window.innerWidth));
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (dragWidth === null) return;
      setDragWidth(clampDrawerWidth(widthFromPointer(e.clientX, window.innerWidth), window.innerWidth));
    },
    [dragWidth],
  );

  const endDrag = useCallback(() => {
    if (dragWidth !== null) commit(dragWidth);
    setDragWidth(null);
  }, [dragWidth, commit]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
      const next =
        e.key === "ArrowLeft" ? width + step : e.key === "ArrowRight" ? width - step : null;
      if (next === null) return;
      e.preventDefault();
      commit(next);
    },
    [width, commit],
  );

  const reset = useCallback(() => commit(DEFAULT_DRAWER_WIDTH), [commit]);

  return {
    width: dragWidth ?? width,
    isDragging: dragWidth !== null,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onKeyDown,
      onDoubleClick: reset,
    },
  };
}
