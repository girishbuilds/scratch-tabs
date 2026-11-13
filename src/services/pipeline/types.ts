/**
 * Pipeline Types
 *
 * Core type definitions for the pipeline system.
 * These types support the self-registration pattern where formats and tablets
 * register their operations to a central registry.
 */

/**
 * Parameter definition for an operation
 */
export interface ParameterDefinition {
  /** Parameter key used in params object */
  name: string;

  /** Display label in UI */
  label: string;

  /** Parameter type determines the input control */
  type: "string" | "number" | "boolean" | "select" | "multiselect" | "textarea";

  /** Default value */
  default?: string | number | boolean | string[];

  /** Options for select/multiselect types */
  options?: { value: string; label: string }[];

  /** Placeholder text for string/textarea inputs */
  placeholder?: string;

  /** Help text shown below the input */
  description?: string;

  /** Whether the parameter is required */
  required?: boolean;

  /** Minimum value for number type */
  min?: number;

  /** Maximum value for number type */
  max?: number;

  /**
   * Whether this parameter supports variable interpolation (${var} syntax)
   * Reserved for future implementation
   */
  supportsInterpolation?: boolean;
}

/**
 * Operation definition - the core unit of the pipeline system
 *
 * Operations are registered by formats, tablets, or core modules.
 * The pipeline engine only knows about operations through the registry.
 */
export interface OperationDefinition {
  /**
   * Unique identifier in format: 'source.name'
   * Examples: 'json.format', 'base64.encode', 'text.trim'
   */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** Description shown in UI */
  description: string;

  /**
   * Categories this operation belongs to.
   * Operations can belong to multiple categories.
   * Examples: ['JSON', 'Formatting'], ['Encoding', 'Base64']
   */
  categories: string[];

  /** Parameter definitions */
  parameters: ParameterDefinition[];

  /**
   * Execute the operation
   *
   * @param input - The input string to process
   * @param params - User-configured parameter values
   * @param context - Execution context with variables and metadata
   * @returns The transformed string (can be async for heavy operations)
   */
  execute: (
    input: string,
    params: Record<string, unknown>,
    context: ExecutionContext,
  ) => string | Promise<string>;

  /** Keywords for search */
  keywords?: string[];

  /** Lucide icon name */
  icon?: string;

  /** Source of the operation */
  source?: "core" | "format" | "tablet";

  /**
   * Processing mode for the operation.
   * - 'entire': Passes the full string input (default).
   * - 'line': Automatically splits input by \n and applies to each line.
   * - 'configurable': User can toggle between 'entire' and 'line' via UI.
   */
  processingMode?: "entire" | "line" | "configurable";

  /**
   * Set on whole-input operations that treat the input as a list of lines
   * (sort, dedupe, keep first N, ...). The executor hands them LF-only text
   * and converts the output back to the input's line ending (CRLF or CR), so
   * the operation can split on "\n" without leaving stray "\r" characters.
   * Leave unset for operations that treat the text as opaque (hashing,
   * encoding, ...), which must see the input byte for byte.
   */
  lineBased?: boolean;

  /**
   * Opt in to a "did not change the input" warning when the output equals the
   * input. Leave unset for operations where a no-op is a normal result
   * (trim, sort, find/replace with no matches, ...).
   */
  warnIfUnchanged?: boolean;
}

/**
 * Execution context passed to every operation
 *
 * Provides access to:
 * - Current execution state (step index, totals)
 * - Variable system for storing/retrieving named values
 * - Built-in variables (_input, _previousOutput, etc.)
 */
export interface ExecutionContext {
  /** Current step index (0-based) */
  stepIndex: number;

  /** Total number of steps in the pipeline */
  totalSteps: number;

  /** Named variables map */
  variables: Map<string, string>;

  /** Get a variable value by name */
  getVariable: (name: string) => string | undefined;

  /** Set a variable value */
  setVariable: (name: string, value: string) => void;

  /** Original pipeline input (always available as _input) */
  _input: string;

  /** Output from the previous step */
  _previousOutput: string;

  /** Current step index (alias for stepIndex) */
  _stepIndex: number;

  /** Current line index (0-based) when in 'line' processing mode */
  lineIndex?: number;

  /** Total number of lines when in 'line' processing mode */
  totalLines?: number;

  /**
   * Report a non-fatal problem. The step still succeeds, but the UI shows it
   * as a warning (e.g. "input is not a JSON string").
   */
  warn?: (message: string) => void;
}

/**
 * A step in a pipeline - user-configured instance of an operation
 */
export interface PipelineStep {
  /** Unique ID for this step instance */
  id: string;

  /** References OperationDefinition.id */
  operationId: string;

  /** User-configured parameter values */
  params: Record<string, unknown>;

  /** Whether this step is enabled */
  enabled: boolean;

  /**
   * Variable name to assign the output to
   * Reserved for future variable interpolation implementation
   */
  assignTo?: string;

  /**
   * Whether to apply the operation per-line.
   * Only applicable if operation.processingMode is 'configurable'.
   */
  applyPerLine?: boolean;
}

/**
 * Pipeline definition
 */
export interface Pipeline {
  /** Unique ID */
  id: string;

  /** Optional name (null = unsaved/temporary) */
  name: string | null;

  /** Optional description */
  description?: string;

  /** Ordered list of steps */
  steps: PipelineStep[];
}

/**
 * Result of executing a single step
 */
export interface StepResult {
  /** Step ID */
  stepId: string;

  /** Operation ID that was executed */
  operationId: string;

  /** Input to this step */
  input: string;

  /** Output from this step */
  output: string;

  /** Execution duration in milliseconds */
  duration: number;

  /** Whether the step was skipped (disabled) */
  skipped: boolean;

  /** Error message if execution failed */
  error?: string;

  /** Non-fatal warning: the step ran but probably did not do what was intended */
  warning?: string;
}

/**
 * Result of executing a pipeline
 */
export interface PipelineResult {
  /** Whether the pipeline executed successfully */
  success: boolean;

  /** Final output string */
  output: string;

  /** Error message if pipeline failed */
  error?: string;

  /** Results for each step */
  stepResults: StepResult[];

  /** Total execution duration in milliseconds */
  totalDuration: number;

  /** Final variable state (for debugging/inspection) */
  variables: Record<string, string>;
}

/**
 * Category for organizing operations in the UI
 */
export interface OperationCategory {
  /** Category ID (used as key) */
  id: string;

  /** Display name */
  name: string;

  /** Lucide icon name */
  icon?: string;

  /** Display order (lower = first) */
  order: number;
}

/**
 * Saved pipeline stored in IndexedDB
 */
export interface SavedPipeline {
  /** Unique ID */
  id: string;

  /** Optional name (null = unnamed) */
  name: string | null;

  /** Optional description */
  description?: string;

  /** JSON serialized PipelineStep[] */
  steps: string;

  /** Creation timestamp */
  createdAt: number;

  /** Last modification timestamp */
  lastModified: number;

  /** Last used timestamp (for sorting) */
  lastUsedAt: number;

  /** Whether pinned to top */
  isFavorite: boolean;
}

/**
 * Pipeline settings stored in IndexedDB
 */
export interface PipelineSettingRecord {
  /** Setting key */
  key: string;

  /** JSON value */
  value: string;
}

/**
 * Options for pipeline execution
 */
export interface PipelineExecutionOptions {
  /** Maximum execution time per step in milliseconds (default: 5000) */
  stepTimeout?: number;

  /** Maximum total execution time in milliseconds (default: 30000) */
  totalTimeout?: number;

  /** Maximum number of steps allowed (default: 50) */
  maxSteps?: number;

  /** Maximum input size in bytes (default: 10MB) */
  maxInputSize?: number;

  /** Callback for step progress */
  onStepComplete?: (stepResult: StepResult, stepIndex: number) => void;
}
