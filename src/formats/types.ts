import React from "react";
import { StatusItemProps } from "../components/StatusBar/types";
import * as monaco from "monaco-editor";
import { SmartView } from "../views/registry";

export interface StatusBarItem {
  id: string; // Unique key for rendering
  component: React.FC<StatusItemProps>;
  priority: number; // For ordering, lower numbers appear first
}

export interface DetectionResult {
  match: boolean;
  confidence: number; // A value between 0.0 (no confidence) and 1.0 (high confidence)
  matchedDefinitive?: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface EditorActionContext {
  editor: monaco.editor.IStandaloneCodeEditor;
  content: string;
  language: string;
  tabId: string;
}

/**
 * Interface for format module implementations
 */
export interface FormatModule {
  /**
   * The format ID (e.g., 'json', 'yaml', 'markdown')
   */
  id: string;

  /**
   * Display name for the format
   */
  name: string;

  /**
   * File extensions associated with this format (without the dot)
   */
  extensions: string[];

  /**
   * Priority for ambiguity resolution (higher wins in ambiguous cases)
   */
  priority: number;

  /**
   * Check if the content matches this format
   */
  detect(content: string): DetectionResult;

  /**
   * Register format provider with Monaco editor
   */
  registerProvider: (monaco: any) => void;

  /**
   * Get sample content for this format
   */
  sampleContent: () => string;

  /**
   * Get file extension for this format
   */
  getFileExtension: () => string;

  // --- NEW: Generic Mechanisms ---
  /**
   * Get context menu actions for this format (optional)
   */
  getContextMenuActions?(context: EditorActionContext): MenuItem[];

  /**
   * Get extended views for this format (optional)
   */
  getSmartViews?(): SmartView[];

  /**
   * Get an array of components to render in the status bar for this format.
   * This replaces getStatusItem and is the new way to add UI.
   */
  getStatusBarItems?(): StatusBarItem[];

  /**
   * Get share strategy for this format (optional)
   * Allows formats to provide custom trimming UI and logic for sharing
   */
  shareStrategy?: ShareStrategy;

  /** Optional structured merge behavior owned by this format. */
  mergeStrategy?: MergeStrategy;

  // --- LEGACY: For backward compatibility (Phase 1) ---
  /**
   * Get status item component for this format (optional) - LEGACY
   */
  getStatusItem?: () => React.FC<StatusItemProps>;

  /**
   * Get options menu component for this format (optional) - LEGACY
   */
  getOptionsMenu?: () => React.FC<{
    editor: monaco.editor.IStandaloneCodeEditor;
  }>;
}

/**
 * Props for trim UI components
 */
export interface TrimUIProps {
  content: string;
  onSelectionChange: (selection: any) => void;
  maxSize: number;
  currentSize: number;
}

/**
 * Share strategy for format-specific content sharing
 * Allows formats to provide custom trimming UI and logic
 */
export interface ShareStrategy {
  /**
   * Does this format support custom trimming UI?
   */
  supportsCustomTrim: boolean;

  /**
   * Check if the specific content can be handled by this strategy
   * @param content The content to check
   * @returns true if the strategy can handle this content, false to fallback to default
   */
  canTrim?: (content: string) => boolean;

  /**
   * Dynamically import the trim UI component (code-splitting)
   * Returns a promise that resolves to the component
   */
  getTrimUI?: () => Promise<{ default: React.ComponentType<TrimUIProps> }>;

  /**
   * Encode user's trim selection into URL metadata string
   * @param selection The user's selection object
   * @returns URL-safe metadata string (e.g., "r500-800" or "kmeta,users")
   */
  encodeMetadata: (selection: any) => string;

  /**
   * Decode URL metadata string back into selection object
   * @param metadata The metadata string from the URL
   * @returns The decoded selection object, or null if metadata is "full"
   */
  decodeMetadata: (metadata: string) => any;

  /**
   * Apply the trim to content based on decoded metadata
   * @param content The full content to trim
   * @param selection The decoded selection object
   * @returns The trimmed content
   */
  applyTrim: (content: string, selection: any) => string;

  /**
   * Validate that trimmed content is still valid for this format
   * @param content The trimmed content to validate
   * @returns true if valid, false otherwise
   */
  validateTrimmedContent?: (content: string) => boolean;
}

/** A source captured in the user's chosen merge order. */
export interface MergeInput {
  id: string;
  title: string;
  content: string;
  language: string;
}

export type MergeOptions = Readonly<Record<string, unknown>>;

export interface MergeOptionsUIProps {
  inputs: ReadonlyArray<Readonly<MergeInput>>;
  options: MergeOptions;
  onOptionsChange: (options: MergeOptions) => void;
}

export type MergeEligibility =
  | { canMerge: true }
  | { canMerge: false; reason: string };

export interface MergeSuccess {
  ok: true;
  content: string;
  language: string;
  warnings: string[];
  /** Paths where values conflicted, when a format has conflict semantics. */
  conflicts?: string[];
  /** Format-specific counts for a bounded preview. */
  counts?: Record<string, number>;
}

export interface MergeValidationError {
  ok: false;
  error: {
    code: string;
    message: string;
    paths?: string[];
  };
}

export type MergeResult = MergeSuccess | MergeValidationError;

/** Format-owned structured merge. The caller supplies fresh, ordered snapshots. */
export interface MergeStrategy {
  canMerge(inputs: ReadonlyArray<Readonly<MergeInput>>): MergeEligibility;
  getOptionsUI?: () => Promise<{
    default: React.ComponentType<MergeOptionsUIProps>;
  }>;
  merge(
    inputs: ReadonlyArray<Readonly<MergeInput>>,
    options: MergeOptions,
  ): MergeResult;
}

/**
 * Interface for format registry
 */
/**
 * Rewrites content so that regions one format merely *quotes* stop voting in
 * detection. A Markdown fence says "here is some SQL", not "this document is
 * SQL", but every detector sees the same raw text and scores on it regardless.
 *
 * The format that owns the quoting syntax supplies the mask, so the registry
 * never has to know which formats have such regions or what they look like.
 */
export type ContentMask = (content: string) => string;

export interface FormatRegistry {
  /**
   * Register a format module
   */
  register: (module: FormatModule) => void;

  /**
   * Register a content mask, applied before detection scores anything
   */
  registerContentMask: (mask: ContentMask) => void;

  /**
   * Run every registered content mask over `content`
   */
  applyContentMasks: (content: string) => string;

  /**
   * Get all registered format modules
   */
  getAll: () => FormatModule[];

  /**
   * Get a format module by ID
   */
  getById: (id: string) => FormatModule | undefined;

  /**
   * Detect the format of content
   */
  detectFormat: (content: string) => string;

  /**
   * Check if content is ambiguous (matches multiple formats)
   */
  isAmbiguous: (content: string) => boolean;

  /**
   * Get potential format matches for content
   */
  getPotentialMatches: (
    content: string,
    limit?: number,
  ) => Array<{
    id: string;
    name: string;
    score: number;
  }>;

  /**
   * Initialize all format providers with Monaco
   */
  initializeProviders: (monaco: any) => void;
}
