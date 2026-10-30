import React from "react";
import { Kbd } from "./Kbd";
import { getPasteShortcutLabel } from "./utils/welcomeUtils";

/**
 * PasteDropHint
 *
 * Tells first-run desktop users the fastest path: paste or drop content anywhere.
 */
export const PasteDropHint: React.FC = () => (
  <p
    data-testid="paste-drop-hint"
    className="hidden md:block w-full max-w-4xl mb-8 text-center text-sm text-secondary"
  >
    <Kbd>{getPasteShortcutLabel()}</Kbd> to paste, or drop a file anywhere to start
  </p>
);
