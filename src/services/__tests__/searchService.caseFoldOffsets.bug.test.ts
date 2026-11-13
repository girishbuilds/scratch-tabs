/**
 * KNOWN-FAILING tests (see BUGS.md).
 *
 * Case-insensitive search lower-cases the haystack and then uses offsets from the lower-cased
 * copy to slice the ORIGINAL text. toLowerCase() changes the length of some characters
 * ("İ" U+0130 becomes "i" + U+0307), so every offset after such a character is shifted.
 */
jest.mock("../tabDocumentAdapter", () => ({ tabDocumentAdapterResolver: {} }));

import { highlightMatchesInText, searchTabs } from "../searchService";
import type { Tab } from "../../types";

const options = { caseSensitive: false, wholeWord: false } as any;
const line = "İstanbul report: total=42";

describe("BUG: search offsets drift after characters whose lowercase form is longer", () => {
  it("highlights exactly the matched text", () => {
    const html = highlightMatchesInText(line, "total", options);
    expect(html).toContain(">total</mark>");
  });

  it("reports the match index in the original line (used to select the match in the editor)", () => {
    const tab = { id: "t", title: "t", content: line, language: "plaintext", workspaceId: "w" } as Tab;
    const [result] = searchTabs("total", options, [tab]);
    expect(result.lineText.substr(result.matchIndex, result.matchLength)).toBe("total");
  });

  it("whole-word highlighting has the same problem", () => {
    const html = highlightMatchesInText(line, "total", { ...options, wholeWord: true });
    expect(html).toContain(">total</mark>");
  });
});
