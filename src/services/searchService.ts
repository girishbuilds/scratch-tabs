import { Tab } from "../types";
import { SearchOptions, SearchResult } from "../stores/searchStore";
import {
  tabDocumentAdapterResolver,
  type TabDocumentAdapterResolver,
  type TabDocumentSearchData,
  type TabDocumentSearchEntry,
} from "./tabDocumentAdapter";

/**
 * Core search function. Iterates through tabs and their content.
 */
export function searchTabs(
  query: string,
  options: SearchOptions,
  tabsToSearch: Tab[],
): SearchResult[] {
  return searchLoadedTabDocuments(
    query,
    options,
    tabsToSearch.map((tab) => ({
      tab,
      searchData:
        tab.isTablet || !tab.content
          ? { searchText: "", entries: [] }
          : {
              searchText: tab.content,
              entries: [{ text: tab.content, language: tab.language }],
            },
    })),
  );
}

interface LoadedTabSearchData {
  tab: Tab;
  searchData: TabDocumentSearchData;
}

export async function searchTabDocuments(
  query: string,
  options: SearchOptions,
  tabsToSearch: Tab[],
  resolver: TabDocumentAdapterResolver = tabDocumentAdapterResolver,
): Promise<SearchResult[]> {
  if (!query) return [];
  const loaded = await Promise.all(
    tabsToSearch.map(async (tab) => {
      const adapter = await resolver.resolve(tab);
      return { tab, searchData: await adapter.getSearchData(tab) };
    }),
  );
  return searchLoadedTabDocuments(query, options, loaded);
}

const searchLoadedTabDocuments = (
  query: string,
  options: SearchOptions,
  loadedTabs: LoadedTabSearchData[],
): SearchResult[] => {
  if (!query) return [];
  const results: SearchResult[] = [];
  const queryRegex = createQueryRegex(query, options);

  for (const { tab, searchData } of loadedTabs) {
    if (!searchData.searchText || !searchData.entries.length) continue;
    if (!containsQuery(searchData.searchText, query, options)) continue;
    for (const entry of searchData.entries) {
      appendEntryResults({
        entry,
        tab,
        queryRegex,
        results,
      });
    }
  }
  return results;
};

const appendEntryResults = ({
  entry,
  tab,
  queryRegex,
  results,
}: {
  entry: TabDocumentSearchEntry;
  tab: Tab;
  queryRegex: RegExp;
  results: SearchResult[];
}): void => {
    // Match against the original line, never a lower-cased copy: lower-casing
    // changes the length of some characters (e.g. "İ"), which would shift
    // every offset after them.
    const lines = entry.text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      queryRegex.lastIndex = 0;
      let match;
      while ((match = queryRegex.exec(line)) !== null) {
        results.push(toSearchResult(tab, entry, line, i, match.index, match[0].length));
        if (match[0].length === 0) {
          queryRegex.lastIndex++;
        }
      }
    }
};

const toSearchResult = (
  tab: Tab,
  entry: TabDocumentSearchEntry,
  lineText: string,
  lineIndex: number,
  matchIndex: number,
  matchLength: number,
): SearchResult => ({
  tabId: tab.id,
  workspaceId: tab.workspaceId,
  tabTitle: tab.title,
  language: entry.language,
  lineNumber: lineIndex + 1,
  lineText,
  matchIndex,
  matchLength,
  tabContent: entry.text,
  resultKind: entry.itemId ? "canvas-item" : "tab",
  ...(entry.itemId ? { canvasItemId: entry.itemId } : {}),
  ...(entry.itemType ? { canvasItemType: entry.itemType } : {}),
  ...(entry.itemLabel ? { itemLabel: entry.itemLabel } : {}),
});

/**
 * Builds the global regex used to find matches in the original text.
 * Case-insensitivity comes from the `i` flag rather than from lower-casing the
 * text, so match offsets always refer to the original string.
 */
const createQueryRegex = (query: string, options: SearchOptions): RegExp => {
  const source = escapeRegex(query);
  return new RegExp(
    options.wholeWord ? `\\b${source}\\b` : source,
    options.caseSensitive ? "g" : "gi",
  );
};

const containsQuery = (
  text: string,
  query: string,
  options: SearchOptions,
): boolean => {
  const regex = createQueryRegex(query, options);
  regex.lastIndex = 0;
  return regex.test(text);
};

/** Helper to escape regex special characters in the query */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * Helper to highlight matches in a text string. Returns an HTML string.
 */
export function highlightMatchesInText(
  text: string,
  query: string,
  options: SearchOptions,
): string {
  if (!query || !text) {
    return escapeHtml(text); // Return escaped text if no query or text
  }

  const queryRegex = createQueryRegex(query, options);

  let lastIndex = 0;
  let highlightedText = "";

  let match;
  while ((match = queryRegex.exec(text)) !== null) {
    highlightedText += escapeHtml(text.substring(lastIndex, match.index));
    highlightedText += `<mark class="bg-yellow-500/40 text-yellow-100 px-0.5 rounded">${escapeHtml(text.substring(match.index, match.index + match[0].length))}</mark>`;
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) {
      // Prevent infinite loop for zero-width matches
      queryRegex.lastIndex++;
    }
  }

  highlightedText += escapeHtml(text.substring(lastIndex)); // Append remaining text

  return highlightedText;
}

/** Basic HTML escaping */
function escapeHtml(unsafe: string): string {
  if (!unsafe) return ""; // Handle null/undefined/empty input
  return unsafe
    .replace(/&/g, "&amp;") // Escape ampersand first
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;") // Escape double quotes
    .replace(/'/g, "&#039;"); // Escape single quotes
}
