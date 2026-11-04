import { loader } from "@monaco-editor/react";
import { formatRegistry } from "./registry";
import { FormatModule } from "./types";

// Import all format modules explicitly
import "./accesslog";
import "./bash";
import "./cpp";
import "./csharp";
import "./css";
import "./csv/index";
import "./curl";
import "./curl/index";
import "./diff";
import "./dockerfile";
import "./go";
import "./graphql";
import "./groovy";
import "./hcl";
import "./html/index";
import "./image";
import "./ini/index";
import "./java";
import "./javascript";
import "./jwt";
import "./json/index";
import "./kotlin";
import "./markdown/index";
import "./php";
import "./properties/index";
import "./python";
import "./r";
import "./ruby";
import "./rust";
import "./scala";
import "./sql";
import "./stacktrace";
import "./stacktrace/index";
import "./diff/index";
import "./svg";
import "./toml";
import "./toml/index";
import "./vhost";
import "./xml";
import "./yaml";
import "./yaml/index";
import "./ndjson/index";
import "./har";
import "./har/index";
import "./dotenv";
import "./dotenv/index";
import "./pem";
import "./pem/index";
import "./openapi/index";

// Export the registry for use in the application
export { formatRegistry };

/**
 * Configuration for format detection performance optimization
 */
const FORMAT_DETECTION_CONFIG = {
  /**
   * Maximum number of lines to sample for format detection
   * Increase for better accuracy with files that have important content later
   * Decrease for better performance with very large files
   */
  MAX_SAMPLE_LINES: 100,

  /**
   * Minimum file size (in characters) before sampling is applied
   * Files smaller than this will be processed entirely
   */
  MIN_SIZE_FOR_SAMPLING: 5000,
} as const;

export const registerAllFormatProviders = (monaco: any) => {
  formatRegistry.getAll().forEach((module: FormatModule) => {
    try {
      // Ensure registerProvider exists before calling
      if (typeof module.registerProvider === "function") {
        module.registerProvider(monaco);
      } else {
        console.warn(
          `Module "${module.id}" is missing registerProvider method.`,
        );
      }
    } catch (error) {
      console.error(
        `Error registering provider for format "${module.id}":`,
        error,
      );
    }
  });
};

/**
 * Initialize all format providers with Monaco
 */
export const initializeFormatProviders = () => {
  // Ensure Monaco loader promise is handled correctly
  loader
    .init()
    .then((monaco) => {
      registerAllFormatProviders(monaco);
    })
    .catch((error) => {
      console.error("Monaco Loader failed to initialize:", error);
    });
};

/**
 * Detect the format of content
 * Content is automatically sampled to first 100 lines for performance optimization
 */
export const detectFormat = (content: string): string => {
  // Use the exact same logic as status bar for consistency
  const potentialMatches = getPotentialFormatMatches(content, 1);

  const detectedFormat = potentialMatches.length > 0
    ? potentialMatches[0].id
    : "plaintext";

  return detectedFormat;
};

/**
 * Check if the content matches patterns that could be ambiguous between formats
 * Content is automatically sampled to first 100 lines for performance optimization
 */
export const isAmbiguousFormat = (content: string): boolean =>
  formatRegistry.isAmbiguous(prepareForDetection(content));

/**
 * Prepare content for detection.
 *
 * Masking runs before sampling on purpose: a format's quoted regions should not
 * consume the line budget that the first N lines of actual content need.
 */
const prepareForDetection = (content: string): string =>
  sampleContentForDetection(formatRegistry.applyContentMasks(content));

/**
 * Sample content to first N lines for performance optimization
 * @param content The full content to sample
 * @returns Sampled content with first N lines (or full content if small)
 */
export const sampleContentForDetection = (content: string): string => {
  if (!content) return content;

  // Skip sampling for small files
  if (content.length < FORMAT_DETECTION_CONFIG.MIN_SIZE_FOR_SAMPLING) {
    return content;
  }

  const lines = content.split("\n");
  if (lines.length <= FORMAT_DETECTION_CONFIG.MAX_SAMPLE_LINES) {
    return content; // No need to sample if content is already small
  }

  // Take first N lines and preserve line endings
  return lines.slice(0, FORMAT_DETECTION_CONFIG.MAX_SAMPLE_LINES).join("\n");
};

/**
 * Get potential format matches for the given content
 * Returns an array of format objects with their confidence scores
 * Always includes plaintext as a fallback if no other formats match
 *
 * Content is automatically sampled to first 100 lines for performance optimization
 */
export const getPotentialFormatMatches = (
  content: string,
  limit: number = 5,
): Array<{
  id: string;
  name: string;
  score: number;
}> => {
  const matches = formatRegistry.getPotentialMatches(
    prepareForDetection(content),
    limit,
  );

  // Ensure we always have at least plaintext in the results
  if (matches.length === 0) {
    const plaintext = formatRegistry.getById("plaintext");
    if (plaintext) {
      return [
        {
          id: "plaintext",
          name: plaintext.name,
          score: 1.0,
        },
      ];
    }
  }

  return matches;
};

/**
 * Alias for getPotentialFormatMatches to maintain backward compatibility
 * @deprecated Use getPotentialFormatMatches instead
 */
export const getPotentialLanguageMatches = getPotentialFormatMatches;
