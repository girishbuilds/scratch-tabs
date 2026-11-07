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

/** Gap between the floating drawer and the window's right edge, in px (Tailwind `right-2`). */
export const DRAWER_EDGE_MARGIN = 8;

/**
 * The drawer floats DRAWER_EDGE_MARGIN px in from the right edge, so its width is the
 * distance from the pointer to that inset edge. Measuring to the window edge instead
 * would make the drawer jump by the margin when a drag starts.
 */
export const widthFromPointer = (pointerX: number, viewportWidth: number): number =>
  viewportWidth - DRAWER_EDGE_MARGIN - pointerX;
