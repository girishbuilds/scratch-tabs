import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PasteFallbackDialog } from "../PasteFallbackDialog";
import { usePasteFallbackStore } from "../../../stores/pasteFallbackStore";

const handleNewTab = jest.fn();

jest.mock("../../../stores", () => ({
  useRootStore: (selector: (s: { handleNewTab: jest.Mock }) => unknown) =>
    selector({ handleNewTab }),
}));

describe("PasteFallbackDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePasteFallbackStore.getState().dismissPasteFallback();
  });

  it("renders nothing until a paste failure is reported", () => {
    render(<PasteFallbackDialog />);
    expect(screen.queryByTestId("paste-fallback-dialog")).not.toBeInTheDocument();
  });

  it("explains the failure and offers a paste box", () => {
    render(<PasteFallbackDialog />);
    act(() => usePasteFallbackStore.getState().showPasteFallback(false, "Permission denied"));

    expect(screen.getByRole("alert")).toHaveTextContent(/could not read your clipboard/i);
    expect(screen.getByRole("alert")).toHaveTextContent("Permission denied");
    expect(screen.getByTestId("paste-fallback-input")).toBeInTheDocument();
  });

  it("creates a tab on the requested side with the pasted text", () => {
    render(<PasteFallbackDialog />);
    act(() => usePasteFallbackStore.getState().showPasteFallback(true));

    fireEvent.change(screen.getByTestId("paste-fallback-input"), { target: { value: '{"a":1}' } });
    fireEvent.click(screen.getByTestId("paste-fallback-create"));

    expect(handleNewTab).toHaveBeenCalledWith(true, '{"a":1}');
    expect(usePasteFallbackStore.getState().request).toBeNull();
  });

  it("disables Create tab while the box is empty", () => {
    render(<PasteFallbackDialog />);
    act(() => usePasteFallbackStore.getState().showPasteFallback(false));
    expect(screen.getByTestId("paste-fallback-create")).toBeDisabled();
  });

  it("closes without creating a tab on Cancel", () => {
    render(<PasteFallbackDialog />);
    act(() => usePasteFallbackStore.getState().showPasteFallback(false));

    fireEvent.click(screen.getByText("Cancel"));

    expect(handleNewTab).not.toHaveBeenCalled();
    expect(screen.queryByTestId("paste-fallback-dialog")).not.toBeInTheDocument();
  });
});
