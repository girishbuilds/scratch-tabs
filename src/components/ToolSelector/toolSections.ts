import type { ToolItem } from '../../services/toolService';

export interface ToolSearchResults {
    documents: ToolItem[];
    tablets: ToolItem[];
    smartViews: ToolItem[];
    formats: ToolItem[];
}

export type ToolSectionColumns = 1 | 2 | 5;
export type ToolCardVariant = 'chip' | 'row';

export interface ToolSectionData {
    key: string;
    title: string;
    items: ToolItem[];
    /** Number of grid columns; keyboard navigation moves by this many items per row */
    columns: ToolSectionColumns;
    variant: ToolCardVariant;
    showDescription: boolean;
    /** Index of the section's first item in the flattened, keyboard-navigable list */
    startIndex: number;
}

const RECENT_COLUMNS: ToolSectionColumns = 5;

/**
 * Result sections in display order. Smart Views and Formats are short names
 * with generated descriptions, so they sit two per row without descriptions.
 */
const RESULT_SECTIONS: ReadonlyArray<{
    key: keyof ToolSearchResults;
    title: string;
    columns: ToolSectionColumns;
    showDescription: boolean;
}> = [
    { key: 'documents', title: 'Documents', columns: 1, showDescription: true },
    { key: 'tablets', title: 'Tablets', columns: 1, showDescription: true },
    { key: 'smartViews', title: 'Smart Views', columns: 2, showDescription: false },
    { key: 'formats', title: 'Formats', columns: 2, showDescription: false },
];

/**
 * Builds the ordered, non-empty sections shown in the tool selector.
 * Recently used tools only appear when the search box is empty.
 */
export function buildToolSections(
    searchQuery: string,
    recentItems: ToolItem[],
    results: ToolSearchResults,
): ToolSectionData[] {
    const drafts: Omit<ToolSectionData, 'startIndex'>[] = [];

    if (searchQuery === '') {
        drafts.push({
            key: 'recent',
            title: 'Recently Used',
            items: recentItems,
            columns: RECENT_COLUMNS,
            variant: 'chip',
            showDescription: false,
        });
    }

    RESULT_SECTIONS.forEach(({ key, title, columns, showDescription }) => {
        drafts.push({ key, title, items: results[key], columns, variant: 'row', showDescription });
    });

    let startIndex = 0;
    return drafts
        .filter((section) => section.items.length > 0)
        .map((section) => {
            const withIndex = { ...section, startIndex };
            startIndex += section.items.length;
            return withIndex;
        });
}

export function flattenToolSections(sections: ToolSectionData[]): ToolItem[] {
    return sections.flatMap((section) => section.items);
}
