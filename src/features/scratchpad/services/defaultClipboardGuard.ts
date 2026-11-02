import { clearClipboard } from "../utils/copyToClipboard";
import { createClipboardGuard } from "./clipboardGuard";

/** App-wide guard: one pending clipboard clear for the whole drawer. */
export const clipboardGuard = createClipboardGuard(() => clearClipboard());
