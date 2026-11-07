import React from "react";
import { ArrowDownToLine, ArrowUpDown, ArrowUpToLine, ChevronDown, ChevronUp } from "lucide-react";
import type { MoveTarget } from "../services/entryOrdering";
import { ScratchMenu, ScratchMenuItem } from "./ScratchMenu";

const ITEMS: { target: MoveTarget; label: string; icon: React.ReactNode }[] = [
  { target: "top", label: "Move to top", icon: <ArrowUpToLine size={14} /> },
  { target: "up", label: "Move up", icon: <ChevronUp size={14} /> },
  { target: "down", label: "Move down", icon: <ChevronDown size={14} /> },
  { target: "bottom", label: "Move to bottom", icon: <ArrowDownToLine size={14} /> },
];

interface ScratchMoveMenuProps {
  /** Accessible name of the trigger, e.g. "Move entry" or "Move selected". */
  label: string;
  /** Trigger test id. Items are `${testId}-top`, `-up`, `-down` and `-bottom`. */
  testId: string;
  /** Which moves would change anything. Moves that would not are disabled. */
  canMove: (target: MoveTarget) => boolean;
  onMove: (target: MoveTarget) => void;
  /** When set, the whole menu is disabled and this explains why. */
  disabledReason?: string;
  onOpenChange?: (open: boolean) => void;
}

/** Move to top / up / down / to bottom. Shared by a row and by the selection bar. */
export const ScratchMoveMenu: React.FC<ScratchMoveMenuProps> = ({
  label,
  testId,
  canMove,
  onMove,
  disabledReason,
  onOpenChange,
}) => (
  <ScratchMenu
    label={label}
    testId={testId}
    icon={<ArrowUpDown size={14} />}
    title={disabledReason ?? label}
    disabled={disabledReason !== undefined}
    onOpenChange={onOpenChange}
  >
    {({ close }) =>
      ITEMS.map(({ target, label: itemLabel, icon }) => (
        <ScratchMenuItem
          key={target}
          testId={`${testId}-${target}`}
          label={itemLabel}
          icon={icon}
          disabled={!canMove(target)}
          onSelect={() => {
            onMove(target);
            close();
          }}
        />
      ))
    }
  </ScratchMenu>
);
