import {
  classifyClipboardPaste,
  hasPasteableText,
  readImageOnlyDataUrl,
  type PasteDataSource,
} from "../clipboardPaste";

const PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA";

const imageFile = () => new File(["png"], "shot.png", { type: "image/png" });

const createSource = ({
  data = {},
  files = [],
}: {
  data?: Record<string, string>;
  files?: { type: string; file: File | null }[];
} = {}): PasteDataSource => ({
  items: files.map(({ type, file }) => ({
    type,
    getAsFile: () => file,
  })),
  getData: (format: string) => data[format] ?? "",
});

describe("hasPasteableText", () => {
  it("is true for non-empty text/plain", () => {
    expect(hasPasteableText(createSource({ data: { "text/plain": "a" } }))).toBe(true);
  });

  it("is false for empty or whitespace-only text/plain", () => {
    expect(hasPasteableText(createSource())).toBe(false);
    expect(hasPasteableText(createSource({ data: { "text/plain": " \n\t " } }))).toBe(false);
  });
});

describe("classifyClipboardPaste", () => {
  it("classifies plain text as text", () => {
    const source = createSource({ data: { "text/plain": "hello" } });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "text" });
  });

  it("classifies spreadsheet cells (TSV + html table + png render) as text", () => {
    const source = createSource({
      data: {
        "text/plain": "a\tb\n1\t2",
        "text/html": "<table><tr><td>a</td></tr></table>",
      },
      files: [{ type: "image/png", file: imageFile() }],
    });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "text" });
  });

  it("classifies text whose html embeds a data URL image as text", () => {
    const source = createSource({
      data: {
        "text/plain": "Hi there",
        "text/html": `<p>Hi there</p><img src="${PNG_DATA_URL}">`,
      },
    });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "text" });
  });

  it("classifies an image-only clipboard as an image file", () => {
    const file = imageFile();
    const source = createSource({ files: [{ type: "image/png", file }] });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "image-file", file });
  });

  it("treats whitespace-only text beside an image as an image paste", () => {
    const file = imageFile();
    const source = createSource({
      data: { "text/plain": "  \n" },
      files: [{ type: "image/png", file }],
    });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "image-file", file });
  });

  it("picks the first image item that yields a file", () => {
    const file = imageFile();
    const source = createSource({
      files: [
        { type: "text/plain", file: null },
        { type: "image/png", file: null },
        { type: "image/jpeg", file },
      ],
    });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "image-file", file });
  });

  it("classifies html with an embedded data URL image and no text as image-data-url", () => {
    const source = createSource({
      data: { "text/html": `<meta charset="utf-8"><img src='${PNG_DATA_URL}' alt="">` },
    });
    expect(classifyClipboardPaste(source)).toEqual({
      kind: "image-data-url",
      dataUrl: PNG_DATA_URL,
    });
  });

  it("prefers an image file over an html data URL image", () => {
    const file = imageFile();
    const source = createSource({
      data: { "text/html": `<img src="${PNG_DATA_URL}">` },
      files: [{ type: "image/png", file }],
    });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "image-file", file });
  });

  it("ignores html images that are remote URLs", () => {
    const source = createSource({
      data: { "text/html": '<img src="https://example.com/a.png">' },
    });
    expect(classifyClipboardPaste(source)).toEqual({ kind: "none" });
  });

  it("returns none for an empty clipboard and for missing items", () => {
    expect(classifyClipboardPaste(createSource())).toEqual({ kind: "none" });
    expect(
      classifyClipboardPaste({ items: null, getData: () => "" }),
    ).toEqual({ kind: "none" });
  });
});

describe("readImageOnlyDataUrl", () => {
  const createItem = (parts: Record<string, Blob>): ClipboardItem =>
    ({
      types: Object.keys(parts),
      getType: jest.fn(async (type: string) => parts[type]),
    }) as unknown as ClipboardItem;

  const pngBlob = new Blob(["png"], { type: "image/png" });
  // jsdom's Blob has no text(), so stand in for the browser's text blob
  const textBlob = (text: string) =>
    ({ type: "text/plain", text: async () => text }) as unknown as Blob;

  it("returns the image as a data URL when the clipboard has no text", async () => {
    const result = await readImageOnlyDataUrl([createItem({ "image/png": pngBlob })]);
    expect(result).toBe("data:image/png;base64,cG5n");
  });

  it("returns null when text accompanies the image (spreadsheet cells)", async () => {
    const item = createItem({
      "text/plain": textBlob("a\tb"),
      "image/png": pngBlob,
    });
    await expect(readImageOnlyDataUrl([item])).resolves.toBeNull();
    expect(item.getType).not.toHaveBeenCalledWith("image/png");
  });

  it("returns null when the text is in a different item than the image", async () => {
    const items = [
      createItem({ "image/png": pngBlob }),
      createItem({ "text/plain": textBlob("hello") }),
    ];
    await expect(readImageOnlyDataUrl(items)).resolves.toBeNull();
  });

  it("treats whitespace-only text as no text", async () => {
    const item = createItem({
      "text/plain": textBlob("  \n"),
      "image/png": pngBlob,
    });
    await expect(readImageOnlyDataUrl([item])).resolves.toBe(
      "data:image/png;base64,cG5n",
    );
  });

  it("returns null when there is no image and no text", async () => {
    const item = createItem({ "text/html": new Blob(["<b>x</b>"]) });
    await expect(readImageOnlyDataUrl([item])).resolves.toBeNull();
    await expect(readImageOnlyDataUrl([])).resolves.toBeNull();
  });

  it("rejects when the image blob cannot be read", async () => {
    const failingReader = {
      readAsDataURL() {
        this.error = new Error("read failed");
        this.onerror?.();
      },
      error: null as Error | null,
      onerror: null as (() => void) | null,
      onloadend: null,
    };
    const spy = jest
      .spyOn(global, "FileReader")
      .mockImplementation(() => failingReader as unknown as FileReader);

    await expect(
      readImageOnlyDataUrl([createItem({ "image/png": pngBlob })]),
    ).rejects.toThrow("read failed");
    spy.mockRestore();
  });
});
