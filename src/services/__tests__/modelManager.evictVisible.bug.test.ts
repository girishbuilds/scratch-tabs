/**
 * KNOWN-FAILING test (see BUGS.md).
 *
 * The LRU order is only refreshed by get(), i.e. when an editor mounts for a tab. In split view
 * one pane can keep showing tab A while the other pane cycles through 10 other tabs; A is then
 * the "least recently used" model and is disposed although an editor is still displaying it.
 */
import { Tab } from "../../types";

const mockStorage = {
  getTabContent: jest.fn(async () => "content from db"),
  updateTabCursor: jest.fn(() => Promise.resolve()),
};
jest.mock("../../db", () => ({
  StorageProviderFactory: { getProvider: jest.fn(() => mockStorage) },
}));
jest.mock("../../stores/tabsStore", () => ({
  useTabsStore: {
    getState: jest.fn(() => ({ tabs: [], updateTabContent: jest.fn(), updateTabState: jest.fn() })),
  },
}));

import { modelManager } from "../modelManager";

const attachedEditors: any[] = [];

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
      getEditors: () => attachedEditors,
    },
  };
}

const makeTab = (id: string): Tab => ({
  id,
  title: id,
  content: `content of ${id}`,
  language: "plaintext",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 1,
  workspaceId: "ws",
});

describe("BUG: LRU eviction disposes a model that an editor is still showing", () => {
  beforeAll(() => modelManager.initialize(createFakeMonaco() as any));
  afterEach(() => {
    attachedEditors.length = 0;
    modelManager.disposeAll();
  });

  it("keeps the left pane's model alive while the right pane opens 10 other tabs", async () => {
    // Left pane: tab A stays open the whole time.
    const modelA = await modelManager.get(makeTab("A"));
    attachedEditors.push({ getModel: () => modelA });

    // Right pane: the user steps through ten other tabs (each mount calls get()).
    for (let i = 1; i <= 10; i++) {
      await modelManager.get(makeTab(`right-${i}`));
    }

    // Monaco blanks an editor whose model is disposed; the left pane would go empty.
    expect(modelA.isDisposed()).toBe(false);
  });
});
