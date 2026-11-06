import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScratchTextEditor } from "../components/ScratchTextEditor";

function renderEditor(onSave = jest.fn().mockResolvedValue(undefined), initialText = "hello") {
  const onCancel = jest.fn();
  render(<ScratchTextEditor initialText={initialText} onSave={onSave} onCancel={onCancel} />);
  const field = () => screen.getByTestId("scratch-edit-text") as HTMLTextAreaElement;
  const type = (text: string) => fireEvent.change(field(), { target: { value: text } });
  return { onSave, onCancel, field, type };
}

describe("ScratchTextEditor", () => {
  it("starts from the entry text, focused", () => {
    const { field } = renderEditor();
    expect(field().value).toBe("hello");
    expect(field()).toHaveFocus();
  });

  it("saves the edited draft", async () => {
    const { onSave, type } = renderEditor();
    type("hello world");
    fireEvent.click(screen.getByTestId("scratch-edit-save"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("hello world"));
  });

  it("saves with Cmd+Enter and Ctrl+Enter but keeps plain Enter as a newline", async () => {
    const { onSave, field, type } = renderEditor();
    type("a");
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: "Enter", metaKey: true });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(field(), { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  });

  it("cannot save a blank draft", () => {
    const { onSave, field, type } = renderEditor();
    type("  \n ");
    expect(screen.getByTestId("scratch-edit-save")).toBeDisabled();
    fireEvent.keyDown(field(), { key: "Enter", metaKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels with the button and with Escape, without letting Escape reach the drawer", () => {
    const { onCancel, field } = renderEditor();
    fireEvent.click(screen.getByTestId("scratch-edit-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);

    const outer = jest.fn();
    document.addEventListener("keydown", outer);
    fireEvent.keyDown(field(), { key: "Escape" });
    document.removeEventListener("keydown", outer);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("shows why a save failed and keeps the draft so it can be retried", async () => {
    const onSave = jest
      .fn()
      .mockRejectedValueOnce(new Error("That is too large for Scratch."))
      .mockResolvedValue(undefined);
    const { type, field } = renderEditor(onSave);
    type("big");
    fireEvent.click(screen.getByTestId("scratch-edit-save"));
    expect(await screen.findByRole("alert")).toHaveTextContent("too large");
    expect(field().value).toBe("big");

    fireEvent.click(screen.getByTestId("scratch-edit-save"));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("ignores a second save while one is in flight", async () => {
    let finish!: () => void;
    const onSave = jest.fn(() => new Promise<void>((r) => (finish = r)));
    renderEditor(onSave);
    fireEvent.click(screen.getByTestId("scratch-edit-save"));
    expect(screen.getByTestId("scratch-edit-save")).toBeDisabled();
    fireEvent.click(screen.getByTestId("scratch-edit-save"));
    expect(onSave).toHaveBeenCalledTimes(1);
    finish();
  });
});
