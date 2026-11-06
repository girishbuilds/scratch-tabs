import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditableCell } from "../EditableCell";

describe("EditableCell", () => {
  const mockOnSelect = jest.fn();
  const mockOnStartEdit = jest.fn();
  const mockOnChange = jest.fn();
  const mockOnEditingChange = jest.fn();
  const mockOnRightClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    value: "Test Value",
    isSelected: false,
    isValid: true,
    startEditing: false,
    onSelect: mockOnSelect,
    onStartEdit: mockOnStartEdit,
    onChange: mockOnChange,
    onEditingChange: mockOnEditingChange,
  };

  describe("Basic Rendering", () => {
    it("should render cell value", () => {
      render(<EditableCell {...defaultProps} />);

      expect(screen.getByText("Test Value")).toBeInTheDocument();
    });

    it("should render empty cell placeholder", () => {
      render(<EditableCell {...defaultProps} value="" />);

      expect(screen.getByText("Empty")).toBeInTheDocument();
    });

    it("should show invalid cell styling", () => {
      render(<EditableCell {...defaultProps} isValid={false} error="Invalid value" />);

      const cell = screen.getByTitle("Invalid value");
      expect(cell).toHaveClass("bg-danger-subtle");
    });
  });

  describe("Search Highlighting", () => {
    it("should highlight search terms when cell is a search match", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="John Doe"
          isSearchMatch={true}
          searchQuery="John"
        />
      );

      // Should have search match styling
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-warning/20", "ring-1", "ring-warning");

      // Should highlight the search term
      const highlightedText = screen.getByText("John");
      expect(highlightedText.tagName).toBe("MARK");
      expect(highlightedText).toHaveClass("bg-warning", "text-gray-900");
    });

    it("should show active search match styling", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="Test Value"
          isSearchMatch={true}
          isActiveSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should have active search match styling (orange)
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-warning/40", "ring-2", "ring-warning");
    });

    it("should not highlight when not a search match", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="Test Value"
          isSearchMatch={false}
          searchQuery="Other"
        />
      );

      // Should not have search highlighting
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).not.toHaveClass("bg-warning/20");
      expect(cell).not.toHaveClass("bg-warning/40");
    });

    it("should handle case-insensitive highlighting", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="JOHN doe"
          isSearchMatch={true}
          searchQuery="john"
        />
      );

      // Should highlight "JOHN" even though query is lowercase
      const highlightedText = screen.getByText("JOHN");
      expect(highlightedText.tagName).toBe("MARK");
    });

    it("should highlight multiple occurrences", () => {
      render(
        <EditableCell
          {...defaultProps}
          value="test test test"
          isSearchMatch={true}
          searchQuery="test"
        />
      );

      // Should highlight all occurrences of "test"
      const highlightedElements = screen.getAllByText("test");
      expect(highlightedElements).toHaveLength(3);
      highlightedElements.forEach(element => {
        expect(element.tagName).toBe("MARK");
      });
    });
  });

  describe("Interaction", () => {
    it("should call onSelect when clicked", () => {
      jest.useFakeTimers();
      render(<EditableCell {...defaultProps} />);

      const cell = screen.getByTitle(/click to select/i);
      fireEvent.click(cell);

      // Wait for the click timer (250ms)
      jest.advanceTimersByTime(250);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("should call onRightClick when right-clicked", () => {
      render(<EditableCell {...defaultProps} onRightClick={mockOnRightClick} />);

      const cell = screen.getByTitle(/click to select/i);
      fireEvent.contextMenu(cell);

      expect(mockOnRightClick).toHaveBeenCalledTimes(1);
    });

    it("should show hover actions on mouse enter", () => {
      render(<EditableCell {...defaultProps} />);

      const cell = screen.getByTitle(/click to select/i);
      fireEvent.mouseEnter(cell);

      // Edit and copy buttons should become visible
      expect(screen.getByTitle("Edit cell")).toBeInTheDocument();
      expect(screen.getByTitle("Copy cell value")).toBeInTheDocument();
    });
  });

  describe("Selected State", () => {
    it("should show selected styling when isSelected is true", () => {
      render(<EditableCell {...defaultProps} isSelected={true} />);

      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-info/30", "ring-1", "ring-info");
    });

    it("should show combined active search match and selected styling", () => {
      render(
        <EditableCell
          {...defaultProps}
          isSelected={true}
          isActiveSearchMatch={true}
          isSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should show combined orange active search + selected styling
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-warning/50", "ring-2", "ring-warning", "shadow-lg");
      expect(cell).not.toHaveClass("bg-info/30");
      expect(cell).not.toHaveClass("bg-warning/20");
    });

    it("should prioritize selected styling over regular search match styling", () => {
      render(
        <EditableCell
          {...defaultProps}
          isSelected={true}
          isSearchMatch={true}
          isActiveSearchMatch={false}
          searchQuery="Test"
        />
      );

      // Should show selected styling over regular search match
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-info/30", "ring-1", "ring-info");
      expect(cell).not.toHaveClass("bg-warning/20");
    });
  });

  describe("Editing Mode", () => {
    it("should enter editing mode when startEditing is true", () => {
      const { rerender } = render(<EditableCell {...defaultProps} />);

      // Initially not in editing mode
      expect(screen.queryByDisplayValue("Test Value")).not.toBeInTheDocument();

      // Enter editing mode
      rerender(<EditableCell {...defaultProps} startEditing={true} />);

      // Should show input field
      expect(screen.getByDisplayValue("Test Value")).toBeInTheDocument();
      expect(mockOnEditingChange).toHaveBeenCalledWith(true);
    });

    it("should not show search highlighting while editing", () => {
      render(
        <EditableCell
          {...defaultProps}
          startEditing={true}
          isSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should show input field, not highlighted text
      expect(screen.getByDisplayValue("Test Value")).toBeInTheDocument();
      expect(screen.queryByText("Test", { selector: "mark" })).not.toBeInTheDocument();
    });
  });

  describe("Escape cancels a pasted edit", () => {
    // Mirrors the real parent, which clears the start-editing trigger when editing ends
    const Harness = () => {
      const [start, setStart] = React.useState(true);
      return (
        <EditableCell
          {...defaultProps}
          startEditing={start}
          onEditingChange={(editing: boolean) => {
            mockOnEditingChange(editing);
            if (!editing) setStart(false);
          }}
        />
      );
    };
    const startEdit = () => render(<Harness />);

    it("restores the original value and does not commit pasted text", () => {
      startEdit();
      const input = screen.getByDisplayValue("Test Value");
      fireEvent.paste(input, { clipboardData: { getData: () => "pasted!" } });
      fireEvent.change(input, { target: { value: "pasted!" } });

      fireEvent.keyDown(input, { key: "Escape" });

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Test Value")).toBeInTheDocument();
      expect(mockOnEditingChange).toHaveBeenLastCalledWith(false);
    });

    it("ignores the blur that fires right after Escape", () => {
      startEdit();
      const input = screen.getByDisplayValue("Test Value");
      fireEvent.change(input, { target: { value: "pasted!" } });

      act(() => {
        fireEvent.keyDown(input, { key: "Escape" });
        fireEvent.blur(input);
      });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("still commits on Enter, once", () => {
      startEdit();
      const input = screen.getByDisplayValue("Test Value");
      fireEvent.change(input, { target: { value: "new" } });

      act(() => {
        fireEvent.keyDown(input, { key: "Enter" });
        fireEvent.blur(input);
      });

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("new");
    });
  });
});
