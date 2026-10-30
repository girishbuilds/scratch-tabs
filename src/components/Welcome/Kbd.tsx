import React from "react";

/** Keyboard key styling shared by the welcome screen hints */
export const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="bg-surface border border-base px-2 py-1 rounded font-mono text-xs text-secondary">
    {children}
  </kbd>
);
