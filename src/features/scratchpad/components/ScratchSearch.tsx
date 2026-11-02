import React from "react";
import { Search } from "lucide-react";

interface ScratchSearchProps {
  query: string;
  onChange: (query: string) => void;
}

/** Searches non-secret text only; secret values are never decrypted for search. */
export const ScratchSearch: React.FC<ScratchSearchProps> = ({ query, onChange }) => (
  <label className="flex items-center gap-2 rounded border border-base bg-surface px-2 py-1 text-sm focus-within:border-focus">
    <Search size={14} className="flex-none text-muted" aria-hidden />
    <input
      type="search"
      value={query}
      data-testid="scratch-search"
      aria-label="Search Scratch"
      placeholder="Search (secrets are not searched)"
      className="w-full bg-transparent text-main placeholder-muted outline-none"
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);
