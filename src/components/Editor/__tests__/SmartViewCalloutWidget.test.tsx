import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SmartViewCalloutWidget } from "../SmartViewCalloutWidget";
import { formatRegistry } from "../../../formats";

jest.mock("../../../formats", () => ({
  formatRegistry: {
    getById: jest.fn(),
  },
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("SmartViewCalloutWidget", () => {
  const onSwitch = jest.fn();
  const onDismiss = jest.fn();
  const view = {
    id: "json-workbench",
    languageId: "json",
    label: "JSON Workbench",
    icon: () => null,
    component: () => null,
    mode: "replaces" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (formatRegistry.getById as jest.Mock).mockReturnValue({ name: "JSON" });
  });

  it("presents Smart View as the primary action", () => {
    render(
      <SmartViewCalloutWidget
        view={view}
        languageId="json"
        onSwitch={onSwitch}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId("smart-view-callout-message")).toHaveTextContent("Smart View available");
    expect(screen.getByTestId("smart-view-callout-message")).toHaveTextContent("JSON detected");
    expect(screen.getByTestId("smart-view-callout")).not.toHaveClass("border-l-primary");
    expect(screen.getByTestId("smart-view-callout-icon")).toHaveClass("text-secondary");
    expect(screen.getByTestId("smart-view-callout-data-view")).toHaveTextContent("Smart View");
    expect(screen.getByTestId("smart-view-callout-data-view")).toHaveAttribute("aria-label", "Open Smart View");
    expect(screen.getByTestId("smart-view-callout-data-view")).toHaveAttribute("title", "Open Smart View (JSON Workbench)");
  });

  it("opens Smart View and dismisses from their respective actions", () => {
    render(
      <SmartViewCalloutWidget
        view={view}
        languageId="json"
        onSwitch={onSwitch}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByTestId("smart-view-callout-data-view"));
    fireEvent.click(screen.getByTestId("smart-view-callout-dismiss"));

    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stays visible and does not auto-dismiss", () => {
    jest.useFakeTimers();
    try {
      render(
        <SmartViewCalloutWidget
          view={view}
          languageId="json"
          onSwitch={onSwitch}
          onDismiss={onDismiss}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(onDismiss).not.toHaveBeenCalled();
      expect(screen.getByTestId("smart-view-callout")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
