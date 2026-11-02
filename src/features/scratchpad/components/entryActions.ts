/** Everything a row can ask the store to do. Keeps rows free of store imports. */
export interface ScratchEntryActions {
  remove: (id: string) => void;
  togglePin: (id: string) => void;
  markNotSecret: (id: string, secretIndex: number) => Promise<void>;
  maskRange: (id: string, start: number, end: number) => Promise<void>;
  revealSecrets: (id: string) => Promise<string[]>;
  getSecretValue: (id: string, secretIndex: number) => Promise<string>;
  getEditableText: (id: string) => Promise<string>;
  getCopyText: (id: string) => Promise<string>;
}
