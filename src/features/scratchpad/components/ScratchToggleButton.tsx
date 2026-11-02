import React from "react";
import { NotebookPen } from "lucide-react";
import { useScratchpadStore } from "../stores/useScratchpadStore";

interface ScratchToggleButtonProps {
  className?: string;
}

export const ScratchToggleButton: React.FC<ScratchToggleButtonProps> = ({ className }) => {
  const isOpen = useScratchpadStore((state) => state.isOpen);
  return (
    <button
      type="button"
      className={className}
      title="Scratch (Cmd/Ctrl+Shift+Y)"
      aria-pressed={isOpen}
      data-testid="icon-scratch"
      onClick={() => void useScratchpadStore.getState().toggle()}
    >
      <NotebookPen size={16} />
    </button>
  );
};
