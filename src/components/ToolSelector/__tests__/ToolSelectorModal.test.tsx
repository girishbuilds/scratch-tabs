import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolSelectorModal } from '../ToolSelectorModal';
import { toolService } from '../../../services/toolService';

// Mock ToolService
jest.mock('../../../services/toolService', () => ({
    toolService: {
        getRecentItems: jest.fn().mockResolvedValue([
            { id: 'recent1', type: 'tablet', label: 'Recent Tablet', icon: () => null }
        ]),
        search: jest.fn().mockResolvedValue({
            tablets: [{ id: 'tablet1', type: 'tablet', label: 'Search Result', icon: () => null }],
            smartViews: [],
            formats: []
        }),
    }
}));

describe('ToolSelectorModal', () => {
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders recent items as chips by default', async () => {
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            expect(screen.getByText(/recently used/i)).toBeDefined();
            expect(screen.getByText('Recent Tablet')).toBeDefined();
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);
        expect(input).toBe(document.activeElement);
    });

    it('switches to list view when searching', async () => {
        const user = userEvent.setup();
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        const input = await screen.findByPlaceholderText(/what do you want to do/i);

        await act(async () => {
            await user.type(input, 'search');
        });

        await waitFor(() => {
            expect(toolService.search).toHaveBeenCalledWith('search');
            expect(screen.getByText('Search Result')).toBeDefined();
            expect(screen.queryByText(/recently used/i)).toBeNull();
        }, { timeout: 2000 });
    });

    it('renders Canvas in the Documents category', async () => {
        (toolService.search as jest.Mock).mockResolvedValueOnce({
            documents: [
                { id: 'canvas', type: 'document', label: 'Canvas', icon: () => null },
            ],
            tablets: [],
            smartViews: [],
            formats: [],
        });

        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        expect(await screen.findByText('Documents')).toBeInTheDocument();
        expect(screen.getByText('Canvas')).toBeInTheDocument();
    });

    it('handles keyboard navigation', async () => {
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        // Wait for focused state to appear on the chip
        await waitFor(() => {
            const card = screen.getByText('Recent Tablet').closest('button');
            expect(card?.className).toContain('border-primary/60');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Explicit focus to be sure
        await act(async () => {
            input.focus();
        });

        // Use fireEvent as a more direct fallback for JSDOM
        await act(async () => {
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', bubbles: true });
        });

        await waitFor(() => {
            expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'recent1' }));
        });
    });

    it('closes on escape', async () => {
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        const input = await screen.findByPlaceholderText(/what do you want to do/i);

        await act(async () => {
            fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', bubbles: true });
        });

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });

    it('handles left/right arrow navigation in the recent chips', async () => {
        // Mock multiple recent items to test horizontal navigation
        (toolService.getRecentItems as jest.Mock).mockResolvedValueOnce([
            { id: 'recent1', type: 'tablet', label: 'Item 1', icon: () => null },
            { id: 'recent2', type: 'tablet', label: 'Item 2', icon: () => null },
            { id: 'recent3', type: 'tablet', label: 'Item 3', icon: () => null },
        ]);

        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            const card = screen.getByText('Item 1').closest('button');
            expect(card?.className).toContain('border-primary/60');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Press right arrow - should move to Item 2
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowRight', code: 'ArrowRight', bubbles: true });
        });

        await waitFor(() => {
            const card2 = screen.getByText('Item 2').closest('button');
            expect(card2?.className).toContain('border-primary/60');
        });

        // Press left arrow - should move back to Item 1
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true });
        });

        await waitFor(() => {
            const card1 = screen.getByText('Item 1').closest('button');
            expect(card1?.className).toContain('border-primary/60');
        });
    });

    it('handles down arrow navigation in the recent chips (moves by columns)', async () => {
        // Mock 10 items to fill 2 rows (5 columns per row)
        const items = Array.from({ length: 10 }, (_, i) => ({
            id: `recent${i + 1}`,
            type: 'tablet' as const,
            label: `Item ${i + 1}`,
            icon: () => null
        }));
        (toolService.getRecentItems as jest.Mock).mockResolvedValueOnce(items);

        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            const card = screen.getByText('Item 1').closest('button');
            expect(card?.className).toContain('border-primary/60');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Press down arrow - should move down by 5 (column count) to Item 6
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true });
        });

        await waitFor(() => {
            const card6 = screen.getByText('Item 6').closest('button');
            expect(card6?.className).toContain('border-primary/60');
        });
    });

    it('handles navigation between the recent chips and list sections', async () => {
        // Mock recent items (grid) and search results (list)
        (toolService.getRecentItems as jest.Mock).mockResolvedValueOnce([
            { id: 'recent1', type: 'tablet', label: 'Recent Item', icon: () => null },
        ]);
        (toolService.search as jest.Mock).mockResolvedValueOnce({
            tablets: [{ id: 'tablet1', type: 'tablet', label: 'Tablet Item', icon: () => null }],
            smartViews: [],
            formats: []
        });

        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            const card = screen.getByText('Recent Item').closest('button');
            expect(card?.className).toContain('border-primary/60');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Press down arrow - should move from grid section to list section
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true });
        });

        await waitFor(() => {
            const tabletCard = screen.getByText('Tablet Item').closest('button');
            // Focused rows show an inset primary bar
            expect(tabletCard?.className).toContain('inset_2px_0_0_0');
        });
    });

    it('does not navigate left/right in list layout', async () => {
        const user = userEvent.setup();
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        const input = await screen.findByPlaceholderText(/what do you want to do/i);

        // Type to switch to search mode (list layout)
        await act(async () => {
            await user.type(input, 'test');
        });

        await waitFor(() => {
            expect(screen.getByText('Search Result')).toBeDefined();
        });

        const initialCard = screen.getByText('Search Result').closest('button');
        expect(initialCard?.className).toContain('inset_2px_0_0_0');

        // Press right arrow - should not change selection in list view
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowRight', code: 'ArrowRight', bubbles: true });
        });

        // Selection should remain the same
        const stillSelected = screen.getByText('Search Result').closest('button');
        expect(stillSelected?.className).toContain('inset_2px_0_0_0');
    });

    it('does not claim left/right keys in a single-column list so the caret keeps working', async () => {
        const user = userEvent.setup();
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);
        const input = await screen.findByPlaceholderText(/what do you want to do/i);

        await act(async () => {
            await user.type(input, 'test');
        });
        await screen.findByText('Search Result');

        let notPrevented = true;
        await act(async () => {
            notPrevented = fireEvent.keyDown(input, { key: 'ArrowLeft', code: 'ArrowLeft' });
        });

        expect(notPrevented).toBe(true);
    });

    it('closes on escape even when nothing matches', async () => {
        (toolService.getRecentItems as jest.Mock).mockResolvedValueOnce([]);
        (toolService.search as jest.Mock).mockResolvedValueOnce({ tablets: [], smartViews: [], formats: [] });
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} initialSearch="zzz" />);

        const input = await screen.findByPlaceholderText(/what do you want to do/i);
        await screen.findByText(/no tools match your search/i);

        await act(async () => {
            fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
        });

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('shows section headings with counts and lays formats out in two columns', async () => {
        (toolService.search as jest.Mock).mockResolvedValueOnce({
            tablets: [{ id: 't1', type: 'tablet', label: 'Tablet One', description: 'About tablet one', icon: () => null }],
            smartViews: [],
            formats: [
                { id: 'f1', type: 'format', label: 'Format One', description: 'Create new Format One tab', icon: () => null },
                { id: 'f2', type: 'format', label: 'Format Two', description: 'Create new Format Two tab', icon: () => null },
            ],
        });
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        const formatsHeading = await screen.findByRole('heading', { name: /formats/i });
        expect(formatsHeading).toHaveTextContent('Formats2');
        expect(formatsHeading.nextElementSibling).toHaveClass('grid-cols-2');
        // Tablets keep their description, formats drop the generated one
        expect(screen.getByText('About tablet one')).toBeInTheDocument();
        expect(screen.queryByText('Create new Format One tab')).toBeNull();
    });

    it('has no placeholder footer text', async () => {
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);
        await screen.findByText('Recent Tablet');

        expect(screen.queryByText(/quick actions area/i)).toBeNull();
    });
});
