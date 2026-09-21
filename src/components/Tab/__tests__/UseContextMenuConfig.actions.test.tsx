import { renderHook, act } from '@testing-library/react';
import { useContextMenuConfig } from '../UseContextMenuConfig';
import { useTabsStore } from '../../../stores/tabsStore';
import { Tab } from '../../../types';

// Mock dependencies
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/splitViewStore');
jest.mock('../../../stores/rootStore');
jest.mock('../../../stores/macroStore');
jest.mock('../../../services/modelManager');

// Import store types for proper mocking
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { useRootStore } from '../../../stores/rootStore';
import { useMacroStore } from '../../../stores/macroStore';

const mockUseSplitViewStore = useSplitViewStore as jest.MockedFunction<typeof useSplitViewStore>;
const mockUseRootStore = useRootStore as jest.MockedFunction<typeof useRootStore>;
const mockUseMacroStore = useMacroStore as jest.MockedFunction<typeof useMacroStore>;

const mockUseTabsStore = useTabsStore as jest.MockedFunction<typeof useTabsStore>;

describe('UseContextMenuConfig - Actions and Structure', () => {
  const mockTab: Tab = {
    id: 'test-tab-id',
    title: 'Test Document',
    content: 'This is a test document content.',
    language: 'plaintext',
    languageLocked: false,
    isTablet: false,
    workspaceId: 'test-workspace',
    dateCreated: Date.now(),
    lastModified: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
  };

  const mockTabletTab: Tab = {
    ...mockTab,
    id: 'tablet-tab-id',
    isTablet: true,
  };

  const mockCloseContextMenu = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTabsStore.mockReturnValue({
      tabs: [mockTab, mockTabletTab],
    } as any);

    mockUseSplitViewStore.mockReturnValue({
      splitView: {
        leftTabs: ['test-tab-id'],
        rightTabs: ['tablet-tab-id'],
        isSplit: false,
        leftTabHistory: ['other-tab-id', 'test-tab-id'], // Correctly mock history here
      },
    } as any);

    // Mock tabs store
    mockUseTabsStore.mockReturnValue({
      tabs: [mockTab, mockTabletTab],
      activeTabId: 'test-tab-id',
    } as any);

    mockUseRootStore.mockReturnValue({
      duplicateTab: jest.fn(),
      splitScreen: jest.fn(),
      toggleTabPin: jest.fn(),
    } as any);


    mockUseMacroStore.mockReturnValue({
      setForceShowToolbar: jest.fn(),
    } as any);
  });

  it('should have Share as the first item', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    expect(menuItems[0].id).toBe('share');
    expect(menuItems[0].label).toBe('Share');
  });

  it('should have Duplicate as the second item', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    expect(menuItems[1].id).toBe('duplicate');
    expect(menuItems[1].label).toBe('Duplicate');
  });

  it('should have Compare with Previous Tab as the third item', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    expect(menuItems[2].id).toBe('compareWithPrevious');
  });
  it('should rename "Split View" to "Split Right"', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitItem = menuItems.find(item => item.id === 'split-unsplit');

    expect(splitItem).toBeDefined();
    expect(splitItem?.label).toBe('Split Right');
  });

  it('should show "Unsplit" when on the right side in split view', () => {
    mockUseSplitViewStore.mockReturnValue({
      splitView: {
        leftTabs: ['other-tab-id'],
        rightTabs: ['test-tab-id'],
        isSplit: true,
        activeRightTabId: 'test-tab-id',
      },
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', true, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitItem = menuItems.find(item => item.id === 'split-unsplit');

    expect(splitItem).toBeDefined();
    expect(splitItem?.label).toBe('Unsplit');
  });

  it('should have Compare with other side as the second item when split', () => {
    mockUseSplitViewStore.mockReturnValue({
      splitView: {
        leftTabs: ['test-tab-id'],
        rightTabs: ['other-tab-id'],
        isSplit: true,
        activeLeftTabId: 'test-tab-id',
        activeRightTabId: 'other-tab-id',
      },
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    expect(menuItems[2].id).toBe('compare');
    expect(menuItems[2].label).toBe('Compare with other side');
  });

  it('should have Compare with Previous Tab as the third item when split', () => {
    mockUseSplitViewStore.mockReturnValue({
      splitView: {
        leftTabs: ['test-tab-id'],
        rightTabs: ['other-tab-id'],
        isSplit: true,
        activeLeftTabId: 'test-tab-id',
        activeRightTabId: 'other-tab-id',
        leftTabHistory: ['prev-tab-id', 'test-tab-id'],
      },
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    expect(menuItems[3].id).toBe('compareWithPrevious');
  });

  it('should have "Pin" state inside Organize submenu', () => {
    const pinnedTab = { ...mockTab, isPinned: true };
    mockUseTabsStore.mockReturnValue({
      tabs: [pinnedTab, mockTabletTab],
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const organizeItem = menuItems.find(item => item.id === 'organize');

    expect(organizeItem).toBeDefined();
    expect(organizeItem?.submenu).toBeDefined();

    // Check if the submenu component has the correct props
    const submenuProps = (organizeItem?.submenu as React.ReactElement).props;
    expect(submenuProps.isPinned).toBe(true);
    expect(submenuProps.canRename).toBe(true);
    expect(submenuProps.onRename).toBeDefined();
  });

  it('should handle tabs that do not exist gracefully', () => {
    mockUseTabsStore.mockReturnValue({
      tabs: [],
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('nonexistent-tab-id', false, mockCloseContextMenu)
    );

    expect(result.current.menuItems).toBeDefined();
  });

  it('should include split tab menu item for non-tablet tabs', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitTabItem = menuItems.find(item => item.id === 'splitTab');

    expect(splitTabItem).toBeDefined();
    expect(splitTabItem?.label).toBe('Split Content');
  });

  it('offers merge only when another editor tab shares the workspace', () => {
    const other = { ...mockTab, id: 'other', title: 'Other' };
    mockUseTabsStore.mockReturnValue({ tabs: [mockTab, mockTabletTab, other] } as any);
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );
    const mergeItem = result.current.menuItems.find(item => item.id === 'mergeTabs');
    expect(mergeItem?.label).toBe('Merge tabs...');
    act(() => mergeItem?.action?.());
    expect(result.current.mergeModalProps).toEqual(expect.objectContaining({
      tabId: 'test-tab-id', isRightSide: false,
    }));
  });

  it('hides merge for non-editor tabs and tabs in other workspaces', () => {
    const otherWorkspace = { ...mockTab, id: 'elsewhere', workspaceId: 'other-workspace' };
    mockUseTabsStore.mockReturnValue({ tabs: [mockTab, mockTabletTab, otherWorkspace] } as any);
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );
    expect(result.current.menuItems.find(item => item.id === 'mergeTabs')).toBeUndefined();
  });

  it('should set splitModalProps when split tab action is triggered', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitTabItem = menuItems.find(item => item.id === 'splitTab');

    act(() => {
      splitTabItem?.action?.();
    });

    expect(result.current.splitModalProps).not.toBeNull();
    expect(result.current.splitModalProps?.isOpen).toBe(true);
  });

  it('should include Transformation Pipeline menu item', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const pipelineItem = menuItems.find(item => item.id === 'pipeline');

    expect(pipelineItem).toBeDefined();
    expect(pipelineItem?.label).toBe('Transformation Pipeline');
  });

  it('shows Canvas actions for text tabs and disables unavailable sources', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const sendTab = result.current.menuItems.find(
      item => item.id === 'sendTabToCanvas'
    );
    const sendSelection = result.current.menuItems.find(
      item => item.id === 'sendSelectionToCanvas'
    );

    expect(sendTab).toBeDefined();
    expect(sendTab?.disabled).toBe(false);
    expect(sendSelection).toBeDefined();
    expect(sendSelection?.disabled).toBe(true);
  });

  it('should include Macro Recording menu item after Transformation Pipeline', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const pipelineIndex = menuItems.findIndex(item => item.id === 'pipeline');
    const macroIndex = menuItems.findIndex(item => item.id === 'macroRecording');

    expect(pipelineIndex).not.toBe(-1);
    expect(macroIndex).not.toBe(-1);
    expect(macroIndex).toBe(pipelineIndex + 1);
    expect(menuItems[macroIndex].label).toBe('Macro Recording');
  });

  it('should activate tab before showing macro toolbar when Macro Recording is triggered', () => {
    const mockSetActiveTab = jest.fn();
    const mockSetForceShowToolbar = jest.fn();

    mockUseRootStore.mockReturnValue({
      duplicateTab: jest.fn(),
      splitScreen: jest.fn(),
      toggleTabPin: jest.fn(),
      setActiveTab: mockSetActiveTab,
    } as any);

    mockUseMacroStore.mockReturnValue({
      setForceShowToolbar: mockSetForceShowToolbar,
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const macroItem = menuItems.find(item => item.id === 'macroRecording');

    expect(macroItem).toBeDefined();

    // Trigger the macro recording action
    act(() => {
      macroItem?.action?.();
    });

    // Verify that setActiveTab was called first with the correct tab ID
    expect(mockSetActiveTab).toHaveBeenCalledWith('test-tab-id');

    // Verify that setForceShowToolbar was called with correct parameters
    expect(mockSetForceShowToolbar).toHaveBeenCalledWith(true, 'test-tab-id', 'left');

    // Verify that context menu was closed
    expect(mockCloseContextMenu).toHaveBeenCalled();
  });
});
