/**
 * Utility functions for WelcomeScreen
 * Following SRP - each function has a single responsibility
 */

import type { ToolItem } from "../../../services/toolService";

/**
 * Demo JSON content with instructions for Smart View
 * Displayed when user clicks "Try a Smart View" without JSON in clipboard
 */
export const DEMO_JSON_CONTENT = {
  "welcome": "Smart View Demo",
  "smartView": "Click the 'Data View' button in the Smart View popup to the right",
  "features": {
    "autoDetection": "Paste any JSON to see it transform automatically",
    "treeView": "Navigate nested objects with expand/collapse",
    "search": "Find keys and values instantly",
    "copyPath": "Hover over nodes to copy JSON paths"
  },
  "howToUse": [
    "1. Everything starts off as a raw editor, until content is pasted in",
    "2. Upon auto-detection, click the 'Data View' button to the right to transform the view",
    "3. Click arrows to expand/collapse objects",
    "4. Paste your own JSON (Ctrl+V) to try it yourself"
  ],
  "tabs": "All content opens in new tabs. Switch between tabs at the top to organize your work.",
  "devTools": "Click the extension icon (top right) to open developer tools (JWT, Regex, REST Client, etc.)",
  "workspaces": "Group related tabs into Workspaces using the sidebar for better organization.",
  "toggle": "Click the 3 dots at the bottom of the page to toggle back to raw editor",
  "nextSteps": "Try pasting your own JSON to see Smart View in action!"
};

/**
 * Dev tools surfaced as one-click chips on the welcome screen.
 * Each opens its tablet directly, skipping the tool selector.
 */
export const FEATURED_TOOLS: ToolItem[] = [
  { id: "jwt", type: "tablet", label: "JWT" },
  { id: "regex", type: "tablet", label: "Regex" },
  { id: "base64", type: "tablet", label: "Base64" },
  { id: "uuid", type: "tablet", label: "UUID" },
  { id: "restclient", type: "tablet", label: "REST" },
];

export interface WelcomeShortcut {
  keys: string[];
  label: string;
}

/**
 * Detects macOS so shortcut hints show the key people actually press
 */
export function isMacPlatform(): boolean {
  return typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Gets the platform-appropriate paste shortcut label
 *
 * @returns "⌘V" on macOS, "Ctrl+V" elsewhere
 */
export function getPasteShortcutLabel(): string {
  return isMacPlatform() ? "⌘V" : "Ctrl+V";
}

/**
 * Gets the keyboard shortcuts advertised on the welcome screen.
 * Paste is omitted because the paste/drop hint already covers it.
 */
export function getWelcomeShortcuts(): WelcomeShortcut[] {
  return [
    { keys: ["Double Click"], label: "to create tab" },
    { keys: ["/"], label: "for dev tools" },
    { keys: ["Ctrl+Shift+-", "Ctrl+Shift+="], label: "to navigate" },
  ];
}

/**
 * Checks if text appears to be JSON-like content
 * Simple heuristic: starts with { or [
 *
 * @param text - The text to check
 * @returns true if text looks like JSON
 */
export function isJSONLike(text: string | null | undefined): boolean {
  if (!text) return false;

  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/**
 * Gets formatted demo JSON string
 *
 * @returns Prettified JSON string with 2-space indentation
 */
export function getDemoJSON(): string {
  return JSON.stringify(DEMO_JSON_CONTENT, null, 2);
}

/**
 * Attempts to read text from clipboard
 * Returns null if clipboard API is unavailable or permission denied
 *
 * @returns Promise resolving to clipboard text or null
 */
export async function readClipboardText(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.readText) {
      return null;
    }

    const text = await navigator.clipboard.readText();
    return text || null;
  } catch (err) {
    // Permission denied or clipboard access failed
    console.debug("Clipboard read failed:", err);
    return null;
  }
}

/**
 * Gets content for JSON demo - either from clipboard or demo JSON
 * Smart detection: uses clipboard if it contains JSON, otherwise uses demo
 *
 * @returns Promise resolving to JSON content string
 */
export async function getJSONDemoContent(): Promise<string> {
  const clipboardText = await readClipboardText();

  if (isJSONLike(clipboardText)) {
    return clipboardText!;
  }

  return getDemoJSON();
}
