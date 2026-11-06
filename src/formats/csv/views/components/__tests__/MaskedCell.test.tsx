import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MaskedCell } from "../MaskedCell";

describe("MaskedCell", () => {
  const mockOnSelect = jest.fn();
  const mockOnStartEdit = jest.fn();
  const mockOnChange = jest.fn();
  const mockOnEditingChange = jest.fn();
  const mockOnRightClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    value: "Sensitive Data",
    isSelected: false,
    isValid: true,
    startEditing: false,
    isMasked: true,
    onSelect: mockOnSelect,
    onStartEdit: mockOnStartEdit,
    onChange: mockOnChange,
    onEditingChange: mockOnEditingChange,
  };

  describe("Basic Rendering", () => {
    it("should render masked cell value with blur", () => {
      render(<MaskedCell {...defaultProps} />);

      const cellContent = screen.getByText("Sensitive Data");
      expect(cellContent).toHaveClass("blur-[3px]", "hover:blur-none");
    });

    it("should render unmasked cell normally", () => {
      render(<MaskedCell {...defaultProps} isMasked={false} />);

      const cellContent = screen.getByText("Sensitive Data");
      expect(cellContent).not.toHaveClass("blur-[3px]");
      expect(cellContent).toHaveClass("text-main");
    });

    it("should render empty cell placeholder", () => {
      render(<MaskedCell {...defaultProps} value="" />);

      expect(screen.getByText("Empty")).toBeInTheDocument();
    });
  });

  describe("Search Highlighting", () => {
    it("should highlight search terms when unmasked and is a search match", () => {
      render(
        <MaskedCell
          {...defaultProps}
          value="John Sensitive"
          isMasked={false}
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
        <MaskedCell
          {...defaultProps}
          value="Test Sensitive"
          isMasked={false}
          isSearchMatch={true}
          isActiveSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should have active search match styling (orange)
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-warning/40", "ring-2", "ring-warning");
    });

    it("should not highlight when masked (for privacy)", () => {
      render(
        <MaskedCell
          {...defaultProps}
          value="John Sensitive"
          isMasked={true}
          isSearchMatch={true}
          searchQuery="John"
        />
      );

      // Should have search match styling on the cell
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-warning/20", "ring-1", "ring-warning");

      // But should not highlight the actual text content due to masking
      const content = screen.getByText("John Sensitive");
      expect(content.querySelector("mark")).toBeNull();
    });

    it("should handle case-insensitive highlighting when unmasked", () => {
      render(
        <MaskedCell
          {...defaultProps}
          value="SENSITIVE data"
          isMasked={false}
          isSearchMatch={true}
          searchQuery="sensitive"
        />
      );

      // Should highlight "SENSITIVE" even though query is lowercase
      const highlightedText = screen.getByText("SENSITIVE");
      expect(highlightedText.tagName).toBe("MARK");
    });
  });

  describe("Masking Functionality", () => {
    it("should temporarily unmask on hover", () => {
      render(<MaskedCell {...defaultProps} isMasked={true} />);

      const cellContent = screen.getByText("Sensitive Data");
      const cell = screen.getByTitle(/click to select/i);

      // Initially blurred
      expect(cellContent).toHaveClass("blur-[3px]", "hover:blur-none");

      // Hover to reveal - the blur class should be removed
      fireEvent.mouseEnter(cell);
      // After hover, blur is removed but hover:blur-none remains
      expect(cellContent).not.toHaveClass("blur-[3px]");
      expect(cellContent).toHaveClass("text-main");

      // Leave to re-blur
      fireEvent.mouseLeave(cell);
      expect(cellContent).toHaveClass("blur-[3px]", "hover:blur-none");
    });
  });

  describe("Interaction", () => {
    it("should call onSelect when clicked", () => {
      jest.useFakeTimers();
      render(<MaskedCell {...defaultProps} />);

      const cell = screen.getByTitle(/click to select/i);
      fireEvent.click(cell);

      // Wait for the click timer (250ms)
      jest.advanceTimersByTime(250);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("should call onRightClick when right-clicked", () => {
      render(<MaskedCell {...defaultProps} onRightClick={mockOnRightClick} />);

      const cell = screen.getByTitle(/click to select/i);
      fireEvent.contextMenu(cell);

      expect(mockOnRightClick).toHaveBeenCalledTimes(1);
    });

    it("should show action buttons on mouse enter", () => {
      render(<MaskedCell {...defaultProps} />);

      const cell = screen.getByTitle(/click to select/i);
      fireEvent.mouseEnter(cell);

      // Should show copy and edit buttons (mask toggle removed from cell level)
      expect(screen.getByTitle("Copy cell value")).toBeInTheDocument();
      expect(screen.getByTitle("Edit cell")).toBeInTheDocument();
    });
  });

  describe("Selected State", () => {
    it("should show selected styling when isSelected is true", () => {
      render(<MaskedCell {...defaultProps} isSelected={true} />);

      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-info/30", "ring-1", "ring-info");
    });

    it("should prioritize selected styling over search match styling", () => {
      render(
        <MaskedCell
          {...defaultProps}
          isSelected={true}
          isSearchMatch={true}
          searchQuery="Test"
        />
      );

      // Should show selected styling, not search styling
      const cell = screen.getByTitle(/click to select/i).closest('div');
      expect(cell).toHaveClass("bg-info/30", "ring-1", "ring-info");
      expect(cell).not.toHaveClass("bg-warning/20");
    });
  });

  describe("Editing Mode", () => {
    it("should enter editing mode when startEditing is true", () => {
      const { rerender } = render(<MaskedCell {...defaultProps} />);

      // Initially not in editing mode
      expect(screen.queryByDisplayValue("Sensitive Data")).not.toBeInTheDocument();

      // Enter editing mode
      rerender(<MaskedCell {...defaultProps} startEditing={true} />);

      // Should show input field
      expect(screen.getByDisplayValue("Sensitive Data")).toBeInTheDocument();
      expect(mockOnEditingChange).toHaveBeenCalledWith(true);
    });

    it("should show unmasked content while editing", () => {
      render(
        <MaskedCell
          {...defaultProps}
          startEditing={true}
          isMasked={true}
        />
      );

      // Should show input field with actual value (unmasked for editing)
      expect(screen.getByDisplayValue("Sensitive Data")).toBeInTheDocument();
    });

    it("should not show search highlighting while editing", () => {
      render(
        <MaskedCell
          {...defaultProps}
          startEditing={true}
          isSearchMatch={true}
          searchQuery="Sensitive"
        />
      );

      // Should show input field, not highlighted text
      expect(screen.getByDisplayValue("Sensitive Data")).toBeInTheDocument();
      expect(screen.queryByText("Sensitive", { selector: "mark" })).not.toBeInTheDocument();
    });
  });

  describe("Escape cancels a pasted edit", () => {
    // Mirrors the real parent, which clears the start-editing trigger when editing ends
    const Harness = () => {
      const [start, setStart] = React.useState(true);
      return (
        <MaskedCell
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
      const input = screen.getByDisplayValue("Sensitive Data");
      fireEvent.paste(input, { clipboardData: { getData: () => "pasted!" } });
      fireEvent.change(input, { target: { value: "pasted!" } });

      fireEvent.keyDown(input, { key: "Escape" });

      expect(mockOnChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Sensitive Data")).toBeInTheDocument();
      expect(mockOnEditingChange).toHaveBeenLastCalledWith(false);
    });

    it("ignores the blur that fires right after Escape", () => {
      startEdit();
      const input = screen.getByDisplayValue("Sensitive Data");
      fireEvent.change(input, { target: { value: "pasted!" } });

      act(() => {
        fireEvent.keyDown(input, { key: "Escape" });
        fireEvent.blur(input);
      });

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("still commits on Enter, once", () => {
      startEdit();
      const input = screen.getByDisplayValue("Sensitive Data");
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
