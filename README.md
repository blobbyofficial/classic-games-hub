# Classic Games Hub

A polished static arcade site rebuilt with a shared UI shell, consistent routing, and manifest-driven metadata.

## What’s new

- Shared `topbar` and `footer` shell rendered dynamically via `assets/scripts/core/site-shell.js`
- Consistent page transitions handled by `assets/scripts/core/site-loader.js`
- Landing, library, field guide, detail, and cabinet pages unified under one visual system
- Direct static routes preserved for all primary pages and playable cabinets
- Build pipeline updated in `scripts/build.js` to bundle the new shared shell script

## Main routes

- `index.html` - landing page
- `pages/homepage.html` - game library
- `pages/gamepage.html` - field guide
- `pages/snake.html` - Snake detail page
- `pages/tetris.html` - Tetris detail page
- `games/arcade-cabinet.html?game=snake` - playable Snake
- `games/arcade-cabinet.html?game=tetris` - playable Tetris

## Architecture

- `assets/scripts/core/site-shell.js` renders shared navigation and footer components in every page
- `assets/scripts/core/site-loader.js` handles pleasant page-loading transitions
- `assets/scripts/games/arcade-suite.js` continues to power library rendering and arcade cabinet behavior
- `assets/styles/core/site.css` provides the unified design system and responsive layout
- `games/manifest.json` holds game metadata for future library automation and detail pages

## Build

Run:

```bash	node scripts/build.js
```

This copies HTML, styles, images, game files, and bundles the shared scripts.

## Changelog

See `CHANGELOG.md` for the latest update notes.
