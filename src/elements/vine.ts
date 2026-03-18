import type { UrnesElement, Point } from '../core/types.ts'
import type { Rng } from '../core/random.ts'
import { pathFromPoints } from '../core/bezier.ts'

/**
 * Generate a single vine/tendril element.
 * Thin, flowing tendril with oscillating path and optional spiral end.
 */
export function generateVine(
  rng: Rng,
  bounds: { width: number; height: number },
  index: number,
  config?: { startPoint?: Point; length?: number }
): UrnesElement {
  const w = bounds.width
  const h = bounds.height

  const waypointCount = rng.int(4, 7)

  // Starting point: from edge or corner, or provided
  let startPoint: Point
  if (config?.startPoint) {
    startPoint = config.startPoint
  } else {
    // Pick an edge to start from
    const edge = rng.int(0, 3)
    switch (edge) {
      case 0: // top edge
        startPoint = { x: rng.range(w * 0.1, w * 0.9), y: rng.range(0, h * 0.15) }
        break
      case 1: // right edge
        startPoint = { x: rng.range(w * 0.85, w), y: rng.range(h * 0.1, h * 0.9) }
        break
      case 2: // bottom edge
        startPoint = { x: rng.range(w * 0.1, w * 0.9), y: rng.range(h * 0.85, h) }
        break
      default: // left edge
        startPoint = { x: rng.range(0, w * 0.15), y: rng.range(h * 0.1, h * 0.9) }
        break
    }
  }

  const waypoints: Point[] = [startPoint]

  // Direction toward center with oscillation
  const centerX = w / 2
  const centerY = h / 2
  const dx = centerX - startPoint.x
  const dy = centerY - startPoint.y
  const dirLen = Math.sqrt(dx * dx + dy * dy)
  const dirX = dirLen > 1e-10 ? dx / dirLen : 0
  const dirY = dirLen > 1e-10 ? dy / dirLen : 1

  // Perpendicular for oscillation
  const perpX = -dirY
  const perpY = dirX

  const totalLen = config?.length ?? Math.sqrt(dx * dx + dy * dy) * rng.range(0.5, 0.8)
  const segLen = totalLen / (waypointCount - 1)

  // Generate spiral end: last 2-3 points curve into tight spiral
  const spiralStart = waypointCount - rng.int(2, 3)

  for (let i = 1; i < waypointCount; i++) {
    const t = i / (waypointCount - 1)
    const prev = waypoints[i - 1]!

    if (i >= spiralStart) {
      // Spiral: curve inward in decreasing radius
      const spiralT = (i - spiralStart) / (waypointCount - spiralStart)
      const spiralRadius = segLen * (1 - spiralT * 0.7)
      const angle = spiralT * Math.PI * 1.5 + rng.range(0, 0.3)
      const side = rng.chance(0.5) ? 1 : -1

      waypoints.push({
        x: Math.max(0, Math.min(w, prev.x + Math.cos(angle) * spiralRadius * side * 0.8)),
        y: Math.max(0, Math.min(h, prev.y + Math.sin(angle) * spiralRadius * 0.8)),
      })
    } else {
      // Sinusoidal oscillation: side alternates based on index
      const side = i % 2 === 1 ? 1 : -1
      const oscAmp = segLen * rng.range(0.3, 0.7)

      waypoints.push({
        x: Math.max(0, Math.min(w, prev.x + dirX * segLen + perpX * side * oscAmp + rng.range(-segLen * 0.15, segLen * 0.15))),
        y: Math.max(0, Math.min(h, prev.y + dirY * segLen + perpY * side * oscAmp + rng.range(-segLen * 0.15, segLen * 0.15))),
      })
    }
  }

  // Width profile: thin throughout, tapering to 1 at tip
  const widthProfile: number[] = []
  for (let i = 0; i < waypointCount + 1; i++) {
    const t = i / waypointCount
    // Thin: starts at 2-4, tapers to 1
    const base = rng.range(2, 4)
    widthProfile.push(Math.max(1, base * (1 - t * 0.7)))
  }

  return {
    id: `vine-${index}`,
    type: 'vine',
    spine: pathFromPoints(waypoints, false),
    widthProfile,
  }
}

/**
 * Generate multiple vines spread across the bounds.
 * Vines start from edges or corners and flow inward.
 */
export function generateVines(
  rng: Rng,
  bounds: { width: number; height: number },
  count: number
): UrnesElement[] {
  const vines: UrnesElement[] = []

  for (let i = 0; i < count; i++) {
    vines.push(generateVine(rng, bounds, i))
  }

  return vines
}
