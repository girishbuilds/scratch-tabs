import { CsvContentProcessor } from '../CsvContentProcessor';
import { ContentProcessingContext } from '../../types';

describe('CsvContentProcessor', () => {
  let processor: CsvContentProcessor;
  let context: ContentProcessingContext;

  beforeEach(() => {
    processor = new CsvContentProcessor();
    context = {
      tabId: 'test-tab',
      currentLanguage: 'plaintext',
      languageLocked: false,
      isFromPaste: true,
      previousContent: '',
      flags: {
        isLikelyFromClipboard: true,
        isInitialContent: false
      }
    };
  });

  describe('canProcess', () => {
    it('should process TSV content with literal \\t from paste', () => {
      const content = 'name\\tage\\temail\nAlice\\t30\\talice@example.com\nBob\\t25\\tbob@example.com';
      expect(processor.canProcess(content, context)).toBe(true);
    });

    it('should not process content without literal \\t', () => {
      const content = 'name,age,email\nAlice,30,alice@example.com';
      expect(processor.canProcess(content, context)).toBe(false);
    });

    it('should not process non-paste content', () => {
      const content = 'name\\tage\\temail\nAlice\\t30\\talice@example.com';
      const nonPasteContext = { ...context, isFromPaste: false, flags: {} };
      expect(processor.canProcess(content, nonPasteContext)).toBe(false);
    });

    it('should not process Windows paths containing \\t (\\temp, \\tools)', () => {
      const content = 'C:\\temp\\tools\\bin\nD:\\temp\\tests\\bin';
      expect(processor.canProcess(content, context)).toBe(false);
    });

    it('should not process UNC paths', () => {
      const content = '\\\\server\\tmp\\tools\n\\\\server\\tmp\\tests';
      expect(processor.canProcess(content, context)).toBe(false);
    });

    it('should not process content in a structured language such as yaml', () => {
      const content = 'name\\tage\nAlice\\t30';
      expect(processor.canProcess(content, { ...context, currentLanguage: 'yaml' })).toBe(false);
    });

    it('should not process single-line content', () => {
      const content = 'name\\tage\\temail';
      expect(processor.canProcess(content, context)).toBe(false);
    });

    it('should not process content with highly inconsistent delimiters', () => {
      // Most lines must be inconsistent (< 50% match) to reject
      const content = 'name\\tage\\temail\nAlice\\t30\nBob,25,bob@example.com\nCarol,28,carol@example.com\nDave,32,dave@example.com';
      expect(processor.canProcess(content, context)).toBe(false);
    });
  });

  describe('process', () => {
    it('should replace literal \\t with actual tabs', () => {
      const content = 'name\\tage\\temail\nAlice\\t30\\talice@example.com\nBob\\t25\\tbob@example.com';
      const result = processor.process(content, context);

      expect(result.processed).toBe(true);
      expect(result.content).toBe('name\tage\temail\nAlice\t30\talice@example.com\nBob\t25\tbob@example.com');
      expect(result.language).toBe('csv');
      expect(result.metadata?.type).toBe('csv-unescape');
    });

    it('should handle complex TSV with multiple fields', () => {
      const content = 'details.email\\tdetails.name\\tid\\tlastLogin\\troles\\tstatus\nalice@example.com\\tAlice\\tuser-123\\t2025-11-12T14:30:00Z\\teditor\\tactive';
      const result = processor.process(content, context);

      expect(result.processed).toBe(true);
      expect(result.content).toContain('\t');
      expect(result.content).not.toContain('\\t');
    });

    it('should not modify content without literal \\t', () => {
      const content = 'name,age,email\nAlice,30,alice@example.com';
      const canProcess = processor.canProcess(content, context);

      expect(canProcess).toBe(false);
    });

    it('should handle empty lines', () => {
      const content = 'name\\tage\nAlice\\t30\n\nBob\\t25';
      const result = processor.process(content, context);

      expect(result.processed).toBe(true);
      expect(result.content).toContain('\t');
    });

    it('should include processing metadata', () => {
      const content = 'name\\tage\nAlice\\t30';
      const result = processor.process(content, context);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.type).toBe('csv-unescape');
      expect(result.metadata?.originalLength).toBe(content.length);
      expect(result.metadata?.processedLength).toBeLessThan(content.length);
      expect(result.metadata?.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle content with both \\t and actual tabs', () => {
      const content = 'name\\tage\temail\nAlice\\t30\talice@example.com';
      const result = processor.process(content, context);

      expect(result.processed).toBe(true);
      // All should be actual tabs now
      expect(result.content.split('\t').length).toBeGreaterThan(1);
    });

    it('should not process if content is not CSV-like', () => {
      const content = 'This is just plain text with \\t escape sequence';
      const canProcess = processor.canProcess(content, context);

      expect(canProcess).toBe(false);
    });
  });
});
