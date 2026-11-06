import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * A simplified YAML language detector that focuses on the most distinctive
 * structural characteristics of the language to avoid aggressively misclassifying
 * other file types like Markdown.
 */
export class YamlFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "yaml";
  name = "YAML";
  extensions = ["yaml", "yml"];
  priority = 5; // Standard priority

  sampleContent(): string {
    return `# Project Configuration
name: my-awesome-project
version: 1.0.0

# Development settings
development:
  port: 3000
  database:
    host: localhost
    port: 5432
    name: dev_db
    credentials:
      username: admin
      password: secret

# List of enabled features
features:
  - dark-mode
  - beta-access
  - analytics

# Deployment configuration
deployment:
  provider: aws
  regions:
    - us-east-1
    - eu-west-1
`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return this.noMatch();
    }

    const lines = content.split("\n");
    // Analyze a sample of up to 50 lines for performance
    const sampleLines = lines.slice(0, 50);

    // A Kubernetes-style manifest (top-level apiVersion + kind) is YAML even
    // when its body also looks like flat key/value config (e.g. a ConfigMap
    // with dotted keys).
    if (this.looksLikeKubernetesManifest(sampleLines)) {
      return { match: true, confidence: 1.0, matchedDefinitive: true };
    }

    let keyValueLines = 0;
    let listLines = 0;
    let indentedLines = 0;
    let totalStructuralLines = 0;
    let totalLineLength = 0;
    let nonCommentLines = 0;

    // Regex to specifically find key: value pairs with a space after the colon.
    // This is a strong YAML signal and helps avoid matching prose like "Note: this is a test."
    // Also excludes CSS-like patterns that end with semicolons
    const keyValueRegex = /^\s*[\w.-]+:\s+(?!.*;)[^:]+$/;

    // Regex for list items, specifically using a hyphen.
    // Excludes Markdown task lists like "- [x]" or "- [ ]"
    const listItemRegex = /^\s*-\s+(?!\[[ xX]\]).+/;

    for (const line of sampleLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue; // Skip empty lines and comments
      }

      nonCommentLines++;
      totalLineLength += trimmedLine.length;

      // 1. Check for Key-Value Pairs
      if (keyValueRegex.test(line)) {
        keyValueLines++;
        totalStructuralLines++;
      }
      // 2. Check for List Items
      else if (listItemRegex.test(line)) {
        listLines++;
        totalStructuralLines++;
      }

      // 3. Check for Indentation
      if (line.startsWith("  ")) {
        // Check for 2 or more spaces of indentation
        indentedLines++;
      }
    }

    if (nonCommentLines < 2) {
      // Not enough content to make a reliable determination
      return this.noMatch();
    }

    let confidence = 0.0;

    // --- Core Confidence Metric ---
    // The most important factor is the ratio of lines that look like YAML structures.
    const structuralRatio = totalStructuralLines / nonCommentLines;

    if (structuralRatio > 0.75) {
      confidence = 0.8; // Very high confidence if most lines are structural
    } else if (structuralRatio > 0.5) {
      confidence = 0.6; // High confidence
    } else if (structuralRatio > 0.25) {
      confidence = 0.3; // Medium confidence
    }

    // --- Bonus Heuristics ---

    // Bonus for indentation: If a good portion of the file is indented,
    // it strongly suggests a structured format like YAML.
    const indentationRatio = indentedLines / nonCommentLines;
    if (indentationRatio > 0.3) {
      confidence += 0.2;
    }

    // Bonus for "line simplicity": YAML files tend to have short lines.
    const averageLineLength = totalLineLength / nonCommentLines;
    if (averageLineLength < 60) {
      confidence += 0.1;
    }

    // Bonus for document separator `---` which is highly indicative of YAML.
    if (sampleLines[0].trim() === "---") {
      confidence += 0.3;
    }

    // --- Penalties for non-YAML patterns ---
    
    // Penalty for CSS-like patterns (lines ending with semicolons)
    const cssLikeLines = sampleLines.filter(line => 
      line.trim().match(/^\s*[\w-]+\s*:\s*[^;]+;\s*$/)
    ).length;
    if (cssLikeLines > nonCommentLines * 0.3) {
      confidence -= 0.4; // Significant penalty for CSS-like content
    }

    // Penalty for Markdown-like patterns
    const markdownHeaders = sampleLines.filter(line => 
      line.trim().match(/^#{1,6}\s+/)
    ).length;
    if (markdownHeaders > 0) {
      confidence -= 0.3; // Penalty for Markdown headers
    }

    // Final clamping to ensure confidence is between 0 and 1.
    const finalConfidence = Math.min(1.0, Math.max(0.0, confidence));

    // --- Final Decision ---
    // Match if confidence is reasonably high. This threshold prevents matching
    // files with only one or two coincidentally-formatted lines.
    const isMatch = finalConfidence >= 0.5;

    return {
      match: isMatch,
      confidence: isMatch ? finalConfidence : 0.0,
    };
  }

  private looksLikeKubernetesManifest(lines: string[]): boolean {
    let hasApiVersion = false;
    let hasKind = false;
    for (const line of lines) {
      if (/^apiVersion:\s*\S+/.test(line)) hasApiVersion = true;
      else if (/^kind:\s*\S+/.test(line)) hasKind = true;
      if (hasApiVersion && hasKind) return true;
    }
    return false;
  }

  registerProvider(monaco: any): void {
    // Monaco has built-in YAML support, so a custom provider is not typically needed.
    // This method can be left empty.
  }
}

// Create and register the detector
const yamlDetector = new YamlFormatDetector();
formatRegistry.register(yamlDetector);
