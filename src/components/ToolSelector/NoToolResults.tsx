import React from 'react';
import { Search } from '../Icons';

/** Empty state for a search that matched no tools. */
export const NoToolResults: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search size={28} className="text-muted mb-3" />
        <h3 className="text-main font-semibold text-lg">No tools match your search</h3>
        <p className="text-secondary text-sm mt-1">Try searching for keywords like "json", "jwt", or "uuid".</p>
    </div>
);
