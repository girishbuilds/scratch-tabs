import { useEffect, useState } from "react";

const STATUS_BAR_SELECTOR = '[data-testid="status-bar"]';

/** Distance in px from the window bottom up to the top of the highest status bar, or 0 if none. */
function measureStatusBarHeight(): number {
  const bars = document.querySelectorAll(STATUS_BAR_SELECTOR);
  if (bars.length === 0) return 0;
  const top = Math.min(...Array.from(bars, (bar) => bar.getBoundingClientRect().top));
  return Math.max(0, Math.round(window.innerHeight - top));
}

/**
 * How much room the drawer must leave at the bottom so it sits above the editor's status bar.
 * The bar only exists while an editor tab is showing (split view has one per pane) and the
 * window can resize, so it is measured while the drawer is open rather than hard-coded.
 */
export function useStatusBarClearance(active: boolean): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setHeight(measureStatusBarHeight()));
    };
    setHeight(measureStatusBarHeight());
    window.addEventListener("resize", update);
    // The bar appears and disappears as tabs switch between editors, tablets and the welcome screen.
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [active]);

  return height;
}
