# Repository Guidelines

## Project Structure & Module Organization

This is a dependency-free Node.js static site for a daily AI opportunity briefing. The browser UI lives at the repository root: `index.html`, `app.js`, and `styles.css`. Generated content is stored in `data/feed.json`; date-stamped snapshots belong in `data/archive/YYYY-MM-DD.json`. Feed collection, scoring, and JSON generation are implemented in `scripts/generate-feed.mjs`. Tests are in `test/`, mirroring the generator's public functions.

## Build, Test, and Development Commands

- `npm test` runs the Node.js built-in test suite (`node --test`). Run it before submitting changes to feed parsing or scoring.
- `npm run generate` fetches configured RSS/Atom sources and rewrites `data/feed.json` plus the current Taipei-date archive.
- `python -m http.server 8000` serves the static site locally. Visit `http://localhost:8000`; use a server because browser `fetch()` cannot reliably read `file://` data.

Use Node.js 20 or newer, as declared in `package.json`. There is no bundler, install step, or external runtime dependency.

## Coding Style & Naming Conventions

Use ES modules and `const` by default. Keep code compact where appropriate but preserve clear names: `parseFeed`, `buildFeed`, and `taipeiDay` describe their responsibilities. Use camelCase for functions and variables, UPPER_SNAKE_CASE for exported constants such as `SOURCES`, and kebab-case for filenames. Keep generated JSON formatted with two-space indentation and end text files with a newline. Avoid introducing dependencies for small standard-library tasks.

## Testing Guidelines

Write tests with `node:test` and `node:assert/strict` in `test/*.test.mjs`. Name tests as behavior statements, for example `test('parses RSS items', ...)`. Cover successful parsing and relevant edge cases (encoded markup, Atom links, date boundaries, deduplication, and scoring changes). Run `npm test` after every generator change; validate `npm run generate` when modifying sources or output format.

## Commit & Pull Request Guidelines

Follow the existing concise, imperative commit style, optionally scoped: `data: publish GPT opportunity briefing for 2026-08-10` or `Unify the daily briefing pipeline`. Keep generated feed and archive updates in their own data-focused commit when practical. Pull requests should explain the user-facing impact, identify changed data or pipeline behavior, link the relevant issue when available, and include screenshots for visual changes. Confirm tests pass and avoid committing unrelated generated archives.

## Configuration & Content Safety

Treat RSS URLs and generated content as untrusted input. Preserve the generator's sanitization and avoid placing secrets in static files, source URLs, or committed configuration.
