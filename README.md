# Urnes Style Pattern Generator

A programmatic generator for [Urnes style](https://en.wikipedia.org/wiki/Urnes_style) Viking/Norse ornamental patterns. Generates SVG patterns that can be used for:

- **3D printing/modeling** — extrude SVG paths into relief surfaces
- **Web design** — CSS backgrounds, masks, and decorative elements
- **Tattoo design** — scalable vector templates
- **Laser cutting/engraving** — vector output ready for CNC

## What is the Urnes Style?

The Urnes style (c. 1050-1150 AD) is the last phase of Viking art. Named after the [Urnes Stave Church](https://en.wikipedia.org/wiki/Urnes_Stave_Church) in Norway, it's characterized by:

- **Slender, elongated animals** with almond-shaped eyes
- **Graceful, intertwining tendrils** that loop over and under each other
- **Asymmetric composition** — unlike the rigid symmetry of earlier Viking styles
- **Figure-eight interlacing** — elements continuously weave through each other
- **Smooth, flowing curves** — elegant rather than aggressive

The style is essentially built from a small set of repeating elements combined with strict interlacing rules — making it a surprisingly good candidate for procedural generation.

## Quick Start

```bash
# Clone and install
git clone <this-repo-url>
cd urnes-style-generator
bun install

# Generate a pattern
bun run generate --seed 42 --output pattern.svg

# Start the web UI
bun run dev
# Open http://localhost:3000

# Run tests
bun test
```

## CLI Usage

```bash
# Basic generation
bun run generate --seed 42 --output output/panel.svg

# Border/frieze (tileable horizontal strip)
bun run generate --seed 7 --composition border --width 800 --height 200 --output output/border.svg

# High complexity
bun run generate --seed 100 --complexity 8 --output output/complex.svg

# Output as CSS background-image
bun run generate --seed 1 --css > pattern.css

# All options
bun run generate --help
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--seed <n>` | random | Random seed for reproducibility |
| `--width <n>` | 400 | SVG width in pixels |
| `--height <n>` | 600 | SVG height in pixels |
| `--composition` | panel | Layout: `panel` or `border` |
| `--complexity <1-10>` | 5 | Pattern complexity |
| `--output <path>` | stdout | Output file path |
| `--css` | - | Output CSS instead of SVG |

## Web UI

Run `bun run dev` and open http://localhost:3000 for an interactive generator with:

- Live preview with all configuration options
- Seed randomizer
- Complexity, stroke width, gap size sliders
- Fill/tapering toggles
- Color pickers for stroke and fill
- Export: Download SVG, Copy CSS, Copy SVG

## Programmatic API

```typescript
import { generate } from './src/generator.ts'

// Generate with defaults
const svg = generate()

// Full configuration
const svg = generate({
  seed: 42,
  width: 400,
  height: 600,
  composition: 'panel',  // 'panel' | 'border'
  complexity: 5,          // 1-10
  elements: {
    greatBeast: true,     // dominant serpentine creature
    serpents: 1,          // secondary serpents (0-3)
    vines: true,          // fill tendrils
  },
  style: {
    strokeWidth: 2,
    gapSize: 6,           // interlace gap width
    fill: true,
    tapering: true,       // variable-width strokes
    strokeColor: '#1a1a1a',
    fillColor: '#1a1a1a',
  },
})

// CSS export
import { toCssBackground, toCssClass } from './src/render/css.ts'
const css = toCssBackground(svg)
const cssClass = toCssClass(svg, 'urnes-pattern')
```

## Architecture

```
src/
  core/
    types.ts              — Shared types (Point, CubicBezier, CurvePath, etc.)
    random.ts             — Seeded PRNG (mulberry32)
    bezier.ts             — Bezier math (evaluate, tangent, split, intersect)
    ribbon.ts             — Variable-width ribbon from spine curves
  interlace/
    intersections.ts      — Bezier-bezier intersection detection
    weave.ts              — Over/under assignment, gap generation
  elements/
    serpent.ts            — Great beast + serpent generators
    vine.ts               — Vine/tendril generator
    head.ts               — Animal head with almond eye
  compose/
    panel.ts              — Rectangular panel composition
    border.ts             — Tileable border/frieze composition
  render/
    svg.ts                — SVG path + document rendering
    css.ts                — CSS embed helpers
  generator.ts            — Public API (orchestrates everything)
  cli.ts                  — CLI entry point
  serve.ts                — Dev server (Bun.serve)
web/
  index.html              — Interactive web UI
  app.ts                  — UI logic
```

### How It Works

1. **Composition** — Arranges elements (great beast, serpents, vines) within bounds
2. **Spine Generation** — Creates flowing bezier curve paths for each creature
3. **Ribbon Generation** — Converts spine curves to variable-width ribbons using normal offsets
4. **Interlace Engine** — Finds all crossings between elements, assigns alternating over/under, creates visual gaps
5. **SVG Rendering** — Converts ribbons to SVG paths (under-segments first, over-segments on top, heads last)

## Tech Stack

- **TypeScript** — type safety for geometry math
- **Bun** — runtime, bundler, test runner, dev server
- **Zero runtime dependencies** — pure math + SVG string generation
- **177 tests** across 13 test files

## Design Document

See [docs/design.md](docs/design.md) for the full technical design including:

- Visual grammar of the Urnes style (what makes it authentic)
- Layer-by-layer architecture explanation
- Interlacing algorithm details
- Pattern DNA JSON format for AI-assisted generation
- Reference material (historical sources, math resources)

## Future Ideas

- Circular/radial composition
- 3D export (SVG to extruded STL via OpenJSCAD)
- PNG rasterization
- More element types (Ringerike, Mammen style variants)
- Pattern tiling for wallpaper/fabric

## License

MIT
