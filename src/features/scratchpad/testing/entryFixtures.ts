import type { ScratchEntryActions } from "../components/entryActions";
import type { ScratchEntryView } from "../types";

export const secretEntry: ScratchEntryView = {
  id: "e1",
  kind: "secret",
  copyTarget: "value",
  createdAt: 1,
  batchIndex: 0,
  pinned: false,
  secretCount: 1,
  segments: [
    { type: "text", text: "UAT key: " },
    { type: "secret", index: 0 },
  ],
};

export const plainEntry: ScratchEntryView = {
  id: "e2",
  kind: "command",
  copyTarget: "all",
  createdAt: 1,
  batchIndex: 0,
  pinned: false,
  secretCount: 0,
  segments: [{ type: "text", text: "mvn clean verify" }],
};

/** Row actions as mocks; override any of them per test. */
export function createActions(overrides: Partial<ScratchEntryActions> = {}) {
  return {
    remove: jest.fn(),
    togglePin: jest.fn(),
    moveEntries: jest.fn(),
    markNotSecret: jest.fn().mockResolvedValue(undefined),
    maskRange: jest.fn().mockResolvedValue(undefined),
    updateText: jest.fn().mockResolvedValue(undefined),
    revealSecrets: jest.fn().mockResolvedValue(["3knd8dsuhds89hds"]),
    getSecretValue: jest.fn().mockResolvedValue("3knd8dsuhds89hds"),
    getEditableText: jest.fn().mockResolvedValue("UAT key: 3knd8dsuhds89hds"),
    getCopyText: jest.fn().mockResolvedValue("copied-text"),
    ...overrides,
  } satisfies ScratchEntryActions;
}
