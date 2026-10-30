import { moveSelection } from '../toolNavigation';
import { ToolSectionData, ToolSectionColumns } from '../toolSections';

const makeSection = (
    key: string,
    count: number,
    columns: ToolSectionColumns,
    startIndex: number,
): ToolSectionData => ({
    key,
    title: key,
    columns,
    startIndex,
    variant: 'row',
    showDescription: false,
    items: Array.from({ length: count }, (_, i) => ({ id: `${key}${i}`, type: 'tablet' as const, label: `${key}${i}` })),
});

// recent: 0-9 (5 columns), tablets: 10-12 (1 column), formats: 13-17 (2 columns, last row has one item)
const sections = [
    makeSection('recent', 10, 5, 0),
    makeSection('tablets', 3, 1, 10),
    makeSection('formats', 5, 2, 13),
];

describe('moveSelection', () => {
    describe('ArrowDown', () => {
        it('moves by a full row in a grid', () => {
            expect(moveSelection('ArrowDown', 0, sections)).toBe(5);
            expect(moveSelection('ArrowDown', 3, sections)).toBe(8);
        });

        it('moves to the next section from the last row', () => {
            expect(moveSelection('ArrowDown', 7, sections)).toBe(10);
        });

        it('moves one item at a time in a single column', () => {
            expect(moveSelection('ArrowDown', 10, sections)).toBe(11);
            expect(moveSelection('ArrowDown', 12, sections)).toBe(13);
        });

        it('lands on the last item when the row below is shorter', () => {
            // formats offset 3 (index 16) -> row below only has offset 4 (index 17)
            expect(moveSelection('ArrowDown', 16, sections)).toBe(17);
        });

        it('wraps to the first item from the end', () => {
            expect(moveSelection('ArrowDown', 17, sections)).toBe(0);
        });
    });

    describe('ArrowUp', () => {
        it('moves up a full row in a grid', () => {
            expect(moveSelection('ArrowUp', 8, sections)).toBe(3);
        });

        it('moves to the last item of the previous section from the first row', () => {
            expect(moveSelection('ArrowUp', 10, sections)).toBe(9);
            expect(moveSelection('ArrowUp', 13, sections)).toBe(12);
            expect(moveSelection('ArrowUp', 14, sections)).toBe(12);
        });

        it('wraps to the last item from the start', () => {
            expect(moveSelection('ArrowUp', 2, sections)).toBe(17);
        });
    });

    describe('ArrowLeft / ArrowRight', () => {
        it('moves within a row in a grid', () => {
            expect(moveSelection('ArrowRight', 1, sections)).toBe(2);
            expect(moveSelection('ArrowLeft', 2, sections)).toBe(1);
        });

        it('stops at row edges', () => {
            expect(moveSelection('ArrowLeft', 5, sections)).toBe(5);
            expect(moveSelection('ArrowRight', 4, sections)).toBe(4);
            expect(moveSelection('ArrowRight', 14, sections)).toBe(14);
        });

        it('stops at the end of a partial last row', () => {
            expect(moveSelection('ArrowRight', 17, sections)).toBe(17);
        });

        it('does nothing in a single column', () => {
            expect(moveSelection('ArrowLeft', 11, sections)).toBe(11);
            expect(moveSelection('ArrowRight', 11, sections)).toBe(11);
        });
    });

    it('returns 0 when the index is outside every section', () => {
        expect(moveSelection('ArrowDown', 99, sections)).toBe(0);
        expect(moveSelection('ArrowDown', 0, [])).toBe(0);
    });
});
