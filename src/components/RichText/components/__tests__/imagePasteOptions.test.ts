import {
  findImagePasteOptionByShortcut,
  getImagePasteOptions,
} from "../imagePasteOptions";

describe("getImagePasteOptions", () => {
  it("orders options by likelihood with Canvas as the default", () => {
    expect(getImagePasteOptions(true).map((option) => option.id)).toEqual([
      "canvas",
      "richText",
      "dataUrl",
    ]);
  });

  it("assigns sequential shortcuts and unique test ids", () => {
    const options = getImagePasteOptions(true);

    expect(options.map((option) => option.shortcut)).toEqual(["1", "2", "3"]);
    expect(new Set(options.map((option) => option.testId)).size).toBe(3);
  });

  it("words the data URL option for an empty tab", () => {
    const dataUrl = getImagePasteOptions(true)[2];

    expect(dataUrl.title).toBe("Paste as data URL");
    expect(dataUrl.description).toContain("into this tab");
  });

  it("words the data URL option for a tab with content", () => {
    const dataUrl = getImagePasteOptions(false)[2];

    expect(dataUrl.title).toBe("Open data URL in new tab");
    expect(dataUrl.description).toContain("Keep this tab unchanged");
  });

  it("keeps the Canvas and Rich Text options independent of tab content", () => {
    expect(getImagePasteOptions(true).slice(0, 2)).toEqual(
      getImagePasteOptions(false).slice(0, 2),
    );
  });
});

describe("findImagePasteOptionByShortcut", () => {
  const options = getImagePasteOptions(true);

  it("finds the option bound to a key", () => {
    expect(findImagePasteOptionByShortcut(options, "2")?.id).toBe("richText");
  });

  it("returns undefined for unbound keys", () => {
    expect(findImagePasteOptionByShortcut(options, "9")).toBeUndefined();
    expect(findImagePasteOptionByShortcut(options, "Enter")).toBeUndefined();
  });
});
