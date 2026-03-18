import type { UrnesElement, GeneratorConfig, Point } from '../core/types.ts'
import type { Rng } from '../core/random.ts'
import { pathFromPoints } from '../core/bezier.ts'
import { generateVines } from '../elements/vine.ts'

/**
 * Generate a horizontally-flowing serpent that snakes across the border.
 * Spine endpoints are near the vertical center at x=0 and x=width for tileability.
 */
function generateBorderSerpent(
  rng: Rng,
  bounds: { width: number; height: number }
): UrnesElement {
  const w = bounds.width
  const h = bounds.height
  const centerY = h / 2

  const waypoints: Point[] = []

  // Start at left edge, vertically centered
  waypoints.push({
    x: 0,
    y: centerY + rng.range(-h * 0.05, h * 0.05),
  })

  // Sinuous path across the width
  const segCount = rng.int(4, 7)
  for (let i = 1; i < segCount; i++) {
    const t = i / segCount
    const x = t * w
    // Alternate up/down from center
    const side = i % 2 === 1 ? 1 : -1
    const amplitude = h * rng.range(0.2, 0.38)
    const y = centerY + side * amplitude + rng.range(-h * 0.05, h * 0.05)

    waypoints.push({
      x,
      y: Math.max(h * 0.05, Math.min(h * 0.95, y)),
    })
  }

  // End at right edge, vertically centered (for tileability)
  waypoints.push({
    x: w,
    y: centerY + rng.range(-h * 0.05, h * 0.05),
  })

  const spine = pathFromPoints(waypoints, false)

  // Width profile: tapers at head and tail
  const profileLen = segCount + 2
  const widthProfile: number[] = []
  for (let i = 0; i < profileLen; i++) {
    const t = i / (profileLen - 1)
    if (t < 0.15) {
      widthProfile.push(2 + (t / 0.15) * 3)
    } else if (t > 0.85) {
      widthProfile.push(2 + ((1 - t) / 0.15) * 3)
    } else {
      widthProfile.push(5 + rng.range(0, 3))
    }
  }

  return {
    id: 'border-serpent',
    type: 'serpent',
    spine,
    widthProfile,
    headPosition: 'start',
  }
}

/**
 * Compose a border/frieze layout: horizontal tileable strip.
 * Main serpent flows horizontally; vines fill gaps.
 * Elements connect at left/right edges for tileability.
 */
export function composeBorder(rng: Rng, config: GeneratorConfig): UrnesElement[] {
  // For border, we work with a horizontal strip (width >> height)
  const borderBounds = { width: config.width, height: config.height }

  const elements: UrnesElement[] = []

  // Add vines first (background)
  if (config.elements.vines) {
    const vineCount = Math.max(1, Math.ceil(config.complexity / 3))
    const vines = generateVines(rng, borderBounds, vineCount)
    elements.push(...vines)
  }

  // Add main border serpent
  const serpent = generateBorderSerpent(rng, borderBounds)
  elements.push(serpent)

  return elements
}
