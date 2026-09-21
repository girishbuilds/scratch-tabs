import {
  generateUrlIdentifier,
  openInitialUrlIdentifier,
} from "../useUrlTabHandler";
import type { Tab } from "../../types";
import { useRootStore } from "../../stores/rootStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

jest.mock("../../tablets/dynamicRegistry", () => ({
  dynamicTabletRegistry: {
    getById: jest.fn().mockResolvedValue({
      id: "spinthewheel",
      label: "Spin the Wheel",
      createInitialState: () => ({ type: "spinthewheel", data: {} }),
      serializeState: (state: unknown) => JSON.stringify(state),
    }),
  },
}));

const tab = (overrides: Partial<Tab> = {}): Tab => ({
  id: "tab-1",
  title: "My Document",
  content: "",
  language: "plaintext",
  languageLocked: false,
  workspaceId: "workspace-1",
  dateCreated: 1,
  lastModified: 1,
  cursorPosition: { lineNumber: 1, column: 1 },
  ...overrides,
});

describe("generateUrlIdentifier", () => {
  it("uses the stable Canvas route instead of the mutable title", () => {
    expect(
      generateUrlIdentifier(
        tab({ title: "Architecture Board", contentKind: "canvas" }),
      ),
    ).toBe("canvas");
  });

  it("continues to slugify normal tab titles", () => {
    expect(generateUrlIdentifier(tab())).toBe("my-document");
  });
});

describe("openInitialUrlIdentifier", () => {
  const originalRootState = useRootStore.getState();
  const originalWorkspaceState = useWorkspaceStore.getState();

  beforeEach(() => {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => "created-tab-id"),
    });
  });

  afterEach(() => {
    useRootStore.setState(originalRootState, true);
    useWorkspaceStore.setState(originalWorkspaceState, true);
    useTabsStore.setState({ tabs: [] });
    useSplitViewStore.setState({
      splitView: useSplitViewStore.getState().createDefaultSplitViewState(),
    });
    jest.clearAllMocks();
  });

  function mockRootActions() {
    const addTab = jest.fn();
    const setActiveLeftTab = jest.fn();
    const setActiveRightTab = jest.fn();
    const setActiveSide = jest.fn();
    useRootStore.setState({
      addTab,
      setActiveLeftTab,
      setActiveRightTab,
      setActiveSide,
    });
    return { addTab, setActiveLeftTab, setActiveSide };
  }

  it("creates a workspace and Spin the Wheel tab for a clean database", async () => {
    const ensureWorkspace = jest.fn().mockResolvedValue("new-workspace");
    useWorkspaceStore.setState({
      activeWorkspaceId: null,
      workspaces: [],
      ensureWorkspace,
    });
    useTabsStore.setState({ tabs: [] });
    const { addTab, setActiveLeftTab, setActiveSide } = mockRootActions();

    await openInitialUrlIdentifier("spin-the-wheel");

    expect(ensureWorkspace).toHaveBeenCalledTimes(1);
    expect(addTab).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Spin the Wheel",
        isTablet: true,
        workspaceId: "new-workspace",
      }),
      false,
    );
    const createdTab = addTab.mock.calls[0][0] as Tab;
    expect(setActiveLeftTab).toHaveBeenCalledWith(createdTab.id);
    expect(setActiveSide).toHaveBeenCalledWith("left");
  });

  it("adds the Spin the Wheel tab to an existing active workspace", async () => {
    const ensureWorkspace = jest.fn();
    useWorkspaceStore.setState({
      activeWorkspaceId: "existing-workspace",
      workspaces: [],
      ensureWorkspace,
    });
    useTabsStore.setState({ tabs: [] });
    const { addTab } = mockRootActions();

    await openInitialUrlIdentifier("spin-the-wheel");

    expect(ensureWorkspace).not.toHaveBeenCalled();
    expect(addTab).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Spin the Wheel",
        isTablet: true,
        workspaceId: "existing-workspace",
      }),
      false,
    );
  });
});
