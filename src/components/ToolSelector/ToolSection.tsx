import React from 'react';
import { ToolItem } from '../../services/toolService';
import { ToolCard } from './ToolCard';
import type { ToolSectionColumns, ToolSectionData } from './toolSections';

// Full class names so Tailwind can see them at build time.
const GRID_COLUMNS_CLASS: Record<ToolSectionColumns, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    5: 'grid-cols-5',
};

interface ToolSectionProps {
    section: ToolSectionData;
    selectedIndex: number;
    focusedItemRef: React.Ref<HTMLButtonElement>;
    onSelect: (item: ToolItem) => void;
}

/** A titled group of tool cards with a sticky heading and item count. */
export const ToolSection: React.FC<ToolSectionProps> = ({
    section,
    selectedIndex,
    focusedItemRef,
    onSelect,
}) => (
    <section className="mb-3">
        <h2 className="sticky top-0 z-10 flex items-baseline gap-2 px-3 py-1.5 bg-surface border-b border-base text-[10px] uppercase tracking-[0.2em] text-muted font-bold">
            {section.title}
            <span className="font-normal tracking-normal">{section.items.length}</span>
        </h2>
        <div className={`grid ${GRID_COLUMNS_CLASS[section.columns]} gap-1 pt-1.5`}>
            {section.items.map((item, index) => {
                const isFocused = selectedIndex === section.startIndex + index;
                return (
                    <ToolCard
                        key={item.id}
                        item={item}
                        variant={section.variant}
                        showDescription={section.showDescription}
                        isFocused={isFocused}
                        onClick={() => onSelect(item)}
                        ref={isFocused ? focusedItemRef : null}
                    />
                );
            })}
        </div>
    </section>
);
