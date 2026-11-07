import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchMoveMenu } from "../components/ScratchMoveMenu";
import type { MoveTarget } from "../services/entryOrdering";

function renderMenu(props: Partial<React.ComponentProps<typeof ScratchMoveMenu>> = {}) {
  const onMove = jest.fn();
  render(
    <ScratchMoveMenu label="Move entry" testId="mv" canMove={() => true} onMove={onMove} {...props} />,
  );
  return { onMove };
}
const open = () => fireEvent.click(screen.getByTestId("mv"));

describe("ScratchMoveMenu", () => {
  it("offers top, up, down and bottom", () => {
    renderMenu();
    open();
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Move to top",
      "Move up",
      "Move down",
      "Move to bottom",
    ]);
  });

  it.each([
    ["top", "mv-top"],
    ["up", "mv-up"],
    ["down", "mv-down"],
    ["bottom", "mv-bottom"],
  ] as [MoveTarget, string][])("moves %s and closes the menu", (target, testId) => {
    const { onMove } = renderMenu();
    open();
    fireEvent.click(screen.getByTestId(testId));
    expect(onMove).toHaveBeenCalledWith(target);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("disables the moves that would change nothing", () => {
    renderMenu({ canMove: (target) => target === "down" || target === "bottom" });
    open();
    expect(screen.getByTestId("mv-top")).toBeDisabled();
    expect(screen.getByTestId("mv-up")).toBeDisabled();
    expect(screen.getByTestId("mv-down")).toBeEnabled();
    expect(screen.getByTestId("mv-bottom")).toBeEnabled();
  });

  it("does not move when a disabled item is clicked", () => {
    const { onMove } = renderMenu({ canMove: () => false });
    open();
    fireEvent.click(screen.getByTestId("mv-top"));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("is disabled, with the reason as its tooltip, when a reason is given", () => {
    renderMenu({ disabledReason: "Clear the search to reorder" });
    expect(screen.getByTestId("mv")).toBeDisabled();
    expect(screen.getByTestId("mv")).toHaveAttribute("title", "Clear the search to reorder");
    open();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("reports opening so a parent can stay visible", () => {
    const onOpenChange = jest.fn();
    renderMenu({ onOpenChange });
    open();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });
});
