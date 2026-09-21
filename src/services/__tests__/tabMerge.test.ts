import type { MergeInput } from "../../formats/types";
import { modelManager } from "../modelManager";
import { captureMergeInputs, joinTabsAsText } from "../tabMerge";

jest.mock("../modelManager", () => ({
  modelManager: { getContent: jest.fn() },
}));

const getContent = modelManager.getContent as jest.MockedFunction<
  typeof modelManager.getContent
>;

const inputs: MergeInput[] = [
  { id: "second", title: "Second", content: "B", language: "json" },
  { id: "first", title: "First", content: "A", language: "csv" },
];

describe("joinTabsAsText", () => {
  it("uses the selected order and defaults to one newline", () => {
    expect(joinTabsAsText(inputs)).toEqual({
      ok: true,
      content: "B\nA",
      language: "plaintext",
      warnings: [],
    });
  });

  it("uses the exact separator, including an empty string", () => {
    expect(joinTabsAsText(inputs, " | ").content).toBe("B | A");
    expect(joinTabsAsText(inputs, "").content).toBe("BA");
    expect(joinTabsAsText(inputs, "\\n").content).toBe("B\\nA");
  });

  it("preserves empty source contents and boundary newlines", () => {
    const withEmpty = [
      { ...inputs[0], content: "" },
      { ...inputs[1], content: "A\n" },
      { ...inputs[0], id: "third", content: "" },
    ];
    expect(joinTabsAsText(withEmpty).content).toBe("\nA\n\n");
    expect(joinTabsAsText(withEmpty, "").content).toBe("A\n");
  });
});

describe("captureMergeInputs", () => {
  beforeEach(() => getContent.mockReset());

  it("prefers live Monaco content and preserves the supplied order", () => {
    getContent.mockImplementation((id) => id === "second" ? "live B" : undefined);
    const tabs = [
      { id: "second", title: "Second", content: "saved B", language: "json" },
      { id: "first", title: "First", content: "saved A", language: "csv" },
    ];

    expect(captureMergeInputs(tabs)).toEqual([
      { id: "second", title: "Second", content: "live B", language: "json" },
      { id: "first", title: "First", content: "saved A", language: "csv" },
    ]);
    expect(getContent.mock.calls.map(([id]) => id)).toEqual(["second", "first"]);
  });

  it("treats an empty live model as current content and falls back to empty saved content", () => {
    getContent.mockReturnValueOnce("").mockReturnValueOnce(undefined);
    expect(captureMergeInputs([
      { id: "live", title: "Live", content: "stale", language: "plaintext" },
      { id: "missing", title: "Missing", language: "plaintext" },
    ]).map(({ content }) => content)).toEqual(["", ""]);
  });
});
