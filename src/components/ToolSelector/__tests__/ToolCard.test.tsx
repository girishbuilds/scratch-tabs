import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCard } from '../ToolCard';
import { ToolItem } from '../../../services/toolService';
import { Puzzle } from '../../Icons';

const mockItem: ToolItem = {
    id: 'test-tool',
    type: 'tablet',
    label: 'Test Tool',
    description: 'A test description for the tool.',
    icon: Puzzle,
    keywords: ['test']
};

describe('ToolCard', () => {
    it('renders a row with label and description by default', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} />);

        expect(screen.getByText('Test Tool')).toBeDefined();
        expect(screen.getByText('A test description for the tool.')).toBeDefined();
    });

    it('does not repeat the item type as a badge', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} />);

        expect(screen.queryByText('tablet')).toBeNull();
        expect(screen.queryByText(/tablet/i)).toBeNull();
    });

    it('hides the description when showDescription is false', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} showDescription={false} />);

        expect(screen.getByText('Test Tool')).toBeDefined();
        expect(screen.queryByText('A test description for the tool.')).toBeNull();
    });

    it('never shows the description on chips', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} variant="chip" />);

        expect(screen.getByText('Test Tool')).toBeDefined();
        expect(screen.queryByText('A test description for the tool.')).toBeNull();
    });

    it('exposes the description as a tooltip so truncated text stays readable', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} showDescription={false} />);

        expect(screen.getByRole('button')).toHaveAttribute('title', 'A test description for the tool.');
    });

    it('keeps the label alone in its own span for stable e2e lookups', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} />);

        expect(screen.getByText('Test Tool').tagName).toBe('SPAN');
    });

    it('calls onClick when clicked', () => {
        const handleClick = jest.fn();
        render(<ToolCard item={mockItem} onClick={handleClick} />);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies an inset focus bar to a focused row without changing its size', () => {
        const { rerender } = render(<ToolCard item={mockItem} onClick={() => { }} isFocused={false} />);
        const button = screen.getByRole('button');
        expect(button.className).not.toContain('inset_2px_0_0_0');

        rerender(<ToolCard item={mockItem} onClick={() => { }} isFocused={true} />);
        expect(button.className).toContain('inset_2px_0_0_0');
        expect(button.className).not.toContain('border-l-4');
        expect(button.className).not.toContain('scale-');
    });

    it('applies a primary border to a focused chip', () => {
        const { rerender } = render(<ToolCard item={mockItem} onClick={() => { }} isFocused={false} variant="chip" />);
        const button = screen.getByRole('button');
        expect(button.className).not.toContain('border-primary/60');

        rerender(<ToolCard item={mockItem} onClick={() => { }} isFocused={true} variant="chip" />);
        expect(button.className).toContain('border-primary/60');
    });
});
