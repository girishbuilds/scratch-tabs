import { tabletMetadata } from '../tabletMetadata';
import { TabletActionContext } from '../types';
import { tabletActionService } from '../../services/tabletActionService';
import { Tab } from '../../types';

// Mock the tablet action service
jest.mock('../../services/tabletActionService');

const mockTabletActionService = tabletActionService as jest.Mocked<typeof tabletActionService>;

describe('Tablet Metadata Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WordCount metadata getActionsForContext', () => {
    let wordCountMetadata: any;

    beforeEach(() => {
      wordCountMetadata = tabletMetadata.find(meta => meta.id === 'wordcount');
    });

    it('should exist and have getActionsForContext method', () => {
      expect(wordCountMetadata).toBeDefined();
      expect(wordCountMetadata.getActionsForContext).toBeDefined();
      expect(typeof wordCountMetadata.getActionsForContext).toBe('function');
    });

    it('should return action for editor-tab with sufficient content', () => {
      const mockTab: Tab = {
        id: 'test-tab-id',
        title: 'Test Document',
        content: 'This is a test document with more than 50 characters of content to trigger the word count action.',
        language: 'plaintext',
        languageLocked: false,
        workspaceId: 'test-workspace',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      const context: TabletActionContext = {
        source: 'editor-tab',
        tab: mockTab,
        content: mockTab.content,
      };

      const actions = wordCountMetadata.getActionsForContext(context);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('wordcount.new-tab-from-content');
      expect(actions[0].label).toBe('Open in Word Count');
      expect(actions[0].icon).toBeDefined();
      expect(typeof actions[0].action).toBe('function');
    });

    it('should return empty array for insufficient content', () => {
      const mockTab: Tab = {
        id: 'test-tab-id',
        title: 'Test Document',
        content: 'Short', // Less than 50 characters
        language: 'plaintext',
        languageLocked: false,
        workspaceId: 'test-workspace',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      const context: TabletActionContext = {
        source: 'editor-tab',
        tab: mockTab,
        content: mockTab.content,
      };

      const actions = wordCountMetadata.getActionsForContext(context);
      expect(actions).toHaveLength(0);
    });

    it('should return empty array for non editor-tab source', () => {
      const context: TabletActionContext = {
        source: 'editor-selection',
        content: 'This is selected text with more than 50 characters but not from editor-tab source.',
      };

      const actions = wordCountMetadata.getActionsForContext(context);
      expect(actions).toHaveLength(0);
    });

    it('should execute action when called', () => {
      const mockTab: Tab = {
        id: 'test-tab-id',
        title: 'Test Document',
        content: 'This is a test document with more than 50 characters of content to trigger the action.',
        language: 'plaintext',
        languageLocked: false,
        workspaceId: 'test-workspace',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      const context: TabletActionContext = {
        source: 'editor-tab',
        tab: mockTab,
        content: mockTab.content,
      };

      const actions = wordCountMetadata.getActionsForContext(context);
      actions[0].action();

      expect(mockTabletActionService.handleAction).toHaveBeenCalledWith({
        targetTablet: 'wordcount',
        action: 'new-tab',
        payload: {
          content: mockTab.content,
          title: mockTab.title,
        },
        source: {
          tabId: mockTab.id,
          titleHint: `${mockTab.title} (Analysis)`,
        }
      });
    });
  });

  describe('SpinTheWheel metadata', () => {
    let spinMeta: any;

    beforeEach(() => {
      spinMeta = tabletMetadata.find(meta => meta.id === 'spinthewheel');
    });

    it('is registered with correct identity and keywords', () => {
      expect(spinMeta).toEqual({
        id: 'spinthewheel',
        label: 'Spin the Wheel',
        description: expect.any(String),
        keywords: expect.arrayContaining([
          'wheel', 'spin', 'random', 'picker', 'names', 'raffle',
          'roulette', 'lottery', 'prize', 'decision',
        ]),
        getActionsForContext: expect.any(Function),
      });
    });

    it('offers an Open-in action for editor tabs with content', () => {
      const tab: Tab = {
        id: 'tab-1',
        title: 'Prize List',
        content: 'Alice\nBob',
        language: 'plaintext',
        languageLocked: false,
        workspaceId: 'ws-1',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };
      const actions = spinMeta.getActionsForContext({
        source: 'editor-tab',
        tab,
        content: tab.content,
      } as TabletActionContext);

      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('spinthewheel.new-tab-from-content');
      expect(actions[0].label).toBe('Spin the wheel');
      expect(actions[0].icon).toBeDefined();
    });

    it('dispatches a new-tab action carrying the tab content as entries', () => {
      const tab: Tab = {
        id: 'tab-1',
        title: 'Prize List',
        content: 'Alice\nBob',
        language: 'plaintext',
        languageLocked: false,
        workspaceId: 'ws-1',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };
      const actions = spinMeta.getActionsForContext({
        source: 'editor-tab',
        tab,
        content: tab.content,
        side: 'right',
      } as unknown as TabletActionContext);

      actions[0].action();

      expect(mockTabletActionService.handleAction).toHaveBeenCalledWith({
        targetTablet: 'spinthewheel',
        action: 'new-tab',
        payload: { content: 'Alice\nBob', title: 'Prize List' },
        source: { tabId: 'tab-1', titleHint: 'Prize List (Wheel)', side: 'right' },
      });
    });

    it.each([
      ['whitespace-only content', { source: 'editor-tab', content: '   ' }],
      ['missing tab', { source: 'editor-tab', content: 'Alice' }],
      ['non editor-tab source', { source: 'editor-selection', content: 'Alice' }],
    ])('returns no actions for %s', (_name, context) => {
      expect(spinMeta.getActionsForContext(context as TabletActionContext)).toEqual([]);
    });
  });

  describe('Data Reconcile metadata getActionsForContext', () => {
    const tab: Tab = {
      id: 'csv-tab', title: 'Customers', content: 'email\na@example.com',
      language: 'csv', languageLocked: false, workspaceId: 'workspace',
      dateCreated: 1, lastModified: 1, cursorPosition: { lineNumber: 1, column: 1 },
    };

    it('launches a CSV-aware reconciliation tablet for an editor tab', () => {
      const metadata = tabletMetadata.find((item) => item.id === 'datareconcile');
      const actions = metadata?.getActionsForContext?.({ source: 'editor-tab', tab, content: tab.content, side: 'right' }) ?? [];

      expect(actions).toHaveLength(1);
      expect(actions[0].label).toBe('Reconcile data with another tab…');
      actions[0].action();
      expect(mockTabletActionService.handleAction).toHaveBeenCalledWith(expect.objectContaining({
        targetTablet: 'datareconcile', action: 'new-tab', payload: { sourceAId: tab.id, csvMode: true },
        source: expect.objectContaining({ tabId: tab.id, side: 'right' }),
      }));
    });

    it('does not offer reconciliation for a tablet or rich-text tab', () => {
      const metadata = tabletMetadata.find((item) => item.id === 'datareconcile');
      expect(metadata?.getActionsForContext?.({ source: 'editor-tab', tab: { ...tab, isTablet: true }, content: tab.content })).toEqual([]);
      expect(metadata?.getActionsForContext?.({ source: 'editor-tab', tab: { ...tab, isRich: true }, content: tab.content })).toEqual([]);
    });
  });

  describe('Checksum metadata getActionsForContext', () => {
    const tab: Tab = {
      id: 'tab-1', title: 'Notes', content: 'hash me',
      language: 'plaintext', languageLocked: false, workspaceId: 'workspace',
      dateCreated: 1, lastModified: 1, cursorPosition: { lineNumber: 1, column: 1 },
    };
    const checksumMeta = tabletMetadata.find((item) => item.id === 'checksum');

    it('seeds the checksum tablet with the content it was given', () => {
      const [action] = checksumMeta?.getActionsForContext?.({
        source: 'editor-tab', tab, content: 'hash me', side: 'right',
      }) ?? [];

      action.action();

      expect(mockTabletActionService.handleAction).toHaveBeenCalledWith(expect.objectContaining({
        targetTablet: 'checksum',
        action: 'new-tab',
        payload: { text: 'hash me' },
        source: expect.objectContaining({ side: 'right' }),
      }));
    });

    it('opens an empty checksum tablet when there is no content', () => {
      const [action] = checksumMeta?.getActionsForContext?.({ source: 'editor-tab', tab, content: '' }) ?? [];

      action.action();

      expect(mockTabletActionService.handleAction).toHaveBeenCalledWith(expect.objectContaining({ payload: {} }));
    });
  });

  describe('Lorem Ipsum metadata getActionsForContext', () => {
    const loremMeta = tabletMetadata.find((item) => item.id === 'loremipsum');

    it('still offers Generate Mock Content for the tab menu', () => {
      const actions = loremMeta?.getActionsForContext?.({ source: 'editor-tab', content: '' }) ?? [];

      expect(actions.map((action) => action.label)).toEqual(['Generate Mock Content']);
    });

    it('keeps Generate Mock Content out of the editor right-click menu', () => {
      const [action] = loremMeta?.getActionsForContext?.({ source: 'editor-tab', content: '' }) ?? [];

      expect(action.showInEditorMenu).toBe(false);
    });

    it('does not hide any other tablet action from the editor menu', () => {
      const tab = {
        id: 'tab-1', title: 'T', content: 'a'.repeat(80), language: 'plaintext', languageLocked: false,
        workspaceId: 'w', dateCreated: 1, lastModified: 1, cursorPosition: { lineNumber: 1, column: 1 },
      } as Tab;
      const hidden = tabletMetadata
        .flatMap((meta) => meta.getActionsForContext?.({ source: 'editor-tab', tab, content: tab.content }) ?? [])
        .filter((action) => action.showInEditorMenu === false)
        .map((action) => action.id);

      expect(hidden).toEqual(['generate-content']);
    });
  });

  describe('Metadata consistency with tablet implementations', () => {
    it('should have WordCount metadata with correct properties', () => {
      const wordCountMetadata = tabletMetadata.find(meta => meta.id === 'wordcount');

      expect(wordCountMetadata).toEqual({
        id: 'wordcount',
        label: 'Word Count',
        description: expect.any(String),
        keywords: expect.arrayContaining([
          'word', 'count', 'text', 'analysis', 'statistics'
        ]),
        getActionsForContext: expect.any(Function),
      });
    });

    it('should maintain metadata structure integrity', () => {
      tabletMetadata.forEach(meta => {
        expect(meta).toHaveProperty('id');
        expect(meta).toHaveProperty('label');
        expect(meta).toHaveProperty('description');
        expect(meta).toHaveProperty('keywords');
        expect(Array.isArray(meta.keywords)).toBe(true);

        // getActionsForContext is optional, but if present should be a function
        if (meta.getActionsForContext) {
          expect(typeof meta.getActionsForContext).toBe('function');
        }
      });
    });
  });

  describe('Dynamic action discovery', () => {
    it('should support multiple tablets with action discovery', () => {
      const tabletsWithActions = tabletMetadata.filter(meta =>
        typeof meta.getActionsForContext === 'function'
      );

      // At minimum, WordCount should have actions
      expect(tabletsWithActions.length).toBeGreaterThanOrEqual(1);

      const wordCountMeta = tabletsWithActions.find(meta => meta.id === 'wordcount');
      expect(wordCountMeta).toBeDefined();
    });

    it('should allow tablets without actions', () => {
      const tabletsWithoutActions = tabletMetadata.filter(meta =>
        !meta.getActionsForContext
      );

      // This should not fail - tablets can exist without actions
      expect(Array.isArray(tabletsWithoutActions)).toBe(true);
    });

    it('should support context-based action filtering', () => {
      const mockTab: Tab = {
        id: 'test-tab-id',
        title: 'Test Document',
        content: 'This is a test document with more than 50 characters of content for context testing.',
        language: 'plaintext',
        languageLocked: false,
        workspaceId: 'test-workspace',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      const validContext: TabletActionContext = {
        source: 'editor-tab',
        tab: mockTab,
        content: mockTab.content,
      };

      const invalidContext: TabletActionContext = {
        source: 'editor-tab',
        tab: mockTab,
        content: 'Short', // Insufficient content
      };

      const allValidActions = tabletMetadata.flatMap(meta =>
        meta.getActionsForContext?.(validContext) || []
      );

      const allInvalidActions = tabletMetadata.flatMap(meta =>
        meta.getActionsForContext?.(invalidContext) || []
      );

      expect(allValidActions.length).toBeGreaterThan(allInvalidActions.length);
    });
  });
});
