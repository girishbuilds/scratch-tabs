import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { WelcomeScreen } from "../WelcomeScreen";
import { useRootStore } from "../../../stores";
import { toolService } from "../../../services/toolService";
import { APP_VERSION } from "../../../data/releases";

jest.mock("../../../stores", () => ({
  useRootStore: jest.fn(),
}));

jest.mock("../../Tab/TabActions", () => ({
  TabActions: () => <div data-testid="tab-actions" />,
}));

jest.mock("../../ToolSelector", () => ({
  ToolSelectorModal: () => <div data-testid="tool-selector" />,
}));

jest.mock("../../../services/toolService", () => ({
  toolService: { executeTool: jest.fn() },
}));

jest.mock("../../../features/import-export/ImportExportService", () => ({
  ImportExportService: jest.fn(),
}));

describe("WelcomeScreen", () => {
  const handleNewTab = jest.fn();
  const handleNewPopulatedTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRootStore as jest.Mock).mockReturnValue({
      handleNewTab,
      handleNewPopulatedTab,
    });
  });

  const renderWelcomeScreen = () =>
    render(
      <BrowserRouter>
        <WelcomeScreen />
      </BrowserRouter>,
    );

  it("uses a dedicated scroll container for the welcome content", () => {
    renderWelcomeScreen();

    expect(screen.getByTestId("welcome-scroll-container")).toHaveClass(
      "overflow-y-auto",
      "justify-start",
      "md:justify-center",
    );
  });

  it("shows a mobile-only desktop recommendation without removing desktop actions", () => {
    renderWelcomeScreen();

    expect(screen.getByTestId("mobile-desktop-recommendation")).toHaveTextContent(
      "Best on desktop",
    );
    expect(screen.getByTestId("mobile-desktop-recommendation")).toHaveClass("md:hidden");
    expect(screen.getByTestId("desktop-secondary-actions")).toHaveClass("hidden", "md:block");
    expect(screen.getByTestId("mobile-secondary-actions")).toHaveClass("md:hidden");
  });

  it("keeps the primary mobile actions available", () => {
    renderWelcomeScreen();

    fireEvent.click(screen.getByRole("button", { name: /new scratch tab/i }));

    expect(handleNewTab).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: /try a smart view/i })).toHaveClass("md:p-6");
  });

  it("makes New Scratch Tab the only filled primary action", () => {
    renderWelcomeScreen();

    expect(screen.getByText("Create tab")).toHaveClass("bg-primary");
    expect(screen.getByText("Try example")).not.toHaveClass("bg-primary");
  });

  it("opens the tool selector from the dev tools row", () => {
    jest.useFakeTimers();
    renderWelcomeScreen();

    fireEvent.click(screen.getByRole("button", { name: /40\+ dev tools/i }));
    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(screen.getByTestId("tool-selector")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("opens a featured tool directly from its chip", async () => {
    renderWelcomeScreen();

    fireEvent.click(screen.getByRole("button", { name: "JWT" }));

    await waitFor(() =>
      expect(toolService.executeTool).toHaveBeenCalledWith(
        expect.objectContaining({ id: "jwt", type: "tablet" }),
        expect.objectContaining({ side: "left" }),
      ),
    );
    expect(screen.queryByTestId("tool-selector")).not.toBeInTheDocument();
  });

  it("shows the paste/drop hint and keeps the version out of the hero", () => {
    renderWelcomeScreen();

    expect(screen.getByTestId("paste-drop-hint")).toBeInTheDocument();
    expect(screen.getByText(`// v${APP_VERSION}`)).toBeInTheDocument();
  });

  it("keeps secondary entry points compact, without descriptions", () => {
    renderWelcomeScreen();

    expect(screen.queryByText("From your computer")).not.toBeInTheDocument();
    expect(screen.queryByText("Load .scratch file")).not.toBeInTheDocument();
  });

  it("keeps the secondary entry points", () => {
    renderWelcomeScreen();

    ["Open File", "Paste Content", "Import Workspace"].forEach((name) => {
      expect(screen.getAllByRole("button", { name: new RegExp(name, "i") }).length).toBeGreaterThan(0);
    });
  });
});
