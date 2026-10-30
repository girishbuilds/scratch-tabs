import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DevToolsRow } from "../DevToolsRow";
import { FEATURED_TOOLS } from "../utils/welcomeUtils";

describe("DevToolsRow", () => {
  const onBrowseAll = jest.fn();
  const onSelectTool = jest.fn();

  const renderRow = () =>
    render(<DevToolsRow onBrowseAll={onBrowseAll} onSelectTool={onSelectTool} />);

  beforeEach(() => jest.clearAllMocks());

  it("opens the full tool selector from the browse button", () => {
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: /40\+ dev tools/i }));

    expect(onBrowseAll).toHaveBeenCalledTimes(1);
    expect(onSelectTool).not.toHaveBeenCalled();
  });

  it("renders one chip per featured tool, followed by the more chip", () => {
    renderRow();

    const chips = within(screen.getByRole("list")).getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual([
      ...FEATURED_TOOLS.map((tool) => tool.label),
      "",
    ]);
    expect(chips[chips.length - 1]).toHaveAccessibleName("Browse all tools");
  });

  it("opens the full tool selector from the more chip", () => {
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: "Browse all tools" }));

    expect(onBrowseAll).toHaveBeenCalledTimes(1);
    expect(onSelectTool).not.toHaveBeenCalled();
  });

  it("opens the clicked tool directly", () => {
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: "JWT" }));

    expect(onSelectTool).toHaveBeenCalledWith(FEATURED_TOOLS.find((tool) => tool.id === "jwt"));
    expect(onBrowseAll).not.toHaveBeenCalled();
  });

  it("does not nest buttons inside the browse button", () => {
    renderRow();

    const browse = screen.getByRole("button", { name: /40\+ dev tools/i });
    expect(within(browse).queryAllByRole("button")).toHaveLength(0);
  });
});
