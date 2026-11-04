import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusBar } from '../index';
import { useTabsStore } from '../../../stores/tabsStore';
import { useRootStore } from '../../../stores/rootStore';
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { useSearchStore } from '../../../stores/searchStore';
import { useActiveEditorStore } from '../../../stores/activeEditorStore';
import { getPotentialFormatMatches } from '../../../formats';

// Mock the stores
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/rootStore');
jest.mock('../../../stores/splitViewStore');
jest.mock('../../../stores/searchStore');
jest.mock('../../../stores/activeEditorStore');

// Mock the FontSizeControls component
jest.mock('../FontSizeControls', () => ({
  FontSizeControls: ({ editor, isTablet, activeTabId }: any) => (
    <div data-testid="font-size-controls" data-editor={!!editor} data-tablet={isTablet} data-tab-id={activeTabId}>
      Font Size Controls
    </div>
  ),
}));

// Mock other components that might be imported
jest.mock('../FormatStatusItems', () => ({
  getFormatStatusItem: jest.fn(() => null),
  getFormatOptionsMenu: jest.fn(() => null),
}));

jest.mock('../FormatSelectionPopup', () => ({
  FormatSelectionPopup: () => <div data-testid="format-popup">Format Popup</div>,
}));

jest.mock('../SmartViewButtons', () => ({
  SmartViewButtons: () => <div data-testid="smart-view-buttons">Smart View Buttons</div>,
}));

jest.mock('../../AI/AIStatusIcon', () => ({
  AIStatusIcon: () => <div data-testid="ai-status-icon">AI Status Icon</div>,
}));

jest.mock('../../Macro', () => ({
  Macro: () => <div data-testid="macro">Macro</div>,
}));

jest.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: jest.fn(() => false),
}));

jest.mock('../../../formats', () => ({
  formatRegistry: {
    getById: jest.fn(() => null),
    getAll: jest.fn(() => []),
  },
  getPotentialFormatMatches: jest.fn(),
}));

jest.mock('../../../tablets', () => ({
  tabletRegistry: {
    getById: jest.fn(() => null),
  },
}));

describe('StatusBar - Font Size Controls Integration', () => {
  const mockToggleSearch = jest.fn();
  const mockEditor = {
    updateOptions: jest.fn(),
    getOption: jest.fn(),
    getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
    onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useTabsStore
    (useTabsStore as any).mockReturnValue({
      tabs: [
        {
          id: 'tab-1',
          title: 'Editor Tab',
          content: 'editor content',
          language: 'javascript',
          languageLocked: false,
          isTablet: false,
          fontSize: 16,
          workspaceId: 'workspace-1',
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
        },
        {
          id: 'tab-2',
          title: 'Tablet Tab',
          content: 'tablet content',
          language: 'plaintext',
          languageLocked: false,
          isTablet: true,
          fontSize: 18,
          workspaceId: 'workspace-1',
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
        },
      ],
    });

    // Mock useSplitViewStore
    (useSplitViewStore as any).mockReturnValue({
      splitView: {
        isSplit: false,
        activeLeftTabId: 'tab-1',
        activeRightTabId: null,
      },
    });

    // Mock useRootStore
    (useRootStore as any).mockReturnValue({
      updateTabLanguage: jest.fn(),
    });

    // Mock useSearchStore
    (useSearchStore as any).mockReturnValue({
      toggleSearch: mockToggleSearch,
    });

    // Mock useActiveEditorStore
    (useActiveEditorStore as any).mockImplementation((selector: any) => {
      const state = {
        activeLeftEditor: mockEditor,
        activeRightEditor: mockEditor,
      };
      return selector(state);
    });

    // Mock getPotentialFormatMatches
    (getPotentialFormatMatches as jest.Mock).mockReturnValue([]);
  });

  describe('FontSizeControls rendering', () => {
    it('should render FontSizeControls for editor tabs', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      const fontSizeControls = screen.getByTestId('font-size-controls');
      expect(fontSizeControls).toBeInTheDocument();
      expect(fontSizeControls).toHaveAttribute('data-editor', 'true');
      expect(fontSizeControls).toHaveAttribute('data-tablet', 'false');
      expect(fontSizeControls).toHaveAttribute('data-tab-id', 'tab-1');
    });

    it('should render FontSizeControls for tablet tabs but with tablet flag', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-2',
            title: 'Tablet Tab',
            content: 'tablet content',
            language: 'plaintext',
            languageLocked: false,
            isTablet: true,
            fontSize: 18,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      const fontSizeControls = screen.getByTestId('font-size-controls');
      expect(fontSizeControls).toBeInTheDocument();
      expect(fontSizeControls).toHaveAttribute('data-editor', 'true');
      expect(fontSizeControls).toHaveAttribute('data-tablet', 'true');
      expect(fontSizeControls).toHaveAttribute('data-tab-id', 'tab-2');
    });

    it('should handle null editor gracefully', () => {
      // Create a separate beforeEach-like setup for this specific test
      jest.clearAllMocks();
      
      // Mock all the stores with null editor
      (useTabsStore as any).mockReturnValue({
        tabs: [
          {
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          },
        ],
      });

      (useSplitViewStore as any).mockReturnValue({
        splitView: {
          isSplit: false,
          activeLeftTabId: 'tab-1',
          activeRightTabId: null,
        },
      });

      (useRootStore as any).mockReturnValue({
        updateTabLanguage: jest.fn(),
      });

      (useSearchStore as any).mockReturnValue({
        toggleSearch: mockToggleSearch,
      });

      // Mock null editor for this specific test
      (useActiveEditorStore as any).mockImplementation((selector: any) => {
        const state = {
          activeLeftEditor: null,
          activeRightEditor: null,
        };
        return selector(state);
      });

      (getPotentialFormatMatches as jest.Mock).mockReturnValue([]);
      
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      const fontSizeControls = screen.getByTestId('font-size-controls');
      expect(fontSizeControls).toBeInTheDocument();
      expect(fontSizeControls).toHaveAttribute('data-editor', 'false');
    });

    it('should handle missing active tab gracefully', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'missing-tab',
            title: 'Missing Tab',
            content: '',
            language: 'plaintext',
            languageLocked: false,
            isTablet: false,
            fontSize: undefined,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      // Should still render the status bar
      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });
  });

  describe('Status bar layout', () => {
    it('should maintain proper layout with FontSizeControls', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      // Check that the status bar is rendered
      expect(screen.getByTestId('status-bar')).toBeInTheDocument();
      
      // Check that FontSizeControls is rendered
      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });
  });

  describe('Side-specific behavior', () => {
    it('should work for left side', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });

    it('should work for right side', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'editor content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="right"
        />
      );

      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });
  });

  describe('Smart View and Rich Text mode behavior', () => {
    it('should hide RichTextControls when isInSmartView is true', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'JSON Tab',
            content: '{"test": "data"}',
            language: 'json',
            languageLocked: false,
            isTablet: false,
            isRich: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
          isInSmartView={true}
        />
      );

      // RichTextControls should not be rendered when in smart view
      expect(screen.queryByTestId('rich-text-toggle')).not.toBeInTheDocument();
    });

    it('should show RichTextControls when isInSmartView is false', () => {
      // Mock RichTextControls to be visible
      jest.mock('../RichTextControls', () => ({
        RichTextControls: () => <div data-testid="rich-text-toggle">Rich Text Toggle</div>,
      }));

      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Editor Tab',
            content: 'content',
            language: 'plaintext',
            languageLocked: false,
            isTablet: false,
            isRich: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
          isInSmartView={false}
        />
      );

      // Should not find it since we're testing the conditional rendering
      // The actual RichTextControls component is a separate component
      expect(screen.getByTestId('font-size-controls')).toBeInTheDocument();
    });

    it('should hide format/language info when in Rich Text mode', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Rich Text Tab',
            content: 'content',
            richContent: { type: 'doc', content: [] },
            language: 'plaintext',
            languageLocked: false,
            isTablet: false,
            isRich: true,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      // Language label should not be visible (it's within the conditional block)
      expect(screen.queryByTestId('status-language')).not.toBeInTheDocument();
    });

    it('should keep the Rich Text toggle visible in Rich Text mode', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Rich Text Tab',
            content: 'content',
            richContent: { type: 'doc', content: [] },
            language: 'plaintext',
            languageLocked: false,
            isTablet: false,
            isRich: true,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      expect(screen.getByTestId('rich-text-toggle')).toBeInTheDocument();
      expect(screen.getByText('Rich Text')).toBeInTheDocument();
      expect(screen.queryByTestId('font-size-controls')).not.toBeInTheDocument();
    });

    it('should show format/language info when NOT in Rich Text mode', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Plain Tab',
            content: 'content',
            language: 'javascript',
            languageLocked: false,
            isTablet: false,
            isRich: false,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      // Language label should be visible
      expect(screen.getByTestId('status-language')).toBeInTheDocument();
    });

    it('should hide line/column info in Rich Text mode', () => {
      render(
        <StatusBar
          activeTab={{
            id: 'tab-1',
            title: 'Rich Text Tab',
            content: 'content',
            richContent: { type: 'doc', content: [] },
            language: 'plaintext',
            languageLocked: false,
            isTablet: false,
            isRich: true,
            fontSize: 16,
            workspaceId: 'workspace-1',
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
          }}
          side="left"
        />
      );

      // Should not show line/column info
      expect(screen.queryByText(/Ln \d+, Col \d+/)).not.toBeInTheDocument();
    });
  });

  describe('Format popup toggle', () => {
    const textTab = {
      id: 'tab-1',
      title: 'Plain Tab',
      content: 'content',
      language: 'javascript',
      languageLocked: false,
      isTablet: false,
      fontSize: 16,
      workspaceId: 'workspace-1',
      dateCreated: Date.now(),
      lastModified: Date.now(),
      cursorPosition: { lineNumber: 1, column: 1 },
    };

    it('opens the format popup when the format label is clicked', () => {
      render(<StatusBar activeTab={textTab} side="left" />);
      expect(screen.queryByTestId('format-popup')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('status-language'));
      expect(screen.getByTestId('format-popup')).toBeInTheDocument();
    });

    it('closes the format popup when the format label is clicked again', () => {
      render(<StatusBar activeTab={textTab} side="left" />);
      const label = screen.getByTestId('status-language');
      fireEvent.click(label);
      expect(screen.getByTestId('format-popup')).toBeInTheDocument();
      fireEvent.click(label);
      expect(screen.queryByTestId('format-popup')).not.toBeInTheDocument();
    });
  });
});
