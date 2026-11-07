import React from "react";
import { MAX_DRAWER_WIDTH, MIN_DRAWER_WIDTH } from "../services/drawerWidth";

type HandleProps = React.HTMLAttributes<HTMLDivElement>;

interface ScratchResizeHandleProps {
  width: number;
  isDragging: boolean;
  handleProps: HandleProps;
}

/** Drag strip on the drawer's left edge. Arrow keys resize; double-click resets. */
export const ScratchResizeHandle: React.FC<ScratchResizeHandleProps> = ({
  width,
  isDragging,
  handleProps,
}) => (
  <div
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize Scratch"
    aria-valuenow={width}
    aria-valuemin={MIN_DRAWER_WIDTH}
    aria-valuemax={MAX_DRAWER_WIDTH}
    tabIndex={0}
    title="Drag to resize, double-click to reset"
    data-testid="scratch-resize"
    className={`absolute inset-y-2 -left-1 z-10 w-2 cursor-col-resize touch-none transition-colors hover:bg-focus/40 focus-visible:bg-focus/60 focus-visible:outline-none ${
      isDragging ? "bg-focus/60" : ""
    }`}
    {...handleProps}
  />
);
