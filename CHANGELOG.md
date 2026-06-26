# Changelog

## 2026-06-26 — Major site overhaul

- Reworked the static site into a polished shared shell with dynamic header and footer rendering.
- Added `assets/scripts/core/site-shell.js` for consistent navigation across all pages.
- Centralized page transitions and entrance loading while preserving direct static file routes.
- Modernized the landing, library, field guide, detail, and cabinet pages with a unified design system.
- Confirmed `scripts/build.js` bundles the new shell script and copies all asset/game routes correctly.
- Kept the arcade cabinet runtime and manifest-driven metadata intact for future library automation.
