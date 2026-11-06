# Scratch Tabs

Scratch Tabs is a local-first developer workspace for exploring, transforming, and validating text/data formats directly in the browser.

Website: https://scratchtabs.com

## Highlights

- Local-first persistence with IndexedDB (no server required for core workflows)
- Installable Progressive Web App
- Monaco-powered editor with many format/tool integrations
- Automatic format detection for JSON, CSV/TSV, YAML, TOML, XML, INI, `.env`, Properties, HAR, OpenAPI, PEM certificates, JWT, SQL, Markdown, HTML/SVG, stack traces, and common programming languages
- Smart Views for structured formats, such as a table view for CSV, a certificate viewer for PEM, and an explorer for OpenAPI
- Transformation Pipeline system for repeatable data operations
- Built-in dev tools such as JWT, regex, REST client, converters, and checksums

## Tech Stack

- React 18 + TypeScript
- Vite
- Zustand
- Monaco Editor
- Dexie (IndexedDB)
- Tailwind CSS
- Jest + Testing Library
- Playwright + Cucumber

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

The app starts on `http://localhost:5173`.

## Scripts

- `npm run dev`: Start local dev server
- `npm run build`: Build production assets
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint
- `npm run tsc`: Type-check project
- `npm run test`: Run unit tests
- `npm run coverage`: Run tests with coverage
- `npm run e2e`: Run E2E tests excluding `@wip`/`@bug`
- `npm run e2e:full`: Run all E2E tests

## Project Structure

- `src/`: Application source code
- `tests/e2e/`: End-to-end test suite
- `landing/`: Landing site assets/pages
- `changelog/`: Changelog generation scripts

## Privacy Model

Scratch Tabs is designed to keep data client-side. Core app workflows run in the browser and persist locally.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request. Implementation guidance for coding agents is in [CLAUDE.md](./CLAUDE.md).

## Security

Please report vulnerabilities using the process in [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
