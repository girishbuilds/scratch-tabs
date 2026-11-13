import { navigationService } from "../navigationService";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";

jest.mock("../../stores/navigationStore");
jest.mock("../../stores/workspaceStore");
jest.mock("../../stores/tabsStore");
jest.mock("../../stores/splitViewStore");

const mockGetTabsMetadataByWorkspace = jest.fn();
jest.mock("../../db", () => ({
  StorageProviderFactory: {
    getProvider: jest.fn(() => ({
      getTabsMetadataByWorkspace: (...args: unknown[]) => mockGetTabsMetadataByWorkspace(...args),
    })),
  },
}));

describe("BUG: back/forward navigation to a tab deleted from an inactive workspace", () => {
  beforeEach(() => {
    // Default: the lookup cannot confirm anything, so navigateTo's post-switch check must catch it.
    mockGetTabsMetadataByWorkspace.mockReset();
    mockGetTabsMetadataByWorkspace.mockRejectedValue(new Error("db unavailable"));
  });

  it("rejects the entry up front, without switching workspace, when the stored metadata lacks the tab", async () => {
    const switchWorkspace = jest.fn();
    (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
      activeWorkspaceId: "ws1",
      workspaces: [{ id: "ws1" }, { id: "ws2" }],
      switchWorkspace,
    });
    (useTabsStore.getState as jest.Mock).mockReturnValue({ tabs: [] });
    mockGetTabsMetadataByWorkspace.mockResolvedValue([{ id: "still-here" }]);

    const ok = await navigationService.navigateTo({
      workspaceId: "ws2",
      tabId: "deleted-tab",
      timestamp: Date.now(),
    });

    expect(ok).toBe(false);
    expect(switchWorkspace).not.toHaveBeenCalled();
  });

  it("still navigates when the stored metadata contains the tab", async () => {
    let activeWorkspaceId = "ws1";
    const setActiveLeftTab = jest.fn();
    (useWorkspaceStore.getState as jest.Mock).mockImplementation(() => ({
      get activeWorkspaceId() {
        return activeWorkspaceId;
      },
      workspaces: [{ id: "ws1" }, { id: "ws2" }],
      switchWorkspace: jest.fn(async () => {
        activeWorkspaceId = "ws2";
      }),
    }));
    (useTabsStore.getState as jest.Mock).mockReturnValue({ tabs: [{ id: "still-here" }] });
    (useSplitViewStore.getState as jest.Mock).mockReturnValue({
      splitView: { leftTabs: ["still-here"], rightTabs: [], activeLeftTabId: "still-here" },
      setActiveLeftTab,
      setActiveRightTab: jest.fn(),
    });
    mockGetTabsMetadataByWorkspace.mockResolvedValue([{ id: "still-here" }]);

    const ok = await navigationService.navigateTo({
      workspaceId: "ws2",
      tabId: "still-here",
      timestamp: Date.now(),
    });

    expect(ok).toBe(true);
    expect(setActiveLeftTab).toHaveBeenCalledWith("still-here");
  });

  it("does not activate a tab id that no longer exists (and reports the entry as invalid)", async () => {
    let activeWorkspaceId = "ws1";
    const setActiveLeftTab = jest.fn();

    (useWorkspaceStore.getState as jest.Mock).mockImplementation(() => ({
      get activeWorkspaceId() {
        return activeWorkspaceId;
      },
      workspaces: [{ id: "ws1" }, { id: "ws2" }],
      // After switching, ws2 is loaded: it only contains tab "still-here".
      switchWorkspace: jest.fn(async () => {
        activeWorkspaceId = "ws2";
      }),
    }));
    (useTabsStore.getState as jest.Mock).mockReturnValue({ tabs: [] });
    (useSplitViewStore.getState as jest.Mock).mockReturnValue({
      splitView: { leftTabs: ["still-here"], rightTabs: [], activeLeftTabId: "still-here" },
      setActiveLeftTab,
      setActiveRightTab: jest.fn(),
    });

    // History entry points at a tab in ws2 that has since been deleted.
    const ok = await navigationService.navigateTo({
      workspaceId: "ws2",
      tabId: "deleted-tab",
      timestamp: Date.now(),
    });

    expect(setActiveLeftTab).not.toHaveBeenCalledWith("deleted-tab");
    expect(ok).toBe(false); // so goBack()/goForward() skip to the next valid entry
  });
});
