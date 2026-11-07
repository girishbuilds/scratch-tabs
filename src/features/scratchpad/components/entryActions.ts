import type { MoveTarget } from "../services/entryOrdering";

/** Everything a row can ask the store to do. Keeps rows free of store imports. */
export interface ScratchEntryActions {
  remove: (id: string) => void;
  togglePin: (id: string) => void;
  moveEntries: (ids: string[], target: MoveTarget) => void;
  markNotSecret: (id: string, secretIndex: number) => Promise<void>;
  maskRange: (id: string, start: number, end: number) => Promise<void>;
  updateText: (id: string, text: string) => Promise<void>;
  revealSecrets: (id: string) => Promise<string[]>;
  getSecretValue: (id: string, secretIndex: number) => Promise<string>;
  getEditableText: (id: string) => Promise<string>;
  getCopyText: (id: string) => Promise<string>;
  /** Opens the entries' full text, one per line, in a new editor tab. */
  openInNewTab: (ids: string[]) => Promise<void>;
}
