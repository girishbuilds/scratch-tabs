import {
  ContentProcessor,
  ContentProcessingResult,
  ContentProcessingContext
} from '../types';

/**
 * Content processor for CSV/TSV content that handles:
 * - Converting literal \t strings to actual tab characters
 * - Cleaning escaped newlines and other literal escape sequences
 */
export class CsvContentProcessor implements ContentProcessor {
  id = 'csv-processor';
  name = 'CSV Content Processor';
  supportedLanguages = ['csv', 'plaintext'];
  priority = 90; // High priority, but lower than JSON

  /**
   * Check if this processor can handle the content
   */
  canProcess(content: string, context: ContentProcessingContext): boolean {
    // Never rewrite escapes in structured languages (e.g. YAML/JSON strings legitimately contain \t)
    if (!this.supportedLanguages.includes(context.currentLanguage)) {
      return false;
    }

    // Windows paths such as C:\temp\tools contain \t but are not escaped tabs
    if (this.looksLikeWindowsPaths(content)) {
      return false;
    }

    // Only process if:
    // 1. Content is from paste or likely from clipboard
    // 2. Content has literal \t sequences (likely TSV from another app)
    const isFromPasteOrClipboard = context.isFromPaste || (context.flags?.isLikelyFromClipboard === true);
    const hasLiteralTabs = content.includes('\\t');

    // Additional check: looks like CSV/TSV structure
    const looksLikeCsv = this.looksLikeCsvOrTsv(content);

    return isFromPasteOrClipboard && hasLiteralTabs && looksLikeCsv;
  }

  /**
   * Process CSV content
   */
  process(content: string, context: ContentProcessingContext): ContentProcessingResult {
    const startTime = Date.now();
    const originalLength = content.length;

    try {
      const processed = this.processCsvContent(content);

      if (processed !== content) {
        return {
          processed: true,
          content: processed,
          language: 'csv', // Update language to CSV since we detected TSV
          lockLanguage: false, // Let normal detection handle it
          metadata: {
            type: 'csv-unescape',
            originalLength,
            processedLength: processed.length,
            processingTime: Date.now() - startTime
          }
        };
      }
    } catch (error) {
      console.warn('[CsvContentProcessor] Processing failed:', error);
    }

    return {
      processed: false,
      content,
      language: context.currentLanguage
    };
  }

  /**
   * Detect Windows drive or UNC paths, where `\t` is a directory separator + "t", not a tab
   */
  private looksLikeWindowsPaths(content: string): boolean {
    return /(^|[\s"'=,;(])[A-Za-z]:\\|(^|[\s"'=,;(])\\\\[\w.$-]+\\/m.test(content);
  }

  /**
   * Check if content looks like CSV or TSV
   */
  private looksLikeCsvOrTsv(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    // Must have at least 2 lines (header + data)
    if (lines.length < 2) {
      return false;
    }

    // Check if first line has literal \t (escaped tabs)
    const firstLine = lines[0];
    if (!firstLine.includes('\\t')) {
      return false;
    }

    // Count occurrences of \t in first line
    const tabCount = (firstLine.match(/\\t/g) || []).length;

    // Must have at least 1 delimiter (2 columns)
    if (tabCount < 1) {
      return false;
    }

    // Check if subsequent lines have similar \t count (consistency)
    let consistentCount = 0;
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const lineTabCount = (lines[i].match(/\\t/g) || []).length;
      if (lineTabCount === tabCount) {
        consistentCount++;
      }
    }

    // At least 50% of lines should have consistent delimiter count
    const checkableLines = Math.min(lines.length - 1, 9);
    return consistentCount >= checkableLines * 0.5;
  }

  /**
   * Process CSV content - replace literal escape sequences
   */
  private processCsvContent(content: string): string {
    // Replace literal \t with actual tab characters
    let processed = content.replace(/\\t/g, '\t');

    // Also handle other common literal escape sequences that might appear
    // (but be careful not to break actual data)
    // Only do this if the content looks machine-generated (all lines have escapes)
    const lines = processed.split('\n');
    const hasEscapesInAllLines = lines.every(line =>
      line.trim() === '' || line.includes('\t')
    );

    if (hasEscapesInAllLines) {
      // These are less common but might appear in exports
      processed = processed.replace(/\\n/g, '\n');
      processed = processed.replace(/\\r/g, '\r');
    }

    return processed;
  }
}
