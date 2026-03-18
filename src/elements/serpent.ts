import type { UrnesElement, CurvePath, Point } from '../core/types.ts'
import type { Rng } from '../core/random.ts'
import { pathFromPoints, evaluateAt, tangentAt } from '../core/bezier.ts'

/**
 * Generate a smooth S-curve path through waypoints that alternate
 * between the left and right sides of the bounds.
 */
function generateSinuousPath(
  rng: Rng,
  bounds: { width: number; height: number },
  segmentCount: number,
  margin: number
): Point[] {
  const points: Point[] = []
  const w = bounds.width
  const h = bounds.height
  const mx = w * margin
  const my = h * margin

  // Start point: roughly top-center area
  const startX = mx + rng.range(0, w - 2 * mx)
  const startY = my + rng.range(0, (h - 2 * my) * 0.15)
  points.push({ x: startX, y: startY })

  // Alternate left/right offsets for sinuous flow
  for (let i = 1; i < segmentCount; i++) {
    const t = i / (segmentCount - 1)
    const baseY = my + t * (h - 2 * my)

    // Alternate sides: even index → left, odd index → right
    const side = i % 2 === 1 ? 1 : -1
    const centerX = w / 2
    const spread = (w / 2 - mx) * rng.range(0.5, 0.95)
    const x = centerX + side * spread * rng.range(0.7, 1.0)
    const y = baseY + rng.range(-h * 0.05, h * 0.05)

    points.push({
      x: Math.max(mx, Math.min(w - mx, x)),
      y: Math.max(my, Math.min(h - my, y)),
    })
  }

  return points
}

/**
 * Generate a limb (thin vine-like child element) branching from a point on the spine.
 */
function generateLimb(
  rng: Rng,
  bounds: { width: number; height: number },
  attachPoint: Point,
  attachTangent: Point,
  limbIndex: number
): UrnesElement {
  const w = bounds.width
  const h = bounds.height

  // Limb branches perpendicular-ish to the spine
  const perpX = -attachTangent.y
  const perpY = attachTangent.x
  const len = Math.sqrt(perpX * perpX + perpY * perpY)
  const pnx = len > 1e-10 ? perpX / len : 1
  const pny = len > 1e-10 ? perpY / len : 0

  // Choose which side to branch to
  const side = rng.chance(0.5) ? 1 : -1
  const limbLen = rng.range(w * 0.15, w * 0.28)

  const waypoints: Point[] = [attachPoint]

  // 2-3 waypoints that curve away from the body
  const count = rng.int(2, 3)
  for (let i = 1; i <= count; i++) {
    const t = i / count
    const baseX = attachPoint.x + pnx * side * limbLen * t
    const baseY = attachPoint.y + pny * side * limbLen * t
    waypoints.push({
      x: Math.max(0, Math.min(w, baseX + rng.range(-w * 0.05, w * 0.05))),
      y: Math.max(0, Math.min(h, baseY + rng.range(-h * 0.05, h * 0.05))),
    })
  }

  const limbWidthProfile = [3, 2, 1]

  return {
    id: `limb-${limbIndex}`,
    type: 'vine',
    spine: pathFromPoints(waypoints, false),
    widthProfile: limbWidthProfile,
  }
}

/**
 * Generate the dominant great beast: large, flowing S-curve body.
 */
export function generateGreatBeast(
  rng: Rng,
  bounds: { width: number; height: number },
  config?: { segments?: number }
): UrnesElement {
  const margin = 0.15
  const segmentCount = config?.segments ?? rng.int(5, 8)

  const waypoints = generateSinuousPath(rng, bounds, segmentCount, margin)
  const spine = pathFromPoints(waypoints, false)

  // Width profile: thick in middle, tapering at head and tail
  const profilePoints = segmentCount + 2
  const widthProfile: number[] = []
  for (let i = 0; i < profilePoints; i++) {
    const t = i / (profilePoints - 1)
    // Bell curve: peak at center, taper at ends
    const center = 0.45 + rng.range(-0.05, 0.05)
    const distance = Math.abs(t - center)
    if (t < 0.12) {
      // Head taper
      const headT = t / 0.12
      widthProfile.push(4 + headT * 2 + rng.range(0, 2))
    } else if (t > 0.88) {
      // Tail taper
      const tailT = (1 - t) / 0.12
      widthProfile.push(1 + tailT * 3 + rng.range(0, 1))
    } else {
      // Body
      const bodyWidth = 10 + rng.range(0, 4) - distance * 8
      widthProfile.push(Math.max(6, bodyWidth))
    }
  }

  // Generate 1-2 limbs
  const children: UrnesElement[] = []
  const limbCount = rng.int(1, 2)
  for (let i = 0; i < limbCount; i++) {
    // Attach limb at roughly 1/3 or 2/3 along the spine
    const attachT = 0.25 + i * 0.35 + rng.range(-0.05, 0.05)
    const nSegs = spine.segments.length
    const globalT = attachT * nSegs
    const segIdx = Math.min(Math.floor(globalT), nSegs - 1)
    const segT = Math.min(globalT - segIdx, 1)
    const seg = spine.segments[segIdx]!

    const attachPoint = evaluateAt(seg, segT)
    const attachTangent = tangentAt(seg, segT)

    children.push(generateLimb(rng, bounds, attachPoint, attachTangent, i))
  }

  return {
    id: 'great-beast',
    type: 'great-beast',
    spine,
    widthProfile,
    headPosition: 'start',
    children,
  }
}

/**
 * Generate a smaller secondary serpent.
 */
export function generateSerpent(
  rng: Rng,
  bounds: { width: number; height: number },
  index: number
): UrnesElement {
  const margin = 0.12
  const segmentCount = rng.int(3, 5)

  const w = bounds.width
  const h = bounds.height
  const mx = w * margin
  const my = h * margin

  // Serpents are smaller and placed randomly in the space
  const waypoints: Point[] = []

  // Start from a random edge-ish position
  const startX = mx + rng.range(0, w - 2 * mx)
  const startY = my + rng.range(0, h - 2 * my)
  waypoints.push({ x: startX, y: startY })

  for (let i = 1; i < segmentCount; i++) {
    const t = i / (segmentCount - 1)
    const prev = waypoints[waypoints.length - 1]!

    // Gentle curves, less dramatic than the great beast
    const angle = rng.range(-Math.PI * 0.6, Math.PI * 0.6)
    const dist = w * rng.range(0.12, 0.22)
    const x = prev.x + Math.cos(angle) * dist
    const y = prev.y + Math.sin(angle) * dist

    waypoints.push({
      x: Math.max(mx, Math.min(w - mx, x)),
      y: Math.max(my, Math.min(h - my, y)),
    })
  }

  const spine = pathFromPoints(waypoints, false)

  // Width profile: thinner body, 4-8 max
  const profilePoints = segmentCount + 2
  const widthProfile: number[] = []
  for (let i = 0; i < profilePoints; i++) {
    const t = i / (profilePoints - 1)
    if (t < 0.15) {
      // Head taper
      const headT = t / 0.15
      widthProfile.push(2 + headT * 2 + rng.range(0, 1))
    } else if (t > 0.85) {
      // Tail taper
      const tailT = (1 - t) / 0.15
      widthProfile.push(1 + tailT * 2 + rng.range(0, 1))
    } else {
      widthProfile.push(4 + rng.range(0, 4))
    }
  }

  return {
    id: `serpent-${index}`,
    type: 'serpent',
    spine,
    widthProfile,
    headPosition: 'start',
  }
}
