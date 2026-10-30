import { render, screen, fireEvent } from '@testing-library/react';
import { ToolSection } from '../ToolSection';
import { ToolSelectorFooter } from '../ToolSelectorFooter';
import { ToolSectionData } from '../toolSections';

const section = (overrides: Partial<ToolSectionData> = {}): ToolSectionData => ({
    key: 'formats',
    title: 'Formats',
    columns: 2,
    startIndex: 4,
    variant: 'row',
    showDescription: false,
    items: [
        { id: 'json', type: 'format', label: 'JSON', description: 'Create new JSON tab' },
        { id: 'yaml', type: 'format', label: 'YAML', description: 'Create new YAML tab' },
        { id: 'csv', type: 'format', label: 'CSV', description: 'Create new CSV tab' },
    ],
    ...overrides,
});

describe('ToolSection', () => {
    it('renders a sticky heading with the item count', () => {
        render(<ToolSection section={section()} selectedIndex={0} focusedItemRef={null} onSelect={() => { }} />);

        const heading = screen.getByRole('heading', { name: /formats/i });
        expect(heading).toHaveClass('sticky', 'top-0');
        expect(heading).toHaveTextContent('Formats3');
    });

    it('lays items out with the configured number of columns', () => {
        const { container } = render(
            <ToolSection section={section({ columns: 2 })} selectedIndex={0} focusedItemRef={null} onSelect={() => { }} />,
        );

        expect(container.querySelector('.grid')).toHaveClass('grid-cols-2');
    });

    it('honours showDescription for its rows', () => {
        const { rerender } = render(
            <ToolSection section={section()} selectedIndex={0} focusedItemRef={null} onSelect={() => { }} />,
        );
        expect(screen.queryByText('Create new JSON tab')).toBeNull();

        rerender(
            <ToolSection section={section({ showDescription: true })} selectedIndex={0} focusedItemRef={null} onSelect={() => { }} />,
        );
        expect(screen.getByText('Create new JSON tab')).toBeInTheDocument();
    });

    it('focuses the item whose flattened index matches selectedIndex', () => {
        render(<ToolSection section={section()} selectedIndex={5} focusedItemRef={null} onSelect={() => { }} />);

        expect(screen.getByText('YAML').closest('button')?.className).toContain('inset_2px_0_0_0');
        expect(screen.getByText('JSON').closest('button')?.className).not.toContain('inset_2px_0_0_0');
    });

    it('selects the clicked item', () => {
        const onSelect = jest.fn();
        render(<ToolSection section={section()} selectedIndex={0} focusedItemRef={null} onSelect={onSelect} />);

        fireEvent.click(screen.getByText('CSV'));

        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'csv' }));
    });
});

describe('ToolSelectorFooter', () => {
    it('shows the keyboard hints and no placeholder text', () => {
        render(<ToolSelectorFooter />);

        ['Navigate', 'Select', 'Close'].forEach((label) => {
            expect(screen.getByText(label)).toBeInTheDocument();
        });
        expect(screen.queryByText(/quick actions area/i)).toBeNull();
    });
});
