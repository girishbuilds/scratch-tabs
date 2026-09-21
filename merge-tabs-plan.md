# Merge tabs plan

## Decision

Offer **Merge tabs** for two or more editor tabs in the current workspace. The dialog always offers **Join as text**, which concatenates the selected contents in a user chosen order with a configurable separator. When all selected tabs have the same supported format, also offer **Merge as [format]**. Make the result a new tab and keep every source tab. Show a preview and any validation errors before creating it.

This gives arbitrary text and mixed formats a predictable operation while allowing formats to preserve their structure. Do not infer a structured merge from content detection alone: use the tabs' `language` IDs and require the selected format strategy to accept every input. A plain text merge of structured inputs gets `plaintext` as its output language; a successful format merge keeps that format's language.

## Existing patterns to use

- `src/formats/types.ts` defines optional `FormatModule.shareStrategy`; `src/components/Share/ShareModal.tsx` obtains it through `formatRegistry.getById(tab.language)` and loads format owned UI when appropriate. Add a separate optional `mergeStrategy` to `FormatModule` using the same dependency direction.
- `src/components/Tab/useContextMenuConfig.tsx` supplies tab actions, and `TabContextMenu.tsx` owns their dialogs. The existing **Split Content** action and `SplitTabModal.tsx` show how to launch a tab operation and create a result through `useRootStore`.
- `src/services/modelManager.ts` owns live Monaco content. Capture each source's current model content, falling back to its saved tab content, when the user previews and again immediately before applying. Do not rely on a stale `tab.content` snapshot.
- `src/formats/json/pipelineOperations.ts` has a `json.merge` operation with recursive object merge and later input winning conflicts. Keep any reuse or refactor inside `src/formats/json/`; the new strategy may need different conflict choices.
- `src/formats/har/views/utils/harEntryOperations.ts` already parses and merges HAR entries and pages. The HAR strategy can reuse this HAR-owned utility; review its duplicate page ID behavior before applying it to arbitrary tabs.
- The CSV view uses Papa Parse in `src/formats/csv/views/hooks/useCsvData.ts`. Use a CSV parser and serializer, not line splitting, so quoted fields and embedded newlines work.

## Format strategy contract

Add an optional `mergeStrategy` field to `FormatModule`, with types in `src/formats/types.ts`. The generic dialog must pass ordered `{ id, title, content, language }` snapshots and know nothing about JSON, CSV, or HAR. A strategy provides:

- `canMerge(inputs)`: checks whether the selected contents and root shapes are eligible, returning a reason when they are not.
- `getOptionsUI?()`: lazy loads a format owned React options component, as `shareStrategy.getTrimUI` does. Its props receive the ordered inputs, current options, and an `onOptionsChange` callback. Omit it when a format needs no options.
- `merge(inputs, options)`: returns `{ content, language, warnings }` or a structured validation error. It must not mutate tabs, models, or the input objects. The dialog uses the same call for preview and apply.

Keep text joining in a small generic service outside the format modules. Strategy selection depends on the registered format's declared capability, not a list of format IDs in the dialog. If inputs are mixed or a strategy rejects them, explain why **Merge as [format]** is unavailable and leave **Join as text** available.

Keep each structured merge implementation within its own format directory. A format may reuse its own existing parser or merge utility, but should not import another format's implementation or move format behavior into a cross-format utility merely to remove duplication. Recreate a small amount of similar logic in another format when its semantics differ. Extract a shared helper only when multiple formats truly have the same stable rule and there is a concrete maintenance benefit; document that reason at the extraction point.

## Initial format behavior

| Format | Structured merge | Rules and decisions |
| --- | --- | --- |
| CSV / TSV | Yes | Parse every tab using Papa Parse. The first tab supplies the header and output delimiter. Include that header once; append every data row in selected order. Require each input to declare whether it has a header (default: yes). Reject parse errors, unequal column counts, or duplicate header names. With headers, accept identical names in the same order by default; offer an explicit **Align columns by name** option for reordered headers, then serialize rows in first tab's column order. Reject missing or extra columns instead of silently dropping values. Preserve all data rows, including duplicates. |
| JSON | Yes | Parse every input. Concatenate top-level arrays. Deep merge top-level objects; for a conflicting leaf, expose **Later tab wins**, **Earlier tab wins**, or **Stop on conflict** (default). Report conflict paths in the preview. Reject mixed root shapes and scalar roots for structured merge. Use a safe-key policy consistent with the existing `json.merge` operation. Serialize valid JSON with a consistent indent. |
| HAR | Yes | Parse every HAR file, append `log.entries`, and combine `log.pages` using the existing HAR merge utility. Surface duplicate page IDs as a warning and verify references remain valid; do not deduplicate request entries. Keep first file's other `log` metadata unless the strategy explicitly explains a different choice. |
| NDJSON / JSON log | Optional follow-up | Append parsed records with one newline between documents, after validating every nonempty line as JSON. Add through its own format strategy when implemented. |
| Other formats | Text join only | Markdown, source code, YAML, XML, TOML, and similar formats have no universally safe structural merge. They can opt in later by implementing `mergeStrategy`; the dialog needs no changes. |

Structured merge never silently falls back to text on a parse or schema error. The user can choose **Join as text** explicitly. Do not call the generic `text.join-lines` pipeline operation here: it joins lines inside one input, not separate tabs.

## Dialog and workflow

1. Add **Merge tabs...** to the editor tab context menu when its workspace contains at least two eligible editor tabs. Opening it preselects the clicked tab and lets the user select other tabs from the same workspace, including either side of split view. Exclude tablets, rich text, and canvas tabs until they have defined merge semantics.
2. Show the selected tabs in merge order, with reorder controls, a result title, and a mode selector. For **Join as text**, offer a separator (`\n` by default, including an empty option) and label the output as plain text. For a supported common format, present **Merge as [format]** and mount the format owned options UI.
3. Recompute a bounded preview when order, sources, mode, or options change. Show the output language, source count, warnings, conflicts, and validation errors. Disable **Create merged tab** while fewer than two sources are selected or structured validation fails. Avoid rendering an unbounded full document in React; show a limited preview with output size and counts where available.
4. On apply, capture current source content again and run the selected merge. If content changed since preview, refresh the preview and require another apply. Create one new tab through `useRootStore.handleNewPopulatedTab` in the clicked tab's workspace and side; set the output language and title. Keep all source tabs. Handle creation failure without closing the dialog.

## One session per step

Run the steps in order. **Each numbered step is the entire scope of one new context session.** At the start of a session, read this file and `CLAUDE.md`, inspect the code named in that step, and complete only that step. At the end, mark its checkbox complete and add a short handoff note under that step with the files changed, checks run, and any decision the next session needs. The next session should use that note and the repository state rather than relying on earlier chat context. Do not mark a step complete while its checks or stated deliverable remain unfinished.

### Step 1 - Core contract and plain text merge

- [x] Complete in one session.
- **Starting point:** `src/formats/types.ts`, `src/formats/registry.ts`, `src/services/modelManager.ts`, and the existing root store tab creation action. No UI or format strategies are needed yet.
- **Work:** Define the typed `mergeStrategy` contract, ordered input snapshots, options UI props, merge result and validation error. Implement the generic text join operation with exact separator semantics and a content snapshot helper that prefers live Monaco content. Keep this code format agnostic.
- **Finish when:** Unit tests cover selected order, separators, empty content, and live model content; TypeScript checks pass. The contract is ready for the generic dialog and for individual format modules.
- **Handoff note:** Added the `mergeStrategy` contract and related types in `src/formats/types.ts`, plus `captureMergeInputs` and `joinTabsAsText` in `src/services/tabMerge.ts`. Added five unit tests in `src/services/__tests__/tabMerge.test.ts` for order, exact separators, empty content, and live model precedence. Focused Jest tests, `npm run tsc`, lint on the new service and test, and `git diff --check` pass. Direct app/test TypeScript project checks are blocked by the pre-existing syntax error at `src/tablets/registry.ts:60` (also present in `HEAD`); targeted lint of `src/formats/types.ts` reports six pre-existing `any` errors. Step 2 can use the snapshots for both preview and apply, and the `ok` result discriminator for structured merge errors.

### Step 2 - Generic merge dialog and tab action

- [x] Complete in one session.
- **Starting point:** Step 1's contract and helpers; `src/components/Tab/useContextMenuConfig.tsx`, `TabContextMenu.tsx`, `DownloadModal.tsx`, and `SplitTabModal.tsx`.
- **Work:** Add **Merge tabs...** and a format agnostic dialog for choosing same-workspace editor tabs, ordering them, joining as text, previewing output, and creating one new tab through `useRootStore`. Implement strategy discovery and optional lazy format options UI without hardcoded format IDs. The dialog should work with text join even when no format registers a strategy. Keep sources, handle failed creation, and guard against source edits after preview.
- **Finish when:** Focused component tests cover visibility, selection, ordering, mixed-format text join, output title/language, current model content, source preservation, and errors; TypeScript checks pass. Manual text joining works end to end.
- **Handoff note:** Added the conditional **Merge tabs...** action in `src/components/Tab/UseContextMenuConfig.tsx`, mounted `src/components/Tab/MergeTabsModal.tsx` from `TabContextMenu.tsx`, and added focused tests in `src/components/Tab/__tests__/MergeTabsModal.test.tsx` and `UseContextMenuConfig.actions.test.tsx`. The dialog selects same-workspace editor tabs in order, joins live content as plain text, discovers `mergeStrategy` through the registry, loads optional format UI, bounds preview output, refreshes after source edits, and keeps sources on cancel or creation failure. Thirty focused tests, `npm run tsc`, lint on the new dialog and tests, `git diff --check`, and `npm run build` pass; a Playwright browser check merged two scratch tabs and verified the new content and unchanged sources. Direct app/test TypeScript project checks remain blocked by the tracked `src/tablets/registry.ts:60` syntax error and wider existing type errors; the checked temporary syntax fix was restored. Step 3 can register a strategy on its format module without changing the dialog; options start as `{}` and the format strategy supplies defaults.

### Step 3 - CSV / TSV strategy

- [x] Complete in one session.
- **Starting point:** Steps 1 and 2's extension points; `src/formats/csv/index.ts` and its Papa Parse usage in `src/formats/csv/views/hooks/useCsvData.ts`.
- **Work:** Add a CSV-owned strategy and CSV-owned options UI. Parse quoted fields and embedded newlines, include the first header once, preserve all data rows, and support the header and align-by-name options described above. Reject malformed input and incompatible schemas with useful messages. Register the strategy only on the CSV format module.
- **Finish when:** Focused tests cover repeated headers, quoted delimiters and newlines, reordered headers, missing or extra columns, duplicate header names, and headerless input; TypeScript checks pass. No generic merge file needs a CSV-specific branch.
- **Handoff note:** Added the Papa Parse based CSV / TSV strategy in `src/formats/csv/mergeStrategy.ts`, its lazy format-owned options UI in `CsvMergeOptions.tsx`, and registered it only from the CSV format module. The strategy preserves quoted delimiters, embedded newlines, duplicate data rows, the first source's delimiter, and one optional first header; it supports per-source header declarations plus opt-in name alignment and reports parse, row-width, duplicate-header, and schema errors. Added 11 focused strategy/UI tests; 41 merge-related tests, `npm run tsc`, targeted lint, `git diff --check`, and `npm run build` pass. Step 4 needs no generic modal changes and can follow the same lazy options pattern; CSV option defaults are derived from `{}` so the generic dialog remains format agnostic.

### Step 4 - JSON strategy

- [x] Complete in one session.
- **Starting point:** Steps 1 and 2's extension points; `src/formats/json/index.ts` and `src/formats/json/pipelineOperations.ts`.
- **Work:** Add a JSON-owned strategy and options UI. Concatenate array roots; deep merge object roots with the three conflict policies described above and visible conflict paths. Keep shared behavior with the existing JSON pipeline inside the JSON module if a refactor is useful. Reject invalid JSON, scalar roots, and mixed root shapes for structured mode.
- **Finish when:** Focused tests cover arrays, nested objects, each conflict policy, unsafe keys, invalid input, and mismatched roots; TypeScript checks pass. No generic merge file needs a JSON-specific branch.
- **Handoff note:** Added the JSON-owned strategy in `src/formats/json/mergeStrategy.ts`, its lazy conflict-policy UI in `JsonMergeOptions.tsx`, and registered it only on the JSON format module. Array roots concatenate in source order; object roots deep merge with default stop-on-conflict plus later-wins and earlier-wins choices, reporting deduplicated JSON paths for divergent leaves. Extracted the existing safe-key sanitizing merge into `mergeUtils.ts` so the strategy and `json.merge` pipeline operation share the same prototype-pollution policy without moving JSON behavior outside its format. Added 12 focused strategy/UI tests; 76 merge-related and pipeline regression tests, `npm run tsc`, targeted lint, `git diff --check`, and `npm run build` pass. Step 5 needs no generic modal changes and can register its HAR-owned strategy through the same extension point.

### Step 5 - HAR strategy

- [x] Complete in one session.
- **Starting point:** Steps 1 and 2's extension points; `src/formats/har/index.ts` and `src/formats/har/views/utils/harEntryOperations.ts`.
- **Work:** Add a HAR-owned strategy. Reuse or adapt the HAR module's existing merge utility within that module, append entries, combine pages, check duplicate page IDs and references, and surface the documented metadata choices and warnings. Keep all HAR behavior inside `src/formats/har/`.
- **Finish when:** Focused tests cover valid multi-tab merges, invalid HAR, duplicate page IDs, page references, preserved request entries, and output metadata; TypeScript checks pass. No generic merge file needs a HAR-specific branch.
- **Handoff note:** Added the HAR-owned strategy in `src/formats/har/mergeStrategy.ts` and registered it only on the HAR format module. It reuses the existing immutable HAR merge helper, appends all request entries in selected order, combines pages while keeping the first definition for duplicate page IDs, rejects dangling `pageref` values with source entry paths, preserves the first tab's other log metadata, and warns about duplicate pages or ignored differing metadata. Added five focused tests covering valid multi-tab merges, invalid HAR, duplicate page IDs and duplicate requests, valid and missing page references, and output metadata. Sixty-four merge-related/HAR utility tests, `npm run tsc`, targeted lint, `git diff --check`, and `npm run build` pass. Step 6 can exercise HAR through the generic dialog without any format-specific modal changes; duplicate page definitions intentionally keep the earliest selected tab's page.

### Step 6 - Integrated verification and user-facing text

- [x] Complete in one session.
- **Starting point:** Completed Steps 1 through 5 and their handoff notes; the tab context menu end-to-end feature and any user-facing help or release text that describes tab actions.
- **Work:** Add one end-to-end scenario that opens the dialog, merges tabs, and verifies the new tab and untouched sources. Check the same workflow in split view and verify format options appear through the strategy contract. Update user-facing help or release notes for the shipped behavior. Fix integration defects found here in the owning module.
- **Finish when:** The focused end-to-end scenario, targeted unit tests, `npm run tsc`, and `npm run lint` pass, or any unrelated baseline failure is recorded with evidence. The acceptance criteria below have been checked.
- **Handoff note:** Added `tests/e2e/features/merge-tabs.feature` with a 32-step CSV scenario that merges reordered columns across split view, verifies the lazy format-owned options, creates the result on the clicked side, and confirms both source models are unchanged. Added its focused steps/actions and wired them into the E2E world; corrected the existing pane assertions to use the tabs' stable `data-side` contract. Added the 1.49.0 Merge Tabs release entry and regenerated the in-app changelog, landing pages, and displayed version. The focused E2E scenario, 58 merge unit tests, `npm run tsc`, E2E TypeScript compilation, targeted lint, `git diff --check`, and `npm run build` pass. Repository-wide `npm run lint` remains blocked by the unrelated baseline: 2,363 findings (2,222 errors and 141 warnings) across legacy source, tests, and generated coverage files; targeted lint reports no errors in the Step 6 files. All acceptance criteria were checked through the integrated CSV flow plus the existing text, CSV, JSON, HAR, cancellation, and creation-failure unit coverage.

## Acceptance criteria

- Any two eligible tabs in one workspace can be joined into a new plain text tab in a chosen order.
- CSV merges contain one header and all rows, even when fields contain delimiters or newlines; incompatible schemas produce a clear error.
- JSON array and object merges produce valid JSON; object conflicts are visible and obey the selected policy.
- HAR merges retain all request entries and valid page references.
- Adding a new format strategy requires no edit to the generic modal or context menu.
- Canceling or failing a merge leaves all source tabs and their content unchanged.
