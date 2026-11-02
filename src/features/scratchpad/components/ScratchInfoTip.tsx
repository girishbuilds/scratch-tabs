import React, { useId, useState } from "react";
import { Info } from "lucide-react";
import { iconButton } from "./styles";

interface ScratchInfoTipProps {
  /** Accessible name of the "i" button. */
  label: string;
  children: React.ReactNode;
}

/**
 * An "i" button that shows a short explanation on hover, focus or tap. The
 * panel spans the nearest positioned ancestor (the drawer header), so it can
 * never run off the edge of the window.
 */
export const ScratchInfoTip: React.FC<ScratchInfoTipProps> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <span
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        data-testid="scratch-info"
        aria-label={label}
        aria-describedby={open ? panelId : undefined}
        aria-expanded={open}
        className={iconButton}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
      >
        <Info size={14} />
      </button>
      {open && (
        <div
          id={panelId}
          role="tooltip"
          data-testid="scratch-info-panel"
          className="absolute inset-x-3 top-full z-30 mt-1 rounded border border-base bg-surface-raised p-3 text-xs font-normal leading-relaxed text-secondary shadow-lg"
        >
          {children}
        </div>
      )}
    </span>
  );
};
