import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useDismissOnOutsidePress } from "../hooks/useDismiss";
import { iconButton } from "./styles";

interface ScratchMenuProps {
  /** Accessible name of the trigger. */
  label: string;
  testId: string;
  /** Trigger icon. Defaults to the "more" dots. */
  icon?: React.ReactNode;
  /** Tooltip for the trigger. Defaults to `label`. */
  title?: string;
  /** Disables the trigger (and closes the menu). */
  disabled?: boolean;
  /** Reported so a parent can keep itself visible while the menu is open. */
  onOpenChange?: (open: boolean) => void;
  /** Menu items; call `close` for items that should dismiss the menu. */
  children: (api: { close: () => void }) => React.ReactNode;
}

/** Room a menu needs below its trigger before it opens upward instead. */
const MENU_SPACE_BELOW = 176;

/**
 * A small dropdown. Escape closes it without closing the drawer. It opens
 * upward when the trigger is near the bottom of the window, so the last rows
 * of a long list don't clip it.
 */
export const ScratchMenu: React.FC<ScratchMenuProps> = ({
  label,
  testId,
  icon = <MoreHorizontal size={14} />,
  title,
  disabled = false,
  onOpenChange,
  children,
}) => {
  const [requestedOpen, setOpen] = useState(false);
  const open = requestedOpen && !disabled;
  const [openUp, setOpenUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    setOpenUp(below < MENU_SPACE_BELOW && rect.top > below);
  }, [open]);

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
        title={title ?? label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        className={`${iconButton} disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-secondary`}
        onClick={() => setOpen((current) => !current)}
      >
        {icon}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          data-placement={openUp ? "up" : "down"}
          className={`absolute right-0 z-20 min-w-[190px] rounded border border-base bg-surface-raised py-1 text-sm shadow-lg ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
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
