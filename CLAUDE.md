# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install                          # Install dependencies
bun run dev                          # Dev server with hot reload at http://localhost:3000
bun run generate --seed 42 --output pattern.svg  # Generate SVG via CLI
bun test                             # Run all tests
bun test --watch                     # Watch mode
bun test tests/core/bezier.test.ts   # Run a single test file
```

## Architecture

Procedural generator for Urnes-style Viking ornamental SVG patterns. Zero runtime dependencies — pure math and SVG string generation running on Bun.

### Pipeline (in execution order)

1. **Composition** (`src/compose/`) — Arranges elements (great beast, serpents, vines) within bounds. `panel.ts` for rectangular layouts, `border.ts` for tileable horizontal strips.
2. **Spine Generation** — Composers create `CurvePath` (chains of `CubicBezier` segments) as the skeleton for each creature/vine.
3. **Ribbon Generation** (`src/core/ribbon.ts`) — Converts spine curves to variable-width `Ribbon` (left/right/spine point arrays) using normal offsets and a `widthProfile`.
4. **Interlace Engine** (`src/interlace/`) — `intersections.ts` finds bezier-bezier crossings; `weave.ts` assigns alternating over/under and creates visual gaps.
5. **SVG Rendering** (`src/render/svg.ts`) — Renders ribbons to SVG paths in z-order: under-segments → over-segments → heads.

### Key Types (`src/core/types.ts`)

- `UrnesElement` — Core element with spine, width profile, ribbon, optional head, and child elements (limbs)
- `GeneratorConfig` — Full config: seed, dimensions, composition type, complexity (1-10), element toggles, style options
- `CurvePath` / `CubicBezier` — Geometry primitives for all curve math
- `Crossing` — Intersection between two element paths with over/under assignment

### Entry Points

- `src/generator.ts` — Public API: `generate(config?)` returns SVG string. Orchestrates the full pipeline.
- `src/cli.ts` — CLI wrapper around `generate()`
- `src/serve.ts` — Bun.serve dev server serving `web/index.html`
- `web/index.html` — Self-contained interactive UI (inline JS, no build step)

### Element Types (`src/elements/`)

Three element generators that each produce an `UrnesElement` with spine curves:
- `serpent.ts` — Great beast (dominant creature) and secondary serpents
- `vine.ts` — Fill tendrils
- `head.ts` — Animal head with almond-shaped eye (rendered at spine endpoints)

## Conventions

- Bun is the runtime, package manager, and test runner — not Node/npm
- All imports use `.ts` extensions (`import { foo } from './bar.ts'`)
- Tests mirror `src/` structure under `tests/` (e.g., `tests/core/bezier.test.ts`)
- Seeded PRNG (`src/core/random.ts`, mulberry32) — all randomness flows from `createRng(seed)` for reproducibility
- CSS export via `src/render/css.ts` (`toCssBackground`, `toCssClass`)
