// Mock dependencies
const mockTabsStore = {
    getState: jest.fn(() => ({
        tabs: [] as any[],
        addTab: jest.fn(),
        removeTab: jest.fn(),
    })),
};

const mockSplitViewStore = {
    getState: jest.fn(() => ({
        splitView: {
            workspaceId: "active-ws",
            leftTabs: [] as string[],
            rightTabs: [] as string[],
            isSplit: false,
        },
        addTabToSide: jest.fn(),
        removeTabFromSide: jest.fn(),
        reorderTabs: jest.fn(),
    })),
};

const mockWorkspaceStore = {
    getState: jest.fn(() => ({
        activeWorkspaceId: "active-ws",
        workspaces: [] as any[],
        deleteWorkspace: jest.fn(),
        switchWorkspace: jest.fn(),
    })),
};

const mockSidebarStore = {
    getState: jest.fn(() => ({
        refreshWorkspaceMetadata: jest.fn(),
    })),
};

const mockStorageProvider = {
    getTabsByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any[]>>,
    saveTabNow: jest.fn() as jest.MockedFunction<(tab: any) => Promise<void>>,
    deleteTab: jest.fn() as jest.MockedFunction<(id: string) => Promise<void>>,
    getSplitViewByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any | null>>,
    saveSplitViewNow: jest.fn() as jest.MockedFunction<(splitView: any) => Promise<void>>,
};

const mockModelManager = {
    dispose: jest.fn(),
};

const mockQueryPanelStore = {
    getState: jest.fn(() => ({
        removePanelState: jest.fn(),
    })),
};

const mockBroadcastManager = {
    broadcastWorkspaceState: jest.fn(),
    broadcastWorkspaceTabsMetadata: jest.fn(),
};

jest.mock("../tabsStore", () => ({
    useTabsStore: mockTabsStore,
}));

jest.mock("../splitViewStore", () => ({
    useSplitViewStore: mockSplitViewStore,
}));

jest.mock("../workspaceStore", () => ({
    useWorkspaceStore: mockWorkspaceStore,
}));

jest.mock("../sidebarStore", () => ({
    useSidebarStore: mockSidebarStore,
}));

jest.mock("../../db", () => ({
    StorageProviderFactory: {
        getProvider: () => mockStorageProvider,
    },
    incrementSetting: jest.fn(),
}));

jest.mock("../../services/modelManager", () => ({
    modelManager: mockModelManager,
}));

jest.mock("../../formats/json/stores/useQueryPanelStore", () => ({
    useQueryPanelStore: mockQueryPanelStore,
}));

jest.mock("../broadcastStore", () => ({
    broadcastManager: mockBroadcastManager,
}));

jest.mock("../milestoneCelebrationStore", () => ({
    useMilestoneCelebrationStore: {
        getState: jest.fn(() => ({
            checkMilestone: jest.fn(),
        })),
    },
}));

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useRootStore } from "../rootStore";

describe("BUG: reorderTabsInWorkspace on a split inactive workspace", () => {
    it("never leaves the same tab id in both leftTabs and rightTabs", async () => {
        mockWorkspaceStore.getState.mockReturnValue({
            activeWorkspaceId: "active-ws",
            workspaces: [],
            deleteWorkspace: jest.fn(),
            switchWorkspace: jest.fn(),
        } as any);
        mockSidebarStore.getState.mockReturnValue({ refreshWorkspaceMetadata: jest.fn() } as any);
        // Inactive workspace that was left in split mode: "a" on the left, "b" on the right.
        // The sidebar shows the combined order [a, b]; the user drags "b" above "a".
        mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue({
            id: "sv",
            workspaceId: "inactive-ws",
            isSplit: true,
            leftTabs: ["a"],
            rightTabs: ["b"],
            activeLeftTabId: "a",
            activeRightTabId: "b",
            lastModified: 1,
        });
        mockStorageProvider.saveSplitViewNow.mockResolvedValue(undefined);
        mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);

        await useRootStore.getState().reorderTabsInWorkspace("inactive-ws", ["b", "a"]);

        const saved = mockStorageProvider.saveSplitViewNow.mock.calls[0][0] as any;
        const all = [...saved.leftTabs, ...saved.rightTabs];
        expect(new Set(all).size).toBe(all.length); // no duplicates
        expect(all.sort()).toEqual(["a", "b"]);
    });
});
