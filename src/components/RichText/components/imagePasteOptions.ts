export type ImagePasteOptionId = "canvas" | "richText" | "dataUrl";

export interface ImagePasteOption {
  id: ImagePasteOptionId;
  title: string;
  description: string;
  testId: string;
  /** Key that triggers the option while the dialog is open */
  shortcut: string;
}

/**
 * Options for an image-only paste into a text tab, most likely first.
 * The first option is the default (focused, so Enter picks it).
 */
export const getImagePasteOptions = (
  isCurrentTabEmpty: boolean,
): ImagePasteOption[] => [
  {
    id: "canvas",
    title: "Paste in Canvas",
    description: "Create and switch to a new Canvas containing the image.",
    testId: "paste-image-in-canvas",
    shortcut: "1",
  },
  {
    id: "richText",
    title: "Paste in Rich Text",
    description:
      "Switch this tab to Rich Text and embed the image with the existing content.",
    testId: "paste-image-in-rich-text",
    shortcut: "2",
  },
  {
    id: "dataUrl",
    title: isCurrentTabEmpty ? "Paste as data URL" : "Open data URL in new tab",
    description: isCurrentTabEmpty
      ? "Insert the image's raw data into this tab."
      : "Keep this tab unchanged and open the raw image data in a new plain-text tab.",
    testId: "paste-image-as-data-url",
    shortcut: "3",
  },
];

export const findImagePasteOptionByShortcut = (
  options: ImagePasteOption[],
  key: string,
): ImagePasteOption | undefined =>
  options.find((option) => option.shortcut === key);
