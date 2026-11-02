import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchMenu, ScratchMenuItem } from "../components/ScratchMenu";

function renderMenu(onOpenChange = jest.fn(), onSelect = jest.fn()) {
  render(
    <div>
      <button data-testid="outside">outside</button>
      <ScratchMenu label="More actions" testId="menu" onOpenChange={onOpenChange}>
        {({ close }) => (
          <>
            <ScratchMenuItem testId="item" label="Do it" icon={<i />} onSelect={() => { onSelect(); close(); }} />
            <ScratchMenuItem testId="toggle" label="Toggle" checked onSelect={jest.fn()} />
            <ScratchMenuItem testId="off" label="Off" checked={false} onSelect={jest.fn()} />
            <ScratchMenuItem testId="danger" label="Danger" danger disabled onSelect={jest.fn()} />
          </>
        )}
      </ScratchMenu>
    </div>,
  );
  return { onOpenChange, onSelect };
}

describe("ScratchMenu", () => {
  it("is closed until the trigger is clicked", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByTestId("menu")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByTestId("menu"));
    expect(screen.getByRole("menu", { name: "More actions" })).toBeInTheDocument();
    expect(screen.getByTestId("menu")).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles closed from the trigger", () => {
    renderMenu();
    fireEvent.click(screen.getByTestId("menu"));
    fireEvent.click(screen.getByTestId("menu"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("reports opening and closing", () => {
    const { onOpenChange } = renderMenu();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByTestId("menu"));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it("closes after an item that asks to", () => {
    const { onSelect } = renderMenu();
    fireEvent.click(screen.getByTestId("menu"));
    fireEvent.click(screen.getByTestId("item"));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on a press outside, but not inside", () => {
    renderMenu();
    fireEvent.click(screen.getByTestId("menu"));
    fireEvent.mouseDown(screen.getByRole("menu"));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape without letting it reach the drawer", () => {
    renderMenu();
    const parentKeyDown = jest.fn();
    document.body.addEventListener("keydown", parentKeyDown);
    fireEvent.click(screen.getByTestId("menu"));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    document.body.removeEventListener("keydown", parentKeyDown);
  });

  it("lets Escape through when the menu is closed", () => {
    const outer = jest.fn();
    render(
      <div onKeyDown={outer}>
        <ScratchMenu label="m" testId="menu2">{() => null}</ScratchMenu>
      </div>,
    );
    fireEvent.keyDown(screen.getByTestId("menu2"), { key: "Escape" });
    expect(outer).toHaveBeenCalled();
  });

  it("ignores other keys", () => {
    renderMenu();
    fireEvent.click(screen.getByTestId("menu"));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "a" });
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("marks toggles as checkable items and plain ones as items", () => {
    renderMenu();
    fireEvent.click(screen.getByTestId("menu"));
    expect(screen.getByTestId("item")).toHaveAttribute("role", "menuitem");
    expect(screen.getByTestId("toggle")).toHaveAttribute("role", "menuitemcheckbox");
    expect(screen.getByTestId("toggle")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("off")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("danger")).toBeDisabled();
  });
});
