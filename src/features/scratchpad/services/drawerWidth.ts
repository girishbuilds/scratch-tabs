export const DEFAULT_DRAWER_WIDTH = 380;
export const MIN_DRAWER_WIDTH = 320;
export const MAX_DRAWER_WIDTH = 800;
/** The drawer never takes more than this share of the window. */
export const MAX_DRAWER_VIEWPORT_SHARE = 0.7;

/** Keeps a drawer width within the fixed limits and the current window size. */
export function clampDrawerWidth(width: number, viewportWidth: number): number {
  const max = Math.max(
    MIN_DRAWER_WIDTH,
    Math.min(MAX_DRAWER_WIDTH, Math.floor(viewportWidth * MAX_DRAWER_VIEWPORT_SHARE)),
  );
  return Math.round(Math.min(max, Math.max(MIN_DRAWER_WIDTH, width)));
}

/** The drawer is anchored to the right edge, so its width is the distance from the pointer to it. */
export const widthFromPointer = (pointerX: number, viewportWidth: number): number =>
  viewportWidth - pointerX;
