# Urnes Style Generator — Design Document

## 1. Problem Statement

The Urnes style is one of the most visually distinctive art styles from the Viking era, but creating authentic-looking patterns requires either deep artistic skill or tedious manual work. A programmatic generator would allow anyone to create unique, authentic patterns for 3D printing, web design, tattoos, and more.

## 2. Visual Grammar of the Urnes Style

Before writing any code, you need to understand what makes a pattern "Urnes style" rather than generic Celtic knotwork or other interlace art.

### 2.1 Core Elements

| Element | Description | Visual Character |
|---------|-------------|-----------------|
| **Great Beast** | Large serpentine animal, dominates the composition | Long sinuous body, small head with almond eye, thin limbs that intertwine with tendrils |
| **Serpent** | Smaller snake-like creature | Ribbon-like body, loops through the great beast |
| **Tendrils/Vines** | Thin plant-like curves | Fill negative space, create rhythm, thinner than animal bodies |
| **Eyes/Heads** | Anchor points for animals | Almond-shaped, profile view, sometimes with a lip curl |
| **Loops** | Figure-eight crossings | Where elements pass over/under each other |

### 2.2 Rules That Make It "Urnes"

1. **Alternating over/under** — When two elements cross, they strictly alternate which one is on top (like weaving)
2. **Varying thickness** — Elements taper and swell along their length (not uniform width)
3. **Asymmetry** — The composition is NOT mirror-symmetric (unlike Ringerike or Mammen styles)
4. **Continuous flow** — Elements don't have abrupt starts/stops; they loop back into themselves or connect to other elements
5. **Hierarchy** — One "great beast" dominates, smaller serpents and vines fill around it
6. **Negative space** — Gaps between elements are roughly even (no cramped areas next to empty areas)
7. **Smooth curves** — No sharp angles; everything flows with cubic bezier-level smoothness

### 2.3 What It Is NOT

- Not Celtic knotwork (which is typically symmetric, geometric, and grid-based)
- Not Jelling/Mammen style (which has thicker, more aggressive animals)
- Not Art Nouveau (similar flowing lines, but different vocabulary)

## 3. Technical Architecture

### 3.1 Layer Model

The generator is built in layers, from low-level math to high-level composition:

```
Layer 5: Generator API         — Public interface, configuration
Layer 4: Composition Engine    — Arranges elements, manages flow
Layer 3: Element Builders      — Creates specific shapes (beasts, vines)
Layer 2: Interlace Engine      — Handles over/under crossings
Layer 1: Curve Primitives      — Bezier math, path operations
Layer 0: SVG Renderer          — Converts paths to SVG markup
```

Each layer only depends on the layers below it.

### 3.2 Layer 1: Curve Primitives

The foundation. Everything in the Urnes style is curves.

```typescript
// Core types
interface Point { x: number; y: number }

interface CubicBezier {
  start: Point
  cp1: Point      // first control point
  cp2: Point      // second control point
  end: Point
}

// A path is a series of connected bezier segments
interface CurvePath {
  segments: CubicBezier[]
  closed: boolean  // does it loop back to start?
}
```

**Key operations needed:**
- `evaluateAt(curve, t)` — get point at parameter t (0-1)
- `tangentAt(curve, t)` — get direction at parameter t
- `splitAt(curve, t)` — split a curve into two at parameter t
- `findIntersections(pathA, pathB)` — find where two paths cross
- `offsetCurve(curve, distance)` — create parallel curve (for stroke width)
- `smoothJoin(curveA, curveB)` — connect two curves with G2 continuity

**Libraries that can help:**
- [Bezier.js](https://pomax.github.io/bezierjs/) — excellent bezier math library
- [Paper.js](http://paperjs.org/) — full 2D vector graphics (heavier, but powerful)
- Or write your own — the math is well-documented (see Resources)

### 3.3 Layer 2: Interlace Engine

This is the **hardest and most important** part. Interlacing is what makes the style work.

**The Problem:** When two ribbon-like paths cross, one must go "over" and one "under." In 2D SVG, you simulate this with clipping masks or path breaks.

**Algorithm:**

```
1. Find all intersections between all element paths
2. Sort intersections along each path by parameter t
3. Assign over/under: alternate along each path
   - If path A is "over" at crossing 1, it's "under" at crossing 2
   - Resolve conflicts (two paths can't both be "over" at the same crossing)
4. At each "under" crossing, create a gap in the under-path
   - Split the path at the intersection
   - Shorten both split ends slightly (creating a visible gap)
   - The "over" path draws continuously through the crossing
```

**SVG implementation options:**
- **Gap method** (simpler): Break the under-path and leave a gap
- **Clipping method** (nicer): Use `<clipPath>` to mask the under-path where it crosses behind
- **Layered method** (simplest for 3D): Draw under-paths first, over-paths on top with white border

**Data structure:**

```typescript
interface Crossing {
  pathA: string          // ID of first path
  pathB: string          // ID of second path
  paramA: number         // t parameter on path A (0-1)
  paramB: number         // t parameter on path B (0-1)
  point: Point           // intersection point
  overPath: 'A' | 'B'   // which path is on top
}
```

### 3.4 Layer 3: Element Builders

Each element type has a builder that generates curve paths with the right character.

#### Serpent/Beast Builder

```typescript
interface SerpentConfig {
  headPos: Point           // where the head goes
  bodyPath: CurvePath      // the spine of the body (center line)
  widthProfile: number[]   // width at each point along the body (for tapering)
  hasLimbs: boolean        // great beasts have thin limbs
  limbPositions?: number[] // t parameters where limbs branch off
}
```

**Generation approach:**
1. Create a flowing spine curve (series of beziers that snake through the composition)
2. Apply width profile — offset the spine curve on both sides to create a ribbon
3. Add head at one end (almond eye, snout)
4. Optionally add thin limbs that branch off and intertwine with other elements

#### Vine/Tendril Builder

```typescript
interface VineConfig {
  startPoint: Point
  flowDirection: number    // angle in radians
  length: number
  curliness: number        // how tightly it spirals (0-1)
  thickness: number        // base width
  taperRate: number        // how quickly it thins out
}
```

**Generation approach:**
1. Start from a point, follow a direction
2. Add periodic oscillation (sine-like curves via beziers)
3. Taper the width toward the tip
4. Optionally spiral at the end (common in Urnes)

### 3.5 Layer 4: Composition Engine

This arranges elements within the given bounds to create a complete pattern.

**Composition strategies:**
- **Panel:** Rectangular frame, great beast fills most of it, vines fill gaps (like the Urnes church portal)
- **Border/Frieze:** Horizontal strip, elements flow left-to-right, tileable
- **Circular:** Radial composition, elements spiral from center (like brooches)
- **Free-form:** No frame constraints, elements grow organically

**Layout algorithm (simplified):**

```
1. Place the dominant element (great beast) along a main flow line
2. Identify negative space regions
3. Place secondary elements (serpents) in large gaps
4. Fill remaining space with vines/tendrils
5. Run interlace engine on all elements
6. Check density — add or remove elements to achieve target density
7. Smooth and adjust for even negative space
```

### 3.6 Layer 5: Generator API

```typescript
interface GeneratorConfig {
  seed: number              // random seed for reproducibility
  width: number             // output width in SVG units
  height: number            // output height in SVG units
  composition: 'panel' | 'border' | 'circular' | 'freeform'
  complexity: number        // 1-10, controls element count
  elements: {
    greatBeast: boolean     // include a great beast?
    serpents: number        // number of secondary serpents (0-3)
    vines: boolean          // fill with vines?
  }
  style: {
    strokeWidth: number     // base line width
    gapSize: number         // gap size at under-crossings
    fill: boolean           // filled ribbons or outline only?
    tapering: boolean       // width variation along elements?
  }
}

function generate(config: GeneratorConfig): string  // returns SVG markup
```

### 3.7 SVG Renderer

Converts the internal path representation to SVG markup.

```typescript
function renderToSVG(elements: Element[], crossings: Crossing[], config: RenderConfig): string
```

**Key SVG features used:**
- `<path d="...">` — bezier curves via M, C, S commands
- `<clipPath>` — for interlace under-crossings
- `<g>` — grouping elements
- `stroke-width` with variable width via multiple overlapping paths or SVG `<path>` with varying offset
- `viewBox` — scalable output

## 4. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Render a single bezier ribbon with tapering width.

- [ ] Set up TypeScript project with build tooling
- [ ] Implement `Point`, `CubicBezier`, `CurvePath` types
- [ ] Implement `evaluateAt`, `tangentAt`, `splitAt`
- [ ] Implement `offsetCurve` for creating ribbon outlines from a center line
- [ ] Implement basic SVG renderer (path → SVG string)
- [ ] Create a CLI that outputs an SVG file
- [ ] **Milestone:** Generate a single flowing ribbon SVG with tapering width

### Phase 2: Interlacing (Week 3-4)

**Goal:** Two paths that correctly weave over and under each other.

- [ ] Implement `findIntersections` (bezier-bezier intersection)
- [ ] Implement over/under assignment with alternation
- [ ] Implement gap rendering at under-crossings
- [ ] Implement clipping-based rendering as alternative
- [ ] **Milestone:** Two ribbons that visually interlace in SVG output

### Phase 3: Element Vocabulary (Week 5-6)

**Goal:** Generate recognizable Urnes-style shapes.

- [ ] Implement serpent/beast spine generator (flowing S-curves)
- [ ] Add width profile for tapering bodies
- [ ] Implement head/eye rendering (almond shape, profile)
- [ ] Implement vine/tendril generator with spiral ends
- [ ] Implement thin limb branching for great beasts
- [ ] **Milestone:** Generate a single great beast with vines that looks like Urnes style

### Phase 4: Composition (Week 7-8)

**Goal:** Full pattern generation with multiple elements.

- [ ] Implement panel composition layout
- [ ] Implement negative space analysis
- [ ] Implement element placement and gap filling
- [ ] Add seeded random number generator for reproducibility
- [ ] Implement border/frieze tileable composition
- [ ] **Milestone:** `generate({ seed: 42 })` produces a complete Urnes panel

### Phase 5: Polish & Export (Week 9-10)

**Goal:** Production-ready output for all target formats.

- [ ] Add circular composition
- [ ] Fine-tune density and spacing algorithms
- [ ] Add CSS embed export (`background-image` ready)
- [ ] Add PNG rasterization (via Resvg or Sharp)
- [ ] Add 3D export — SVG → extruded STL (via OpenJSCAD or custom)
- [ ] Build simple web UI for interactive generation
- [ ] **Milestone:** Complete generator with web UI and multiple export formats

## 5. The Hardest Problems (and Approaches)

### 5.1 Bezier-Bezier Intersection

Finding where two cubic bezier curves cross is non-trivial. Approaches:
- **Bezier.js library** — has this built in, recommended
- **Subdivision method** — recursively split curves and check bounding box overlap
- **Algebraic** — solve the system of polynomial equations (complex but exact)

### 5.2 Even Negative Space

The aesthetic quality of Urnes patterns depends heavily on even spacing. This is essentially a constraint satisfaction problem:
- Use iterative relaxation: nudge control points to equalize gaps
- Or use a force-directed approach: treat elements as having repulsion forces

### 5.3 Authentic "Feel"

The difference between "generic interlace" and "Urnes style" is subtle:
- Study real examples extensively (Urnes portal, Runestone U 344, Pitney Brooch)
- The curves have specific rhythm — long flowing sections punctuated by tight loops
- Elements have hierarchy — not everything is the same thickness
- Train your eye by tracing real examples and noting the curve characteristics

### 5.4 Variable-Width Strokes

SVG doesn't natively support variable-width strokes. Solutions:
- **Outline approach** (recommended): Generate two offset paths (left and right edges) and fill between them
- **Multiple overlapping strokes:** Draw the same path with decreasing stroke-width
- **SVG `<feTurbulence>`:** Can add organic variation but is hard to control

## 6. Reference Material

### Key Visual References
- **Urnes Stave Church portal** — the defining example ([Wikipedia](https://en.wikipedia.org/wiki/Urnes_Stave_Church))
- **Runestone U 344** — classic Urnes interlace on stone
- **Pitney Brooch** — Urnes style in metalwork
- Google Image search: "urnes style viking art" / "urnesstil"

### Technical References
- [A Primer on Bezier Curves](https://pomax.github.io/bezierinfo/) — essential reading for the math
- [Bezier.js documentation](https://pomax.github.io/bezierjs/) — the library to use
- [SVG Path specification](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths) — SVG path commands
- [Celtic Knot Theory](https://www.entrelacs.net/) — mathematical analysis of interlace patterns (applicable to Urnes)

### Books
- *Viking Art* by David M. Wilson and Ole Klindt-Jensen — the academic standard
- *Norse Art: Origins and Evolution* — covers all Viking art styles including Urnes

## 7. Pattern DNA Format

For AI-assisted generation or pattern sharing, use this JSON format:

```json
{
  "version": "1.0",
  "seed": 42,
  "meta": {
    "name": "Serpent Panel",
    "style": "urnes",
    "author": "generator"
  },
  "canvas": {
    "width": 400,
    "height": 600,
    "composition": "panel"
  },
  "elements": [
    {
      "type": "great-beast",
      "spine": [
        { "type": "cubic", "points": [[50,100], [150,50], [250,150], [350,100]] },
        { "type": "cubic", "points": [[350,100], [300,200], [100,250], [50,300]] }
      ],
      "widthProfile": [8, 12, 14, 12, 10, 8, 6],
      "head": { "position": "start", "style": "almond-eye" },
      "limbs": [
        { "at": 0.3, "side": "left", "length": 80 },
        { "at": 0.7, "side": "right", "length": 60 }
      ]
    },
    {
      "type": "serpent",
      "spine": [
        { "type": "cubic", "points": [[200,50], [100,150], [300,250], [200,350]] }
      ],
      "widthProfile": [4, 6, 8, 6, 4],
      "head": { "position": "start", "style": "simple" }
    },
    {
      "type": "vine",
      "path": [
        { "type": "cubic", "points": [[30,200], [80,180], [120,220], [160,200]] }
      ],
      "thickness": 3,
      "taperRate": 0.8,
      "spiralEnd": true
    }
  ],
  "interlace": {
    "method": "alternating",
    "gapSize": 4
  },
  "style": {
    "strokeColor": "#1a1a1a",
    "fillColor": "none",
    "strokeWidth": 2,
    "tapering": true
  }
}
```

This format can be:
- Hand-edited to tweak patterns
- Generated by the algorithm
- Fed to Claude or other AI to produce SVG directly
- Stored and shared as pattern "recipes"

## 8. Quick Win: Manual SVG First

Before building the full generator, try creating one Urnes pattern by hand in SVG. This teaches you:
- How bezier control points shape curves
- How to simulate interlacing with gaps/clips
- What SVG output should look like

Use a tool like [SVG Path Editor](https://yqnn.github.io/svg-path-editor/) to draw curves interactively and get the `d` attribute values.

Once you have one hand-crafted SVG that looks right, you have your target output — then build the generator to produce similar results programmatically.
