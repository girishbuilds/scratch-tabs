# Scratch Tabs — Improvement Analysis V2

**Goal:** Be the #1 trusted offline, privacy-first developer tool and scratchpad on the planet.

**Baseline:** Audited against the current tree. Counts below are verified, not estimated:
- **36 tablets registered** in `src/tablets/tabletMetadata.ts` (38 components on disk; `runcode` unregistered, `promptmanager` disabled)
- **40 formats registered**, **19 with smart views**, 21 detection/highlight-only
- **181 pipeline operations** (150 core + 12 format-injected + 19 tablet-injected) vs CyberChef's ~477

---

## How to Keep This Document Current

Run this maintenance pass after every 2–3 releases:

**1. Prune delivered items**
- Cross-reference `git log --oneline` and directory listings against each row.
- Verify the feature isn't a TODO stub before marking shipped (several V1 items were listed as gaps but were already fixed — and one "shipped" claim in V1 was wrong: see Known Bugs).
- Keep counts honest: WelcomeScreen copy must match `tabletMetadata.ts`, not aspiration.

**2. Rescan for new opportunities**
Same eight areas as V1 (formats → smart views → tablets → tablet value → pipeline ops → workspace → tabs → context menu). The sections below are the living output of that scan.

**3. Reorder the Priority Stack Rank** after each pass. Items that close privacy/offline gaps or fix regressions rank highest.

---

## Delivered Since V1 (verified — do not re-propose)

| Item | Where |
|---|---|
| Hex encode/decode pipeline ops | `encoding.to-hex` / `encoding.from-hex` |
| Workspace export/import | `ImportExportService.ts`, Export/Import Workspaces modals |
| Tab count badge per workspace | Sidebar + IconRail |
| Workspace colours (auto-assigned) | `workspaceColors.ts` |
| Sidebar tab drag reorder | `SidebarDraggableTab.tsx` (dnd-kit) |
| Postman collection import | `restclient/converters/postmanConverter.ts` |
| Storage usage indicator (`navigator.storage.estimate()`) | `useAppStats.ts` → About modal |
| UUID v1 + v7 | `UuidTablet.tsx` |
| Keyboard shortcut overlays (Canvas + Hex Viewer) | `CanvasShortcutHelp.tsx`, hexviewer `KeyboardShortcutsOverlay.tsx` |
| AI model download warnings (sizes, offline messaging, progress) | `AIModelManagementModal.tsx` — good as-is |
| Pipeline hardening: Web Worker execution, 5s step / 30s total timeouts, 10MB input cap, 50-step cap, saved pipelines | `pipelineExecutor.ts`, `pipelineWorker.ts` |
| New tablets shipped: SQL Sandbox (DuckDB-WASM), Secret Scanner, Webhook HMAC, Data Reconcile | `src/tablets/*` |

---

## Known Bugs / Incomplete TODOs (verified current)

| Location | Issue |
|---|---|
| `src/tablets/diagram/DiagramTablet.tsx:365` | Diagram → Monaco line navigation still an empty handler (`// TODO`) — ErrorPanel "go to line" leads nowhere |
| `src/tablets/shapesnap/core/SelectionManager.ts:184-196` | `groupSelectedShapes()` is still a fake-ID placeholder — **and is dead code**: never called outside tests. Either implement grouping or delete the API and any UI affordance |
| `tests/e2e/features/csv-view.feature:260` | `@bug`-tagged test "CSV table view preserves data integrity" excluded from CI via `run-e2e-tests.sh:23` — **this is the known regression**; it guards data integrity on the flagship CSV smart view |
| `tests/e2e/features/csv-view.feature:206,240`, `welcome-screen-entry-points.feature:53,94` | Four more `@wip` exclusions covering CSV table export/column manipulation and file-upload entry points |
| `src/db/index.ts:569` | Cloud sync path throws `"Cloud storage not implemented yet"` — dead code reachable from settings? Verify and remove or gate |
| `src/tablets/restclient/utils/requestUtils.ts:127` | Binary request bodies not implemented |
| `src/tablets/restclient/converters/httpConverter.ts:404` | multipart/form-data parsing not implemented |
| `src/features/canvas/../../bridge/implementation.ts:149-176` (split-view bridge ops) | Non-functional placeholders behind split-view features |
| `EditorPaneWrapper.tsx:49-53` | **Regression:** large-content guard for smart views was *removed* ("removing large content guard"). Full content flows unconditionally into preview components on the main thread |

---

## Scan 1 — New Formats

40 formats registered today. Detection architecture note: specialized formats win by definitive-match priority over generic JSON/YAML (e.g. OpenAPI prio 35, HAR prio 9). There is no separate sub-detection pass — K8s/GitHub Actions/compose currently exist only as JSON-schema entries inside the YAML smart view (`yaml/utils/schemaStore.ts`), not as detectable formats.

Formats from V1 that remain absent (all still valid proposals):

| Format | Detection Signal | Value |
|---|---|---|
| **JUnit / xUnit XML** | `<testsuites>` / `<testsuite>` root | Test-result inspection; pairs with smart view |
| **Protocol Buffers** | `syntax = "proto3";`, `message`/`service` keywords | Growing gRPC audience |
| **Kubernetes YAML** | Sub-detect YAML with `apiVersion:` + `kind:` | Extremely common; resource-summary smart view. Schema-store entry exists but no format detection or view |
| **GitHub Actions YAML** | Sub-detect YAML with `on:` + `jobs:` | CI debugging; same schema-store-only status |
| **Terraform plan JSON** | JSON with `format_version`, `resource_changes` | Drift summary smart view |
| **JSON Schema** | `$schema`, `properties`, `$defs`/`definitions` keys | A schema *generator* exists (`json/utils/jsonSchema.ts` + validation modal) but no detected format or dedicated smart view |
| **AsyncAPI** | `asyncapi:` root key (JSON or YAML) | Event-driven API inspection, mirrors OpenAPI pattern |
| **Postman Collection / Insomnia export** | `info.schema` → Postman schema; `_type: export` | Import exists in REST Client; not a tab format/smart view |
| **SARIF** | `version` + `runs` + `tool.driver` + `results` | CodeQL/Semgrep/Code-scanning output unreadable raw |
| **SBOM (CycloneDX / SPDX)** | `bomFormat: CycloneDX`, `spdxVersion` | Supply-chain workflows |
| **Coverage (LCOV / Cobertura / JaCoCo)** | `TN:`/`SF:`/`DA:` markers; `<coverage>` root | CI coverage artifacts |
| **Logfmt** | Majority of lines match `\w+=\S+` key-value pairs | Completes log-analysis trio (accesslog + NDJSON exist); filterable key-value table |
| **Syslog / RFC5424** | `<34>1 ...` PRI headers or classic syslog lines | Groups by facility/severity/host/process |
| **Docker Compose YAML** | Top-level `services:` (+ `networks:`/`volumes:`) | Service-topology smart view; schema-store entry only today |
| **Lockfiles** | `package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`, `go.sum` markers | Duplicate-version detection, dependency summary |
| **iCalendar (.ics)** | `BEGIN:VCALENDAR` markers | Event/recurrence rendering |
| **JWT (as tab format)** | Three base64url segments `eyJ…\.….…` | Tablet + pipeline ops exist; pasting a JWT into an editor tab doesn't route anywhere useful — deep-link to JWT tablet |
| **`docker run` command** | Starts with `docker run ` | `docker.run-to-compose` op exists; promote to format + side-by-side smart view |
| **Email / SMTP headers** | Multiple `^[\w-]+:` lines incl. `Received:` | Privacy-sensitive hop-chain analysis; replaces mxtoolbox.com |

New candidates since V1:

| Format | Detection Signal | Value |
|---|---|---|
| **Git patch series / range-diff output** | Multiple `diff --git` blocks with cover-letter markers | Pairs with existing diff viewer |
| **`.gitignore` / editorconfig** | Section-less rule lines / `[root]` INI variant | Tiny, but constant paste targets; lint-style annotations |

Detection limitation worth fixing while adding formats: `detectFormat()` samples only the first 100 lines when content exceeds 5,000 chars (`MAX_SAMPLE_LINES`). A HAR with a huge preamble or a compose file whose `services:` block starts late will misdetect. Consider tail sampling or mask-aware scanning.

---

## Scan 2 — Existing Formats That Can Gain Smart Views

21 of 40 formats render no smart view. Highest-value gaps:

| Format | Smart View Idea |
|---|---|
| **SQL** | Query type badge, table/column extraction, formatted query display — pairs naturally with SQL Sandbox handoff |
| **GraphQL** | Schema explorer for SDL/introspection JSON; deep-link to GraphQL Client |
| **HCL (Terraform)** | Resource/variable/output listing — infra-at-a-glance |
| **Dockerfile** | Layer breakdown: numbered RUN/COPY stages with caching commentary |
| **Access log** | Request timeline, status-code distribution, top paths — raw logs are unreadable; chart view |
| **VHost** | Directive summary: vhosts, rewrite rules, SSL config flags |
| **Bash/Shell** | Script summary: commands used, shebang target, unsafe-pattern warnings (`rm -rf $VAR`, unquoted vars) — complements Secret Scanner |

Verify-existing notes from V1, still unchecked:
- Stack Trace viewer: confirm Python/Go/Rust/Java traces, not just JS frames
- cURL smart view: confirm `--data-raw`, `--form`, auth flag coverage
- OpenAPI Explorer: confirm circular `$ref` handling, OpenAPI 2.0 parity, large-spec behaviour

---

## Scan 3 — New Tablets

Tools where developers leave the app (breaking the privacy model). PDF Inspector remains #1:

| Tool | Architecture | Why It Matters |
|---|---|---|
| **PDF Inspector** | Tablet | Still completely absent — zero pdf.js in deps. Archive Inspector explicitly falls back to binary-hex for PDF entries. Page/metadata/font/text extraction keeps sensitive documents off online converters |
| **Unicode explorer** | Tablet | Search by name/codepoint; inspect pasted text char-by-char |
| **Chmod calculator** | Tablet | Octal ↔ symbolic ↔ plain English + copyable command |
| **HTTP header analyzer** | Tablet + REST companion | Explain cache/CORS/security headers, flag weak settings |
| **CSP builder/analyzer** | Tablet | Parse directives, flag unsafe rules, build tighter policy offline |
| **Certificate chain builder** | Tablet + PEM format | PEM viewer exists; chain ordering/validation/export completes the story |
| **Crontab file viewer** | Tablet + format | Cron builder handles one expression; full crontab parsing handles env lines, comments, multiple schedules |
| **SemVer / version range tool** | Tablet | npm/Cargo range explanation and satisfaction testing |
| **Env / feature-flag diff** | Tablet + dotenv format | Two `.env` comparison, secret-drift flagging |
| **Dependency license checker** | Tablet + lockfile companion | Paste lockfile/package metadata → license summary, attribution export |

Housekeeping (not new tools, but registry decisions):
- **`runcode`** tablet is fully built but unregistered in metadata — invisible to users. Ship it (with sandboxing review) or remove it.
- **`promptmanager`** entry commented out — same decision needed.

---

## Scan 4 — Additional Value on Existing Tablets

| Tablet | Gap | Fix |
|---|---|---|
| **REST Client** | No named collections/folders (history only); no environments beyond per-request variables; binary body and multipart parsing unimplemented | Collections close the Hoppscotch gap; environments enable staging/prod switching; finish body handling |
| **Diagram** | Mermaid only | D2/Graphviz have WASM builds; PlantUML via server is off-brand (network) — prefer WASM options |
| **Regex** | No match highlighting in the Monaco editor itself | Monaco decorations on match ranges |
| **UUID** | v1/v4/v7 done | Add ULID, NanoID, KSUID generation |
| **Vault** | **No encryption at all** — despite the name, Command Vault stores snippets in plaintext IndexedDB (V1 wrongly assumed CryptoJS encryption was present). No per-entry export either | Decide: encrypt vault entries like the planned locked-tab feature, or rename to avoid implying security |
| **ShapeSnap** | Grouping stub (see Known Bugs); annotation limited to label editing | Implement or remove grouping; add annotation/redaction layer |
| **Converter** | CIDR calculator present; **no IPv6 support anywhere in tablet** (though pipeline has ipv6-expand/compress) | Surface IPv6 expand/compress and host-count details in Converter |
| **Archive Inspector** | ZIP-family only; PDF fallback (see Scan 3) | PDF Inspector closes the gap; consider tar/7z/gz single-file support |
| **Image Smart View** | Annotation, redaction/blur, palette quantization, animated-frame editing still deferred | Annotation + redaction layer; wire quantization into Colour Palette handoff |

---

## Scan 5 — New Pipeline Operations (Rival CyberChef)

Current: **181 operations** vs CyberChef ~477 (~37%). Runner architecture is solid (worker + timeouts + size caps), so op additions are low-risk.

Already covered (do not re-add): full base-N family **including hex**, morse/nato/punycode/quoted-printable, XOR, gzip/zlib/deflate/brotli, URL suite, IPv6 expand/compress, CIDR ops, SHA family + MD5/CRC32/RIPEMD/Keccak + HMAC, AES-GCM, JWT sign/decode, XML XPath, jsonpath (**plus JMESPath**), flatten/unflatten/sort-keys/merge/pick, YAML/TOML/CSV/Markdown conversions, datetime suite, docker.run-to-compose, JS snippet op, all case conversions (camel/snake/kebab/pascal/title/etc. — V1's "convert-case" gap is effectively closed).

### Priority A — No new dependencies

- `json.to-type-definition` — infer TS interface / Go struct / Python TypedDict / Rust struct; zero deps; replaces json-to-go.com
- `text.normalize-unicode` — NFC/NFD/NFKC/NFKD via `String.prototype.normalize`
- `text.template` — `{{var}}` substitution from JSON input
- `text.remove-comments` — generic source-comment stripper (current `json.removeComments` is JSON-only)
- `crypto.rsa-encrypt` / `crypto.rsa-decrypt` — RSA-OAEP via native SubtleCrypto, PEM in/out

### Priority B — Moderate cost or new dependency

- `validate.json-schema` — needs `ajv` (~30 KB, only a transitive dep today); pairs with the JSON Schema format work
- `hash.blake2` — BLAKE2b/blake2s
- `compression.bzip2-compress/decompress` — completes compression matrix; `seek-bzip` or wasm-flate
- `encoding.msgpack-encode/decode` (`msgpackr`, ~15 KB)
- `encoding.cbor-encode/decode` (`cbor-x`, ~30 KB)
- `json.diff` — RFC 6902 patch or human diff (`fast-json-patch`, ~8 KB)
- `json.jq` — real jq via WASM; JMESPath/JSONPath exist but jq is the lingua franca of DevOps
- `text.parse-useragent` — `ua-parser-js` (~10 KB)

### Priority C — Differentiated (not in CyberChef)

- `network.mac-vendor` — bundled offline OUI table lookup; strong privacy angle

Scope notes unchanged: bcrypt/Argon2 excluded (no decrypt step in a pipeline); classical ciphers excluded (CTF-only value).

---

## Scan 6 — Workspace Management

| Gap | Detail |
|---|---|
| ~~Export/import~~ | **Done** |
| ~~Tab count badge~~ | **Done** |
| ~~Colour coding~~ | Done, but auto-assigned — user-selectable colour is a small upgrade |
| Workspace templates | "New workspace from template" (e.g. "API debugging": REST Client + JSON tab) |
| Archive workspace | Collapse out of active list without deleting |

---

## Scan 7 — Tab Management

| Gap | Detail |
|---|---|
| **Recently closed / recycle bin** | Closes are permanent; dialogs say "cannot be undone". Store last N closed tabs per session — cheap data-loss insurance |
| ~~Sidebar drag reorder~~ | **Done** |
| Tab templates / new-tab-from-template | Every tab starts blank; scaffold JWT decode, REST request, pipeline starter |
| Tab groups / folders within workspace | Pin + "Group Types" sort exist; folders would help heavy multi-tab workspaces |

---

## Scan 8 — Tab Context Menu

Current menu is rich (18 actions incl. Compare variants, Split, Pipeline, Macro, Canvas send, Organize submenu). Remaining:

| Missing Item | Detail |
|---|---|
| **Lock / encrypt tab** | Password-encrypt content at rest (see Privacy Gaps #2) |
| **Set format override** | Force language/format when auto-detection is wrong — no escape hatch exists today, and detection misfires become unfixable |

---

## Privacy Story Gaps (Core Brand Differentiator)

1. **No in-app network activity monitor.** Still zero PerformanceObserver usage. A "0 outbound requests this session" panel remains the boldest differentiator available — especially credible now that REST Client and AI downloads make network activity visible-by-default elsewhere.

2. **Everything sits plaintext in IndexedDB.** `ScratchDB` stores tabs, canvas assets, pipelines, and settings unencrypted. High-risk content lands there routinely: TOTP secrets (`totp/AddAccountModal.tsx`), password-manager entries (`password/`), JWTs (`jwt/`), vault snippets. The optional "lock tab"/lock-vault feature closes this and corrects V1's mistaken assumption about Vault encryption.

3. **Share links encode content uncompressed-plaintext.** `shareService.ts:50` uses LZ-string compression — trivially reversible — into URLs that leak into browser history and server logs. Needed: explicit sensitivity warning before copy, and/or local QR/file alternatives.

4. **AI model downloads:** adequately communicated now (sizes, offline messaging, progress). No action.

---

## UX / Accessibility / Performance

- **Accessibility baseline is effectively zero.** Verified gaps:
  - `BaseModal.tsx`: no Escape-to-close, no focus trap, no initial focus, no focus return — across *every* modal in the app
  - Tab bar: `aria-selected` set but no `role="tablist"/"tab"/"tabpanel"` anywhere — orphaned ARIA
  - Zero `prefers-reduced-motion` support repo-wide
  - No keyboard-only workflow validation (open tablet → focus editor → smart view → switch tab)
- **Smart-view performance regression.** The large-content guard was removed (`EditorPaneWrapper.tsx:49-53`). CSV/TOML/NDJSON/diff views virtualize, but JSON Workbench and others take full content unguarded on the main thread. Restore a threshold + warning, or move parsing off-thread.
- **Global keyboard shortcut overlay missing.** Per-feature overlays exist (Canvas, Hex Viewer) but nothing app-wide; hotkeys in `useGlobalHotkeys.ts` are undiscoverable. One modal listing global + per-tablet shortcuts.
- Status bar discoverability (smart-view toggles live there) — unchanged from V1.
- Pipeline builder loses content context behind its modal — side-panel alternative still open.
- Font size persists per-tab (IndexedDB `TabRecord.fontSize`) but there is no app-wide default preference, and tablets ignore it deliberately. Document or add a global setting.

---

## Competitive Positioning Gaps

| Competitor | Their edge | What you need |
|---|---|---|
| **CyberChef** | ~477 ops, community | Op gap is closing (181); UX remains the counter-pitch; jq + msgpack/cbor + type-definition are the highest-value adds |
| **DevToys** | Native installable | Lean into browser-native persistence + workspace model |
| **Boop** | Mac-only minimal | Workspace persistence beats it |
| **regex101** | Match visualization | Editor-integrated match highlighting still missing |
| **Hoppscotch** | Collections, environments, sync | REST Client needs named collections + environments (import half done via Postman converter) |
| **Transform.tools** | SEO dominance | Landing pages make no numeric claims and don't index per-operation — SEO for specific conversions remains untapped |

---

## Priority Stack Rank

1. **Restore the smart-view large-content guard** — a shipped regression; UI-freezing previews undermine trust more than any missing feature
2. **Fix the @bug CSV data-integrity regression + prune @wip debt** — flagship format, known broken test excluded from CI
3. **Accessibility baseline** — Escape/focus-trap in BaseModal, proper tab-list semantics, reduced-motion. Cheap, high-trust, and currently at zero
4. **PDF Inspector** — still the single biggest offline-privacy gap (zero pdf.js today); Archive Inspector punts PDFs to hex dumps
5. **Optional encryption at rest (lock tab + real Vault encryption)** — corrects V1's wrong assumption; TOTP secrets and passwords sitting plaintext is the worst current privacy exposure
6. **In-app network activity monitor** — hardest differentiator to clone
7. **JSON Schema format + ajv validator** — generator already exists; detection + smart view + `validate.json-schema` op complete the story
8. **Email/SMTP headers format + smart view** — privacy-sensitive, pure-JS, follows HAR/StackTrace pattern
9. **REST Client collections + environments + body-handling TODOs** — closes the Hoppscotch gap properly
10. **Pipeline Priority A ops** (to-type-definition, normalize-unicode, template, remove-comments, RSA) — zero-dependency parity gains
11. **SARIF + SBOM viewers** — security/supply-chain positioning
12. **Logfmt + Syslog + Compose/K8s sub-detects** — completes observability trio; leverages existing schema-store entries
13. **Ship-or-kill `runcode` and `promptmanager`; delete ShapeSnap dead grouping code** — registry hygiene before marketing
14. **Recently closed tabs + global shortcut overlay** — expected polish
15. **SQL/GraphQL/HCL/Dockerfile smart views; Regex editor highlighting; ULID/NanoID** — second-wave tablet value
