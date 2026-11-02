import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchResizeHandle } from "../components/ScratchResizeHandle";

describe("ScratchResizeHandle", () => {
  it("is an accessible, focusable vertical separator showing the current width", () => {
    render(<ScratchResizeHandle width={420} isDragging={false} handleProps={{}} />);
    const handle = screen.getByRole("separator", { name: "Resize Scratch" });
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "420");
    expect(handle).toHaveAttribute("aria-valuemin", "320");
    expect(handle).toHaveAttribute("aria-valuemax", "800");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it("passes interaction handlers through", () => {
    const onDoubleClick = jest.fn();
    render(<ScratchResizeHandle width={420} isDragging handleProps={{ onDoubleClick }} />);
    fireEvent.doubleClick(screen.getByTestId("scratch-resize"));
    expect(onDoubleClick).toHaveBeenCalled();
  });
});
