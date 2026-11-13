import { Tab } from "../../types";

const mockStorage = {
  getTabContent: jest.fn(async () => {
    // Real IndexedDB reads are asynchronous; yield to the event loop.
    await new Promise((r) => setTimeout(r, 5));
    return "content from db";
  }),
  updateTabCursor: jest.fn(() => Promise.resolve()),
};

jest.mock("../../db", () => ({
  StorageProviderFactory: { getProvider: jest.fn(() => mockStorage) },
}));

jest.mock("../../stores/tabsStore", () => ({
  useTabsStore: {
    getState: jest.fn(() => ({
      tabs: [],
      updateTabContent: jest.fn(),
      updateTabState: jest.fn(),
    })),
  },
}));

import { modelManager } from "../modelManager";

/** Minimal stateful Monaco fake: models are registered by URI, like the real thing. */
function createFakeMonaco() {
  const registry = new Map<string, any>();
  return {
    Uri: { parse: (uri: string) => ({ toString: () => uri }) },
    editor: {
      getModel: (uri: { toString(): string }) => registry.get(uri.toString()) ?? null,
      createModel: (value: string, _lang: string, uri: { toString(): string }) => {
        let disposed = false;
        const model: any = {
          getValue: () => value,
          isDisposed: () => disposed,
          onDidChangeContent: () => ({ dispose: () => {} }),
          dispose: () => {
            disposed = true;
            registry.delete(uri.toString());
          },
        };
        registry.set(uri.toString(), model);
        return model;
      },
      setModelLanguage: jest.fn(),
      getEditors: () => [],
    },
  };
}

describe("BUG: ModelManager.get() is not safe against concurrent calls for the same tab", () => {
  const tab: Tab = {
    id: "race-tab",
    title: "Race",
    content: "hello",
    language: "plaintext",
    languageLocked: false,
    cursorPosition: { lineNumber: 1, column: 1 },
    dateCreated: Date.now(),
    lastModified: Date.now(),
    isTablet: false,
    tabletState: "",
    workspaceId: "default",
  };

  beforeAll(() => {
    modelManager.initialize(createFakeMonaco() as any);
  });

  afterEach(() => {
    modelManager.disposeAll();
  });

  it("returns the same live (non-disposed) model to both concurrent callers", async () => {
    // EditorInstance re-runs its model-switch effect whenever the active tab object
    // changes (e.g. setActiveTab -> updateTabAccessed) while the first async get()
    // is still awaiting, so two get() calls for one tab overlap.
    const [a, b] = await Promise.all([modelManager.get(tab), modelManager.get(tab)]);

    expect(a.isDisposed()).toBe(false);
    expect(b.isDisposed()).toBe(false);
    expect(a).toBe(b);
  });
});
