import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchHeader } from "../components/ScratchHeader";

function renderHeader(props: Partial<React.ComponentProps<typeof ScratchHeader>> = {}) {
  const handlers = {
    onTogglePresenting: jest.fn(),
    onToggleClipboardAutoClear: jest.fn(),
    onClearAll: jest.fn(),
    onClose: jest.fn(),
  };
  render(
    <ScratchHeader
      presenting={false}
      clipboardAutoClear
      canClearAll
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("ScratchHeader", () => {
  it("is titled Scratch Drawer", () => {
    renderHeader();
    expect(screen.getByRole("heading", { name: /Scratch Drawer/ })).toBeInTheDocument();
  });

  it("explains what the drawer is when the info icon is hovered", () => {
    renderHeader();
    expect(screen.queryByTestId("scratch-info-panel")).toBeNull();
    fireEvent.focus(screen.getByLabelText("About the Scratch Drawer"));
    const panel = screen.getByTestId("scratch-info-panel");
    expect(panel).toHaveTextContent(/commands, links, notes and keys/i);
    expect(panel).toHaveTextContent(/hidden and encrypted in this browser/i);
    expect(panel).toHaveTextContent(/not someone who can open your browser profile/i);
  });

  it("no longer shows a shield icon", () => {
    renderHeader();
    expect(screen.queryByLabelText("Encrypted")).toBeNull();
  });

  it("toggles presenting mode and reflects it", () => {
    const { onTogglePresenting } = renderHeader({ presenting: true });
    const button = screen.getByTestId("scratch-presenting");
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(onTogglePresenting).toHaveBeenCalled();
  });

  it("explains presenting mode when it is off", () => {
    renderHeader({ presenting: false });
    const button = screen.getByTestId("scratch-presenting");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.getAttribute("title")).toMatch(/screen sharing/i);
  });

  it("keeps occasional actions out of sight until the settings menu is opened", () => {
    renderHeader();
    expect(screen.queryByTestId("scratch-clipboard-clear")).toBeNull();
    expect(screen.queryByTestId("scratch-clear-all")).toBeNull();
    fireEvent.click(screen.getByTestId("scratch-settings"));
    expect(screen.getByTestId("scratch-clipboard-clear")).toBeInTheDocument();
    expect(screen.getByTestId("scratch-clear-all")).toBeInTheDocument();
  });

  it("toggles clipboard auto-clear and shows its state", () => {
    const { onToggleClipboardAutoClear } = renderHeader({ clipboardAutoClear: true });
    fireEvent.click(screen.getByTestId("scratch-settings"));
    const item = screen.getByTestId("scratch-clipboard-clear");
    expect(item).toHaveAttribute("aria-checked", "true");
    fireEvent.click(item);
    expect(onToggleClipboardAutoClear).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("shows clipboard auto-clear as off", () => {
    renderHeader({ clipboardAutoClear: false });
    fireEvent.click(screen.getByTestId("scratch-settings"));
    expect(screen.getByTestId("scratch-clipboard-clear")).toHaveAttribute("aria-checked", "false");
  });

  it("asks to clear all entries", () => {
    const { onClearAll } = renderHeader();
    fireEvent.click(screen.getByTestId("scratch-settings"));
    fireEvent.click(screen.getByTestId("scratch-clear-all"));
    expect(onClearAll).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("disables clear all when there is nothing to clear", () => {
    renderHeader({ canClearAll: false });
    fireEvent.click(screen.getByTestId("scratch-settings"));
    expect(screen.getByTestId("scratch-clear-all")).toBeDisabled();
  });

  it("closes", () => {
    const { onClose } = renderHeader();
    fireEvent.click(screen.getByTestId("scratch-close"));
    expect(onClose).toHaveBeenCalled();
  });
});
