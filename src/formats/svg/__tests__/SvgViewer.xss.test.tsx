import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SvgViewer } from "../views/components/SvgViewer";
import { SmartViewProps } from "../../../views/registry";

jest.mock("../utils/optimizer", () => ({
  optimizeWithSvgo: jest.fn(),
  basicCleanup: jest.fn(),
  validateSvg: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  extractSvgMetadata: jest.fn().mockReturnValue({ complexityScore: 5 }),
  generateOptimizationSuggestions: jest.fn().mockReturnValue([]),
}));

jest.mock("../../../stores/activeEditorStore", () => ({
  useActiveEditorStore: jest.fn(() => ({
    activeLeftEditor: null,
    activeRightEditor: null,
  })),
}));

/**
 * Bug-confirmation test: SVG preview injects the document into the app origin
 * via dangerouslySetInnerHTML with no sanitization. SVG content can arrive from
 * a shared link (#/s/v1/svg/...), a pasted file or a download. EXPECTED TO FAIL.
 */
describe("SvgViewer - untrusted SVG", () => {
  const hostile =
    '<svg xmlns="http://www.w3.org/2000/svg" onload="window.__pwned=1" width="100" height="100">' +
    '<script>window.__pwned=1</script>' +
    '<a href="javascript:window.__pwned=1"><rect width="50" height="50"/></a>' +
    '<foreignObject><img src="x" onerror="window.__pwned=1"/></foreignObject>' +
    "</svg>";

  const props: SmartViewProps = {
    content: hostile,
    onContentChange: jest.fn(),
    tabId: "t",
    isActive: true,
    side: "left",
  };

  it("does not put scripts, event handlers or javascript: URLs into the preview DOM", () => {
    render(<SvgViewer {...props} />);
    const container = screen.getByTestId("svg-container");

    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toMatch(/\son(load|error)\s*=/i);
    expect(container.innerHTML).not.toMatch(/javascript:/i);
  });
});
