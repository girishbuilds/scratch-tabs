import { ReactNode } from "react";
import { TabletMetadata } from "./tabletMetadata";
import { Tab } from "../types";
import { LucideIcon } from 'lucide-react';

export interface TabletState {
  type: string;
  data: any;
}

// NEW: Describes the context in which an action is being requested.
export interface TabletActionContext {
  source: 'editor-tab' | 'editor-selection';
  tab?: Tab;
  content?: string;
  side?: 'left' | 'right';
}

// NEW: Describes an action that a tablet can offer.
export interface TabletAction {
  id: string; // e.g., 'wordcount.new-tab-from-content'
  label: string;
  icon?: LucideIcon;
  action: () => void; // This will dispatch the message to the service.
  showInEditorMenu?: boolean; // Set to false to keep the action out of the editor right-click menu.
}

// Base interface that all tablets must implement
export interface Tablet extends TabletMetadata {
  // Create initial state for the tablet
  createInitialState(payload?: any): TabletState;

  // Serialize tablet state to JSON
  serializeState(state: TabletState): string;

  // Deserialize JSON back to tablet state
  deserializeState(json: string): TabletState;

  // Render the tablet's UI
  render(state: TabletState, onChange: (state: TabletState) => void): ReactNode;
}

// Registry interface for managing tablets
export interface TabletRegistry {
  // Get all available tablet metadata (for discovery)
  getAllMetadata(): TabletMetadata[];

  // Get tablet by ID (loads implementation on demand)
  getById(id: string): Promise<Tablet | undefined>;

  // Search tablets by query
  search(query: string): TabletMetadata[];

  // Check if a tablet is loaded
  isLoaded(id: string): boolean;
}

// Extended interface for dynamic registry with async support
export interface DynamicTabletRegistry extends TabletRegistry {
  registerLazy(
    id: string,
    lazyModule: () => Promise<{ default: Tablet }>,
  ): void;
  loadTablet(id: string): Promise<Tablet | undefined>;
  getAllIds(): string[];
  getById(id: string): Promise<Tablet | undefined>;
  getByIdSync(id: string): Tablet | undefined;
  searchWithLazy(
    query: string,
  ): Promise<
    Array<{ id: string; label: string; keywords: string[]; isLoaded: boolean }>
  >;
}
