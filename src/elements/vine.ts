import type { UrnesElement, Point } from '../core/types.ts'
import type { Rng } from '../core/random.ts'
import { pathFromPoints } from '../core/bezier.ts'

/**
 * Generate a single vine/tendril element.
 * Urnes-style vines are thin, flowing tendrils that weave through
 * the composition, ending in tightly scrolled spiral terminals.
 */
export function generateVine(
  rng: Rng,
  bounds: { width: number; height: number },
  index: number,
  config?: { startPoint?: Point; length?: number }
): UrnesElement {
  const w = bounds.width
  const h = bounds.height

  // Starting point: from an edge
  let startPoint: Point
  if (config?.startPoint) {
    startPoint = config.startPoint
  } else {
    const edge = rng.int(0, 3)
    switch (edge) {
      case 0:
        startPoint = { x: rng.range(w * 0.1, w * 0.9), y: 0 }
        break
      case 1:
        startPoint = { x: w, y: rng.range(h * 0.1, h * 0.9) }
        break
      case 2:
        startPoint = { x: rng.range(w * 0.1, w * 0.9), y: h }
        break
      default:
        startPoint = { x: 0, y: rng.range(h * 0.1, h * 0.9) }
        break
    }
  }

  const waypoints: Point[] = [startPoint]

  // Direction toward center
  const centerX = w / 2
  const centerY = h / 2
  const dx = centerX - startPoint.x
  const dy = centerY - startPoint.y
  const dirLen = Math.sqrt(dx * dx + dy * dy)
  const dirX = dirLen > 1e-10 ? dx / dirLen : 0
  const dirY = dirLen > 1e-10 ? dy / dirLen : 1
  const perpX = -dirY
  const perpY = dirX

  const totalLen = config?.length ?? dirLen * rng.range(0.5, 0.8)
  const segCount = rng.int(5, 8)
  const segLen = totalLen / segCount

  // Generate smooth flowing sinusoidal path toward center
  for (let i = 1; i <= segCount; i++) {
    const t = i / segCount
    const side = Math.sin(t * Math.PI * 2 + rng.range(0, Math.PI)) * 0.4
    const fwd = segLen * i

    waypoints.push({
      x: Math.max(w * 0.02, Math.min(w * 0.98,
        startPoint.x + dirX * fwd + perpX * side * segLen * 2)),
      y: Math.max(h * 0.02, Math.min(h * 0.98,
        startPoint.y + dirY * fwd + perpY * side * segLen * 2)),
    })
  }

  // Add spiral terminal at the end
  const last = waypoints[waypoints.length - 1]!
  const prev = waypoints[waypoints.length - 2]!
  const endTangent = { x: last.x - prev.x, y: last.y - prev.y }
  const tLen = Math.sqrt(endTangent.x * endTangent.x + endTangent.y * endTangent.y)
  const etx = tLen > 1e-10 ? endTangent.x / tLen : 0
  const ety = tLen > 1e-10 ? endTangent.y / tLen : 1
  const startAngle = Math.atan2(ety, etx)

  const spiralRadius = segLen * 0.25
  const spiralSteps = 5
  for (let i = 1; i <= spiralSteps; i++) {
    const st = i / spiralSteps
    const radius = spiralRadius * (1 - st * 0.8)
    const angle = startAngle + st * Math.PI * 3

    waypoints.push({
      x: Math.max(0, Math.min(w, last.x + Math.cos(angle) * radius)),
      y: Math.max(0, Math.min(h, last.y + Math.sin(angle) * radius)),
    })
  }

  // Width profile: thin, tapering to 1
  const profileLen = waypoints.length + 1
  const widthProfile: number[] = []
  const baseWidth = rng.range(2, 3.5)
  for (let i = 0; i < profileLen; i++) {
    const t = i / (profileLen - 1)
    widthProfile.push(Math.max(0.8, baseWidth * (1 - t * 0.7)))
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
