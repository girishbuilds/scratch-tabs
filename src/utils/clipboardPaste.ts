/**
 * Decides what a paste event actually carries, so each paste target can leave
 * text to the native paste and only intercept pure-image clipboards.
 *
 * Spreadsheet apps (Excel, Numbers) put a PNG render of the selected cells on
 * the clipboard next to the TSV text. Text always wins over an incidental image.
 */

/** The slice of DataTransfer that classification needs (keeps callers testable). */
export interface PasteDataSource {
  items?: ArrayLike<Pick<DataTransferItem, "type" | "getAsFile">> | null;
  getData(format: string): string;
}

export type ClipboardPasteContent =
  | { kind: "text" }
  | { kind: "image-file"; file: File }
  | { kind: "image-data-url"; dataUrl: string }
  | { kind: "none" };

const HTML_IMAGE_DATA_URL = /src=["'](data:image\/[^"']+)["']/;

export const hasPasteableText = (source: PasteDataSource): boolean =>
  source.getData("text/plain").trim() !== "";

const findImageFile = (items: PasteDataSource["items"]): File | null => {
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return null;
};

const findHtmlImageDataUrl = (source: PasteDataSource): string | null =>
  source.getData("text/html").match(HTML_IMAGE_DATA_URL)?.[1] ?? null;

export const classifyClipboardPaste = (
  source: PasteDataSource,
): ClipboardPasteContent => {
  if (hasPasteableText(source)) return { kind: "text" };

  const file = findImageFile(source.items);
  if (file) return { kind: "image-file", file };

  const dataUrl = findHtmlImageDataUrl(source);
  if (dataUrl) return { kind: "image-data-url", dataUrl };

  return { kind: "none" };
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const clipboardItemsHaveText = async (
  items: readonly ClipboardItem[],
): Promise<boolean> => {
  for (const item of items) {
    if (!item.types.includes("text/plain")) continue;
    const text = await (await item.getType("text/plain")).text();
    if (text.trim() !== "") return true;
  }
  return false;
};

/**
 * Async Clipboard API counterpart of `classifyClipboardPaste`: returns the
 * clipboard image as a data URL only when no text is present, otherwise null.
 */
export const readImageOnlyDataUrl = async (
  items: readonly ClipboardItem[],
): Promise<string | null> => {
  if (await clipboardItemsHaveText(items)) return null;

  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith("image/"));
    if (imageType) return blobToDataUrl(await item.getType(imageType));
  }
  return null;
};
