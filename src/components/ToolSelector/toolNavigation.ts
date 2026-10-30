import type { ToolSectionData } from './toolSections';

export type NavigationKey = 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight';

/**
 * Computes the next selected index for an arrow key press.
 *
 * Every section is a grid (a list is a one-column grid). Up/down move by one
 * row and spill into the neighbouring section at the edges, wrapping around
 * the whole list; left/right move within a row. Returns the same index when
 * the key does not move the selection.
 */
export function moveSelection(
    key: NavigationKey,
    index: number,
    sections: ToolSectionData[],
): number {
    const position = sections.findIndex(
        (section) => index >= section.startIndex && index < section.startIndex + section.items.length,
    );
    if (position < 0) return 0;

    const section = sections[position];
    const end = section.startIndex + section.items.length;
    const offset = index - section.startIndex;

    switch (key) {
        case 'ArrowDown': {
            const lastRow = Math.floor((section.items.length - 1) / section.columns);
            if (Math.floor(offset / section.columns) < lastRow) {
                return Math.min(index + section.columns, end - 1);
            }
            return sections[position + 1]?.startIndex ?? 0;
        }
        case 'ArrowUp': {
            if (offset - section.columns >= 0) return index - section.columns;
            const previous = sections[position - 1];
            if (previous) return previous.startIndex + previous.items.length - 1;
            const last = sections[sections.length - 1];
            return last.startIndex + last.items.length - 1;
        }
        case 'ArrowLeft':
            return offset % section.columns > 0 ? index - 1 : index;
        case 'ArrowRight':
            return (offset + 1) % section.columns !== 0 && index + 1 < end ? index + 1 : index;
    }
}
