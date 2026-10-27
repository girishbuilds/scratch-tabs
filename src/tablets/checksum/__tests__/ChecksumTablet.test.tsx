import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChecksumTabletDefinition, { ChecksumTablet } from '../ChecksumTablet';
import { ChecksumState } from '../types';

// Mock the hashing utilities
jest.mock('../utils/hashing', () => ({
  hashText: jest.fn().mockResolvedValue({
    'SHA-256': 'ABCDEF123456789',
    'CRC32': '12345678'
  }),
  hashFile: jest.fn().mockResolvedValue({
    'SHA-256': 'FEDCBA987654321',
    'CRC32': '87654321'
  }),
  compareHashes: jest.fn().mockImplementation((a, b) => a.toLowerCase() === b.toLowerCase()),
  formatFileSize: jest.fn().mockImplementation((size) => `${size} bytes`),
  formatProcessingTime: jest.fn().mockImplementation((time) => `${time}ms`),
}));

// Mock the tablet action service
jest.mock('../../../services/tabletActionService', () => ({
  tabletActionService: {
    handleAction: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('ChecksumTablet', () => {
  const createMockState = (overrides: Partial<ChecksumState> = {}): ChecksumState => ({
    type: 'checksum',
    inputText: '',
    fileInfo: null,
    calculatedHashes: {} as any,
    expectedChecksum: '',
    comparisonResult: 'none',
    isProcessing: false,
    processingProgress: 0,
    processingAlgorithm: '',
    selectedAlgorithms: ['SHA-256', 'CRC32'],
    lastProcessedAt: 0,
    ...overrides,
  });

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the main interface', () => {
      const state = createMockState();
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Secure Checksum Calculator')).toBeInTheDocument();
      expect(screen.getByText('Calculate file and text hashes securely')).toBeInTheDocument();
      expect(screen.getByText('Hash Algorithms')).toBeInTheDocument();
      expect(screen.getByText('Text Input')).toBeInTheDocument();
    });

    it('should render all hash algorithm options', () => {
      const state = createMockState();
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('MD5')).toBeInTheDocument();
      expect(screen.getByText('SHA-1')).toBeInTheDocument();
      expect(screen.getByText('SHA-256')).toBeInTheDocument();
      expect(screen.getByText('SHA-384')).toBeInTheDocument();
      expect(screen.getByText('SHA-512')).toBeInTheDocument();
      expect(screen.getByText('CRC32')).toBeInTheDocument();
    });

    it('should show selected algorithms as active', () => {
      const state = createMockState({
        selectedAlgorithms: ['SHA-256', 'CRC32']
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const sha256Button = screen.getByText('SHA-256').closest('button');
      const crc32Button = screen.getByText('CRC32').closest('button');
      const md5Button = screen.getByText('MD5').closest('button');

      expect(sha256Button).toHaveClass('border-info');
      expect(crc32Button).toHaveClass('border-info');
      expect(md5Button).not.toHaveClass('border-info');
    });
  });

  describe('text input functionality', () => {
    it('should update state when text is entered', () => {
      const state = createMockState();
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const textArea = screen.getByPlaceholderText(/Type or paste text here/);
      fireEvent.change(textArea, { target: { value: 'test text' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          inputText: 'test text',
          fileInfo: null, // Should clear file info
        })
      );
    });

    it('should show character count for text input', () => {
      const state = createMockState({
        inputText: 'Hello World'
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('11 characters')).toBeInTheDocument();
    });
  });

  describe('algorithm selection', () => {
    it('should toggle algorithm selection', () => {
      const state = createMockState({
        selectedAlgorithms: ['SHA-256']
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const crc32Button = screen.getByText('CRC32').closest('button');
      fireEvent.click(crc32Button!);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedAlgorithms: ['SHA-256', 'CRC32'],
          calculatedHashes: {}, // Should clear previous results
        })
      );
    });

    it('should not allow deselecting all algorithms', () => {
      const state = createMockState({
        selectedAlgorithms: ['SHA-256'] // Only one selected
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      // Clear any onChange calls from effects during render
      mockOnChange.mockClear();

      const sha256Button = screen.getByText('SHA-256').closest('button');
      fireEvent.click(sha256Button!);

      // Should not call onChange since we can't deselect the last algorithm
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('expected checksum functionality', () => {
    it('should update expected checksum', () => {
      const state = createMockState();
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText(/Paste expected checksum/);
      fireEvent.change(input, { target: { value: 'ABCDEF123456' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedChecksum: 'ABCDEF123456',
        })
      );
    });

    it('should show clear button when expected checksum is entered', () => {
      const state = createMockState({
        expectedChecksum: 'ABCDEF123456'
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('processing state', () => {
    it('should show processing indicator when processing', () => {
      const state = createMockState({
        isProcessing: true,
        processingAlgorithm: 'SHA-256',
        processingProgress: 45,
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Processing SHA-256...')).toBeInTheDocument();
      expect(screen.getByText('45% complete')).toBeInTheDocument();
    });

    it('should show progress bar when processing with progress', () => {
      const state = createMockState({
        isProcessing: true,
        processingProgress: 75,
        processingAlgorithm: 'SHA-512',
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Processing SHA-512')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();

      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toHaveStyle('width: 75%');
    });

    it('should disable inputs when processing', () => {
      const state = createMockState({
        isProcessing: true,
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const textArea = screen.getByPlaceholderText(/Type or paste text here/);
      expect(textArea).toBeDisabled();

      // Algorithm buttons should be disabled
      const sha256Button = screen.getByText('SHA-256').closest('button');
      expect(sha256Button).toBeDisabled();
    });
  });

  describe('hash results display', () => {
    it('should display calculated hashes', () => {
      const state = createMockState({
        calculatedHashes: {
          'SHA-256': 'ABCDEF123456789',
          'CRC32': '12345678',
        } as any,
        selectedAlgorithms: ['SHA-256', 'CRC32'],
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Calculated Hashes')).toBeInTheDocument();
      expect(screen.getByText('ABCDEF123456789')).toBeInTheDocument();
      expect(screen.getByText('12345678')).toBeInTheDocument();
    });

    it('should show comparison results when expected checksum matches', () => {
      const state = createMockState({
        calculatedHashes: {
          'SHA-256': 'ABCDEF123456789',
        } as any,
        expectedChecksum: 'abcdef123456789', // Different case
        comparisonResult: 'match',
        selectedAlgorithms: ['SHA-256'],
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Verification Results')).toBeInTheDocument();
      expect(screen.getByText('Match')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      const state = createMockState();
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const textArea = screen.getByPlaceholderText('Type or paste text here to calculate hashes in real-time...');
      expect(textArea).toBeInTheDocument();

      const expectedChecksumInput = screen.getByPlaceholderText('Paste expected checksum here for comparison...');
      expect(expectedChecksumInput).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const state = createMockState();
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      const sha256Button = screen.getByText('SHA-256').closest('button');
      expect(sha256Button).toHaveAttribute('type', 'button');
    });
  });

  describe('error handling', () => {
    it('should handle text hashing errors gracefully', async () => {
      const hashText = require('../utils/hashing').hashText;
      hashText.mockRejectedValueOnce(new Error('Hashing failed'));

      const state = createMockState({
        inputText: 'test text'
      });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      // Wait for the debounced hashing to trigger
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isProcessing: false,
          })
        );
      }, { timeout: 1000 });
    });
  });

  describe('opening with seeded text', () => {
    it('creates the initial state from the text payload', () => {
      const state = ChecksumTabletDefinition.createInitialState({ text: 'from the editor' });

      expect(state.inputText).toBe('from the editor');
    });

    it('starts empty without a payload', () => {
      expect(ChecksumTabletDefinition.createInitialState().inputText).toBe('');
    });

    it('shows the seeded text in the input and counts its characters', () => {
      const state = ChecksumTabletDefinition.createInitialState({ text: 'from the editor' });
      render(<ChecksumTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText(/Type or paste text here/)).toHaveValue('from the editor');
      expect(screen.getByText('15 characters')).toBeInTheDocument();
    });

    it('keeps the seeded text through a serialize round trip', () => {
      const state = ChecksumTabletDefinition.createInitialState({ text: 'from the editor' });
      const restored = ChecksumTabletDefinition.deserializeState(ChecksumTabletDefinition.serializeState(state));

      expect(restored.inputText).toBe('from the editor');
    });
  });
});
