// Auto-generated from releases.yml - DO NOT EDIT MANUALLY
// Run: cd changelog && node generate.js

export interface ReleaseCategory {
  name: string;
  changes: string[];
}

export interface Release {
  version: string;
  type: 'latest' | 'release' | 'beta' | 'alpha';
  date: string;
  headline: string;
  summary: string;
  categories: ReleaseCategory[];
}

export const APP_VERSION = '1.49.0';

export const RELEASES: Release[] = [
  {
    "version": "1.49.0",
    "type": "latest",
    "date": "2026-09-21",
    "headline": "Merge Tabs",
    "summary": "Combine tabs in a chosen order as plain text, CSV, JSON, or HAR while keeping every source unchanged.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Merge tabs:** Select and reorder tabs from either side of split view, name the result, and preview it before creating a new tab",
          "**Structured formats:** Merge CSV and TSV rows, JSON arrays or objects, and HAR requests with format-specific validation and options",
          "**Safe source handling:** Source tabs stay open and unchanged, and edits made after preview must be reviewed before the merge can be created"
        ]
      }
    ]
  },
  {
    "version": "1.48.0",
    "type": "release",
    "date": "2026-09-03",
    "headline": "Canvas Quick Transform + CSV Find and Replace",
    "summary": "Run any pipeline operation right from a Canvas card, plus CSV find and replace and one-click copy down for faster table cleanup.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Canvas quick transform:** Search any pipeline operation from a text or code card, tweak params, and run it with the result placed as a linked card beside the source",
          "**CSV find and replace:** Replace across the whole table, one column, or just the selected cells, with match case and whole cell options",
          "**CSV copy down:** Right click any cell to copy its value into every cell below it in the same column, with full undo support"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Pipeline menu with no selection:** Right clicking with nothing selected now opens the pipeline with full tab content instead of an empty input"
        ]
      }
    ]
  },
  {
    "version": "1.47.0",
    "type": "release",
    "date": "2026-08-25",
    "headline": "Spin the Wheel + Canvas & Storage Polish",
    "summary": "A new Spin the Wheel tablet for weighted random picks with history, snapshots, and shareable links - plus Canvas drag-drop polish and a Storage panel showing what's using space.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Spin the Wheel tablet:** Add entries to the wheel and spin for a weighted, crypto-RNG winner - drawn before the animation so the wheel is visually honest",
          "**Winner modal:** Spin again, remove the winner and respin, or copy the result as an image with the winner overlaid on the wheel",
          "**History and snapshots:** Past spins are logged per tab, and entry lists can be saved as named snapshots and restored later",
          "**Shareable links:** Share wheels via link from the tablet or send text tabs straight in with Open in → Spin the Wheel",
          "**Rota generator:** Build a who's-on-when rota from the wheel's names - cycled or shuffled order, daily or weekly changes, optional weekend skipping - with a live preview and one-click copy as date-then-name lines",
          "**Storage quick panel:** Sidebar panel listing heaviest tabs by live size with a quota bar - click to navigate, bin to close"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Canvas drop targeting:** The global drop popup stays hidden over Canvas while dragging; the canvas highlights with a drop ring instead",
          "**Cleaner image cards:** Canvas image actions reveal on hover rather than covering the picture",
          "**Honest storage errors:** Real QuotaExceededError detection with a friendly message replaces the unreliable pre-flight estimate",
          "**Orphaned tab cleanup:** Tabs whose workspace no longer exists are hard-deleted along with their canvas documents and unreferenced assets"
        ]
      }
    ]
  },
  {
    "version": "1.46.0",
    "type": "release",
    "date": "2026-08-22",
    "headline": "CSV Smart View Filtering + Six New Pipeline Operations",
    "summary": "Type-aware column filtering for CSV tables with facets and presets, plus RSA encrypt/decrypt, JSON-to-type-definition, template substitution, Unicode normalization, and comment removal operations.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Per-column CSV filters:** Filter row under headers with operators like equals, contains, regex, range, between, and is-empty - matched with AND or OR across columns",
          "**Type-aware filter inputs:** Columns are typed as number, date, boolean, or text by sampling rows; number columns get min/max ranges and date columns get date pickers",
          "**Value facets:** Excel-style checkbox list of distinct values per column with live counts that update as other filters apply",
          "**Filter presets:** Save the active filter set under a name and reapply it later; active filters show as removable chips with a clear-all action"
        ]
      },
      {
        "name": "New Pipeline Operations",
        "changes": [
          "**RSA Encrypt / Decrypt:** RSA-OAEP (SHA-256) with PEM public/private keys via Web Crypto, Node.js fallback",
          "**JSON To Type Definition:** Infer TypeScript interfaces, Go structs, Python TypedDicts, or Rust structs from JSON",
          "**Template Substitution:** Fill {{variable}} placeholders from a JSON object, with dot notation for nested values",
          "**Normalize Unicode:** Convert text to NFC, NFD, NFKC, or NFKD form",
          "**Remove Comments:** Strip line and block comments across JS, Python, Shell, SQL, HTML, and XML styles while preserving strings"
        ]
      }
    ]
  },
  {
    "version": "1.45.0",
    "type": "release",
    "date": "2026-07-31",
    "headline": "Top-Level Tab Actions + Markdown Diagrams",
    "summary": "Restored top-level Import/Canvas buttons, JSON search path suggestions, and mermaid diagram rendering with a repositioned copy/open toolbar in Markdown code blocks.",
    "categories": [
      {
        "name": "Improvements",
        "changes": [
          "**Top-level tab actions:** New Tab, Import from Paste, Canvas, and Developer Tool are top-level buttons again instead of a dropdown menu",
          "**JSON search suggestions:** Field-name and query-path autocomplete while typing in the JSON smart view search box",
          "**Markdown code block toolbar:** Copy and open-in-new-tab icons repositioned to the top-left of each code block"
        ]
      },
      {
        "name": "New Features",
        "changes": [
          "**Mermaid diagrams in Markdown:** Fenced mermaid code blocks render as diagrams in the Markdown preview, with fallback to raw source on error"
        ]
      }
    ]
  },
  {
    "version": "1.44.0",
    "type": "release",
    "date": "2026-07-24",
    "headline": "Spatial Canvas",
    "summary": "Arrange code, notes, images, links, and videos on a local-first infinite canvas.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Mixed content:** Add text, code and JSON, local images, links, and click-to-load YouTube or Vimeo cards",
          "**Spatial controls:** Pan, zoom, resize, multi-select, layer, duplicate, undo, redo, and navigate by keyboard",
          "**Fast capture:** Paste or drop content, or send a tab or selection to a new or existing Canvas"
        ]
      },
      {
        "name": "Local-First Workspace",
        "changes": [
          "**Private persistence:** Canvas documents and images stay in local IndexedDB and work offline",
          "**Workspace integration:** Search cards, use split view, and preserve Canvas content through workspace import and export"
        ]
      }
    ]
  },
  {
    "version": "1.43.0",
    "type": "release",
    "date": "2026-07-17",
    "headline": "Data Reconcile Tablet",
    "summary": "Compare rows across two tabs with whole-line or CSV key-column matching, then open or copy the results without changing either source.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Data Reconcile tablet:** Compare whole lines or CSV rows across two tabs, preserving duplicate occurrences and keeping source tabs unchanged",
          "**CSV key matching:** Pair different header names between sources, surface changed fields, and create cleaned copies or result tabs",
          "**Fast entry points:** Start a comparison from the tab context menu or directly from the CSV table toolbar"
        ]
      }
    ]
  },
  {
    "version": "1.42.0",
    "type": "release",
    "date": "2026-07-14",
    "headline": "Mobile Welcome + CSV Table Editing",
    "summary": "A compact, scrollable welcome screen for mobile, plus column selection and spreadsheet-style copy and paste for CSV tables.",
    "categories": [
      {
        "name": "Improvements",
        "changes": [
          "**Mobile scrolling:** Welcome content can be scrolled on smaller screens",
          "**Compact actions:** Primary actions use space-efficient rows and secondary actions are tucked behind More ways to start",
          "**Desktop recommendation:** A small mobile-only note sets clear expectations without blocking access"
        ]
      },
      {
        "name": "CSV Table Editing",
        "changes": [
          "**Column selection:** Click a header to select a column, then Ctrl/Cmd-click or Shift-click to extend the selection",
          "**Copy and paste:** Paste tabular data into a selected cell, expanding rows and columns as needed with undo/redo support",
          "**Copy columns:** Copy selected columns with headers and insert them before another column without overwriting data"
        ]
      }
    ]
  },
  {
    "version": "1.41.0",
    "type": "release",
    "date": "2026-06-25",
    "headline": "Archive Inspector + Image Smart View",
    "summary": "A new Archive Inspector tablet for browsing ZIP/JAR/APK/DOCX/EPUB archives offline, plus an Image smart view for viewing and editing images.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Archive Inspector tablet:** Browse ZIP, JAR, APK, DOCX, XLSX, and EPUB archives with a file tree, search, and stats panel - fully offline",
          "**Archive previews:** Text, JSON, XML, image, and hex previews per entry, with copy, extract, and open-in-new-tab actions",
          "**Image smart view:** Zoom, pan, rotate, flip, crop, resize, and colour adjustments with undo/redo and compare",
          "**Colour Palette handoff:** Send a sampled colour or extracted palette from the Image smart view into a new Colour Palette tab"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Image paste/drop:** Pasting or dropping an image now opens it in the Image smart view instead of raw text"
        ]
      }
    ]
  },
  {
    "version": "1.40.0",
    "type": "release",
    "date": "2026-06-19",
    "headline": "XML Smart View + Five New Pipeline Operations",
    "summary": "A dedicated smart view for XML tabs with a live structure tree, node inspector, diagnostics panel, and XPath workbench - plus five new pipeline operations including xml.xpath, jwt.sign, and docker run-to-compose conversion.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**XML Structure tree:** Collapsible element tree synced bidirectionally with the editor - clicking a tree node selects and reveals it in the editor; moving the cursor in the editor highlights the deepest node at that position",
          "**Node inspector:** Right-hand panel shows element kind, path, line/column, namespace, attribute list, and one-click copy buttons for node XML, inner XML, text content, XPath, Clark notation, and CSS path",
          "**Diagnostics panel:** Reports parse errors with jump-to-line links, security warnings (XXE entities, external DTDs, large base64 payloads), and payload size stats",
          "**XPath workbench:** Live XPath 1.0 evaluator with 300ms debounce, result table showing type/name/value/path, and export to CSV, JSON, or XML in a background tab; hints when a default namespace requires a generated prefix",
          "**Format and Minify:** Toolbar buttons to pretty-print (2-space indent, comment-preserving, xml:space aware) or minify the XML in place, with full undo stack support",
          "**JSON conversion:** Converts XML to a structured JSON object (attributes under `@attributes`, text under `#text`) and opens it in a background tab",
          "**xml.xpath pipeline operation:** Evaluate an XPath 1.0 expression on XML input and return matching nodes, strings, numbers, or booleans - the natural companion to json.jsonpath",
          "**jwt.sign pipeline operation:** Sign a JSON payload as a JWT using HS256, HS384, or HS512 via Web Crypto - closes the encode/decode symmetry gap left by jwt.decode",
          "**docker.run-to-compose pipeline operation:** Convert a `docker run` command into an equivalent docker-compose.yml service definition; handles ports, volumes, env vars, restart policy, resource limits, and more",
          "**text.remove-line-numbers pipeline operation:** Strip leading numbering from each line (complement of the existing text.add-line-numbers)",
          "**text.column-align pipeline operation:** Align whitespace- or tab-separated columns to uniform widths, equivalent to `column -t`"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Tab state persistence:** Expanded tree nodes, selected node, active bottom tab, XPath expression, tree scroll position, and editor scroll/cursor/fold state are all saved and restored when switching between tabs"
        ]
      }
    ]
  },
  {
    "version": "1.39.0",
    "type": "release",
    "date": "2026-06-16",
    "headline": "Installable Offline App",
    "summary": "Scratch Tabs is now installable as a Progressive Web App with offline app-shell caching, so the workspace can launch from the desktop or home screen after the first visit.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Progressive Web App support:** Scratch Tabs can now be installed from supported browsers and launched in a standalone app window",
          "**Offline app shell:** A generated service worker precaches the built application assets so the workspace can open without a network connection after the first successful load",
          "**Install assets:** Added manifest metadata and dedicated 192px, 512px, and maskable icons for browser install surfaces"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**FAQ update:** Clarified that browser app installation is paired with explicit PWA metadata and service-worker-backed app-shell caching"
        ]
      }
    ]
  },
  {
    "version": "1.38.0",
    "type": "release",
    "date": "2026-06-15",
    "headline": "Quick Transform - Apply Pipeline Operations from the Editor",
    "summary": "Right-click any text in a Monaco editor tab to instantly search and apply pipeline operations or saved pipelines without opening the full pipeline editor.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Quick Transform:** Right-click in any editor tab to open a floating search modal - find any pipeline operation or saved pipeline by name and apply it to the selected text or full tab content",
          "**Selection-aware:** When text is selected the transform runs against the selection only and writes the result back in-place; without a selection the full tab content is used",
          "**Recents:** Recently used transforms surface at the top of search results so repeated operations require no typing",
          "**Inline params:** Operations that require parameters show a compact form in the modal before applying, with a per-line mode toggle for applicable operations"
        ]
      }
    ]
  },
  {
    "version": "1.37.0",
    "type": "release",
    "date": "2026-06-12",
    "headline": "SQL Sandbox - Query Your Data with DuckDB in the Browser",
    "summary": "Run SQL against local CSV, TSV, JSON, NDJSON, and Parquet files using DuckDB WASM - no server, no install, no upload. Import files or paste data, write queries in a Monaco editor, inspect schemas, and export results.",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**SQL Sandbox tablet:** Full offline SQL environment powered by DuckDB WASM - import CSV, TSV, JSON, NDJSON, or Parquet data sources, query them with standard SQL, and export results without any data leaving the browser",
          "**DuckDB WASM engine:** Uses DuckDB's WebAssembly build with automatic browser capability detection - supports JOINs, aggregations, window functions, GROUP BY, CTEs, and all standard DuckDB SQL syntax",
          "**Multi-source sessions:** Register multiple files or pasted text payloads as named tables in the same session - each source becomes a DuckDB view queryable by the table name derived from the file name",
          "**Format auto-detection:** CSV, TSV, JSON arrays, NDJSON, and Parquet files are identified automatically; CSV and TSV use read_csv_auto with header detection; JSON uses read_json_auto; NDJSON uses read_ndjson_auto; Parquet files are loaded natively",
          "**Monaco SQL editor:** Full Monaco editor with SQL language mode and syntax highlighting; run the full query with the Run button or select a SQL fragment and execute only that portion with the Selected button",
          "**Schema sidebar:** Collapsible sidebar listing all tables and views in the current session with column names and inferred types, updated automatically after each source import",
          "**Query history:** Every executed statement is recorded with timestamp, execution time, and row count; the History panel lets you browse past queries and load any entry back into the editor",
          "**Named snapshots:** Save the current query as a named snapshot (auto-named by time if no name is given); up to 20 snapshots are stored per session with restore and delete actions",
          "**Results table:** Query output displays in a responsive table with column headers; result sets are capped at 5,000 display rows with a truncation notice when the engine returns more",
          "**CSV and JSON export:** Export the current result set as a CSV or JSON file opened in a new background tab with the language pre-set",
          "**Destructive statement guard:** Queries containing DROP, DELETE, UPDATE, ALTER, or TRUNCATE trigger a confirmation prompt before execution",
          "**Session persistence:** Text-based sources (CSV, TSV, JSON, NDJSON) are serialized into tab state and restored on reload so data survives page refreshes without re-uploading",
          "**Engine lifecycle:** The DuckDB runtime is lazily initialized on first use and disposed after five minutes of inactivity to free WebAssembly memory; reopening the tablet re-initializes and reloads persisted sources automatically",
          "**Sample data:** A built-in sample CSV loads instantly so you can explore the interface before importing your own data",
          "**Context action:** Editor tabs containing CSV or JSON content gain an 'Open in SQL Sandbox' option in the right-click menu, creating a new SQL Sandbox tab with that content pre-loaded as a queryable table"
        ]
      }
    ]
  },
  {
    "version": "1.36.0",
    "type": "release",
    "date": "2026-06-01",
    "headline": "12 New Pipeline Operations, Move to Workspace Fix & Active Workspace Highlight",
    "summary": "Base62, Base64URL, Basic Auth, JSON Merge/Pick, Extract JSON, Text Obfuscate, Luhn validation, and Strip ANSI pipeline operations - plus the Move to Workspace context menu fix and a clearer active workspace indicator in the sidebar",
    "categories": [
      {
        "name": "New Pipeline Operations",
        "changes": [
          "**Base62 Encode:** Encode text to Base62 using the 0-9A-Za-z alphabet - used in URL shorteners, YouTube video IDs, and MongoDB ObjectIDs; preserves leading null bytes using the '0' sentinel consistent with the Base58 implementation",
          "**Base62 Decode:** Decode Base62 back to text; strips surrounding and internal whitespace before decoding; throws a descriptive error on any character outside the alphabet",
          "**Base64URL Encode:** Encode text as URL-safe Base64 without padding - useful for JWT, OAuth, PKCE, WebAuthn, and other token formats that avoid `+`, `/`, and `=` characters",
          "**Base64URL Decode:** Decode URL-safe Base64 back to UTF-8 text; accepts padded or unpadded input and restores missing padding automatically",
          "**Basic Auth Encode:** Build an HTTP Basic Authorization header value from username and password parameters; supports emitting either the full `Basic ...` header value or the raw Base64 token",
          "**Basic Auth Decode:** Decode a Basic Auth header or raw token into username/password fields, with JSON or `username:password` output modes for pipeline chaining",
          "**JSON Merge:** Deep merge a second JSON object (textarea parameter) into the pipeline input - nested objects are merged recursively, the patch document wins on key conflicts, arrays are replaced not merged, and null/false/zero patch values correctly overwrite non-null base values",
          "**JSON Pick:** Extract one or more values from JSON by dot/bracket paths such as `user.profile.email` or `items[0].id`; can return values directly or preserve the selected object shape",
          "**Extract JSON:** Pull valid JSON object or array fragments out of logs, stack traces, and prose; supports first-match or all-matches modes and pretty, minified, or JSON-array output",
          "**Text Obfuscate:** Mask sensitive values with configurable visible prefix/suffix lengths and mask character; works per-line or over the full input for safe sharing",
          "**Luhn Validate:** Validate card-like identifiers and other Luhn check-digit values; ignores spaces and dashes and can return plain text, boolean, or structured JSON",
          "**Strip ANSI Codes:** Remove ANSI/VT100 colour and control escape sequences from terminal output - covers SGR colour and style codes, 256-colour params, cursor movement, clear screen, hide/show cursor, and OSC window title sequences; runs per-line or over the full block"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Move to Workspace:** The sidebar tab context menu's Move to Workspace submenu now correctly moves the tab - it was a TODO stub that did nothing since the feature shipped; the action handles tabs in both active and inactive source workspaces and both active and inactive target workspaces"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Active workspace highlight:** The active workspace row in the sidebar now shows a 3px primary-colour left accent stripe and a subtle background tint, making it immediately scannable without reading the workspace name - all workspace rows carry the border slot (transparent when inactive) so content alignment never shifts"
        ]
      }
    ]
  },
  {
    "version": "1.35.0",
    "type": "release",
    "date": "2026-06-01",
    "headline": "Webhook HMAC Verifier & HAR Smart View Editing",
    "summary": "New offline Webhook HMAC Verifier tablet for validating provider signatures, plus HAR Smart View editing with request deletion, two-request comparison, and paste-to-merge",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Webhook HMAC Verifier tablet:** Validate GitHub, Stripe, Slack, Twilio, Shopify, Standard Webhooks / Svix, and custom HMAC signatures locally",
          "**Canonical payload inspector:** Shows exactly what was signed, including byte counts, newline style, trailing newline status, and optional invisible-character rendering",
          "**Replay diagnostics:** Flags missing, stale, or future timestamps with configurable tolerance for providers that sign timestamps",
          "**Request import modes:** Paste structured fields, raw HTTP requests, or common cURL commands and preserve the raw body for verification",
          "**Safe reports:** Open a redacted markdown verification report in a background tab without including secrets or raw payloads"
        ]
      },
      {
        "name": "Smart View Improvements",
        "changes": [
          "**HAR request selection:** Select individual requests directly from the HAR waterfall or sortable table, with select-all-visible support for filtered result sets",
          "**Delete selected HAR entries:** Remove selected requests from the underlying HAR content in one action, making it easy to trim noisy captures before exporting or sharing",
          "**Compare two HAR requests:** Select exactly two requests and open a comparison modal that lists fields that match and fields that differ across request, response, timing, cookies, and HAR metadata",
          "**Differences-only comparison:** Toggle the compare modal to hide matching fields and focus only on changed values",
          "**Paste-to-merge HAR content:** Paste another HAR file's JSON into a merge dialog to append its entries into the current capture while preserving existing content"
        ]
      }
    ]
  },
  {
    "version": "1.34.0",
    "type": "release",
    "date": "2026-05-29",
    "headline": "Secret Scanner",
    "summary": "Fully offline secret scanner — detects API keys, tokens, private keys, credentials, and high-entropy strings across logs, diffs, configs, and PEM bundles; redacts findings and generates safe shareable reports without sending a single byte off-device",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Secret Scanner tablet:** Fully offline secret detection — paste logs, diffs, .env files, JSON, YAML, PEM blocks, or HTTP snippets and scan without any data leaving the browser",
          "**60+ detection rules:** Provider-specific patterns for AWS, GitHub, GitLab, OpenAI, Anthropic, Google Cloud, Slack, Stripe, Discord, npm, Cloudflare, SendGrid, Sentry, HTTP auth headers, and database connection URLs; generic patterns for secret-like assignments, credential pairs, and private key blocks",
          "**AWS secret access key rule:** Dedicated rule for the 40-character AWS secret key (in addition to the existing AKIA/ASIA access key ID rule), reported at critical severity",
          "**Discord bot token rule:** Detects the three-segment Discord bot and user token format distinct from webhook URL detection",
          "**Kubernetes Secret decoder:** Locally base64-decodes all entries in `data:` and `stringData:` blocks and reports the decoded credential material with a safe preview",
          "**JWT detection with local metadata:** Decodes header and payload locally to surface algorithm, issuer, subject, expiry timestamp, and an explicit warning when `alg: none` is used",
          "**Shannon entropy analysis:** Flags opaque high-entropy strings as medium-confidence findings independently of variable name — URL values are excluded to prevent false positives on webhook and API paths",
          "**Google Cloud service account priority:** Provider-specific rules outrank the generic private-key-block fallback at the same position so GCP service account keys are attributed to Google Cloud, not the generic 'Private Key' provider",
          "**Context scoring:** Documentation context (example, sample, readme, mock) downgrades severity and confidence; diff added-line findings receive an upward severity nudge; placeholder values (dummy, changeme, all-same-character) are collapsed to info",
          "**Credential-pair detection:** Detects prose-style `username / password` patterns in documentation and comments; URL path segments are excluded to prevent API routes from being misread as passwords",
          "**Deterministic redaction:** Each unique secret value receives a stable numbered token (`[REDACTED_GITHUB_3]`) so redacted output is consistent across multiple scans of the same content",
          "**Summary bar:** At-a-glance counts for total findings, critical/high findings, distinct providers, diff added-line findings, and private key blocks",
          "**Findings table:** Sortable by severity with columns for provider, redacted preview, line:column location, and confidence",
          "**Finding detail panel:** Explanation of why the finding was raised, remediation checklist, surrounding context with the secret value redacted, and a false-positive toggle to suppress a finding",
          "**Filter bar:** Filter findings by severity, provider, and status (open / false positive); hide low-confidence results with a single toggle",
          "**Copy Safe Report:** Copies a plain-text summary of all findings with values redacted — safe to paste into tickets or incident reports",
          "**Download Redacted:** Downloads the full scanned input with all secret values replaced by their redaction tokens",
          "**Redaction preview:** Live preview panel showing the redacted version of the input as findings are produced",
          "**Auto-scan mode:** Optional checkbox debounces a re-scan 350 ms after each keystroke so findings update as you type",
          "**Zero persistence of secrets:** Raw secret values are stripped from the tablet state before it is written to IndexedDB — only redacted tokens and metadata are stored",
          "**Context action:** Tabs gain an 'Scan for Secrets' option in the right-click menu, sending the tab's content directly to a new Secret Scanner tab"
        ]
      }
    ]
  },
  {
    "version": "1.33.0",
    "type": "release",
    "date": "2026-05-28",
    "headline": "OpenAPI / Swagger Smart View",
    "summary": "Offline OpenAPI viewer with syntax highlighting, endpoint explorer, schema resolution, response examples, cURL / REST Client exports, plus quicker access to pinned and recently modified tabs",
    "categories": [
      {
        "name": "New Smart Views",
        "changes": [
          "**OpenAPI / Swagger viewer:** Dedicated offline smart view for OpenAPI 2.0 and 3.x specs — inspect endpoints, schemas, security requirements, and diagnostics without leaving the app",
          "**OpenAPI syntax highlighting:** Specs detected in the editor now use a custom OpenAPI language mode for readable syntax highlighting",
          "**Markdown descriptions:** API descriptions render as Markdown so headings, lists, emphasis, and links display correctly in the overview panel",
          "**Endpoint explorer:** Browse operations by tag or path, inspect path/query parameters, view request bodies, and switch between response status codes",
          "**Resolved schemas & examples:** Nested schema references are resolved recursively so request and response examples show the full object shape, including referenced properties",
          "**cURL / REST Client export:** Generated requests preserve path and query parameters when opened in cURL or REST Client tabs",
          "**Copy feedback:** Copy actions in the OpenAPI viewer use the app's standard success affordance with a brief green tick confirmation"
        ]
      },
      {
        "name": "Workspace Navigation",
        "changes": [
          "**Pinned tabs quick panel:** A new Pinned button above Import / Export in the sidebar opens a compact panel of pinned tabs across known workspaces; clicking an entry activates it just like selecting the tab directly",
          "**Recently modified quick panel:** A new Recent button opens a compact list of recently modified tabs so active scratch work can be recovered without scanning every workspace",
          "**Tab access tracking:** Tabs now store `lastAccessed` alongside `lastModified`, laying the groundwork for future recently accessed and stale-tab decluttering views"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Sidebar pinning inactive tabs:** Right-clicking a tab in an inactive workspace and choosing Pin now persists the pin state and refreshes sidebar metadata correctly",
          "**Sidebar Pin / Unpin label:** The sidebar tab context menu now shows Unpin for tabs that are already pinned, including tabs loaded from inactive workspace metadata"
        ]
      }
    ]
  },
  {
    "version": "1.32.0",
    "type": "release",
    "date": "2026-05-27",
    "headline": "16 New Pipeline Operations — AES-GCM, RIPEMD-160, Keccak-256, IPv6, Reading Time & More",
    "summary": "AES-256-GCM encrypt/decrypt, ROT-13/47, slugify, text diff, number formatting, CSV stats, CIDR info, datetime diff, RIPEMD-160, Keccak-256, IPv6 expand/compress, and reading time — all offline, zero dependencies",
    "categories": [
      {
        "name": "New Pipeline Operations",
        "changes": [
          "**AES-GCM Encrypt:** Encrypt with AES-256-GCM — passphrase via PBKDF2-SHA256, random salt + IV per invocation, Base64 or hex output; Web Crypto API with Node.js fallback",
          "**AES-GCM Decrypt:** Decrypt and verify AES-GCM ciphertext — re-derives the key from the embedded salt and validates the auth tag; fails immediately on wrong passphrase or tampered data",
          "**ROT-13:** Letter substitution over A–Z/a–z; non-letters pass through unchanged; self-inverse",
          "**ROT-47:** Rotation over all 94 printable ASCII characters ('!' through '~'); self-inverse; whitespace preserved",
          "**Slugify:** URL-safe lowercase slug with configurable separator — NFD decomposition for accented chars, overrides table for ligatures (Æ → ae, ø → o, ß → ss, Þ → th); configurable per-line or full-text mode",
          "**Text Diff:** Unified diff between pipeline input and a second text parameter — configurable context lines, pure-JS LCS, no dependencies",
          "**Format Number:** Locale-aware formatting via Intl.NumberFormat — thousands separators, decimal places, currency, and percent style; strips commas from input before parsing",
          "**CSV Stats:** Per-column statistics with auto-detected delimiter — numeric columns get min/max/mean/median/distinct; text columns get distinct count and top-3 values",
          "**CIDR Info:** Network address, broadcast, subnet mask, wildcard, first/last usable host, and host counts for any IPv4 CIDR — /31 and /32 handled as special cases",
          "**Datetime Diff:** Signed difference between two ISO 8601 dates in seconds, minutes, hours, days, weeks, months, or years via date-fns; absolute-value option available",
          "**RIPEMD-160:** 160-bit digest; Node.js crypto with pure-JS browser fallback; hex or Base64 output",
          "**Keccak-256:** Ethereum's SHA3 variant (0x01 padding, not FIPS 0x06); pure-JS BigInt Keccak-f[1600] sponge; hex or Base64 output",
          "**IPv6 Expand:** Expand compressed IPv6 to full 8-group notation (`::1` → `0000:0000:…:0001`); handles `::`, zone IDs, and IPv4-mapped suffixes",
          "**IPv6 Compress:** Compress to shortest `::` form; longest zero-run gets `::` replacement; round-trips with IPv6 Expand",
          "**Sort JSON Keys — Deep/Shallow:** New `mode` param (deep recursive or shallow top-level), `output` (pretty/minified), and `indent` size; backward-compatible with no params",
          "**Reading Time:** Estimate reading time from word count; separate WPM rates for prose (default 200) and fenced code blocks (default 100)"
        ]
      }
    ]
  },
  {
    "version": "1.31.0",
    "type": "release",
    "date": "2026-05-26",
    "headline": "CSV Smart View: Header Promotion & Delimiter Conversion",
    "summary": "Two new CSV table actions — promote any data row to the header or demote the header back to a data row, plus a one-click delimiter converter to switch between comma, tab, semicolon, and pipe",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Row 1 → Header:** Promote the first data row to column headers in one click — the row's cell values become the column names and the row is removed from the data; only shown when at least one data row exists",
          "**Header → Row 1:** Demote the current column headers back to the first data row and reset column names to Column 1, Column 2… — works even when the table has no data rows",
          "**Delimiter Converter:** Toolbar selector showing the auto-detected delimiter (Comma, Tab, Semicolon, Pipe); changing it immediately re-serializes the document with the new separator, converting TSV  CSV  PSV without leaving the smart view",
          "**Undo/Redo for header changes:** Both promote and demote operations are recorded in the undo stack and can be reversed with the existing undo/redo buttons"
        ]
      }
    ]
  },
  {
    "version": "1.30.0",
    "type": "release",
    "date": "2026-05-22",
    "headline": "HAR Network Traffic Viewer & 10 New Pipeline Operations",
    "summary": "Full offline HAR viewer with waterfall, request detail panel, privacy detection, and cURL export — plus Ascii85, Punycode, Brotli, CIDR, CSV Dedupe & Date Arithmetic pipeline operations",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**HAR Network Traffic Viewer:** Full offline Smart View for HTTP Archive (.har) files — no data leaves the browser; opens captures of any size using virtualized rendering",
          "**Waterfall Timeline:** DevTools-style waterfall with per-request colour-coded timing bars, start-offset positioning, and a total-duration axis; handles 1,000+ entry captures without frame drops",
          "**Table View:** Sortable, virtualized table showing method, status, host, path, type, transfer size, and time — switch between Waterfall and Table with one click",
          "**Request Detail Panel:** Resizable side panel with five tabs — Headers (general, response, request, query params), Request body, Response body, Cookies, and Timing breakdown",
          "**Timing Breakdown:** Colour-coded bar chart for each phase (Queued, DNS, TCP Connect, SSL/TLS, Request Sent, TTFB, Download); HAR 1.2 spec-compliant — SSL duration is subtracted from connect to avoid double-counting; zero-duration phases (cached DNS) are shown rather than hidden",
          "**Response Body Previews:** JSON responses are pretty-printed (bypassed above 500 KB to prevent main-thread freeze with a raw-text fallback and notice); base64-encoded image responses render as an inline image preview instead of dumping the base64 string",
          "**Privacy Banner:** Automatically detected when the capture contains Authorization headers, cookies, API keys, token-bearing URLs, or other sensitive data — lists the specific data types found",
          "**Filtering:** Filter by URL/method/status/MIME search, status category pills (2xx/3xx/4xx/5xx), HTTP method checkboxes, errors-only toggle, and a page selector for multi-page HAR files (shown only when `log.pages` has more than one entry)",
          "**cURL Export:** Generate a cURL command for any request using `--data-raw` (prevents `@`-file and newline stripping) and `--compressed` (matches Chrome DevTools output); copy to clipboard or open directly in a new curl-format tab",
          "**HAR & CSV Export:** Export filtered entries as a HAR file or CSV summary to a background tab; tabs open with the correct language locked so they are not misidentified as JSON",
          "**Data URI Safety:** Entries with `data:` URLs are fast-pathed before URL parsing — hostname shown as `(data URI)` and pathname truncated to 60 characters to prevent megabyte strings from reaching the table layout engine",
          "**Out-of-Order Entry Handling:** Start offsets and the summary total-time are derived from the chronological minimum timestamp across all entries rather than assuming `entries[0]` is earliest — correctly handles HAR files from async capture tools"
        ]
      },
      {
        "name": "New Pipeline Operations",
        "changes": [
          "**Ascii85 / Base85 Encode:** Encode text to Adobe Ascii85 format (`<~` / `~>` delimiters, `z` zero-group shorthand, correct partial last-group handling) — used in PDFs, PostScript, and Python's `base64.b85encode`",
          "**Ascii85 / Base85 Decode:** Decode Ascii85 back to text; strips `<~` / `~>` delimiters automatically and tolerates embedded whitespace",
          "**Punycode Encode:** Convert a Unicode domain name to its ACE Punycode form (e.g. `münchen.de` → `xn--mnchen-3ya.de`) — handles full multi-label domains",
          "**Punycode Decode:** Convert an ACE Punycode domain back to Unicode (e.g. `xn--mnchen-3ya.de` → `münchen.de`); ASCII-only domains pass through unchanged",
          "**Brotli Compress:** Compress text using the browser-native `CompressionStream('br')` API (Chrome 80+, Firefox 115+, Safari 17+); outputs Base64 or raw Latin-1",
          "**Brotli Decompress:** Decompress Brotli-compressed data (Base64 or raw Latin-1 input) using the native `DecompressionStream('br')` API",
          "**CIDR Expand:** Expand an IPv4 CIDR range (e.g. `192.168.1.0/24`) to a newline-separated list of addresses; toggles for network and broadcast address inclusion; hard-capped at 65,536 addresses with a clear error for larger ranges",
          "**CSV Deduplicate Rows:** Remove duplicate rows from CSV data — dedupe on the full row or scope to a column by name or zero-based index; case-sensitive or case-insensitive comparison; preserves header row and first occurrence",
          "**Date Add:** Add a duration (seconds, minutes, hours, days, weeks, months, or years) to an ISO date string or `now`; outputs ISO 8601, date-only, locale string, or Unix timestamp",
          "**Date Subtract:** Subtract a duration from an ISO date string or `now` with the same unit and output options as Date Add"
        ]
      }
    ]
  },
  {
    "version": "1.29.0",
    "type": "release",
    "date": "2026-05-21",
    "headline": "Hex Viewer Expanded (12 New Capabilities), PEM / X.509 & .env Smart Views, 11 New Pipeline Operations",
    "summary": "Major hex viewer expansion with magic-byte detection, find & replace, undo/redo, strings extraction, 256-bucket histogram, checksums, decoded text panel, drag-and-drop, jump-to-offset, keyboard shortcuts, and 16 MB file support; full certificate viewer with chain analysis; interactive .env editor; plus Morse, NATO, Shannon entropy, URL defang/refang, and CSV pipeline operations",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Hex Viewer / Binary Inspector:** Professional offline hex viewer supporting four input modes — paste raw text, hex string, or Base64, or upload any binary file up to 16 MB; all rendering and analysis runs entirely in the browser",
          "**Interactive Hex Grid:** Paginated grid with configurable bytes-per-row (8/16/32) and page size; click a byte to select it, Shift+click to extend the selection to a range",
          "**In-Grid Byte Editing:** Type hex nibbles directly into the selected byte cell; changes sync back to the source editor panel in real time",
          "**Undo / Redo for Byte Edits:** Every byte edit is recorded in a 100-entry history stack; Ctrl+Z undoes the last edit, Ctrl+Y or Ctrl+Shift+Z redoes it — edits made after an undo correctly prune the redo branch",
          "**Find & Replace:** A toggle button in the search bar reveals a replace field; Replace All substitutes every occurrence of the search sequence (text or hex bytes) in a single pass, handles variable-length replacements correctly",
          "**Magic-Byte File Type Detection:** On every file load, the first 16 bytes are scanned against a 29-signature table — PNG, JPEG, GIF, PDF, ZIP, ELF, PE, Mach-O, SQLite, MP4, GZip, BZip2, RAR, 7-Zip, XZ, HDF5, and more; the detected type, MIME, and extension are shown in a banner below the toolbar",
          "**Jump-to-Offset:** Toolbar input accepts a hex address (0x1A3F00) or decimal offset and navigates instantly to the containing page with the byte selected",
          "**Drag-and-Drop File Loading:** Drop any binary file onto the empty state dropzone or the loaded hex grid at any time; the hex viewer suppresses the app-level file drop handler while mounted so drops stay local",
          "**Strings Extraction Panel:** Sidebar 'Strings' tab scans the buffer for runs of ≥N consecutive printable ASCII bytes (minimum length configurable: 3–16); each result lists its offset and length; a live filter narrows the list; clicking any row jumps the grid to that offset",
          "**256-Bucket Byte Histogram:** Sidebar 'Histogram' tab renders one bar per byte value 0x00–0xFF normalised to the tallest bar, colour-coded by category (null / control / ASCII / extended); hover tooltip shows exact count and percentage — flat histogram indicates encrypted or compressed data, ASCII spike indicates text",
          "**Checksum Panel:** Sidebar 'Checksums' tab computes CRC32 (IEEE 802.3 lookup table), SHA-1, and SHA-256 (SubtleCrypto) asynchronously for the full buffer or the active selection; one-click copy on each result",
          "**Decoded Text Panel:** Inspector tab shows the selected bytes (or the first 256 bytes when nothing is selected) decoded as UTF-8, UTF-16 LE, UTF-16 BE, and Latin-1 — replacement characters mark invalid sequences",
          "**Sidebar Tabs:** Sidebar is reorganised into four tabs — Inspect (data inspector + decoded text), Strings, Histogram, and Checksums — keeping the inspector uncluttered while surfacing all analysis panels",
          "**Python & C/JS Escaped String Exports:** Two new formats join the Export menu — Python bytes literal (`b'\\x48\\x65...'`) and C/JS hex-escaped string (`\\x48\\x65...`); both apply to the full buffer or active selection",
          "**16 MB File Size Support:** File size cap raised from 2 MB to 16 MB; a non-blocking warning appears for files above 8 MB",
          "**Keyboard Shortcut Reference:** Press `?` or click the toolbar help button to open an overlay listing all navigation, selection, editing, and search shortcuts",
          "**Data Inspector Sidebar:** Decodes the selected byte offset into every standard numeric type — Binary (8-bit), Int8, Uint8, Int16, Uint16, Int32, Uint32, Int64, Uint64 (BigInt), Float32, Float64, and ASCII character; endianness toggle switches all multi-byte reads between little-endian and big-endian instantly",
          "**Shannon Entropy Analysis:** Calculates information density for the full buffer or the active selection with a rated label — Low (structured), Low-Medium (text/source), Medium (dense binary/executable), High (compressed/media), Very High (encrypted/compressed)",
          "**Search:** Find any text string or hex sequence across the buffer; match count and current position are shown in the toolbar; next/previous navigation jumps to each match and pages to it automatically",
          "**Export:** Copy the full buffer or active selection as space-separated hex, raw hex, Base64, C array (`unsigned char rawData[]`), JSON number array, Python bytes literal, C/JS hex-escaped string, or download as a raw binary file",
          "**Smart Format Detection:** When content is sent from an editor tab, the input format is auto-detected — hex strings are opened in hex mode, Base64-padded strings in base64 mode, everything else as raw text",
          "**Context Action:** Any editor tab gains an 'Open in Hex Viewer' option in the right-click menu, sending the tab's content directly to a new Hex Viewer tab",
          "**PEM / X.509 Smart View:** Parses certificates, private keys, public keys, and CSRs in the browser using a pure-JS DER/ASN.1 engine — no native dependencies, no server calls",
          "**Certificate Detail Panel:** Subject and issuer distinguished names, serial number, version, signature algorithm, validity dates, Subject Alternative Names (DNS, IP, Email, URI), Key Usage, and Extended Key Usage",
          "**Validity Timeline:** Visual progress bar showing where today falls in the certificate's validity window — green when healthy, amber when expiring within 30 days, red when expired",
          "**SHA-256 Fingerprint:** Computed asynchronously via the SubtleCrypto Web API and displayed as uppercase colon-separated hex pairs",
          "**RSA Key-Size Detection:** Reads the SubjectPublicKeyInfo modulus to report key length in bits; colour-coded badge highlights weak keys (<2048-bit in red, ≥4096-bit in green)",
          "**Certificate Chain Analysis:** Links intermediate and leaf certificates to their issuer by matching subject/issuer CN and O fields; chain-root certificates are labelled",
          "**CA, Self-Signed & Root Badges:** Each certificate card shows the relevant badges so the role in a chain is immediately clear",
          "**Split Certificates:** When a PEM bundle contains multiple certificates, a Split button opens each as its own tab with the CN as the title",
          "**Key & CSR Support:** Private key blocks show key type and a 'never share' warning; public key blocks show key type; CSR blocks surface the subject DN",
          "**.env Smart View:** Interactive variable editor — click any key or value to edit inline; commits on Enter or blur, cancels on Escape",
          "**Type Inference & Icons:** Each variable is annotated as URL, boolean, number, JSON, secret, or string with a matching icon and colour",
          "**Secret Masking:** Keys matching secret patterns (API_KEY, TOKEN, PASSWORD…) are auto-masked with a reveal/hide toggle",
          "**Sort A → Z:** Alphabetically sorts keys while keeping comment-delimited sections intact — comments travel with their block",
          "**Group by Prefix:** Reorganises variables by their first underscore-delimited component (DB_, APP_, AWS_…) with auto-generated section headers",
          "**Remove Duplicates:** Scans for repeated keys and keeps only the last occurrence, matching shell semantics",
          "**Clean Operations:** Strip comments, collapse consecutive blank lines to one, or remove all blank lines",
          "**Export as JSON / Shell / Docker:** One-click conversion opens the variable set as a new tab — pretty JSON object, `export KEY=\"value\"` shell script, or Docker `-e KEY=\"value\"` flags",
          "**Validation Panel:** Surfaces duplicate keys and empty values with counts; duplicate-key link triggers remove-duplicates in one click",
          "**Search & Filter:** Live search across key names and values narrows the visible rows without modifying the file",
          "**Add & Delete Variables:** Add button appends a new editable row; per-row delete removes the variable from the file",
          "**Morse Code Encode/Decode:** Convert text to Morse code (dots and dashes) and back — configurable word separator (slash, pipe, or newline); round-trips correctly for all alphanumeric and punctuation characters in the standard ITU table",
          "**NATO Phonetic Alphabet:** Convert text to NATO words (A → Alfa, B → Bravo…) with delimiter options (space, newline, comma, dash) and uppercase toggle — covers A–Z, 0–9, and space",
          "**Unicode Escape/Unescape:** Escape characters to \\uXXXX sequences (non-ASCII only or all characters) and decode them back — handles both \\uXXXX and \\u{XXXXX} surrogate-pair form for emoji and supplementary code points",
          "**Shannon Entropy:** Calculate information density in bits/character — full report mode shows entropy, length, unique character count, and theoretical maximum; value-only mode outputs a single number for pipeline chaining",
          "**Defang URL:** Replace https:// → hxxps://, http:// → hxxp://, and dots → [.] for safe sharing in threat intelligence reports and IOC feeds — each substitution is independently toggleable",
          "**Refang URL:** Reverse all common defang substitutions (hxxps://, [.], [@], [:]) back to working URLs — handles case-insensitive hxxp variants and colon-bracket notation",
          "**Filter CSV Rows:** Keep rows where a column matches a condition — supports contains, not-contains, equals, not-equals, regex, greater-than, and less-than operators with optional case sensitivity; works by header name or column index",
          "**Sort CSV:** Sort rows by any column ascending or descending — auto-detects numeric columns or use explicit string/number mode; preserves the header row",
          "**Transpose CSV:** Swap rows and columns — each input row becomes a column in the output; handles unequal row lengths by padding with empty cells; preserves quoting throughout"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Tab bar action buttons obscured by scroll gradient:** The scroll indicator gradients are now scoped to the tab scroll area via a dedicated wrapper element; previously the right-side gradient could paint over the Plus, Clipboard, and Extension buttons when the tab bar was scrolled left, making the icons go dark",
          "**Context menu clipped at viewport edges:** The tab context menu now measures its rendered dimensions with `useLayoutEffect` and adjusts its position before becoming visible, preventing the menu from being cut off at the bottom or right edges of the viewport",
          "**Submenu overflows viewport right edge:** Context menu submenus that would extend beyond the right edge of the viewport now flip to open leftward instead; previously they would render off-screen and be inaccessible",
          "**Hex Viewer route broken by slash in label:** The URL slug generator now strips `/` and `\\` from tablet labels before hyphenating, preventing 'Hex Viewer / Binary Inspector' from generating a two-segment path that React Router could not match",
          "**Hex Viewer drag-and-drop file content wiped on load:** Dropping a file while the input format was set to 'raw', 'hex', or 'base64' caused the inputText→bytesHex sync effect to fire immediately after load and clear the buffer; the file reader callback now sets inputFormat to 'file' atomically so the sync effect's early-return fires correctly",
          "**Hex Viewer drag-and-drop conflicts with app-level file drop handler:** The hex viewer now calls setGlobalDragDropSuppressed(true) on mount (cleared on unmount), matching the pattern used by the Checksum tablet; drag events also call stopPropagation to prevent the DragDropOverlay from intercepting drops intended for the hex viewer"
        ]
      }
    ]
  },
  {
    "version": "1.28.0",
    "type": "release",
    "date": "2026-05-19",
    "headline": "SSH Key Generator & TOTP 2FA Generator",
    "summary": "Two new offline security tablets: generate Ed25519, RSA, and ECDSA SSH key pairs with passphrase encryption, inspect and validate any key — plus a multi-account TOTP authenticator with animated countdown rings",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**SSH Key Generator:** Generate Ed25519, RSA-3072, RSA-4096, and ECDSA P-256/P-384/P-521 key pairs entirely in the browser — no server calls, no data leaves the device",
          "**OpenSSH-Compatible Output:** Private keys are written in the standard OpenSSH v1 format (AES-256-CBC + bcrypt_pbkdf KDF, 16 rounds) — immediately usable with `ssh-add`, `ssh-keygen`, and any compliant SSH client",
          "**Passphrase Encryption:** Optionally protect the private key with a passphrase; the field persists between generations so you can generate multiple keys without re-entering it",
          "**Key Inspector:** Paste any SSH public or private key to see algorithm, bit length, SHA-256 fingerprint (matching `ssh-keygen -l`), MD5 fingerprint, and encryption status — derives the `authorized_keys` line from an unencrypted private key without decryption",
          "**Pair Validator:** Confirm that a public key and private key belong to the same pair by comparing their embedded wire-format public key bytes",
          "**Copy & Download:** One-click copy and download buttons for both keys; private key downloads as `id_ed25519` / `id_rsa` / `id_ecdsa` and public key as the `.pub` counterpart",
          "**Zero Persistence:** No key material, passphrases, or generated results are ever written to IndexedDB — only the selected algorithm, comment, and tab preference are saved",
          "**TOTP 2FA Generator:** Multi-account authenticator tablet — add as many TOTP accounts as needed, each stored locally and generating a fresh code every period",
          "**Animated Countdown Ring:** Per-account SVG ring depletes smoothly as the OTP window expires; turns amber with a numeric countdown in the final 5 seconds to signal an imminent rotation",
          "**otpauth:// URI Import:** Paste any `otpauth://totp/...` URI to auto-populate label, issuer, secret, algorithm, digits, and period in one click — compatible with Google Authenticator, Aegis, and standard 2FA QR codes",
          "**Manual Entry:** Add accounts manually with label, issuer, Base32 secret (show/hide toggle), algorithm (SHA1/SHA256/SHA512), digit count (6/7/8), and custom period — inline Base32 validation and a live code preview appear as you type",
          "**Edit & Delete:** Modify any account's details or remove it via the per-card overflow menu",
          "**One-Click Copy:** Copy the current OTP to the clipboard directly from the account card with a 1.5-second green tick confirmation",
          "**Verify Panel:** Standalone tab to check a code against a raw Base32 secret without adding an account — returns Valid, Invalid, or Clock Skew with the exact drift in seconds",
          "**Color-Coded Accounts:** Each account receives a deterministic HSL color derived from its label, shown as a dot on the card and as the ring stroke color"
        ]
      }
    ]
  },
  {
    "version": "1.27.0",
    "type": "release",
    "date": "2026-05-13",
    "headline": "QR Code Generator",
    "summary": "Full offline QR code generation and decoding — 8 content types, visual customisation, logo embedding, and a history strip, with no data leaving the browser",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**QR Code Generator:** Eight smart content types — URL, Text, WiFi, Email, Phone, SMS, vCard, and Location — each with a dedicated form that formats the correct URI scheme (WIFI:T:..., mailto:, tel:, smsto:, BEGIN:VCARD, geo:) automatically",
          "**Visual Customisation:** Dot style (6 variants), corner frame style (3 variants), dot and background colour pickers, transparent background toggle (SVG), error correction level (L 7% / M 15% / Q 25% / H 30%), output size (256–2048 px), and margin slider",
          "**Logo Embedding:** Drag-and-drop or file-pick PNG/SVG/JPEG logos (max 2 MB), resized client-side to ≤200 px; auto-bumps error correction to H with a scanability indicator when logo coverage exceeds 30%",
          "**Decode Tab:** Drop a QR image, paste from clipboard (Ctrl+V), or pick a file — jsQR decodes it entirely in-browser with smart content-type detection and a 'Send to Generate' action to load the result back into the generator",
          "**History Strip:** Last 8 generated QR codes stored as thumbnails; click any to restore its content, style, and logo",
          "**Auto-Detection:** Pasting a URL, WIFI:T:..., mailto:, or vCard string into the URL field shows a 'Detected: X — Switch' pill for one-click content-type switching",
          "**Geo Location:** 'Use my location' button on the Location type populates coordinates via the browser Geolocation API",
          "**Context Action:** Any editor tab containing a URL gains a 'Generate QR Code' option in the right-click actions menu",
          "**Privacy Footer:** Permanently visible 'Generated in your browser — no data leaves your device' footer"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Safari clipboard:** Copy PNG now passes the blob Promise directly into ClipboardItem so it is constructed synchronously within the user-gesture frame, satisfying Safari's strict clipboard API requirement",
          "**vCard line endings:** vCard 3.0 output now uses CRLF (\\r\\n) as required by RFC 2426; added the mandatory N: field (Last;First;;;) and TYPE annotations on TEL and EMAIL properties for correct iOS Contacts parsing"
        ]
      }
    ]
  },
  {
    "version": "1.26.0",
    "type": "release",
    "date": "2026-05-13",
    "headline": "TOML Smart View & 4 New Pipeline Operations",
    "summary": "Full TOML format support with Structure Explorer smart view, custom syntax highlighting, and TOMLJSON/YAML pipeline conversions",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**TOML Smart View:** Structure Explorer with resizable tree/editor split — browse tables, arrays-of-tables, and all scalar types in a virtualised tree alongside the Monaco editor",
          "**TOML Syntax Highlighting:** Custom Monarch tokenizer with colour-coded table headers, keys, strings, numbers, booleans, datetimes, inline tables, and array delimiters",
          "**TOML Auto-Detection:** Confidently distinguishes TOML from INI using array-of-tables `[[t]]`, RFC 3339 datetimes, dotted keys, inline tables, and multi-line strings as strong signals; penalises `;` comments and colon-delimited values that indicate INI",
          "**TOMLJSON Pipeline Operations:** `toml.to-json` and `json.to-toml` with configurable indent size",
          "**TOMLYAML Pipeline Operations:** `toml.to-yaml` and `yaml.to-toml` with configurable indent size; `yaml.to-toml` raises a clear error when the YAML root is an array (not valid at TOML root)",
          "**Convert to JSON / YAML:** Toolbar convert dropdown in the TOML smart view opens the converted output in a new background tab"
        ]
      }
    ]
  },
  {
    "version": "1.25.0",
    "type": "release",
    "date": "2026-05-12",
    "headline": "17 New Pipeline Operations - Encoding, Compression, Hashing, Networking & Datetime",
    "summary": "Format Date, binary/octal/Base32/Base58 encoding, Raw Deflate and Zlib compression, SHA hash digest, IPv4 format conversion, and JSONPath queries",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Format Date:** Parse any date string and reformat it - accepts ISO 8601, SQL datetime, Unix timestamps (seconds or milliseconds), natural language (yesterday, 2 hours ago), and more as input",
          "**11 date output presets:** ISO 8601, date-only, SQL, RFC 3339, HTTP/RFC 7231, human, full human (with weekday), relative time, Unix seconds, Unix milliseconds, and custom date-fns format string",
          "**Per-line date processing:** Configurable mode converts a list of dates line-by-line in a single pipeline step",
          "**To/From Binary:** Convert text to space-separated binary bit strings (e.g. `A` → `01000001`) and back - delimiter options: space, none, comma, newline",
          "**To/From Octal:** Convert text to octal byte values (e.g. `A` → `101`) and back - delimiter options: space, backslash, none, comma",
          "**Base32 Encode/Decode:** RFC 4648 standard Base32 with optional padding control - useful for TOTP/2FA secrets and DNS encodings",
          "**Base58 Encode/Decode:** Bitcoin/IPFS alphabet Base58 - useful for wallet addresses, CIDs, and SSH key fingerprints",
          "**Raw Deflate / Raw Inflate:** Compress and decompress using Raw Deflate (no header), output as Base64",
          "**Zlib Deflate / Zlib Inflate:** Compress and decompress using Zlib-wrapped Deflate, output as Base64",
          "**Hash / Digest:** Generate SHA-1, SHA-256, SHA-384, or SHA-512 hashes with hex or Base64 output - composable per-line or full-text",
          "**Change IP Format:** Convert IPv4 addresses in-place between dotted decimal, decimal integer (e.g. `3232235777`), hex (`0xC0A80101`), and dotted octal - works on embedded IPs in log lines",
          "**JSONPath Query:** Apply a JSONPath expression to JSON input and output results as pretty JSON, compact JSON, or one value per line (e.g. `$.users[*].name`)",
          "**Diagram Tablet - Resizable split:** Drag the vertical divider between the Mermaid code editor and diagram preview to adjust the split ratio - uses the same drag handle as the Markdown preview",
          "**Diagram Tablet - Maximize view:** New toolbar toggle (split  maximize icons) collapses the editor to show the diagram full-width, then restores the split with one click"
        ]
      },
      {
        "name": "Bug Fixes",
        "changes": [
          "**Diagram Tablet - Label clipping:** Fixed right-side clipping of node label text (e.g. `Decision?`, `Action 1`) caused by Mermaid slightly under-calculating the SVG viewBox width - an 8px padding is now added to every side of the viewBox before display"
        ]
      }
    ]
  },
  {
    "version": "1.24.1",
    "type": "release",
    "date": "2026-05-11",
    "headline": "Editor Copy/Paste Fix",
    "summary": "Restored right-click Copy and Paste in the Monaco editor context menu, broken by a Monaco 0.54 upgrade",
    "categories": [
      {
        "name": "Bug Fixes",
        "changes": [
          "**Right-click Copy:** Fixed Copy in the editor context menu not putting selected text on the clipboard (Monaco 0.54 EditContext API regression)",
          "**Right-click Paste:** Fixed Paste in the editor context menu doing nothing when clicked (Monaco 0.54 shadow DOM focus regression)",
          "**Sidebar height on large screens:** Fixed the sidebar workspace list cutting off before the bottom of the screen on tall displays - list now expands to fill the full available height",
          "**CSV masked column copy feedback:** Fixed copy icon in password/sensitive columns not switching to a green tick after copying - now shows the same 2-second success indicator as regular columns"
        ]
      }
    ]
  },
  {
    "version": "1.24.0",
    "type": "release",
    "date": "2026-02-26",
    "headline": "Open-Source Readiness",
    "summary": "Prepared the project for open-source release with repository hygiene, public docs, and contributor-facing updates",
    "categories": [
      {
        "name": "Open Source",
        "changes": [
          "**Repository hygiene:** Removed internal-only notes/scripts and cleaned ignored local artifacts",
          "**Public docs added:** Added README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY policies",
          "**Content sanitization:** Replaced organization-specific test fixtures and headers with neutral generic examples",
          "**Landing updates:** Added concise open-source mentions in key landing pages and FAQ",
          "**Changelog refresh:** Added this release and regenerated changelog outputs"
        ]
      }
    ]
  },
  {
    "version": "1.23.1",
    "type": "release",
    "date": "2026-02-23",
    "headline": "Sidebar Polish & Inline Renaming",
    "summary": "Introducing inline renaming for workspaces and tabs directly in the sidebar, plus performance and UX improvements",
    "categories": [
      {
        "name": "Improvements",
        "changes": [
          "**Inline Sidebar Renaming:** Rename workspaces and tabs directly in the sidebar tree without opening separate modals. Simply double-click or use the context menu to enter edit mode."
        ]
      }
    ]
  },
  {
    "version": "1.23.0",
    "type": "release",
    "date": "2026-02-01",
    "headline": "JSON Smart View Enhancements & 25 New Pipeline Operations",
    "summary": "Streamlined JSON toolbar with quick-access Stringify/Unstringify, redesigned JMESPath Query Panel, plus 25 new transformation pipeline operations",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Documentation Export Modal:** New 'Export Docs' button in JSON toolbar opens a powerful privacy tool for sharing JSON in documentation - mask sensitive values, replace with type placeholders, or remove fields entirely before sharing",
          "**Path-Level Privacy Control:** Configure each JSON path individually with four modes: Keep (original value), Mask (replace with ***), Type (show data type like <string>), or Remove (delete from output)",
          "**Depth-Grouped Path Browser:** Paths organized by nesting depth (Top Level, Level 2, etc.) with bulk actions per group - quickly mask all deeply nested fields while keeping top-level structure",
          "**Live Documentation Preview:** Side-by-side view with instant preview of masked JSON, click any path to navigate to its location in the preview editor",
          "**Quick-Access Stringify/Unstringify:** Moved from Toolbox menu to main Editor Actions toolbar - escape and unescape JSON strings with one click without navigating menus",
          "**Auto-Populated Query Panel:** JMESPath Query Panel now automatically populates and runs the first contextual sample query when opened - see results immediately without typing",
          "**25 New Pipeline Operations:** Major expansion of transformation pipeline capabilities across multiple categories"
        ]
      },
      {
        "name": "Pipeline Operations",
        "changes": [
          "**Encoding Operations:** To Hex (with delimiter options), To Charcode (decimal/hex/binary output), HTML Entity Encode (special chars, named entities, numeric/hex modes)",
          "**Compression:** Gzip Compress (outputs Base64, completes the gunzip pair)",
          "**Data Conversion:** CSV to JSON (with number/boolean parsing), JSON to CSV (with nested object flattening), CSV to Markdown Table, JSON to Markdown Table (perfect for documentation)",
          "**XML Operations:** Format XML (pretty-print), Minify XML, XML to JSON, JSON to XML (bidirectional conversion with attribute support)",
          "**URL Operations:** JSON to Query String (with array format options: repeat, brackets, indices, comma), Query String to JSON (with type parsing)",
          "**DateTime Operations:** To Unix Timestamp (parse dates or get current time in seconds/milliseconds)",
          "**Text Operations:** Reverse Text (entire text, per-line, or per-word modes), Text Statistics (character, word, line, sentence, paragraph counts with JSON output)",
          "**Extraction Operations:** Extract Numbers (integers, decimals, with negative number support), Extract Phone Numbers (US, international, all formats), Extract Dates (ISO, US, EU formats)",
          "**Utility Generators:** Generate UUID (v4 random, v7 time-ordered with format options), Generate Random String (alphanumeric, hex, URL-safe, with symbols), Lorem Ipsum Generator (paragraphs, sentences, words), Generate Sequence (numbers, letters, Roman numerals with custom ranges)"
        ]
      }
    ]
  },
  {
    "version": "1.22.0",
    "type": "release",
    "date": "2026-01-29",
    "headline": "Persistent Sidebar State & Pipeline Operations Expansion",
    "summary": "Sidebar preferences now persist across sessions, plus 15 new powerful transformation pipeline operations for data processing workflows",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Persistent Sidebar Width:** Custom sidebar width (150px-600px) is automatically saved and restored on app reload",
          "**Persistent Sidebar State:** Sidebar expanded/collapsed state persists across sessions - your preferred view mode is remembered",
          "**Persistent Workspace Expansion:** Workspace expansion states in the sidebar tree are saved - return to find your workspaces exactly as you left them",
          "**15 New Pipeline Operations:** Massive expansion of transformation pipeline with web parsing (HTML strip tags, JWT decode), code formatting (SQL/CSS prettify, SQL escape), data conversion (YAMLJSON, CSV column extraction), cryptography (HMAC, base conversion), and text analysis (slugify, frequency analysis, diacritics removal, regex capture groups, quoted-printable decode)"
        ]
      }
    ]
  },
  {
    "version": "1.21.0",
    "type": "release",
    "date": "2026-01-29",
    "headline": "Share Customization, Curl UI Polish & Regex Engine Refined",
    "summary": "Manual content trimming for privacy-safe sharing, compact professional Curl Smart View redesign, and refined Regex Plain English engine",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Manual Content Customization:** New \"Customize Content\" button in Share modal lets you manually trim content even when it fits within URL limits - exclude sensitive fields from JSON objects, select specific line ranges from text content, or reduce clutter by sharing only relevant data for privacy-safe collaboration",
          "**Privacy-First JSON Sharing:** Selectively deselect sensitive fields (passwords, tokens, internal IDs) from JSON before sharing - maintain valid structure while excluding private data",
          "**Flexible Line Range Selection:** Choose specific line ranges to share from text content without manually editing - perfect for sharing relevant snippets while excluding debug logs or sensitive information",
          "**Modern Regex Syntax Support:** Added full support for Unicode property escapes (`\\p{...}`), hex escapes (`\\xHH`), and named backreferences (`\\k<name>`) to the Regex Plain English interpreter"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Advanced Regex Semantic Engine:** Upgraded the \"Plain English\" interpreter to use a sophisticated AST-based parser with literal-aware semantic analysis - provides more robust recognition of complex patterns (emails, dates, SSNs) and gracefully handles incomplete or malformed regexes",
          "**Natural Language Flow:** Improved explanation logic with sequential connectors (e.g., \"...and then ensures...\") and deduplicated phrasing for a more human, readable flow in complex validation patterns",
          "**Strict Pattern Matching:** Refined numeric pattern matchers to eliminate false positives in partially alphanumeric strings while maintaining high accuracy for standard formats",
          "**Curl Smart View Compact Design:** Redesigned with 25-37% tighter spacing for a more professional, scannable interface - card padding reduced from 16px to 12px horizontal and 10px vertical, headers from ~56px to ~48px height",
          "**Enhanced Visual Hierarchy:** Method badges now larger and bolder (text-sm, font-semibold) with tracking-wide for instant recognition, domain names displayed in bold to stand out from full URLs, and numbered card indexes (#1, #2) for easy reference"
        ]
      }
    ]
  },
  {
    "version": "1.20.0",
    "type": "release",
    "date": "2026-01-27",
    "headline": "Navigation History & Welcome Screen Redesign",
    "summary": "VS Code-style back/forward navigation with persistence, plus modernized welcome screen with enhanced onboarding",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Global Navigation History:** Track your journey through workspaces and tabs with back/forward navigation - history persists across sessions in IndexedDB, remembers up to 50 entries with FIFO eviction, and automatically skips deleted tabs/workspaces",
          "**Navigation Controls:** Back/Forward buttons in sidebar header with disabled states, plus keyboard shortcuts (Ctrl+Shift+- for back, Ctrl+Shift+= for forward)",
          "**Smart Navigation:** Prevents recording history during back/forward operations to avoid recursion, validates entries before navigation, and handles cross-workspace jumps seamlessly",
          "**Welcome Screen Redesign:** Modernized first-run experience with hero section featuring value proposition and trust badges (Offline & Private, Persisted Locally, No Server Calls), tiered action cards with semantic color theming, and enhanced keyboard shortcut discovery",
          "**Enhanced Onboarding:** Primary action cards for Format JSON (demo Smart View), Dev Tools (25+ utilities), and New Scratch Tab, plus secondary actions for Open File, Paste Content, and Import Workspace - all with clear descriptions and hints"
        ]
      }
    ]
  },
  {
    "version": "1.19.0",
    "type": "release",
    "date": "2026-01-22",
    "headline": "Workspace Sidebar Explorer",
    "summary": "Workspace sidebar with collapsible tree view, icon rail, and intelligent workspace management",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Workspace Sidebar Explorer:** Collapsible tree view showing all workspaces and tabs - expand/collapse workspaces to browse without switching, with clear visual distinction between active and expanded workspaces",
          "**Icon Rail (Collapsed Mode):** Minimal icon rail showing workspace first-letters in themed color badges - toggle between full sidebar and compact rail with Cmd+B or click to expand",
          "**Context Menus:** Right-click workspaces for create/rename/delete actions, right-click tabs for rename/delete/pin/duplicate/move operations",
          "**Auto-Reveal Active Tab:** Sidebar automatically expands active workspace and scrolls to show the current tab when switching via tab bar or keyboard",
          "**Resizable Sidebar:** Drag the resize handle to adjust sidebar width (150px-600px) or drag below 100px to snap-collapse to icon rail with smooth visual feedback"
        ]
      }
    ]
  },
  {
    "version": "1.18.0",
    "type": "release",
    "date": "2026-01-19",
    "headline": "Transformation Pipeline",
    "summary": "CyberChef-style data processing with chainable operations, drag-and-drop reordering, and persistent pipelines",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Transformation Pipeline Editor:** 3-panel interface with operations palette, pipeline canvas, and live preview - chain operations like Trim → Uppercase → Base64 Encode → JSON Format",
          "**37+ Pipeline Operations:** Text processing (case conversion, trim, whitespace), line operations (sort, reverse, dedupe, shuffle), filtering (regex, keyword, keep first/last N), encoding (Base64, URL), checksums, and redaction",
          "**Drag-and-Drop Reordering:** Rearrange pipeline steps with smooth drag-and-drop - each step can be enabled/disabled individually",
          "**Persistent Pipelines:** Save named pipelines and load them across sessions",
          "**Real-Time Preview:** Live output preview with execution stats (duration, character counts) as you build your pipeline"
        ]
      }
    ]
  },
  {
    "version": "1.17.0",
    "type": "release",
    "date": "2026-01-13",
    "headline": "Browser-Style Scrollable Tabs",
    "summary": "Native horizontal scrolling for tabs with visual gradient indicators and touch support",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Horizontal Tab Scrolling:** Tabs now maintain minimum readable width (80px) with variable widths and scroll horizontally when they overflow, preventing tab squashing",
          "**Gradient Scroll Indicators:** Visual masking gradients fade from tab bar background to transparent at edges, clearly indicating when tabs are hidden off-screen and scrollable in both light and dark modes",
          "**Mouse Wheel Scrolling:** Scroll through tabs using vertical mouse wheel gestures over the tab bar for intuitive navigation",
          "**Touch Gesture Support:** Swipe horizontally to scroll through tabs, or long-press (250ms) to drag and reorder tabs - properly distinguishing between scrolling and dragging on touch devices"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Performance Optimization:** Native browser scrolling eliminates expensive resize calculations and render cycles",
          "**Theme-Aware Gradients:** Gradients use CSS variables to match tab bar background color, ensuring visibility in all themes"
        ]
      }
    ]
  },
  {
    "version": "1.16.0",
    "type": "release",
    "date": "2026-01-12",
    "headline": "Macro Recording & Menu Refinement",
    "summary": "New Macro Recording engine with floating toolbar, status bar integration, and refined context menu",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Macro Recording Engine:** Record and replay complex editor interactions including typing, cursors, selection, and deletions with a new engine.",
          "**Floating Macro Toolbar:** New draggable toolbar for Macro controls (Record, Play, Play to End) that appears automatically when recording starts."
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Context Menu Restructure:** significantly reorganized tab context menu for better usability - introducing 'Organize' submenu, top-level 'Share' and 'Duplicate', and clearer grouping.",
          "**Menu Icons:** Updated icons across the context menu for better visual clarity (Share, Organize, Split, etc.).",
          "**Status Bar Refinement:** Cleaned up status bar layout for better information density and visual balance."
        ]
      }
    ]
  },
  {
    "version": "1.15.0",
    "type": "release",
    "date": "2026-01-03",
    "headline": "Colour Palette: Canvas-First UX & Smart Tools",
    "summary": "Complete rewrite with canvas-first interface, intelligent generation, and slide-over feature panels",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Canvas-First Interface:** Complete redesign into a 100% responsive canvas featuring vertical interactive color stripes with direct manipulation.",
          "**Slide-Over Feature Panels:** Peripheral tools (Image Extraction, UI Preview, Accessibility, Export) are now housed in elegant slide-over containers, keeping the main interaction clean.",
          "**Intelligent Palette Generation:** New generation engine using a `useReducer` pattern with space bar shortcuts and full Undo/Redo support.",
          "**Enhanced Image Colour Extraction:** Modern sidebar interface for uploading images and sampling colors via direct click or region-dragging.",
          "**UI Preview & Remix Engine:** Live preview of palettes on real UI components with an intelligent remixing engine and atomic locking.",
          "**Omni-Selector Redesign:** A completely overhauled tool selector featuring weighted fuzzy search, a 'Recently Used' grid, and a high-density list layout for deep discovery.",
          "**Markdown Preview Sync:** Bidirectional scroll synchronization and click-to-navigate between raw markdown editor and live preview - scroll either pane to keep them in sync, or click any preview element to jump to its source line."
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Accessibility Matrix with  Suggestions:** WCAG 2.1 compliance matrix with one-click suggestions to fix contrast failures.",
          "**Multi-Format Export:** Directly export palettes to CSS, SCSS, Tailwind, or JSON, with the ability to create new workspace tabs instantly.",
          "**Centralized Tool Execution:** Unified `ToolService` for all tool types (Tablets, Smart Views, Formats) ensure consistent tab creation and usage tracking.",
          "**Comprehensive Tool Registry Tests:** Added a robust test suite for `ToolService`, `ToolCard`, and `ToolSelectorModal` to guarantee stability and keyboard navigation compliance.",
          "**Smart View Sync Architecture:** Introduced extensible sync configuration system allowing any format (Markdown, HTML, CSV) to provide custom scroll/click synchronization while maintaining architectural separation."
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "**Generation Stability:** Implemented value-based state synchronization and memoization to prevent infinite render loops.",
          "**Color Rendering Consistency:** Guaranteed `#` prefix normalization across all colors to prevent rendering failures."
        ]
      }
    ]
  },
  {
    "version": "1.14.0",
    "type": "release",
    "date": "2025-12-29",
    "headline": "Share Tabs with Privacy-First URLs",
    "summary": "Share tab content via URLs with compression, smart trimming, and hash-based zero-knowledge privacy",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Share Tab URLs:** Generate shareable URLs from any tab via context menu - compressed content embedded directly in the URL for instant sharing",
          "**Structure-Aware JSON Trimming:** Interactive key-selection UI for large JSON objects and arrays - selectively share specific data fields while maintaining valid structure",
          "**Auto-Balancing Greedy Selection:** Intelligent algorithm that automatically unselects heavy fields to fit within URL limits while maximizing smaller, informative keys",
          "**Smart Content Trimming:** Fallback line-range selector for text-based or malformed content ensuring you can always share high-density snippets",
          "**Hash-Based Privacy Routing:** URLs use hash fragments (#/s/...) ensuring content never appears in server logs or network requests - true zero-knowledge sharing",
          "**Visual Size Feedback:** Real-time colour-coded budget bar with individual key weight estimation and \"heavy offender\" warnings"
        ]
      },
      {
        "name": "Privacy & Security",
        "changes": [
          "**Zero-Knowledge Architecture:** Hash routing ensures shared content exists only in browser memory - never transmitted to servers, proxies, or logging systems",
          "**No External Dependencies:** Pure client-side implementation with no third-party services, APIs, or tracking",
          "**URL-Safe Encoding:** Automatic handling of special characters preventing routing conflicts and injection attacks"
        ]
      }
    ]
  },
  {
    "version": "1.13.0",
    "type": "release",
    "date": "2025-12-23",
    "headline": "Date/Time Command Center & Smart Inputs",
    "summary": "Date/Time tablet with command-line inputs, natural language arithmetic, and multi-zone comparison",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Smart Command Inputs:** Control the tablet via the input field using `> [City]` to add timezones (e.g., `> Tokyo`), `> diff [date]` for duration analysis, or `> next friday` to jump dates.",
          "**\"Command Center\" Layout:** Complete redesign into a multi-column interface optimized for developer workflows, featuring persistent history, grouped conversions, and real-time dashboarding.",
          "**Natural Language Date Arithmetic:** Intelligent parsing engine supporting human-friendly math (e.g., `now + 5d`, `yesterday - 2w`).",
          "**Timezone Explorer:** Compare your entered date/time across multiple configurable timezones with live DST indicators and smart city matching (e.g. \"NYC\", \"London\")."
        ]
      }
    ]
  },
  {
    "version": "1.12.0",
    "type": "release",
    "date": "2025-12-05",
    "headline": "Command Vault Complete Rework",
    "summary": "Command Vault redesign with categories, search, scratchpad, and improved workflow",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Command Vault Redesign:** Complete rework with category-based organization, making it easier to manage and find your command snippets",
          "**Command Search (Ctrl+R):** Quick search across all commands with instant filtering and copy-on-select",
          "**Scratchpad:** Temporary editing space for modifying commands before copying or saving as new entries",
          "**Category Management:** Create, organize, and delete categories to keep your commands structured",
          "**Inline Command Editing:** Click any command to edit in place with auto-save on blur",
          "**Drag-and-Drop Reordering:** Rearrange commands within categories to prioritize frequently used items",
          "**Import/Export:** Bulk import commands from you terminal history with automatic category assignment"
        ]
      }
    ]
  },
  {
    "version": "1.12.0",
    "type": "release",
    "date": "2025-12-03",
    "headline": "Light/Dark Mode & Editor Enhancements",
    "summary": "Theme system with Light/Dark mode toggle, bug fixes, and rich text improvements",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Light/Dark Mode Toggle:** Comprehensive theme system with light and dark modes for editor, smart views, and UI components - seamlessly switch between themes with persistent preference"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**Rich Text Bullet Point Indentation:** Enhanced list editing with proper indentation support for nested bullet points"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "**Clipboard Content Comparison:** Fixed auto-formatting issue when comparing with content from clipboard",
          "**Mermaid Diagram Export:** Fixed PNG export functionality for Mermaid diagrams"
        ]
      }
    ]
  },
  {
    "version": "1.11.1",
    "type": "release",
    "date": "2025-11-18",
    "headline": "Bug Fixes",
    "summary": "Fixed clipboard processing in JSON comparison and Mermaid PNG export",
    "categories": [
      {
        "name": "Fixed",
        "changes": [
          "**JSON Compare with Clipboard:** Clipboard content now properly processed through content pipeline when comparing - stringified JSON is automatically unstringified and formatted in diff modal for accurate side-by-side comparison",
          "**Mermaid Diagram PNG Export:** Fixed SecurityError canvas tainting issue preventing PNG export by converting SVG to base64 data URL instead of blob URL"
        ]
      }
    ]
  },
  {
    "version": "1.11.0",
    "type": "release",
    "date": "2025-11-14",
    "headline": "JSON Query Panel & Navigation",
    "summary": "JMESPath query panel, structure-aware navigation, and enhanced CSV editing",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**JSON Query Panel:** Interactive JMESPath query tool with live results preview, contextual sample queries generated from actual JSON structure, and built-in JMESPath guide with syntax examples",
          "**Structure-Aware JSON Navigation:** Navigator tree clicks now reliably jump to exact locations in JSON using AST parsing (json-source-map), handling nested keys, missing properties, and edge cases correctly",
          "**CSV Cell Actions:** Clear cell contents, copy cell values, and view full cell values in a modal for large data"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**JSON Navigator:** Full horizontal scrolling for long values instead of ellipsis truncation",
          "**JSON Navigator:** Dynamic height adjustment using ResizeObserver for optimal space utilization",
          "**JSON Equality Checker:** Enhanced array mismatch reporting with detailed diff information"
        ]
      }
    ]
  },
  {
    "version": "1.10.0",
    "type": "release",
    "date": "2025-11-12",
    "headline": "JSON & CSV Features",
    "summary": "JSON equality checking, CSV export strategies, and smart delimiter detection",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**JSON Deep Equality Checker:** Order-insensitive JSON comparison using canonical hashing, with intelligent array analysis reporting matched, missing, and extra items",
          "**JSON to CSV Export:** Intelligent JSON-to-CSV conversion with three strategies: expandFirst (recommended), expandAll (Cartesian product), and stringify (legacy)",
          "**CSV Paste Cleaner:** Automatically detects and converts literal \\t escape sequences to actual tab characters on paste",
          "**CSV Auto-Delimiter Detection:** Smart View automatically detects tab, comma, semicolon, or pipe delimiters for proper table rendering"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**CSV Export:** Nested objects automatically flattened with dot notation (e.g., user.name → user.name column)",
          "**CSV Export:** Proper CSV escaping for quotes, delimiters, and newlines",
          "**JWT Tablet:** Improved security messaging - clearer explanation of local storage and best practices"
        ]
      }
    ]
  },
  {
    "version": "1.9.0",
    "type": "release",
    "date": "2025-11-11",
    "headline": "JSON Data Extraction and Calculator improvements",
    "summary": "JSON data extraction tool, calculator readability, and bug fixes",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**JSON Data Extraction:** Extract and filter values from JSON arrays with live preview, supporting nested paths, comparison operators (==, !=, >, <, >=, <=), and export to new tabs",
          "**Calculator Human Readable Output:** Display calculation results in plain language for better comprehension"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Rich text editor: Date created header now properly isolated from document content",
          "Calculator: Various calculation and operator handling bug fixes",
          "Editor: Blank editor issue after applying transformations"
        ]
      }
    ]
  },
  {
    "version": "1.8.0",
    "type": "release",
    "date": "2025-11-01",
    "headline": "Calculator enhancements, JSON Mapper joins, and smart fixes",
    "summary": "Calculator bit manipulation, JSON Mapper joins, and intelligent auto-fix",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Calculator Bit Toggler:** Interactive bit manipulation tool in programmer mode for binary operations",
          "**Calculator Live Base Converter:** Real-time conversion between decimal, binary, octal, and hexadecimal",
          "**JSON Auto-Fix:** Intelligent JSON repair tool that automatically fixes common syntax errors",
          "**JSON Mapper Joins:** Join on matching identifiers when mapping array items"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**JSON Mapper:** Specify naming patterns on mapped files",
          "**Calculator:** Less opportunity to enter incorrect calculator syntax"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "General bug fixes to JSON Mapper"
        ]
      }
    ]
  },
  {
    "version": "1.7.0",
    "type": "release",
    "date": "2025-10-24",
    "headline": "Split tabs, JSON improvements, and bug fixes",
    "summary": "Split tab functionality, JSON sanitize, and smart view enhancements",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Split Tab:** Split tab content into multiple tabs with extensive split configuration controls",
          "**Smart View Callout Widget:** Visual indicator when smart view is available after auto-format detection",
          "**JSON Sanitize:** Added sanitize feature for JSON smart view"
        ]
      },
      {
        "name": "Improvements",
        "changes": [
          "**JSON Mapper:** Enhanced filename controls for mapped files in folders with pattern matching and transformation rules",
          "**Diff Viewer:** Now shows files in tab view order for better context"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Compare with JSON smart view bug fix",
          "Pomodoro timer now appears correctly in browser title when running"
        ]
      }
    ]
  },
  {
    "version": "1.6.0",
    "type": "release",
    "date": "2025-10-15",
    "headline": "GraphQL tablet and Pomodoro fixes",
    "summary": "GraphQL query builder with schema introspection and Pomodoro timer fix",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**GraphQL Tablet:** Interactive GraphQL query builder with schema introspection, query validation, and variables support"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Pomodoro timer getting stuck at 00:01 when auto-start next session is enabled"
        ]
      }
    ]
  },
  {
    "version": "1.5.0",
    "type": "release",
    "date": "2025-10-07",
    "headline": "Rich text enhancements and bug fixes",
    "summary": "Rich text headings, underline, separators, and critical bug fixes",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Rich text H1, H2, H3:** Added heading support for better document structure",
          "**Rich text Underline:** Added underline formatting option",
          "**Rich text Separator:** Added horizontal separator for content division"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Rich text table selection bug",
          "IP Details tablet caching IP address issue",
          "Diff Smart View line wrapping causing text overlap"
        ]
      }
    ]
  },
  {
    "version": "1.4.0",
    "type": "release",
    "date": "2025-09-25",
    "headline": "New tablets and improvements",
    "summary": "Five new tablets: Mermaid, Checksum, DateTime, Colour Palette, Lorem Ipsum",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Mermaid Diagram Tablet:** Create flowcharts, sequence diagrams, and more with live preview",
          "**Checksum Tablet:** Generate MD5, SHA-1, SHA-256 checksums for text and files",
          "**DateTime Tablet:** Parse, format, and convert dates across timezones and formats",
          "**Colour Palette Tablet:** Create and export colour palettes with live UI preview",
          "**Lorem Ipsum Tablet:** Generate placeholder text with customizable options",
          "**SVG Smart View:** Live preview SVG with syntax highlighting and optimization"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Enhanced regex explanations with detailed pattern descriptions",
          "Improved language detection algorithms and bug fixes"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Curl multiline JSON body parsing in Smart View"
        ]
      }
    ]
  },
  {
    "version": "1.3.0",
    "type": "release",
    "date": "2025-08-28",
    "headline": "Rich text editing",
    "summary": "Rich text editor with images, tables, lists, and code blocks",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Rich text editing - Images:** Paste and resize images",
          "**Rich text editing - Style:** Create tables, lists, links",
          "**Rich text editing - Code:** Code blocks with highlighting",
          "**Rich text editing - Content:** Convert standard editor content to rich text or import content from other tabs"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "JSON Smart View scroll-to from tree node now working at any nested level",
          "Can undo a \"From sample\" action",
          "Format detection issues - now more reliable"
        ]
      }
    ]
  },
  {
    "version": "1.2.0",
    "type": "release",
    "date": "2025-08-15",
    "headline": "Properties and INI Smart View",
    "summary": "Smart Views for Properties and INI formats with editing and conversion",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Smart View for Properties:** Validate, edit, convert Properties with a dedicated builder",
          "**Smart View for INI:** Validate, edit, convert INI with a dedicated builder",
          "**CSV Smart View:** Search capabilities",
          "**CSV Smart View:** Shift cells to the right where columns are missing"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Improved JSON, CSV and R auto detection algorithms"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "JSON Smart View replicating content across multiple tabs"
        ]
      }
    ]
  },
  {
    "version": "1.1.0",
    "type": "release",
    "date": "2025-08-11",
    "headline": "Curl command builder",
    "summary": "Feature-rich Curl command builder Smart View with improved detection",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**Smart View for Curl:** A feature rich Curl command builder"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Improved JSON, Csv and R auto detection algorithms",
          "Search JSON by path OR content",
          "Fix broken JSON option",
          "Search formats (Github request #2)",
          "CTRL+Click for tab close without confirmation (Github request #2)",
          "Middle mouse click for tab close without confirmation (Github request #2)",
          "Larger clickable area for close button (Github request #2)"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "JSON Smart View replicating content across multiple tabs",
          "Do not kebab-case already kebab-cased JSON property"
        ]
      }
    ]
  },
  {
    "version": "1.0.0",
    "type": "release",
    "date": "2025-08-06",
    "headline": "Initial Public Release",
    "summary": "First stable release with 50+ tools, multi-tab workspace, and privacy-first design",
    "categories": [
      {
        "name": "New Features",
        "changes": [
          "**50+ Developer Tools:** JSON editor, JWT decoder, Regex tester, Word count, and more",
          "**Multi-tab Workspace:** Organize your work with persistent tabs and split-view support",
          "**Smart Format Detection:** Automatic recognition and formatting of JSON, YAML, Markdown, CSV, and other common formats",
          "**Smart Views:** Take your editing to the next level with Smart Views, support for JSON, YAML, Markdown, HTML and CSV",
          "**Offline AI Summarization:** Client-side text summarization using WebAssembly (experimental)",
          "**Advanced Diff Tool:** Side-by-side comparison with syntax highlighting",
          "**Workspace Management:** Save, export, and import entire workspaces",
          "**Privacy-First Design:** 100% client-side processing, zero data collection"
        ]
      },
      {
        "name": "Technical Highlights",
        "changes": [
          "Built with React 18 and TypeScript for reliability and performance",
          "Monaco Editor integration for advanced code editing capabilities",
          "IndexedDB for persistent local storage",
          "Service Worker support for process intensive tasks"
        ]
      }
    ]
  },
  {
    "version": "0.9.0-beta",
    "type": "beta",
    "date": "2025-07-20",
    "headline": "Beta Release",
    "summary": "Feature-complete beta with REST client, JWT toolkit, and performance optimizations",
    "categories": [
      {
        "name": "Added",
        "changes": [
          "REST client with environment variables and request history",
          "JWT token decoder, verifier, and signer with multiple algorithms",
          "Advanced JSON transformation tools with jq-like syntax",
          "Batch text processing",
          "CSV Smart View providing extended capabilities",
          "Password and UUID generators with customizable options"
        ]
      },
      {
        "name": "Improved",
        "changes": [
          "Enhanced tab management with drag-and-drop reordering",
          "Better error handling and user feedback",
          "Improved keyboard shortcuts and accessibility",
          "Performance optimizations for large files"
        ]
      },
      {
        "name": "Fixed",
        "changes": [
          "Memory leaks when switching between multiple tabs",
          "Incorrect syntax highlighting for certain file types",
          "Issues with workspace export containing special characters",
          "Mobile layout problems on smaller screens"
        ]
      }
    ]
  },
  {
    "version": "0.8.0-alpha",
    "type": "alpha",
    "date": "2025-05-05",
    "headline": "Alpha Release",
    "summary": "Initial alpha with core tab interface, JSON formatter, and plugin architecture",
    "categories": [
      {
        "name": "Added",
        "changes": [
          "Core tab-based interface with workspace support",
          "Basic JSON formatter and validator",
          "Text editor with syntax highlighting for 20+ languages",
          "Local storage persistence for tabs and settings",
          "Import/export functionality for individual tabs"
        ]
      },
      {
        "name": "Architecture",
        "changes": [
          "Established plugin-based tablet system for extensibility",
          "Implemented privacy-first design principles",
          "Set up development toolchain with TypeScript and Vite",
          "Created comprehensive testing framework"
        ]
      }
    ]
  }
];

export const getLatestRelease = (): Release | undefined => RELEASES[0];

export const getRecentReleases = (count: number = 10): Release[] => RELEASES.slice(0, count);
