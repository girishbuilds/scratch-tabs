import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RichTextControls } from '../RichTextControls';
import { useRootStore } from '../../../stores/rootStore';
import { Tab } from '../../../types';

// Mock the store
jest.mock('../../../stores/rootStore', () => ({
  useRootStore: jest.fn(),
}));

// Mock the Icons
jest.mock('../../Icons', () => ({
  FileText: ({ size }: { size: number }) => <div data-testid="file-text-icon" data-size={size}>FileText</div>,
}));

describe('RichTextControls', () => {
  const mockUpdateTabState = jest.fn();
  const mockUseRootStore = useRootStore as jest.MockedFunction<typeof useRootStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRootStore.mockReturnValue({
      updateTabState: mockUpdateTabState,
    } as any);
  });

  const createMockTab = (isRich: boolean): Tab => ({
    id: 'test-tab-1',
    title: 'Test Tab',
    content: 'test content',
    language: 'plaintext',
    languageLocked: false,
    isRich,
    richContent: null,
    dateCreated: Date.now(),
    lastModified: Date.now(),
    isTablet: false,
    cursorPosition: { lineNumber: 1, column: 1 },
    workspaceId: 'test-workspace',
  });

  describe('rendering', () => {
    it('should render toggle button for plain text tab', () => {
      const tab = createMockTab(false);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Switch to Rich Text');
      expect(screen.getByText('Plain Text')).toBeInTheDocument();
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();
    });

    it('should render toggle button for rich text tab', () => {
      const tab = createMockTab(true);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Switch to Plain Text');
      expect(screen.getByText('Rich Text')).toBeInTheDocument();
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();
    });

    it('should render icon with correct size', () => {
      const tab = createMockTab(false);
      render(<RichTextControls activeTab={tab} />);

      const icon = screen.getByTestId('file-text-icon');
      expect(icon).toHaveAttribute('data-size', '12');
    });
  });

  describe('functionality', () => {
    it('should call updateTabState when toggling from plain text to rich text', () => {
      const tab = createMockTab(false);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockUpdateTabState).toHaveBeenCalledWith('test-tab-1', {
        isRich: true,
        lastModified: expect.any(Number),
      });
    });

    it('should call updateTabState when toggling from rich text to plain text', () => {
      const tab = createMockTab(true);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockUpdateTabState).toHaveBeenCalledWith('test-tab-1', {
        isRich: false,
        lastModified: expect.any(Number),
      });
    });

    it('should update lastModified timestamp when toggling', () => {
      const tab = createMockTab(false);
      const beforeTime = Date.now();

      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockUpdateTabState).toHaveBeenCalledWith('test-tab-1', {
        isRich: true,
        lastModified: expect.any(Number),
      });

      const call = mockUpdateTabState.mock.calls[0][1];
      expect(call.lastModified).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should call updateTabState exactly once per click', () => {
      const tab = createMockTab(false);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockUpdateTabState).toHaveBeenCalledTimes(2);
    });
  });

  describe('accessibility', () => {
    it('should have correct ARIA attributes', () => {
      const tab = createMockTab(false);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title');
      expect(button.getAttribute('title')).toBeTruthy();
    });

    it('should have appropriate hover styles', () => {
      const tab = createMockTab(false);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-element/50');
      expect(button).toHaveClass('transition-colors');
    });
  });

  describe('edge cases', () => {
    it('should handle tabs with different IDs correctly', () => {
      const tab1 = { ...createMockTab(false), id: 'tab-1' };
      const tab2 = { ...createMockTab(true), id: 'tab-2' };

      const { rerender } = render(<RichTextControls activeTab={tab1} />);

      fireEvent.click(screen.getByRole('button'));
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-1', expect.any(Object));

      mockUpdateTabState.mockClear();

      rerender(<RichTextControls activeTab={tab2} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockUpdateTabState).toHaveBeenCalledWith('tab-2', expect.any(Object));
    });

    it('should handle multiple rapid clicks correctly', () => {
      const tab = createMockTab(false);
      render(<RichTextControls activeTab={tab} />);

      const button = screen.getByRole('button');

      // Simulate rapid clicking
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockUpdateTabState).toHaveBeenCalledTimes(3);

      // Each call should toggle based on the original tab state (false), 
      // since the component doesn't update the prop between renders
      const calls = mockUpdateTabState.mock.calls;
      expect(calls[0][1].isRich).toBe(true);  // false -> true
      expect(calls[1][1].isRich).toBe(true);  // false -> true (still using original prop)
      expect(calls[2][1].isRich).toBe(true);  // false -> true (still using original prop)
    });
  });
});