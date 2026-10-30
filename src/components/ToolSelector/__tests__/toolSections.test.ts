import { buildToolSections, flattenToolSections, ToolSearchResults } from '../toolSections';
import { ToolItem } from '../../../services/toolService';

const item = (id: string, type: ToolItem['type'] = 'tablet'): ToolItem => ({ id, type, label: id });

const results = (overrides: Partial<ToolSearchResults> = {}): ToolSearchResults => ({
    documents: [],
    tablets: [],
    smartViews: [],
    formats: [],
    ...overrides,
});

describe('buildToolSections', () => {
    it('shows recently used first as five-column chips when the query is empty', () => {
        const sections = buildToolSections('', [item('r1'), item('r2')], results({ tablets: [item('t1')] }));

        expect(sections.map((s) => s.title)).toEqual(['Recently Used', 'Tablets']);
        expect(sections[0]).toMatchObject({ columns: 5, variant: 'chip', showDescription: false });
    });

    it('omits recently used while searching', () => {
        const sections = buildToolSections('jwt', [item('r1')], results({ tablets: [item('t1')] }));

        expect(sections.map((s) => s.title)).toEqual(['Tablets']);
    });

    it('drops empty sections', () => {
        expect(buildToolSections('', [], results())).toEqual([]);
    });

    it('keeps results in display order', () => {
        const sections = buildToolSections('x', [], results({
            formats: [item('f1', 'format')],
            smartViews: [item('s1', 'smartview')],
            tablets: [item('t1')],
            documents: [item('d1', 'document')],
        }));

        expect(sections.map((s) => s.title)).toEqual(['Documents', 'Tablets', 'Smart Views', 'Formats']);
    });

    it('lays tablets and documents out as described single-column rows', () => {
        const sections = buildToolSections('x', [], results({ tablets: [item('t1')], documents: [item('d1', 'document')] }));

        sections.forEach((section) => {
            expect(section).toMatchObject({ columns: 1, variant: 'row', showDescription: true });
        });
    });

    it('lays smart views and formats out as two-column rows without descriptions', () => {
        const sections = buildToolSections('x', [], results({
            smartViews: [item('s1', 'smartview')],
            formats: [item('f1', 'format')],
        }));

        sections.forEach((section) => {
            expect(section).toMatchObject({ columns: 2, variant: 'row', showDescription: false });
        });
    });

    it('assigns consecutive start indexes across sections', () => {
        const sections = buildToolSections('', [item('r1'), item('r2')], results({
            tablets: [item('t1'), item('t2'), item('t3')],
            formats: [item('f1', 'format')],
        }));

        expect(sections.map((s) => s.startIndex)).toEqual([0, 2, 5]);
    });
});

describe('flattenToolSections', () => {
    it('returns items in section order, matching start indexes', () => {
        const sections = buildToolSections('', [item('r1')], results({ tablets: [item('t1'), item('t2')] }));
        const flat = flattenToolSections(sections);

        expect(flat.map((i) => i.id)).toEqual(['r1', 't1', 't2']);
        sections.forEach((section) => {
            expect(flat[section.startIndex]).toBe(section.items[0]);
        });
    });
});
