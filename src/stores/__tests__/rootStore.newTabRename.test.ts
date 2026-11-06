import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockSetEditingId = jest.fn();
const mockExpandWorkspace = jest.fn();

jest.mock("../tabsStore", () => ({ useTabsStore: { getState: jest.fn(() => ({ tabs: [] })) } }));
jest.mock("../splitViewStore", () => ({ useSplitViewStore: { getState: jest.fn() } }));
jest.mock("../workspaceStore", () => ({
  useWorkspaceStore: { getState: jest.fn(() => ({ ensureWorkspace: jest.fn().mockResolvedValue("ws1") })) },
}));
jest.mock("../sidebarStore", () => ({
  useSidebarStore: {
    getState: () => ({ setEditingId: mockSetEditingId, expandWorkspace: mockExpandWorkspace }),
  },
}));
jest.mock("../editorStore", () => ({ useEditorStore: { getState: jest.fn() } }));
jest.mock("../broadcastStore", () => ({ broadcastManager: {} }));
jest.mock("../../services/modelManager", () => ({ modelManager: {} }));
jest.mock("../../services/tabDocumentAdapter", () => ({
  tabDocumentAdapterResolver: { resolve: jest.fn() },
}));
jest.mock("../../db", () => ({
  incrementSetting: jest.fn(),
  getSetting: jest.fn(),
  setSetting: jest.fn(),
  StorageProviderFactory: { getProvider: jest.fn().mockReturnValue({}) },
}));

import { useRootStore } from "../rootStore";

describe("RootStore new tab creation does not start sidebar rename", () => {
  let addTab: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    addTab = jest.fn();
    let n = 0;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: () => `uuid-${++n}` },
    });
    useRootStore.setState({ addTab, canAddNewTab: jest.fn().mockReturnValue(true) });
  });

  it("handleNewTab adds the tab without entering rename mode", async () => {
    const id = await useRootStore.getState().handleNewTab(false, '{"a":1}');

    expect(id).toBeTruthy();
    expect(addTab).toHaveBeenCalledTimes(1);
    expect(mockSetEditingId).not.toHaveBeenCalled();
  });

  it("handleNewPopulatedTab (Try example) adds the tab without entering rename mode", async () => {
    const id = await useRootStore
      .getState()
      .handleNewPopulatedTab({ title: "Sample JSON", content: '{"a":1}' });

    expect(id).toBeTruthy();
    expect(addTab).toHaveBeenCalledTimes(1);
    expect(mockSetEditingId).not.toHaveBeenCalled();
  });
});
