import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { UpgradeConfirmationModal } from "../UpgradeConfirmationModal";

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

const renderModal = (
  isCurrentTabEmpty: boolean,
  imageDataUrl: string | null = null,
) => {
  const actions = {
    onCancel: jest.fn(),
    onPasteAsDataUrl: jest.fn(),
    onPasteInRichText: jest.fn(),
    onPasteInCanvas: jest.fn(),
  };

  render(
    <UpgradeConfirmationModal
      isOpen
      isCurrentTabEmpty={isCurrentTabEmpty}
      imageDataUrl={imageDataUrl}
      {...actions}
    />,
  );

  return actions;
};

describe("UpgradeConfirmationModal", () => {
  it("offers to paste the data URL into an empty Monaco tab", () => {
    renderModal(true);

    expect(
      screen.getByRole("button", { name: /Paste as data URL/i }),
    ).toHaveTextContent("Insert the image's raw data into this tab.");
    expect(
      screen.getByRole("button", { name: /Paste in Rich Text/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Paste in Canvas/i }),
    ).toBeInTheDocument();
  });

  it("offers to open the data URL in a new tab when Monaco has content", () => {
    renderModal(false);

    expect(
      screen.getByRole("button", { name: /Open data URL in new tab/i }),
    ).toHaveTextContent("Keep this tab unchanged");
  });

  it("lists Canvas first, then Rich Text, then the data URL option", () => {
    renderModal(true);

    const testIds = screen
      .getAllByRole("button")
      .map((button) => button.getAttribute("data-testid"))
      .filter((id) => id?.startsWith("paste-image-"));

    expect(testIds).toEqual([
      "paste-image-in-canvas",
      "paste-image-in-rich-text",
      "paste-image-as-data-url",
    ]);
  });

  it("focuses the first option so Enter picks Canvas", () => {
    renderModal(true);

    expect(screen.getByTestId("paste-image-in-canvas")).toHaveFocus();
  });

  it("runs the selected data URL action", () => {
    const actions = renderModal(false);

    fireEvent.click(
      screen.getByRole("button", { name: /Open data URL in new tab/i }),
    );

    expect(actions.onPasteAsDataUrl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["1", "onPasteInCanvas"],
    ["2", "onPasteInRichText"],
    ["3", "onPasteAsDataUrl"],
  ] as const)("runs the matching action when %s is pressed", (key, action) => {
    const actions = renderModal(true);

    fireEvent.keyDown(document, { key });

    expect(actions[action]).toHaveBeenCalledTimes(1);
  });

  it("ignores number keys pressed with a modifier", () => {
    const actions = renderModal(true);

    fireEvent.keyDown(document, { key: "1", metaKey: true });
    fireEvent.keyDown(document, { key: "2", ctrlKey: true });
    fireEvent.keyDown(document, { key: "3", altKey: true });

    expect(actions.onPasteInCanvas).not.toHaveBeenCalled();
    expect(actions.onPasteInRichText).not.toHaveBeenCalled();
    expect(actions.onPasteAsDataUrl).not.toHaveBeenCalled();
  });

  it("ignores other keys", () => {
    const actions = renderModal(true);

    fireEvent.keyDown(document, { key: "4" });
    fireEvent.keyDown(document, { key: "a" });

    expect(actions.onCancel).not.toHaveBeenCalled();
    expect(actions.onPasteInCanvas).not.toHaveBeenCalled();
  });

  it("runs only one action while another is in progress", () => {
    const actions = renderModal(true);
    actions.onPasteInCanvas.mockReturnValue(new Promise(() => {}));

    fireEvent.keyDown(document, { key: "1" });
    fireEvent.keyDown(document, { key: "2" });

    expect(actions.onPasteInCanvas).toHaveBeenCalledTimes(1);
    expect(actions.onPasteInRichText).not.toHaveBeenCalled();
  });

  it("shows the error and re-enables the options when an action fails", async () => {
    const actions = renderModal(true);
    actions.onPasteInCanvas.mockRejectedValue(new Error("Canvas is full"));

    fireEvent.click(screen.getByTestId("paste-image-in-canvas"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Canvas is full");
    expect(screen.getByTestId("paste-image-in-canvas")).toBeEnabled();
  });

  it("falls back to a generic message for non-Error failures", async () => {
    const actions = renderModal(true);
    actions.onPasteInCanvas.mockRejectedValue("nope");

    fireEvent.click(screen.getByTestId("paste-image-in-canvas"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The image could not be pasted.",
    );
  });

  it("closes when Escape is pressed", () => {
    const actions = renderModal(true);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(actions.onCancel).toHaveBeenCalledTimes(1);
  });

  it("closes from the close button", () => {
    const actions = renderModal(true);

    fireEvent.click(screen.getByLabelText("Close image paste options"));

    expect(actions.onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders nothing and ignores keys while closed", () => {
    const onPasteInCanvas = jest.fn();
    render(
      <UpgradeConfirmationModal
        isOpen={false}
        isCurrentTabEmpty
        onCancel={jest.fn()}
        onPasteAsDataUrl={jest.fn()}
        onPasteInRichText={jest.fn()}
        onPasteInCanvas={onPasteInCanvas}
      />,
    );

    fireEvent.keyDown(document, { key: "1" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onPasteInCanvas).not.toHaveBeenCalled();
  });

  it("shows a preview of the pasted image", async () => {
    renderModal(true, PNG_DATA_URL);

    const image = screen.getByAltText("Pasted image preview");
    expect(image).toHaveAttribute("src", PNG_DATA_URL);
    await waitFor(() =>
      expect(screen.getByTestId("paste-image-preview-meta")).toHaveTextContent(
        "PNG",
      ),
    );
  });

  it("omits the preview when there is no image data", () => {
    renderModal(true, null);

    expect(screen.queryByTestId("paste-image-preview")).not.toBeInTheDocument();
  });
});
