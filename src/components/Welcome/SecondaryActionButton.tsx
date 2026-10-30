import React from "react";
import type { LucideProps } from "lucide-react";

interface SecondaryActionButtonProps {
  icon: React.ComponentType<LucideProps>;
  title: string;
  onClick: () => void;
}

/** Compact icon + label button for the less common ways to start */
export const SecondaryActionButton: React.FC<SecondaryActionButtonProps> = ({
  icon: Icon,
  title,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center gap-2 px-3 py-3 bg-surface hover:bg-surface-highlight
      rounded-sm border border-base hover:border-primary/30 transition-all duration-200"
  >
    <Icon size={16} className="text-secondary" />
    <span className="text-main font-medium text-sm">{title}</span>
  </button>
);
