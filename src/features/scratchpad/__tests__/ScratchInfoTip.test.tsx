import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchInfoTip } from "../components/ScratchInfoTip";

const renderTip = () =>
  render(
    <ScratchInfoTip label="About it">
      <p>Plain explanation</p>
    </ScratchInfoTip>,
  );

describe("ScratchInfoTip", () => {
  it("is hidden until needed", () => {
    renderTip();
    expect(screen.getByRole("button", { name: "About it" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows on hover and hides when the pointer leaves", () => {
    renderTip();
    const wrapper = screen.getByTestId("scratch-info").parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Plain explanation");
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows on keyboard focus and hides on blur", () => {
    renderTip();
    const button = screen.getByTestId("scratch-info");
    fireEvent.focus(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("toggles on click, for touch screens", () => {
    renderTip();
    const button = screen.getByTestId("scratch-info");
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("links the button to the panel while it is open", () => {
    renderTip();
    const button = screen.getByTestId("scratch-info");
    expect(button).not.toHaveAttribute("aria-describedby");
    fireEvent.focus(button);
    expect(button).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
