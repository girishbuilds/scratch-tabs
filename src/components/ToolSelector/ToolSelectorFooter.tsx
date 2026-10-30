import React from 'react';

const KEY_HINTS = [
    { keys: '↑↓←→', label: 'Navigate' },
    { keys: '↵', label: 'Select' },
    { keys: 'esc', label: 'Close' },
];

/** Keyboard hints shown below the tool list. */
export const ToolSelectorFooter: React.FC = () => (
    <div className="px-4 py-2 border-t border-base bg-surface-secondary/20 flex items-center gap-6 text-[11px] text-muted font-medium">
        {KEY_HINTS.map(({ keys, label }) => (
            <span key={label} className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-element border border-base rounded-sm text-[10px] font-mono">{keys}</kbd>
                <span>{label}</span>
            </span>
        ))}
    </div>
);
