import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MergeTabsModal } from "../MergeTabsModal";
import { useTabsStore } from "../../../stores/tabsStore";
import { useRootStore } from "../../../stores/rootStore";
import { useWorkspaceStore } from "../../../stores/workspaceStore";
import { modelManager } from "../../../services/modelManager";
import { formatRegistry } from "../../../formats";
import type { Tab } from "../../../types";

jest.mock("../../../stores/tabsStore", () => ({
  useTabsStore: Object.assign(jest.fn(), { getState: jest.fn() }),
}));
jest.mock("../../../stores/rootStore", () => ({ useRootStore: jest.fn() }));
jest.mock("../../../stores/workspaceStore", () => ({
  useWorkspaceStore: jest.fn(),
}));
jest.mock("../../../services/modelManager", () => ({
  modelManager: { getContent: jest.fn() },
}));
jest.mock("../../../formats", () => ({
  formatRegistry: { getById: jest.fn() },
}));

const tab = (
  id: string,
  title: string,
  content: string,
  language = "plaintext",
  workspaceId = "workspace",
): Tab => ({
  id,
  title,
  content,
  language,
  workspaceId,
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 1,
});

const sourceTabs: Tab[] = [
  tab("a", "Alpha", "saved A", "json"),
  tab("b", "Beta", "B", "csv"),
  tab("c", "Gamma", "C", "plaintext"),
  tab("other", "Other workspace", "X", "plaintext", "elsewhere"),
  { ...tab("tablet", "Tablet", "T"), isTablet: true },
  { ...tab("rich", "Rich", "R"), isRich: true },
  { ...tab("canvas", "Canvas", "D"), contentKind: "canvas" },
];

const createTab = jest.fn();
const close = jest.fn();
const getContent = modelManager.getContent as jest.Mock;
const getById = formatRegistry.getById as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  const tabsState = { tabs: [...sourceTabs] };
  (useTabsStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector(tabsState),
  );
  (useTabsStore.getState as jest.Mock).mockImplementation(() => tabsState);
  (useRootStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({ handleNewPopulatedTab: createTab }),
  );
  (useWorkspaceStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector({ activeWorkspaceId: "workspace" }),
  );
  getContent.mockReturnValue(undefined);
  getById.mockReturnValue(undefined);
  createTab.mockResolvedValue("new-tab");
});

const open = (right = false) =>
  render(<MergeTabsModal tabId="a" isRightSide={right} onClose={close} />);

it("preselects the clicked tab and only lists editor tabs in its workspace", () => {
  open();
  expect(screen.getByLabelText("Include Alpha")).toBeChecked();
  expect(screen.getByLabelText("Include Beta")).not.toBeChecked();
  expect(
    screen.queryByLabelText("Include Other workspace"),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Include Tablet")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Include Rich")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Include Canvas")).not.toBeInTheDocument();
  expect(
    screen.getByLabelText("Include Alpha").closest(".custom-scrollbar"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Choose source tabs" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Create merged tab" }),
  ).toBeDisabled();
});

it("joins mixed formats in the chosen order using live content and creates on the clicked side", async () => {
  getContent.mockImplementation((id) => (id === "a" ? "live A" : undefined));
  open(true);
  fireEvent.click(screen.getByLabelText("Include Beta"));
  fireEvent.click(screen.getByLabelText("Include Gamma"));
  fireEvent.click(screen.getByRole("button", { name: "Move Gamma up" }));
  fireEvent.change(screen.getByLabelText("Result title"), {
    target: { value: "Combined" },
  });
  fireEvent.change(screen.getByLabelText("Separator"), {
    target: { value: "" },
  });
  expect(screen.getByLabelText("Merge preview")).toHaveTextContent("live ACB");
  expect(screen.getByLabelText("Merge preview")).toHaveTextContent(
    "Output language: plaintext",
  );
  fireEvent.click(screen.getByRole("button", { name: "Create merged tab" }));
  await waitFor(() =>
    expect(createTab).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Combined",
        content: "live ACB",
        language: "plaintext",
        languageLocked: true,
        workspaceId: "workspace",
      }),
      true,
    ),
  );
  expect(close).toHaveBeenCalledTimes(1);
  expect(useTabsStore.getState().tabs).toHaveLength(sourceTabs.length);
});

it("supports an exact custom separator, including an empty value", () => {
  open();
  fireEvent.click(screen.getByLabelText("Include Beta"));
  fireEvent.change(screen.getByLabelText("Separator"), {
    target: { value: "custom" },
  });
  fireEvent.change(screen.getByLabelText("Custom separator"), {
    target: { value: " | " },
  });
  expect(screen.getByLabelText("Merge preview")).toHaveTextContent(
    "saved A | B",
  );
});

it("refreshes the preview and requires a second apply when source content changes", async () => {
  open();
  fireEvent.click(screen.getByLabelText("Include Beta"));
  getContent.mockImplementation((id) => (id === "a" ? "edited A" : undefined));
  fireEvent.click(screen.getByRole("button", { name: "Create merged tab" }));
  expect(createTab).not.toHaveBeenCalled();
  expect(screen.getByText(/Source content changed/)).toBeInTheDocument();
  expect(screen.getByLabelText("Merge preview")).toHaveTextContent("edited A");
  fireEvent.click(screen.getByRole("button", { name: "Create merged tab" }));
  await waitFor(() => expect(createTab).toHaveBeenCalledTimes(1));
});

it("keeps the dialog open and sources untouched when creation fails", async () => {
  createTab.mockResolvedValue(undefined);
  open();
  fireEvent.click(screen.getByLabelText("Include Beta"));
  fireEvent.click(screen.getByRole("button", { name: "Create merged tab" }));
  await waitFor(() =>
    expect(
      screen.getByText("Could not create the merged tab."),
    ).toBeInTheDocument(),
  );
  expect(close).not.toHaveBeenCalled();
  expect(useTabsStore.getState().tabs).toEqual(sourceTabs);
});

it("discovers a registered strategy and displays its validation errors", () => {
  const strategy = {
    canMerge: jest.fn(() => ({ canMerge: true })),
    merge: jest.fn(() => ({
      ok: false,
      error: { code: "invalid", message: "Invalid format input" },
    })),
  };
  getById.mockReturnValue({ name: "JSON", mergeStrategy: strategy });
  const tabsState = {
    tabs: [sourceTabs[0], { ...sourceTabs[1], language: "json" }],
  };
  (useTabsStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector(tabsState),
  );
  (useTabsStore.getState as jest.Mock).mockImplementation(() => tabsState);
  open();
  fireEvent.click(screen.getByLabelText("Include Beta"));
  fireEvent.click(screen.getByLabelText("Merge as JSON"));
  expect(screen.getByText("Invalid format input")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Create merged tab" }),
  ).toBeDisabled();
  expect(strategy.merge).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ id: "a" }),
      expect.objectContaining({ id: "b" }),
    ]),
    {},
  );
});

it("loads format options and creates a structured result without changing sources", async () => {
  const strategy = {
    canMerge: jest.fn(() => ({ canMerge: true })),
    getOptionsUI: jest
      .fn()
      .mockResolvedValue({
        default: ({
          onOptionsChange,
        }: {
          onOptionsChange: (options: { preferLater: boolean }) => void;
        }) => (
          <button onClick={() => onOptionsChange({ preferLater: true })}>
            Prefer later
          </button>
        ),
      }),
    merge: jest.fn((_inputs, options) => ({
      ok: true,
      content: options.preferLater ? "later" : "earlier",
      language: "json",
      warnings: [],
    })),
  };
  getById.mockReturnValue({ name: "JSON", mergeStrategy: strategy });
  const tabsState = {
    tabs: [sourceTabs[0], { ...sourceTabs[1], language: "json" }],
  };
  (useTabsStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector(tabsState),
  );
  (useTabsStore.getState as jest.Mock).mockImplementation(() => tabsState);
  open();
  fireEvent.click(screen.getByLabelText("Include Beta"));
  fireEvent.click(screen.getByLabelText("Merge as JSON"));
  fireEvent.click(await screen.findByRole("button", { name: "Prefer later" }));
  expect(screen.getByLabelText("Merge preview")).toHaveTextContent("later");
  fireEvent.click(screen.getByRole("button", { name: "Create merged tab" }));
  await waitFor(() =>
    expect(createTab).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "later",
        language: "json",
      }),
      false,
    ),
  );
  expect(strategy.merge).toHaveBeenCalledWith(expect.any(Array), {
    preferLater: true,
  });
  expect(tabsState.tabs).toEqual([
    sourceTabs[0],
    { ...sourceTabs[1], language: "json" },
  ]);
});

it("explains a rejected format strategy while leaving text joining available", () => {
  getById.mockReturnValue({
    name: "JSON",
    mergeStrategy: {
      canMerge: () => ({ canMerge: false, reason: "Roots differ" }),
      merge: jest.fn(),
    },
  });
  const tabsState = {
    tabs: [sourceTabs[0], { ...sourceTabs[1], language: "json" }],
  };
  (useTabsStore as unknown as jest.Mock).mockImplementation((selector) =>
    selector(tabsState),
  );
  (useTabsStore.getState as jest.Mock).mockImplementation(() => tabsState);
  open();
  fireEvent.click(screen.getByLabelText("Include Beta"));
  expect(screen.getByLabelText("Merge as JSON")).toBeDisabled();
  expect(screen.getByText("Roots differ")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Create merged tab" }),
  ).toBeEnabled();
});
