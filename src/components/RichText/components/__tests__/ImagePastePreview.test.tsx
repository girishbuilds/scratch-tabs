import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ImagePastePreview } from "../ImagePastePreview";

// 1x1 transparent PNG
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const loadImage = (width: number, height: number) => {
  const image = screen.getByAltText("Pasted image preview");
  Object.defineProperty(image, "naturalWidth", { value: width });
  Object.defineProperty(image, "naturalHeight", { value: height });
  fireEvent.load(image);
};

describe("ImagePastePreview", () => {
  it("renders the pasted image", () => {
    render(<ImagePastePreview dataUrl={PNG_DATA_URL} />);

    expect(screen.getByAltText("Pasted image preview")).toHaveAttribute(
      "src",
      PNG_DATA_URL,
    );
  });

  it("describes the type and size before the image has loaded", () => {
    render(<ImagePastePreview dataUrl={PNG_DATA_URL} />);

    expect(screen.getByTestId("paste-image-preview-meta")).toHaveTextContent(
      /^PNG · \d+ B$/,
    );
  });

  it("adds the dimensions once the image has loaded", () => {
    render(<ImagePastePreview dataUrl={PNG_DATA_URL} />);

    loadImage(640, 480);

    expect(screen.getByTestId("paste-image-preview-meta")).toHaveTextContent(
      /^640×480 · PNG · \d+ B$/,
    );
  });

  it("shows only the dimensions when the data URL cannot be parsed", () => {
    render(<ImagePastePreview dataUrl="data:image/png;base64,@@@" />);

    loadImage(32, 16);

    expect(screen.getByTestId("paste-image-preview-meta")).toHaveTextContent(
      /^32×16$/,
    );
  });

  it("has no details when nothing is known about the image", () => {
    render(<ImagePastePreview dataUrl="data:image/png;base64,@@@" />);

    expect(screen.getByTestId("paste-image-preview-meta")).toBeEmptyDOMElement();
  });
});
