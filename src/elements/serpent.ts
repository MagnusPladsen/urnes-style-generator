import type { UrnesElement, CubicBezier, CurvePath, Point } from '../core/types.ts'
import type { Rng } from '../core/random.ts'
import { evaluateAt, tangentAt } from '../core/bezier.ts'

/**
 * Build a smooth S-curve looping spine using direct bezier segments.
 * Each half-loop is one bezier: sweeping from center to a peak and back.
 * Control points are placed at the peak to create round, smooth arcs.
 */
function buildLoopingSpine(
  rng: Rng,
  bounds: { width: number; height: number },
  loopCount: number,
  amplitude: number,
  xCenter: number
): CurvePath {
  const w = bounds.width
  const h = bounds.height
  const mx = w * 0.08
  const my = h * 0.05
  const usableH = h - 2 * my

  const segments: CubicBezier[] = []
  const halfLoops = loopCount * 2
  const yPerHalf = usableH / halfLoops
  const swingX = w * amplitude * 0.4

  let currentX = xCenter
  let currentY = my

  for (let i = 0; i < halfLoops; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const nextY = currentY + yPerHalf

    // Peak X — how far the loop swings out
    const peakX = xCenter + side * swingX * rng.range(0.85, 1.0)
    const clampedPeakX = Math.max(mx, Math.min(w - mx, peakX))

    // Next crossing point (slightly randomized around center)
    const nextX = xCenter + rng.range(-w * 0.015, w * 0.015)
    const clampedNextX = Math.max(mx, Math.min(w - mx, nextX))

    // Control points at the peak Y-positions to create round arcs
    segments.push({
      start: { x: currentX, y: currentY },
      cp1: { x: clampedPeakX, y: currentY + yPerHalf * 0.2 },
      cp2: { x: clampedPeakX, y: nextY - yPerHalf * 0.2 },
      end: { x: clampedNextX, y: nextY },
    })

    currentX = clampedNextX
    currentY = nextY
  }

  return { segments, closed: false }
}

/**
 * Build a spiral terminal as bezier segments.
 * Tight inward-curling scroll — characteristic Urnes terminal.
 */
function buildSpiralTerminal(
  startPoint: Point,
  tangent: Point,
  bounds: { width: number; height: number },
  turns: number,
  maxRadius: number
): CubicBezier[] {
  const segments: CubicBezier[] = []
  const len = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y)
  const tx = len > 1e-10 ? tangent.x / len : 0
  const ty = len > 1e-10 ? tangent.y / len : 1

  // Use quarter-circle bezier approximation for clean arcs
  const stepsPerTurn = 4
  const totalSteps = Math.max(3, Math.ceil(turns * stepsPerTurn))
  const startAngle = Math.atan2(ty, tx)
  const kappa = 0.5522847498 // bezier approximation of quarter circle

  let prev = startPoint

  for (let i = 1; i <= totalSteps; i++) {
    const t0 = (i - 1) / totalSteps
    const t1 = i / totalSteps
    const r0 = maxRadius * (1 - t0 * 0.9)
    const r1 = maxRadius * (1 - t1 * 0.9)
    const a0 = startAngle + t0 * turns * Math.PI * 2
    const a1 = startAngle + t1 * turns * Math.PI * 2

    const end = {
      x: Math.max(0, Math.min(bounds.width, startPoint.x + Math.cos(a1) * r1)),
      y: Math.max(0, Math.min(bounds.height, startPoint.y + Math.sin(a1) * r1)),
    }

    // Tangent-aligned control points for smooth arc
    const arcLen = (a1 - a0) * (r0 + r1) / 2
    const cpLen = arcLen * kappa / (Math.PI / 2) * 0.8

    segments.push({
      start: prev,
      cp1: {
        x: Math.max(0, Math.min(bounds.width, prev.x + Math.cos(a0 + Math.PI / 2) * cpLen)),
        y: Math.max(0, Math.min(bounds.height, prev.y + Math.sin(a0 + Math.PI / 2) * cpLen)),
      },
      cp2: {
        x: Math.max(0, Math.min(bounds.width, end.x - Math.cos(a1 + Math.PI / 2) * cpLen * 0.6)),
        y: Math.max(0, Math.min(bounds.height, end.y - Math.sin(a1 + Math.PI / 2) * cpLen * 0.6)),
      },
      end,
    })

    prev = end
  }

  return segments
}

/**
 * Generate a single hip spiral marker (small circle at a joint).
 * Returns an UrnesElement that renders as a small spiral.
 */
function generateHipSpiral(
  rng: Rng,
  bounds: { width: number; height: number },
  point: Point,
  tangent: Point,
  side: number,
  index: number
): UrnesElement {
  const len = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y)
  const tx = len > 1e-10 ? tangent.x / len : 0
  const ty = len > 1e-10 ? tangent.y / len : 1
  const nx = -ty * side
  const ny = tx * side

  // Hip spiral sits perpendicular to the body
  const offset = 12
  const spiralCenter = {
    x: point.x + nx * offset,
    y: point.y + ny * offset,
  }

  const spiralTangent = { x: nx, y: ny }
  const spiralSegs = buildSpiralTerminal(spiralCenter, spiralTangent, bounds, 1.0, 6)

  if (spiralSegs.length === 0) {
    return {
      id: `hip-${index}`,
      type: 'vine',
      spine: { segments: [], closed: false },
      widthProfile: [1],
    }
  }

  return {
    id: `hip-${index}`,
    type: 'vine',
    spine: { segments: spiralSegs, closed: false },
    widthProfile: Array(spiralSegs.length + 2).fill(1.5),
  }
}

/**
 * Generate the great beast: flowing figure-8 body with
 * spiral terminal, hip spirals at "leg joints", and head with lappets.
 *
 * Authentic Urnes rules:
 * - Wide ribbon body (~10-14px)
 * - Smooth even outlines with gradual taper
 * - 2-3 figure-8 loops filling the panel
 * - Hip spirals at 4 "joint" positions
 * - Head at start with almond eye
 */
export function generateGreatBeast(
  rng: Rng,
  bounds: { width: number; height: number },
  config?: { segments?: number }
): UrnesElement {
  const loopCount = config?.segments ?? rng.int(2, 3)
  const centerX = bounds.width * (0.5 + rng.range(-0.04, 0.04))

  const spine = buildLoopingSpine(
    rng, bounds, loopCount,
    rng.range(0.7, 0.95),
    centerX
  )

  // Add spiral terminal at tail
  const lastSeg = spine.segments[spine.segments.length - 1]!
  const tailTangent = tangentAt(lastSeg, 1)
  spine.segments.push(...buildSpiralTerminal(lastSeg.end, tailTangent, bounds, 1.5, 16))

  // Width profile
  const totalSegs = spine.segments.length
  const profileLen = totalSegs + 3
  const widthProfile: number[] = []
  const bodyWidth = 11 + rng.range(0, 3)

  for (let i = 0; i < profileLen; i++) {
    const t = i / (profileLen - 1)
    if (t < 0.06) {
      // Head: taper from neck width
      widthProfile.push(5 + (t / 0.06) * (bodyWidth - 5))
    } else if (t > 0.75) {
      // Tail: gradual taper into spiral
      const tailT = (t - 0.75) / 0.25
      widthProfile.push(Math.max(1.5, bodyWidth * (1 - tailT * 0.88)))
    } else {
      // Body: even width (Urnes characteristic)
      widthProfile.push(bodyWidth)
    }
  }

  // Generate hip spirals at 4 "joint" positions along the body
  const children: UrnesElement[] = []
  const jointPositions = [0.15, 0.35, 0.55, 0.7]
  const nSegs = spine.segments.length

  for (let i = 0; i < 4 && nSegs > 0; i++) {
    const t = jointPositions[i]!
    const globalT = t * nSegs
    const segIdx = Math.min(Math.floor(globalT), nSegs - 1)
    const segT = Math.min(globalT - segIdx, 1)
    const seg = spine.segments[segIdx]!
    const pt = evaluateAt(seg, segT)
    const tan = tangentAt(seg, segT)
    const side = i % 2 === 0 ? 1 : -1

    children.push(generateHipSpiral(rng, bounds, pt, tan, side, i))
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
 * Generate a serpent that weaves through the composition.
 *
 * Authentic Urnes rules:
 * - Narrow ribbon body (~4-6px) — clearly thinner than beast
 * - Same smooth flowing figure-8 structure
 * - Offset from beast to create crossing/interlacing
 * - Spiral terminal at tail
 * - Head shown biting the beast
 */
export function generateSerpent(
  rng: Rng,
  bounds: { width: number; height: number },
  index: number
): UrnesElement {
  const loopCount = rng.int(2, 3)
  // Offset to create interlacing with the beast
  const offsetBias = index % 2 === 0 ? 0.15 : -0.15
  const centerX = bounds.width * (0.5 + offsetBias + rng.range(-0.03, 0.03))

  const spine = buildLoopingSpine(
    rng, bounds, loopCount,
    rng.range(0.55, 0.85),
    centerX
  )

  // Spiral terminal
  const lastSeg = spine.segments[spine.segments.length - 1]!
  const tailTangent = tangentAt(lastSeg, 1)
  spine.segments.push(...buildSpiralTerminal(lastSeg.end, tailTangent, bounds, 1.0, 10))

  // Thinner ribbon — Urnes uses exactly two widths
  const totalSegs = spine.segments.length
  const profileLen = totalSegs + 3
  const widthProfile: number[] = []
  const bodyWidth = 4 + rng.range(0, 2)

  for (let i = 0; i < profileLen; i++) {
    const t = i / (profileLen - 1)
    if (t < 0.08) {
      widthProfile.push(2 + (t / 0.08) * (bodyWidth - 2))
    } else if (t > 0.82) {
      const tailT = (t - 0.82) / 0.18
      widthProfile.push(Math.max(1, bodyWidth * (1 - tailT * 0.8)))
    } else {
      widthProfile.push(bodyWidth)
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
