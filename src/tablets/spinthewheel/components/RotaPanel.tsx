import React, { useCallback, useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import type { RotaConfig } from "../types";
import {
  generateRota,
  ROTA_FREQUENCIES,
  ROTA_ORDERS,
  ROTA_PERIOD_OPTIONS,
  rotaToTable,
} from "../utils/rotaModel";

interface RotaPanelProps {
  names: string[];
  config: RotaConfig;
  onChange: (patch: Partial<RotaConfig>) => void;
}

function formatSlotDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Generates a who's-on-when rota from the enabled wheel names. Everything
 *  updates live; Copy puts the rota on the clipboard as a tab-separated table
 *  (Date/Name columns) so it pastes straight into a spreadsheet or doc. */
export const RotaPanel: React.FC<RotaPanelProps> = ({ names, config, onChange }) => {
  const [copied, setCopied] = useState(false);

  const slots = useMemo(() => generateRota(names, config), [names, config]);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(rotaToTable(slots))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [slots]);

  const handleReshuffle = useCallback(() => {
    onChange({ seed: Math.floor(Math.random() * 0xffffffff) });
  }, [onChange]);

  const segment = (
    label: string,
    options: readonly { id: string; label: string }[],
    activeId: string,
    onPick: (id: string) => void,
    testidPrefix: string,
  ) => (
    <div className="px-3 py-2">
      <p className="text-sm text-main mb-1.5">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded-lg border border-base/50 overflow-hidden"
      >
        {options.map((option) => (
          <button
            key={option.id}
            role="radio"
            aria-checked={option.id === activeId}
            data-testid={`${testidPrefix}-${option.id}`}
            onClick={() => onPick(option.id)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
              option.id === activeId
                ? "bg-primary text-primary-contrast"
                : "text-secondary hover:text-main hover:bg-element-hover"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-shrink-0 overflow-y-auto custom-scrollbar divide-y divide-base/20">
        {segment(
          "Order",
          ROTA_ORDERS,
          config.order,
          (id) => onChange({ order: id as RotaConfig["order"] }),
          "spinthewheel-rota-order",
        )}
        {config.order === "shuffle" && (
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted/70">Shuffled order is fixed until you reshuffle.</p>
            <button
              onClick={handleReshuffle}
              aria-label="Reshuffle rota"
              title="Reshuffle"
              className="flex-shrink-0 p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
        {segment(
          "Frequency",
          ROTA_FREQUENCIES,
          config.frequency,
          (id) => onChange({ frequency: id as RotaConfig["frequency"] }),
          "spinthewheel-rota-frequency",
        )}
        <div className="px-3 py-2">
          <label htmlFor="spinthewheel-rota-start" className="block text-sm text-main mb-1.5">
            Starts on
          </label>
          <input
            id="spinthewheel-rota-start"
            type="date"
            value={config.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="w-full px-2 py-1.5 text-xs bg-surface border border-base/50 rounded text-main focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="px-3 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-main">Skip weekends</p>
            <p className="text-xs text-muted/70">Move weekend changes to Monday</p>
          </div>
          <button
            role="switch"
            aria-checked={config.skipWeekends}
            aria-label="Skip weekends"
            onClick={() => onChange({ skipWeekends: !config.skipWeekends })}
            className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              config.skipWeekends ? "bg-primary" : "bg-base"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
                config.skipWeekends ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
        {segment(
          "Changes",
          ROTA_PERIOD_OPTIONS.map((count) => ({ id: String(count), label: String(count) })),
          String(config.periods),
          (id) => onChange({ periods: Number(id) }),
          "spinthewheel-rota-periods",
        )}
      </div>

      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-t border-b border-base/30">
        <span className="text-xs text-muted">
          {`${slots.length} ${slots.length === 1 ? "change" : "changes"}`}
        </span>
        <div className="flex items-center gap-1">
          {copied && (
            <span role="status" className="text-xs text-success mr-1">
              Copied to clipboard
            </span>
          )}
          <button
            onClick={handleCopy}
            disabled={slots.length === 0}
            aria-label="Copy rota to clipboard"
            title="Copy rota"
            className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {slots.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            Add names to the wheel to build a rota.
          </p>
        ) : (
          <ol className="divide-y divide-base/20">
            {slots.map((slot) => (
              <li
                key={slot.date}
                data-testid="spinthewheel-rota-slot"
                className="flex items-center justify-between gap-2 px-3 py-1.5"
              >
                <time dateTime={slot.date} className="flex-shrink-0 text-xs text-muted/70">
                  {formatSlotDate(slot.date)}
                </time>
                <span className="text-sm text-main truncate">{slot.name}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
