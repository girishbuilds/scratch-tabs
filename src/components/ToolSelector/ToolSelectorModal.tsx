import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search } from '../Icons';
import { toolService, ToolItem } from '../../services/toolService';
import { NoToolResults } from './NoToolResults';
import { ToolSection } from './ToolSection';
import { ToolSelectorFooter } from './ToolSelectorFooter';
import { moveSelection, NavigationKey } from './toolNavigation';
import { buildToolSections, flattenToolSections, ToolSearchResults } from './toolSections';

interface ToolSelectorModalProps {
    onSelect: (item: ToolItem) => void;
    onClose: () => void;
    initialSearch?: string;
}

const EMPTY_RESULTS: ToolSearchResults = { documents: [], tablets: [], smartViews: [], formats: [] };

const NAVIGATION_KEYS: NavigationKey[] = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];

const isNavigationKey = (key: string): key is NavigationKey =>
    (NAVIGATION_KEYS as string[]).includes(key);

export const ToolSelectorModal: React.FC<ToolSelectorModalProps> = ({
    onSelect,
    onClose,
    initialSearch = '',
}) => {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [results, setResults] = useState<ToolSearchResults>(EMPTY_RESULTS);
    const [recentItems, setRecentItems] = useState<ToolItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const focusedItemRef = useRef<HTMLButtonElement>(null);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            const recent = await toolService.getRecentItems();
            setRecentItems(recent);

            const searchResults = await toolService.search(searchQuery);
            setResults({ ...EMPTY_RESULTS, ...searchResults });

            // Auto-select first item when searching or on mount
            setSelectedIndex(0);
        };
        loadData();
    }, [searchQuery]);

    // Focus search on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Scroll focused item into view
    useEffect(() => {
        if (focusedItemRef.current && typeof focusedItemRef.current.scrollIntoView === 'function') {
            focusedItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [selectedIndex]);

    const sections = useMemo(
        () => buildToolSections(searchQuery, recentItems, results),
        [searchQuery, recentItems, results],
    );
    const allItems = useMemo(() => flattenToolSections(sections), [sections]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
            return;
        }
        if (allItems.length === 0) return;

        if (isNavigationKey(e.key)) {
            const nextIndex = moveSelection(e.key, selectedIndex, sections);
            const isHorizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
            // Left/right only claim the key when they move the selection, so the caret still works in the search box
            if (!isHorizontal || nextIndex !== selectedIndex) {
                e.preventDefault();
            }
            setSelectedIndex(nextIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = allItems[selectedIndex];
            if (selected) onSelect(selected);
        }
    };

    return (
        <div className="fixed inset-0 z-command flex items-start justify-center pt-[10vh] pb-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className="relative w-full max-w-4xl mx-4 bg-surface border border-base rounded-lg shadow-xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-label="Tool Selector"
            >

                {/* Header/Search Area */}
                <div className="p-4 pb-2">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 text-muted" size={18} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What do you want to do?"
                            className="w-full bg-surface-raised/50 border-0 rounded-sm py-3 pl-11 pr-11 text-main text-lg transition-all outline-none placeholder:text-muted focus:bg-surface-raised focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="absolute right-3 p-1.5 text-muted hover:text-main hover:bg-element-hover rounded-sm transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-4 pb-2 custom-scrollbar">
                    {sections.map((section) => (
                        <ToolSection
                            key={section.key}
                            section={section}
                            selectedIndex={selectedIndex}
                            focusedItemRef={focusedItemRef}
                            onSelect={onSelect}
                        />
                    ))}
                    {searchQuery !== '' && allItems.length === 0 && <NoToolResults />}
                </div>

                <ToolSelectorFooter />
            </div>
        </div>
    );
};
