import React, { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useDismissOnOutsidePress } from "../hooks/useDismiss";
import { iconButton } from "./styles";

interface ScratchMenuProps {
  /** Accessible name of the trigger. */
  label: string;
  testId: string;
  /** Reported so a parent can keep itself visible while the menu is open. */
  onOpenChange?: (open: boolean) => void;
  /** Menu items; call `close` for items that should dismiss the menu. */
  children: (api: { close: () => void }) => React.ReactNode;
}

/** A small "more actions" dropdown. Escape closes it without closing the drawer. */
export const ScratchMenu: React.FC<ScratchMenuProps> = ({
  label,
  testId,
  onOpenChange,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismissOnOutsidePress(root, open, close);
  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (open && e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        type="button"
        data-testid={testId}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={iconButton}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-20 mt-1 min-w-[190px] rounded border border-base bg-surface-raised py-1 text-sm shadow-lg"
        >
          {children({ close })}
        </div>
      )}
    </div>
  );
};

interface ScratchMenuItemProps {
  testId: string;
  label: string;
  ariaLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  /** For toggles: shows a check mark when true. */
  checked?: boolean;
  onSelect: () => void;
}

export const ScratchMenuItem: React.FC<ScratchMenuItemProps> = ({
  testId,
  label,
  ariaLabel,
  icon,
  disabled,
  danger,
  checked,
  onSelect,
}) => (
  <button
    type="button"
    role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
    aria-checked={checked}
    aria-label={ariaLabel}
    data-testid={testId}
    disabled={disabled}
    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-element-hover disabled:opacity-40 ${
      danger ? "text-warning" : "text-main"
    }`}
    onClick={onSelect}
  >
    <span className="w-3.5 flex-none">{icon}</span>
    <span className="flex-1">{label}</span>
    {checked && <span aria-hidden>✓</span>}
  </button>
);
