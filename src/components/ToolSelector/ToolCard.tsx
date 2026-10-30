import React from 'react';
import { ToolItem } from '../../services/toolService';
import type { ToolCardVariant } from './toolSections';

interface ToolCardProps {
    item: ToolItem;
    onClick: () => void;
    isFocused?: boolean;
    /** "chip" is a compact tile (recent tools); "row" is a single-line list row */
    variant?: ToolCardVariant;
    /** Rows only: show the description beside the label */
    showDescription?: boolean;
}

// The focus treatment adds no border width or scale, so rows never shift while navigating.
const FOCUSED_CLASSES: Record<ToolCardVariant, string> = {
    chip: 'bg-element-hover border-primary/60',
    row: 'bg-element-hover shadow-[inset_2px_0_0_0_rgb(var(--color-primary))]',
};

const BASE_CLASSES: Record<ToolCardVariant, string> = {
    chip: 'px-2.5 py-1.5 bg-element border border-base hover:bg-element-hover hover:border-primary/30',
    row: 'px-3 py-1.5 border border-transparent hover:bg-element-hover',
};

export const ToolCard = React.forwardRef<HTMLButtonElement, ToolCardProps>(({
    item,
    onClick,
    isFocused,
    variant = 'row',
    showDescription = true,
}, ref) => {
    const Icon = item.icon;
    const description = variant === 'row' && showDescription ? item.description : undefined;

    return (
        <button
            ref={ref}
            onClick={onClick}
            title={item.description}
            className={`
                group flex items-center gap-2.5 w-full min-w-0 text-left rounded-sm scroll-mt-8
                transition-colors duration-150 outline-none
                ${BASE_CLASSES[variant]}
                ${isFocused ? FOCUSED_CLASSES[variant] : ''}
            `}
        >
            <span className="w-4 flex-shrink-0">
                {Icon && <Icon size={16} className="text-secondary group-hover:text-main" />}
            </span>
            <span className={`text-main font-medium text-sm ${description ? 'flex-shrink-0' : 'truncate'}`}>
                {item.label}
            </span>
            {description && (
                <span className="text-muted text-xs truncate min-w-0 flex-1">{description}</span>
            )}
        </button>
    );
});

ToolCard.displayName = 'ToolCard';
