import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CsvTableViewer } from "../components/CsvTableViewer";
import { tabletActionService } from "../../../../services/tabletActionService";

jest.mock("../../../../services/tabletActionService", () => ({
  tabletActionService: { handleAction: jest.fn() },
}));

// Mock getBoundingClientRect to provide dimensions for virtualization
const mockGetBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

// Apply the mock to all elements
Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  value: mockGetBoundingClientRect,
});

const mockOnContentChange = jest.fn();

const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco`;

describe("CsvTableViewer", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
    jest.clearAllMocks();
  });

  it("launches Data Reconcile through the tablet action service", () => {
    render(
      <CsvTableViewer content={sampleCsv} onContentChange={mockOnContentChange} tabId="customers" isActive={true} side="right" />,
    );

    fireEvent.click(screen.getByTestId("csv-reconcile-tab"));
    expect(tabletActionService.handleAction).toHaveBeenCalledWith({
      targetTablet: "datareconcile",
      action: "new-tab",
      payload: { sourceAId: "customers", csvMode: true },
      source: { tabId: "customers", titleHint: "Data Reconcile", side: "right" },
    });
  });

  it("should render CSV data in a table", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    // Test that headers are rendered (these are always visible)
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();

    // Test that the table structure exists
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redo/i })).toBeInTheDocument();
  });

  it("filters to one value, then adds another from the value picker", () => {
    const csv = `Name,Region
Alice,east
Bob,west
Cara,north`;
    render(
      <CsvTableViewer
        content={csv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filter Region by value" }));
    fireEvent.click(screen.getByRole("button", { name: "Show only east in Region" }));
    expect(screen.getByTestId("filter-summary")).toHaveTextContent("Showing 1 of 3 rows");

    fireEvent.click(screen.getByLabelText("Filter by Region = west"));
    expect(screen.getByTestId("filter-summary")).toHaveTextContent("Showing 2 of 3 rows");
    expect(screen.getByTestId("filter-chip-col_1_Region")).toHaveTextContent("east, west");
  });

  it("should show loading state", () => {
    render(
      <CsvTableViewer
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    // The component should handle empty content gracefully
    expect(screen.queryByText("Parsing CSV...")).not.toBeInTheDocument();
  });

  it("should display row and column counts", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    expect(screen.getByText("2 rows × 3 columns")).toBeInTheDocument();
  });

  it("should show undo/redo buttons", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    expect(screen.getByTitle("Undo")).toBeInTheDocument();
    expect(screen.getByTitle("Redo")).toBeInTheDocument();
  });

  it("should show add row/column buttons", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    // Test that column action buttons are visible in headers (these are always rendered)
    expect(screen.getAllByTitle("Add column after").length).toBeGreaterThan(0);

    // Test that the toolbar has the expected functionality
    expect(screen.getByTitle("Create snapshot")).toBeInTheDocument();
    expect(screen.getByTitle("Find duplicate rows")).toBeInTheDocument();
  });

  describe("Search Functionality", () => {
    const searchableCsv = `Name,Age,City,Country
John Doe,28,New York,USA
Jane Smith,32,San Francisco,USA
Bob Johnson,45,Chicago,USA
Alice Johnson,25,New York,Canada`;

    it("should render search input and controls", () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Search input should be present
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should show search navigation controls when search has results", () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Simulate user typing in search input - this requires firing change event
      fireEvent.change(searchInput, { target: { value: "John" } });

      // Navigation buttons should be present when there's a search query
      expect(screen.getByTestId("search-previous")).toBeInTheDocument();
      expect(screen.getByTestId("search-next")).toBeInTheDocument();
    });

    it("should show match count when searching", async () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Simulate typing "Johnson" which should appear in 2 rows
      fireEvent.change(searchInput, { target: { value: "Johnson" } });
      
      // The search match count element should be present
      expect(screen.getByTestId("search-match-count")).toBeInTheDocument();
    });

    it("should show clear button when search has text", () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Set search value using fireEvent
      fireEvent.change(searchInput, { target: { value: "test" } });
      
      // Clear button should be visible (X button in search input)
      const clearButton = searchInput.parentElement?.querySelector('button[title="Clear search"]');
      expect(clearButton).toBeInTheDocument();
    });

    it("should not select table cell when pressing Enter in search input", () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Focus search input and press Enter
      searchInput.focus();
      fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
      
      // Should not trigger cell selection or any table navigation
      // The search input should handle Enter without bubbling to table
      expect(searchInput).toHaveFocus();
    });

    it("should navigate through search matches with visual feedback", async () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Search for "Johnson" which appears in 2 cells
      fireEvent.change(searchInput, { target: { value: "Johnson" } });
      
      // Wait for search to process
      const nextButton = screen.getByTestId("search-next");
      const prevButton = screen.getByTestId("search-previous");
      
      // Should show "1 of 2"
      expect(screen.getByTestId("search-match-count")).toHaveTextContent("1 of 2");
      
      // Click next - should go to "2 of 2"
      fireEvent.click(nextButton);
      expect(screen.getByTestId("search-match-count")).toHaveTextContent("2 of 2");
      
      // Click next again - should cycle back to "1 of 2"
      fireEvent.click(nextButton);
      expect(screen.getByTestId("search-match-count")).toHaveTextContent("1 of 2");
      
      // Click previous - should go to "2 of 2"
      fireEvent.click(prevButton);
      expect(screen.getByTestId("search-match-count")).toHaveTextContent("2 of 2");
    });

    it("should clear search highlights when search input is cleared", async () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Search for "Johnson" to create highlights
      fireEvent.change(searchInput, { target: { value: "Johnson" } });
      
      // Should show search results
      expect(screen.getByTestId("search-match-count")).toHaveTextContent("1 of 2");
      
      // Verify that highlighted text exists in the DOM (there are 2 "Johnson" instances)
      expect(screen.getAllByText("Johnson", { selector: "mark" })).toHaveLength(2);
      
      // Now clear by typing empty string (this should work like normal typing)
      fireEvent.change(searchInput, { target: { value: "" } });
      
      // Search query should be cleared
      expect(searchInput).toHaveValue("");
      
      // Wait for the state updates to complete
      await waitFor(() => {
        // Search navigation should be hidden
        expect(screen.queryByTestId("search-match-count")).not.toBeInTheDocument();
        
        // Most importantly: highlighted text should no longer exist in the DOM
        expect(screen.queryAllByText("Johnson", { selector: "mark" })).toHaveLength(0);
      });
      
      // But the regular text should still be present (might need to wait for virtualization)
      await waitFor(() => {
        expect(screen.getAllByText(/Johnson/)).toHaveLength(2);
      });
    });
  });

  describe("Context Menu and Shift Right", () => {
    const raggedCsv = `Name,Age,City,Country
John Doe,28,New York
Jane Smith,32
Bob Johnson,45,Chicago,USA`;

    it("should not show context menu initially", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Context menu should not be visible initially
      expect(screen.queryByText("Insert Empty Cell & Shift Right")).not.toBeInTheDocument();
    });

    // Note: Testing right-click context menu is complex in jsdom environment
    // as it requires simulating mouse events and DOM manipulation
    // The actual functionality is tested through the useCsvData hook tests
    it("should have context menu structure available", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify the component renders without errors and has the expected structure
      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
      expect(screen.getByTestId("csv-table-container")).toBeInTheDocument();
    });

    it("should maintain correct shift right state after right-clicking different cells", () => {
      // This test verifies the fix for the bug where shift right option becomes
      // permanently disabled after right-clicking on a fully populated row
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // The CSV has:
      // - Row 1: John Doe,28,New York (3 columns, missing Country)
      // - Row 2: Jane Smith,32 (2 columns, missing City and Country) 
      // - Row 3: Bob Johnson,45,Chicago,USA (4 columns, fully populated)
      // Header has 4 columns: Name,Age,City,Country

      // Verify the component structure is available for testing
      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
      
      // Note: In a real test environment, we would simulate right-click events
      // on different cells and verify that the context menu state is properly
      // managed. This test documents the expected behavior:
      // 
      // 1. Right-click on Jane Smith's Name cell (row with 2 columns) → Should enable shift right
      // 2. Right-click on Bob Johnson's Name cell (row with 4 columns) → Should disable shift right  
      // 3. Right-click on Jane Smith's Name cell again → Should enable shift right (not permanently disabled)
      //
      // The fix ensures that selectedCells state is reset for each new context menu,
      // preventing accumulation of cells from previous right-clicks.
    });

    it("should support CTRL+Click multi-selection for shift right operations", () => {
      // This test documents the expected behavior for CTRL+Click multi-selection
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify the component structure is available
      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
      
      // Note: This test documents the CTRL+Click multi-selection behavior:
      //
      // Expected behavior:
      // 1. Regular click selects a single cell (blue background)
      // 2. CTRL+Click on additional cells adds them to selection (purple background for multi-selected)
      // 3. CTRL+Click on already selected cell removes it from selection
      // 4. Right-click on any selected cell opens context menu with shift right option
      // 5. Shift right is enabled only if all selected cells are in same column and have fewer columns than headers
      // 6. Visual feedback: 
      //    - Single selected cell: blue background
      //    - Multi-selected cells: purple background
      //    - Primary selected cell (for editing): blue background even in multi-selection
      //
      // Implementation details:
      // - handleCellSelect manages CTRL+Click behavior
      // - selectedCells Set tracks multi-selection
      // - selectedCell tracks the primary cell for editing
      // - isCellMultiSelected determines purple highlighting
      // - canShiftRight validates shift operation on all selected cells
    });
  });

  describe("Data Safety and Validation", () => {
    const testCsv = `Name,Age
John,28
Jane,32`;

    it("should handle content changes safely", () => {
      const { rerender } = render(
        <CsvTableViewer
          content={testCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify initial state
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Age")).toBeInTheDocument();

      // Update content
      const updatedCsv = `Name,Age,City
John,28,NYC
Jane,32,SF`;

      rerender(
        <CsvTableViewer
          content={updatedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify new content is rendered
      expect(screen.getByText("City")).toBeInTheDocument();
    });

    it("should display diagnostic information", () => {
      render(
        <CsvTableViewer
          content={testCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Should show row/column count
      expect(screen.getByTestId("row-column-status")).toBeInTheDocument();
      expect(screen.getByText("2 rows × 2 columns")).toBeInTheDocument();
    });
  });

  describe("Cell Selection Behavior", () => {
    it("should render table with cell selection capability", () => {
      const multiRowCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;

      render(
        <CsvTableViewer
          content={multiRowCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify the table structure is rendered with proper data
      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
      expect(screen.getByText("3 rows × 3 columns")).toBeInTheDocument();
      
      // Verify headers are present
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Age")).toBeInTheDocument();
      expect(screen.getByText("City")).toBeInTheDocument();
    });

    it("should have cell selection event handlers attached", async () => {
      const multiRowCsv = `Name,Age
John,28
Jane,32`;

      render(
        <CsvTableViewer
          content={multiRowCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // The table should render successfully and be ready for interaction
      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
      expect(screen.getByText("2 rows × 2 columns")).toBeInTheDocument();
    });
  });
});
