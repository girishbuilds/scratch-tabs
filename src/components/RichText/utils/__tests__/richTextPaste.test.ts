import { handleRichTextPaste, insertImageAtSelection } from "../richTextPaste";

type View = Parameters<typeof insertImageAtSelection>[0];

const createView = (nodes: Record<string, { create: jest.Mock }>) => {
  const tr = { replaceSelectionWith: jest.fn((node) => ({ node })) };
  return {
    state: { schema: { nodes }, tr },
    dispatch: jest.fn(),
  } as unknown as View;
};

const createPasteEvent = (clipboardData: unknown) =>
  ({ clipboardData }) as unknown as ClipboardEvent;

const imageFile = new File(["png"], "shot.png", { type: "image/png" });

const clipboardWith = ({
  text = "",
  html = "",
  file = null,
}: {
  text?: string;
  html?: string;
  file?: File | null;
}) => ({
  items: file ? [{ type: file.type, getAsFile: () => file }] : [],
  getData: (format: string) =>
    format === "text/plain" ? text : format === "text/html" ? html : "",
});

describe("insertImageAtSelection", () => {
  it("prefers the resizableImage node over the plain image node", () => {
    const resizableImage = { create: jest.fn(() => "resizable-node") };
    const image = { create: jest.fn() };
    const view = createView({ resizableImage, image });

    insertImageAtSelection(view, "data:image/png;base64,abc");

    expect(resizableImage.create).toHaveBeenCalledWith({
      src: "data:image/png;base64,abc",
      alt: "",
      title: "",
    });
    expect(image.create).not.toHaveBeenCalled();
    expect(view.state.tr.replaceSelectionWith).toHaveBeenCalledWith("resizable-node");
    expect(view.dispatch).toHaveBeenCalledTimes(1);
  });

  it("falls back to the image node", () => {
    const image = { create: jest.fn(() => "image-node") };
    const view = createView({ image });

    insertImageAtSelection(view, "data:image/png;base64,abc");

    expect(view.state.tr.replaceSelectionWith).toHaveBeenCalledWith("image-node");
  });

  it("does nothing when the schema has no image node", () => {
    const view = createView({});
    insertImageAtSelection(view, "data:image/png;base64,abc");
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it("swallows insertion errors", () => {
    const image = {
      create: jest.fn(() => {
        throw new Error("invalid node");
      }),
    };
    const view = createView({ image });

    expect(() => insertImageAtSelection(view, "x")).not.toThrow();
    expect(view.dispatch).not.toHaveBeenCalled();
  });
});

describe("handleRichTextPaste", () => {
  let fileReaderSpy: jest.SpyInstance;
  let reader: {
    readAsDataURL: jest.Mock;
    onload: ((e: { target: { result: string } }) => void) | null;
  };

  beforeEach(() => {
    reader = { readAsDataURL: jest.fn(), onload: null };
    fileReaderSpy = jest
      .spyOn(global, "FileReader")
      .mockImplementation(() => reader as unknown as FileReader);
  });

  afterEach(() => {
    fileReaderSpy.mockRestore();
  });

  it("embeds an image-only clipboard and takes over the paste", () => {
    const image = { create: jest.fn(() => "image-node") };
    const view = createView({ image });

    const handled = handleRichTextPaste(
      view,
      createPasteEvent(clipboardWith({ file: imageFile })),
    );

    expect(handled).toBe(true);
    expect(reader.readAsDataURL).toHaveBeenCalledWith(imageFile);

    reader.onload?.({ target: { result: "data:image/png;base64,abc" } });

    expect(image.create).toHaveBeenCalledWith({
      src: "data:image/png;base64,abc",
      alt: "",
      title: "",
    });
    expect(view.dispatch).toHaveBeenCalledTimes(1);
  });

  it("leaves spreadsheet cells (text + html + image render) to the native paste", () => {
    const view = createView({ image: { create: jest.fn() } });

    const handled = handleRichTextPaste(
      view,
      createPasteEvent(
        clipboardWith({
          text: "a\tb\n1\t2",
          html: "<table><tr><td>a</td></tr></table>",
          file: imageFile,
        }),
      ),
    );

    expect(handled).toBe(false);
    expect(reader.readAsDataURL).not.toHaveBeenCalled();
    expect(view.dispatch).not.toHaveBeenCalled();
  });

  it("leaves plain text to the native paste", () => {
    const view = createView({});
    expect(
      handleRichTextPaste(view, createPasteEvent(clipboardWith({ text: "hello" }))),
    ).toBe(false);
  });

  it("leaves html-only image clipboards to the native paste", () => {
    const view = createView({});
    const html = '<img src="data:image/png;base64,abc">';
    expect(
      handleRichTextPaste(view, createPasteEvent(clipboardWith({ html }))),
    ).toBe(false);
  });

  it("returns false when the event has no clipboard data", () => {
    expect(handleRichTextPaste(createView({}), createPasteEvent(null))).toBe(false);
  });
});
