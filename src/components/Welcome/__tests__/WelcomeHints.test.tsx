import React from "react";
import { render, screen } from "@testing-library/react";
import { PasteDropHint } from "../PasteDropHint";
import { WelcomeShortcuts } from "../WelcomeShortcuts";

const mockPlatform = (platform: string) =>
  jest.spyOn(window.navigator, "platform", "get").mockReturnValue(platform);

afterEach(() => jest.restoreAllMocks());

describe("PasteDropHint", () => {
  it("shows the Command key on macOS", () => {
    mockPlatform("MacIntel");
    render(<PasteDropHint />);

    expect(screen.getByText("⌘V")).toBeInTheDocument();
    expect(screen.getByTestId("paste-drop-hint")).toHaveTextContent("drop a file anywhere");
  });

  it("shows Ctrl+V on other platforms", () => {
    mockPlatform("Win32");
    render(<PasteDropHint />);

    expect(screen.getByText("Ctrl+V")).toBeInTheDocument();
  });

  it("is desktop-only", () => {
    render(<PasteDropHint />);

    expect(screen.getByTestId("paste-drop-hint")).toHaveClass("hidden", "md:block");
  });
});

describe("WelcomeShortcuts", () => {
  it("renders each shortcut with its label", () => {
    render(<WelcomeShortcuts />);

    const list = screen.getByTestId("welcome-shortcuts");
    expect(list).toHaveTextContent("Double Click to create tab");
    expect(list).toHaveTextContent("/ for dev tools");
    expect(list).toHaveTextContent("Ctrl+Shift+- / Ctrl+Shift+= to navigate");
  });

  it("uses the higher-contrast secondary text colour", () => {
    render(<WelcomeShortcuts />);

    expect(screen.getByTestId("welcome-shortcuts")).toHaveClass("text-secondary");
  });

  it("is desktop-only", () => {
    render(<WelcomeShortcuts />);

    expect(screen.getByTestId("welcome-shortcuts")).toHaveClass("hidden", "md:flex");
  });
});
