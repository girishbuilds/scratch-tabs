# CLAUDE.md

Scratch Tabs: local-first developer workspace for exploring and transforming text/data formats (React + TypeScript SPA).

## Commands

```bash
npm run e2e          # excludes @wip/@bug tags; auto-starts dev server
npm run e2e:full     # all tags; use this when running a specific feature file
npm run e2e:full -- tests/e2e/features/undo.feature   # single feature file
npm run e2e:full -- --tags @wip                       # by tag
cd changelog && npm run generate                      # changelog generation
```

## Code Map

- `src/formats/`: format detectors and smart views (self-registering)
- `src/tablets/`: standalone utility tools (self-registering)
- `src/features/`: feature-flag-gated functionality
- `src/workers/`: Web Workers for heavy computation
- `landing/`: static marketing pages

## Architecture Guardrails

1. Monaco model is the live content source.
   - Use `src/services/modelManager.ts` for model lifecycle/content reads.

2. Zustand tab content is the last-known/saved state.
   - Keep store updates consistent with model changes.

3. Do not add cursor-position React state.
   - Cursor/view state belongs to Monaco and persisted storage paths.

4. Keep inactive workspace content out of active in-memory flows.
   - For cross-workspace views, prefer metadata-only reads unless full content is required.

5. Keep pipeline engine independent.
   - `src/services/pipeline/*` should stay format/tablet agnostic.

## Self-Registration Patterns

**Formats** (`src/formats/`): each format directory exports a module that calls `formatRegistry.register(...)` on import. `src/formats/index.ts` imports every format to trigger registration and exposes `detectFormat` / `isAmbiguousFormat`.

**Tablets** (`src/tablets/`): each tablet registers itself via `src/tablets/registry.ts`. Use `dynamicRegistry.ts` for lazy-loaded tablets.

**Pipeline operations** (`src/services/pipeline/operations/`): each file exports `OperationDefinition` objects and registers them with `OperationRegistry`. Operations are format/tablet agnostic — they receive plain `string` input and return `string` output. The `processingMode` field controls whole-input vs. per-line execution.

## Store Architecture

`rootStore.ts` holds **actions only** (no mirrored state). It coordinates `tabsStore`, `splitViewStore`, `workspaceStore`, etc. For cross-store tab operations (add, remove, move, duplicate) always go through `useRootStore`, not the individual stores directly.

## Conventions

- Use semantic theme tokens (`bg-surface`, `text-main`, `border-base`), not hardcoded light/dark class pairs.
- For public-facing text/docs, avoid internal notes or plan-heavy content.

## E2E Testing

Full test run: ~27 minutes (4 shards plus a serial pass). Prefer running a single feature file during development. Set `BASE_URL` to skip the auto-started dev server. See [E2E README](tests/e2e/README.md) for architecture and troubleshooting.

**Stable test contract** — use `data-testid` and ARIA attributes, not CSS classes (e.g. `[data-testid="tab-${title}"][aria-selected="true"]`).

**DOM-based async detection** — never use arbitrary `waitForTimeout`. The app updates hidden DOM indicators after async operations. Use `waitForSaveIndicator(page)` / `waitForCursorIndicator(page)` from `tests/e2e/support/testIndicator.utils.ts`.

## Changelog Style (`changelog/releases.yml`)

- No em dashes — use plain hyphens
- `description` field: 2-3 sentences max; no walls of prose — the individual `changes` entries carry the detail
- `summary` field: one sentence
