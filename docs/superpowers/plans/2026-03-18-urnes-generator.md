# Urnes Style Pattern Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete parametric SVG generator for Urnes-style Viking ornamental patterns with CLI, web UI, and multiple export formats.

**Architecture:** Layered system — curve primitives at the bottom, SVG renderer, interlace engine, element builders (serpent/vine), composition engine, and generator API at the top. Each layer depends only on layers below it. Zero runtime dependencies for the core engine (pure math + string generation).

**Tech Stack:** TypeScript, Bun (runtime + bundler), Vitest (testing), Bezier.js (curve math), vanilla HTML/CSS/JS for web UI.

---

## File Structure

```
src/
  core/
    types.ts              — Point, CubicBezier, CurvePath, etc.
    random.ts             — Seeded PRNG (mulberry32)
    bezier.ts             — Bezier math: evaluate, tangent, split, intersect
    ribbon.ts             — Offset curves → ribbon outlines with variable width
  interlace/
    intersections.ts      — Find bezier-bezier intersections
    weave.ts              — Assign over/under, generate crossing data
  elements/
    serpent.ts            — Great beast + serpent spine/body generator
    vine.ts               — Vine/tendril generator with spiral ends
    head.ts               — Animal head/eye SVG shapes
  compose/
    panel.ts              — Panel composition layout
    border.ts             — Tileable border/frieze composition
  render/
    svg.ts                — Convert internal paths → SVG markup
    css.ts                — CSS embed helper (data URI)
  generator.ts            — Public API: generate(config) → SVG string
  cli.ts                  — CLI entry point
web/
  index.html              — Interactive web UI
  app.ts                  — Web UI logic (imports generator)
tests/
  core/
    bezier.test.ts
    ribbon.test.ts
    random.test.ts
  interlace/
    intersections.test.ts
    weave.test.ts
  elements/
    serpent.test.ts
    vine.test.ts
    head.test.ts
  compose/
    panel.test.ts
    border.test.ts
  render/
    svg.test.ts
  generator.test.ts
```

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `vitest.config.ts`
- Create: `src/core/types.ts`

- [ ] **Step 1: Initialize project with bun**

```bash
cd ~/git/urnes-style-generator
bun init -y
```

- [ ] **Step 2: Install dev dependencies**

```bash
bun add -d vitest typescript @types/bun
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "sourceMap": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "web/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
output/
*.svg
!examples/*.svg
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 6: Create core types**

Create `src/core/types.ts` with all shared type definitions: `Point`, `CubicBezier`, `CurvePath`, `Ribbon`, `Crossing`, `UrnesElement`, `GeneratorConfig`, `RenderConfig`.

- [ ] **Step 7: Verify setup**

```bash
bun run vitest --version
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: project setup with bun, typescript, vitest"
```

---

### Task 2: Seeded Random Number Generator

**Files:**
- Create: `src/core/random.ts`
- Create: `tests/core/random.test.ts`

- [ ] **Step 1: Write failing tests for PRNG**

Test: same seed produces same sequence, different seeds produce different sequences, `range()` stays in bounds, `pick()` selects from array.

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run vitest run tests/core/random.test.ts
```

- [ ] **Step 3: Implement mulberry32 PRNG**

Implement `createRng(seed)` returning `{ next(), range(min, max), pick(arr), shuffle(arr) }`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/core/random.ts tests/core/random.test.ts && git commit -m "feat: seeded PRNG (mulberry32)"
```

---

### Task 3: Bezier Curve Primitives

**Files:**
- Create: `src/core/bezier.ts`
- Create: `tests/core/bezier.test.ts`

- [ ] **Step 1: Write failing tests for bezier math**

Test `evaluateAt` (t=0 → start, t=1 → end, t=0.5 → midpoint), `tangentAt`, `splitAt` (split produces two curves that together match the original), `lengthEstimate`.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement bezier functions**

Implement: `evaluateAt(bez, t)`, `tangentAt(bez, t)`, `normalAt(bez, t)`, `splitAt(bez, t)`, `lengthEstimate(bez, segments)`, `samplePoints(path, count)`.

All pure math — De Casteljau's algorithm for evaluate/split, derivative for tangent.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/core/bezier.ts tests/core/bezier.test.ts && git commit -m "feat: bezier curve primitives"
```

---

### Task 4: Ribbon Generator (Variable-Width Strokes)

**Files:**
- Create: `src/core/ribbon.ts`
- Create: `tests/core/ribbon.test.ts`

- [ ] **Step 1: Write failing tests**

Test: ribbon from straight line produces two parallel paths, ribbon with tapering width narrows, ribbon output has correct number of points.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement ribbon generation**

`generateRibbon(spine: CurvePath, widthProfile: number[])` → `{ left: Point[], right: Point[], spine: Point[] }`. Sample spine at N points, at each point offset left/right by width using normal vector.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/core/ribbon.ts tests/core/ribbon.test.ts && git commit -m "feat: variable-width ribbon generator"
```

---

### Task 5: SVG Renderer

**Files:**
- Create: `src/render/svg.ts`
- Create: `tests/render/svg.test.ts`

- [ ] **Step 1: Write failing tests**

Test: `pointsToSvgPath` produces valid `d` attribute, `renderSvg` wraps in `<svg>` with viewBox, `renderRibbon` creates filled path from ribbon points.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement SVG renderer**

Implement: `pointsToSvgPath(points, closed)` → smooth bezier path string via Catmull-Rom → Bezier conversion, `renderRibbon(ribbon, style)` → `<path>` element, `renderSvg(elements, config)` → complete SVG document string.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/render/svg.ts tests/render/svg.test.ts && git commit -m "feat: SVG renderer"
```

---

### Task 6: Bezier-Bezier Intersection

**Files:**
- Create: `src/interlace/intersections.ts`
- Create: `tests/interlace/intersections.test.ts`

- [ ] **Step 1: Write failing tests**

Test: two straight-line beziers crossing at known point, two curves that don't cross → empty, two curves with multiple intersections.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement intersection finding**

Use subdivision/bounding-box method: recursively split both curves, check bounding box overlap, converge on intersection points. Return `{ paramA, paramB, point }[]`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/interlace/intersections.ts tests/interlace/intersections.test.ts && git commit -m "feat: bezier-bezier intersection detection"
```

---

### Task 7: Interlace/Weave Engine

**Files:**
- Create: `src/interlace/weave.ts`
- Create: `tests/interlace/weave.test.ts`

- [ ] **Step 1: Write failing tests**

Test: two crossing paths get alternating over/under, `createGaps` splits under-path at crossing points, gap size is configurable.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement weave engine**

`assignCrossings(elements)` → find all intersections, assign alternating over/under. `applyInterlace(elements, crossings, gapSize)` → modify paths to create visual interlacing (gap method: split under-paths and shorten at crossings).

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/interlace/weave.ts tests/interlace/weave.test.ts && git commit -m "feat: interlace weave engine with over/under gaps"
```

---

### Task 8: Serpent/Beast Element Builder

**Files:**
- Create: `src/elements/serpent.ts`
- Create: `src/elements/head.ts`
- Create: `tests/elements/serpent.test.ts`
- Create: `tests/elements/head.test.ts`

- [ ] **Step 1: Write failing tests for serpent**

Test: `generateSpine` produces flowing S-curve path within bounds, `generateBeast` returns element with spine + ribbon + head, width profile tapers correctly.

- [ ] **Step 2: Write failing tests for head**

Test: `generateHead` produces SVG path data for almond-eye head, head orientation matches spine tangent at endpoint.

- [ ] **Step 3: Run tests to verify they fail**

- [ ] **Step 4: Implement serpent builder**

`generateSpine(rng, bounds, segments)` → create flowing spine using randomized control points that form S-curves. `generateBeast(rng, config)` → full beast with spine, width profile, optional limbs. `generateSerpent(rng, config)` → smaller version without limbs.

- [ ] **Step 5: Implement head builder**

`generateHead(position, tangent, size, style)` → SVG path data for the animal head (almond eye, snout profile, optional lip curl).

- [ ] **Step 6: Run tests to verify they pass**

- [ ] **Step 7: Commit**

```bash
git add src/elements/ tests/elements/ && git commit -m "feat: serpent/beast and head element builders"
```

---

### Task 9: Vine/Tendril Element Builder

**Files:**
- Create: `src/elements/vine.ts`
- Create: `tests/elements/vine.test.ts`

- [ ] **Step 1: Write failing tests**

Test: `generateVine` produces path within bounds, vine tapers toward tip, spiral end curves back.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement vine builder**

`generateVine(rng, config)` → flowing tendril with oscillation, taper, and optional spiral terminal. Uses sine-like control point offsets for organic feel.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/elements/vine.ts tests/elements/vine.test.ts && git commit -m "feat: vine/tendril element builder"
```

---

### Task 10: Panel Composition Engine

**Files:**
- Create: `src/compose/panel.ts`
- Create: `tests/compose/panel.test.ts`

- [ ] **Step 1: Write failing tests**

Test: `composePanel` returns array of elements, dominant beast is present, vines fill remaining space, element count scales with complexity.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement panel composition**

`composePanel(rng, config)` → place great beast along main flow, add secondary serpents, fill with vines. Uses bounds subdivision to manage negative space.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/compose/panel.ts tests/compose/panel.test.ts && git commit -m "feat: panel composition engine"
```

---

### Task 11: Border/Frieze Composition

**Files:**
- Create: `src/compose/border.ts`
- Create: `tests/compose/border.test.ts`

- [ ] **Step 1: Write failing tests**

Test: `composeBorder` produces tileable output (left edge connects to right edge), elements flow horizontally.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement border composition**

`composeBorder(rng, config)` → horizontal strip with repeating motif. Serpent flows left-to-right, vines fill, ensure spine endpoints allow seamless tiling.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/compose/border.ts tests/compose/border.test.ts && git commit -m "feat: tileable border/frieze composition"
```

---

### Task 12: Generator API

**Files:**
- Create: `src/generator.ts`
- Create: `tests/generator.test.ts`

- [ ] **Step 1: Write failing tests**

Test: `generate` returns valid SVG string, same seed → same output, different complexity → different element counts, all composition types work.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement generator**

`generate(config: Partial<GeneratorConfig>)` → merges defaults, creates RNG from seed, calls composition engine, runs interlace, renders to SVG. This is the orchestration layer.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/generator.ts tests/generator.test.ts && git commit -m "feat: public generator API"
```

---

### Task 13: CLI Tool

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Implement CLI**

Parse args with Bun's `process.argv`: `--seed`, `--width`, `--height`, `--composition`, `--complexity`, `--output`. Call `generate()`, write SVG to file or stdout.

- [ ] **Step 2: Add bin entry to package.json**

```json
{ "bin": { "urnes": "src/cli.ts" } }
```

- [ ] **Step 3: Test manually**

```bash
bun run src/cli.ts --seed 42 --output output/test.svg
```

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts && git commit -m "feat: CLI tool"
```

---

### Task 14: CSS Export Helper

**Files:**
- Create: `src/render/css.ts`
- Create: `tests/render/css.test.ts`

- [ ] **Step 1: Write failing tests**

Test: `toDataUri` returns valid `data:image/svg+xml` URI, `toCssBackground` returns valid CSS `background-image` declaration.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement CSS helpers**

`toDataUri(svg)`, `toCssBackground(svg)`, `toCssClass(svg, className)`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/render/css.ts tests/render/css.test.ts && git commit -m "feat: CSS export helpers"
```

---

### Task 15: Web UI

**Files:**
- Create: `web/index.html`
- Create: `web/app.ts`

- [ ] **Step 1: Create HTML page**

Simple page with: controls panel (seed, width, height, composition type, complexity sliders), SVG preview area, export buttons (SVG download, CSS copy, PNG download).

- [ ] **Step 2: Implement app.ts**

Import generator, wire up controls → `generate()` → render preview. Add export button handlers.

- [ ] **Step 3: Add dev server script**

```json
{ "scripts": { "dev": "bun run --hot web/app.ts" } }
```

Or use a simple static server approach with `Bun.serve()`.

- [ ] **Step 4: Test manually in browser**

- [ ] **Step 5: Commit**

```bash
git add web/ && git commit -m "feat: interactive web UI"
```

---

### Task 16: Example Outputs & Final Polish

**Files:**
- Create: `examples/` directory with pre-generated SVGs
- Update: `README.md` with usage examples and screenshots

- [ ] **Step 1: Generate example patterns**

```bash
bun run src/cli.ts --seed 1 --composition panel --output examples/panel-01.svg
bun run src/cli.ts --seed 42 --composition border --output examples/border-01.svg
bun run src/cli.ts --seed 7 --composition panel --complexity 8 --output examples/complex-01.svg
```

- [ ] **Step 2: Update README with examples**

Add generated SVG previews and usage instructions.

- [ ] **Step 3: Add npm scripts**

```json
{
  "scripts": {
    "generate": "bun run src/cli.ts",
    "dev": "bun run web/serve.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat: example outputs and final polish"
```
