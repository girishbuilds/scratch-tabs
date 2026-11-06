import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchComposer } from "../components/ScratchComposer";

const paste = (el: HTMLElement, text: string) => {
  const event = new Event("paste", { bubbles: true, cancelable: true }) as Event & {
    clipboardData: { getData: () => string };
  };
  event.clipboardData = { getData: () => text };
  fireEvent(el, event);
  return event;
};

describe("ScratchComposer", () => {
  it("focuses the input on mount", () => {
    render(<ScratchComposer onSubmit={jest.fn()} />);
    expect(screen.getByTestId("scratch-input")).toHaveFocus();
  });

  it("submits pasted text immediately and never puts it in the textarea", () => {
    const onSubmit = jest.fn();
    render(<ScratchComposer onSubmit={onSubmit} />);
    const input = screen.getByTestId("scratch-input") as HTMLTextAreaElement;
    const event = paste(input, "Prod-Key: abc123def456");
    expect(onSubmit).toHaveBeenCalledWith("Prod-Key: abc123def456");
    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe("");
  });

  it("pastes into the field when there is already typed text", () => {
    const onSubmit = jest.fn();
    render(<ScratchComposer onSubmit={onSubmit} />);
    const input = screen.getByTestId("scratch-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "My key: " } });
    const event = paste(input, "abc123def456");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    expect(input.value).toBe("My key: ");
  });

  it("lets blank pastes through untouched", () => {
    const onSubmit = jest.fn();
    render(<ScratchComposer onSubmit={onSubmit} />);
    const event = paste(screen.getByTestId("scratch-input"), "   ");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("submits typed text on Enter and clears the box", () => {
    const onSubmit = jest.fn();
    render(<ScratchComposer onSubmit={onSubmit} />);
    const input = screen.getByTestId("scratch-input") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "remember this" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("remember this");
    expect(input.value).toBe("");
  });

  it("keeps Shift+Enter for new lines", () => {
    const onSubmit = jest.fn();
    render(<ScratchComposer onSubmit={onSubmit} />);
    const input = screen.getByTestId("scratch-input");
    fireEvent.change(input, { target: { value: "line one" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit an empty draft", () => {
    const onSubmit = jest.fn();
    render(<ScratchComposer onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByTestId("scratch-input"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit while an IME composition is in progress", () => {
    const onSubmit = jest.fn();
    render(<ScratchComposer onSubmit={onSubmit} />);
    const input = screen.getByTestId("scratch-input");
    fireEvent.change(input, { target: { value: "にほん" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
