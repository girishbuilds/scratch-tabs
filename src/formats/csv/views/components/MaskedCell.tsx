import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Edit3, Copy, Check } from "../../../../components/Icons";
import { highlightSearchTerm } from "../utils/searchHighlight";
import { getCellClasses } from "../constants/cellStyles";
import { FullValuePopup } from "./FullValuePopup";

interface MaskedCellProps {
  value: string;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isValid: boolean;
  error?: string;
  startEditing: boolean;
  isMasked: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onEditingChange: (isEditing: boolean) => void;
  isSearchMatch?: boolean;
  isActiveSearchMatch?: boolean;
  searchQuery?: string;
  onRightClick?: (e: React.MouseEvent) => void;
  'data-testid'?: string;
  'data-row'?: string;
  'data-col'?: string;
}

export const MaskedCell: React.FC<MaskedCellProps> = React.memo(({
  value,
  isSelected,
  isMultiSelected = false,
  isValid,
  error,
  startEditing,
  isMasked,
  onSelect,
  onStartEdit,
  onChange,
  onEditingChange,
  isSearchMatch = false,
  isActiveSearchMatch = false,
  searchQuery = "",
  onRightClick,
  'data-testid': dataTestId,
  'data-row': dataRow,
  'data-col': dataCol,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isHovered, setIsHovered] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isTemporarilyUnmasked, setIsTemporarilyUnmasked] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
    const clickCountRef = useRef(0);
    // Set once an edit is committed or cancelled, so the blur that follows
    // (while the old closure still holds the typed/pasted text) is ignored.
    const editFinishedRef = useRef(false);

    // Start editing when triggered
    useEffect(() => {
      if (startEditing && !isEditing) {
        setIsEditing(true);
        setEditValue(value);
        onEditingChange(true);
      }
    }, [startEditing, isEditing, value, onEditingChange]);

    // Focus and position cursor when editing starts
    useEffect(() => {
      if (isEditing && inputRef.current) {
        editFinishedRef.current = false;
        inputRef.current.focus();
        // Position cursor at end
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, [isEditing]);

    const handleCommitChange = useCallback(() => {
      if (isEditing && !editFinishedRef.current) {
        editFinishedRef.current = true;
        setIsEditing(false);
        onEditingChange(false);
        if (editValue !== value) {
          onChange(editValue);
        }
      }
    }, [isEditing, editValue, value, onChange, onEditingChange]);

    const handleCancelEdit = useCallback(() => {
      editFinishedRef.current = true;
      setIsEditing(false);
      setEditValue(value);
      onEditingChange(false);
    }, [value, onEditingChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          handleCommitChange();
        } else if (e.key === "Escape") {
          handleCancelEdit();
        }
      },
      [handleCommitChange, handleCancelEdit],
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        clickCountRef.current += 1;

        // Clear any existing timer
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
        }

        // Set a timer to determine if it's a single or double click
        clickTimerRef.current = setTimeout(() => {
          if (clickCountRef.current === 1) {
            // Single click - perform selection
            onSelect(e);
          } else if (clickCountRef.current === 2) {
            // Double click - check for truncation and show popup
            if (textRef.current) {
              const isTruncated = textRef.current.scrollWidth > textRef.current.clientWidth;
              if (isTruncated && value) {
                const rect = textRef.current.getBoundingClientRect();
                setPopupPosition({
                  x: rect.left,
                  y: rect.bottom + 5,
                });
                setShowPopup(true);
              } else {
                // If not truncated, still perform selection on double-click
                onSelect(e);
              }
            }
          }
          // Reset click count
          clickCountRef.current = 0;
        }, 250); // 250ms window to detect double-click
      },
      [onSelect, value],
    );

    // Cleanup timer on unmount
    useEffect(() => {
      return () => {
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
        }
      };
    }, []);

    const handleEditClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onStartEdit();
      },
      [onStartEdit],
    );

    const handleCopyClick = useCallback(
      async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
          console.error('Failed to copy text:', err);
        }
      },
      [value],
    );

    const handleMouseEnter = useCallback(() => {
      setIsHovered(true);
      if (isMasked) {
        setIsTemporarilyUnmasked(true);
      }
    }, [isMasked]);

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
      if (isMasked) {
        setIsTemporarilyUnmasked(false);
      }
    }, [isMasked]);

    // Determine if content should be masked
    const shouldShowMasked = isMasked && !isTemporarilyUnmasked && !isEditing;

    if (isEditing) {
      return (
        <div className="h-full w-full flex items-center bg-surface">
          <input
            ref={inputRef}
            className="w-full h-full bg-transparent border-none outline-none text-sm text-main px-2 focus:outline-none focus:ring-0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCommitChange}
          />
        </div>
      );
    }

    return (
      <>
        <div
          className={`${getCellClasses({
            isSelected,
            isMultiSelected,
            isActiveSearchMatch,
            isSearchMatch,
            isValid,
          })} px-2`}
          onClick={handleClick}
          onContextMenu={onRightClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title={error || "Click to select. Double-click truncated value to view full content"}
          data-testid={dataTestId}
          data-row={dataRow}
          data-col={dataCol}
        >
          <span
            ref={textRef}
            className={`text-sm truncate flex-1 mr-2 select-none transition duration-150 ${shouldShowMasked ? "blur-[3px] hover:blur-none" : "text-main"}`}
            title={shouldShowMasked ? "Hover to reveal" : undefined}
          >
            {value ? (
              isSearchMatch && searchQuery && searchQuery.trim() && !shouldShowMasked ? (
                highlightSearchTerm(value, searchQuery)
              ) : (
                value
              )
            ) : (
              <span className="text-muted italic">Empty</span>
            )}
          </span>
          <div className="flex items-center space-x-1 w-12 justify-end">
            <button
              className={`p-1 rounded hover:bg-element-hover transition-all ${
                isHovered || isSelected
                  ? "opacity-70 hover:opacity-100"
                  : "opacity-0"
              } ${copySuccess ? 'text-success' : ''}`}
              onClick={handleCopyClick}
              title="Copy cell value"
            >
              {copySuccess ? <Check size={12} /> : <Copy size={12} />}
            </button>
            <button
              className={`p-1 rounded hover:bg-element-hover transition-all ${
                isHovered || isSelected
                  ? "opacity-70 hover:opacity-100"
                  : "opacity-0"
              }`}
              onClick={handleEditClick}
              title="Edit cell"
            >
              <Edit3 size={12} />
            </button>
          </div>
        </div>

        {/* Full Value Popup */}
        {showPopup && (
          <FullValuePopup
            value={value}
            position={popupPosition}
            onClose={() => setShowPopup(false)}
          />
        )}
      </>
    );
  },
);
