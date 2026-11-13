import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WordCountInput } from "../WordCountInput";
import { analyzeText, generateExportReport } from "../../utils/textAnalysis";

jest.mock("../../../../hooks/useDebounce", () => ({
  useDebounce: (fn: Function) => fn,
}));

jest.mock("../../../../stores", () => ({
  useRootStore: () => ({ addBackgroundTab: jest.fn() }),
}));

jest.mock("../../../../stores/workspaceStore", () => ({
  useWorkspaceStore: () => ({ activeWorkspaceId: "ws" }),
}));

jest.mock("../../../bridge/context", () => ({
  useTabletContext: jest.fn(() => ({ tabId: "tab" })),
  TabletContextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

/**
 * Bug-confirmation test: the Report tab converts markdown to HTML with regexes
 * and injects it with dangerouslySetInnerHTML. The document title and target
 * keyword are copied into that markdown unescaped. Tablet state is restorable
 * from a shared link, so these fields are not necessarily typed by the viewer.
 * EXPECTED TO FAIL.
 */
describe("WordCountInput - report rendering", () => {
  const payload = '<img src="x" onerror="window.__pwned=1">';

  it("escapes a hostile title in the rendered report", () => {
    const text = "Some ordinary prose. It has two sentences.";
    const stats = analyzeText(text, "standard", "");
    const report = generateExportReport(stats, "standard", "general", "", text, payload);

    const { container } = render(
      <WordCountInput value={text} onChange={jest.fn()} reportContent={report} />,
    );
    fireEvent.click(screen.getByText("Report"));

    expect(container.querySelector("img[onerror]")).toBeNull();
    expect(container.innerHTML).not.toMatch(/onerror\s*=/i);
  });

  it("escapes a hostile target keyword in the rendered report", () => {
    const text = "Some ordinary prose. It has two sentences.";
    const stats = analyzeText(text, "standard", payload);
    const report = generateExportReport(stats, "standard", "general", payload, text, "");

    const { container } = render(
      <WordCountInput value={text} onChange={jest.fn()} reportContent={report} />,
    );
    fireEvent.click(screen.getByText("Report"));

    expect(container.querySelector("img[onerror]")).toBeNull();
  });
});
