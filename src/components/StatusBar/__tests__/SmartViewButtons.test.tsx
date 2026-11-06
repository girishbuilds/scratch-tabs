import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SmartViewButtons } from "../SmartViewButtons";
import { smartViewRegistry } from "../../../views/registry";
import { useRootStore } from "../../../stores";

jest.mock("../../../views/registry", () => ({
  smartViewRegistry: {
    getViewsForLanguage: jest.fn(),
  },
}));

jest.mock("../../../stores", () => ({
  useRootStore: jest.fn(),
}));

const mockView = {
  id: "json-tree",
  label: "JSON Tree",
  languageId: "json",
  icon: () => null,
  component: () => null,
  mode: "replaces" as const,
};

describe("SmartViewButtons", () => {
  const mockSetActiveView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRootStore as jest.Mock).mockReturnValue({
      getActiveView: jest.fn(() => null),
      setActiveView: mockSetActiveView,
    });
  });

  it("renders nothing when no views are registered for the language", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([]);

    const { container } = render(<SmartViewButtons language="plaintext" tabId="tab-1" />);

    expect(container.firstChild).toBeNull();
  });

  it("renders both Text View and Smart View with Text View selected by default", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView]);

    render(<SmartViewButtons language="json" tabId="tab-1" />);

    expect(screen.getByTestId("text-view-button")).toHaveTextContent("Text View");
    expect(screen.getByTestId("data-view-button")).toHaveTextContent("Smart View");
    expect(screen.getByTestId("text-view-button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("data-view-button")).toHaveAttribute("aria-pressed", "false");
  });

  it("selects the primary Smart View when the data option is clicked", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView]);
    render(<SmartViewButtons language="json" tabId="tab-1" />);

    fireEvent.click(screen.getByTestId("data-view-button"));

    expect(mockSetActiveView).toHaveBeenCalledWith("tab-1", "json-tree");
  });

  it("returns to Text View when the selected text option is clicked", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView]);
    (useRootStore as jest.Mock).mockReturnValue({
      getActiveView: jest.fn(() => "json-tree"),
      setActiveView: mockSetActiveView,
    });

    render(<SmartViewButtons language="json" tabId="tab-1" />);
    fireEvent.click(screen.getByTestId("text-view-button"));

    expect(mockSetActiveView).toHaveBeenCalledWith("tab-1", null);
  });

  it("marks Smart View selected for any registered active smart view", () => {
    const secondaryView = { ...mockView, id: "json-schema", label: "Schema" };
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView, secondaryView]);
    (useRootStore as jest.Mock).mockReturnValue({
      getActiveView: jest.fn(() => "json-schema"),
      setActiveView: mockSetActiveView,
    });

    render(<SmartViewButtons language="json" tabId="tab-1" />);

    expect(screen.getByTestId("text-view-button")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("data-view-button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("data-view-button")).toHaveAttribute("aria-label", "Smart View (JSON Tree)");
  });
});
