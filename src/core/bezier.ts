import type { Point, CubicBezier, CurvePath } from './types.ts'

/**
 * Evaluate cubic bezier at parameter t using De Casteljau's algorithm.
 */
export function evaluateAt(bez: CubicBezier, t: number): Point {
  const mt = 1 - t
  // Level 1
  const p10 = { x: mt * bez.start.x + t * bez.cp1.x, y: mt * bez.start.y + t * bez.cp1.y }
  const p11 = { x: mt * bez.cp1.x + t * bez.cp2.x, y: mt * bez.cp1.y + t * bez.cp2.y }
  const p12 = { x: mt * bez.cp2.x + t * bez.end.x, y: mt * bez.cp2.y + t * bez.end.y }
  // Level 2
  const p20 = { x: mt * p10.x + t * p11.x, y: mt * p10.y + t * p11.y }
  const p21 = { x: mt * p11.x + t * p12.x, y: mt * p11.y + t * p12.y }
  // Level 3
  return { x: mt * p20.x + t * p21.x, y: mt * p20.y + t * p21.y }
}

/**
 * Compute tangent vector at parameter t.
 * B'(t) = 3(1-t)²(cp1-start) + 6(1-t)t(cp2-cp1) + 3t²(end-cp2)
 */
export function tangentAt(bez: CubicBezier, t: number): Point {
  const mt = 1 - t
  const d0x = bez.cp1.x - bez.start.x
  const d0y = bez.cp1.y - bez.start.y
  const d1x = bez.cp2.x - bez.cp1.x
  const d1y = bez.cp2.y - bez.cp1.y
  const d2x = bez.end.x - bez.cp2.x
  const d2y = bez.end.y - bez.cp2.y

  const c0 = 3 * mt * mt
  const c1 = 6 * mt * t
  const c2 = 3 * t * t

  return {
    x: c0 * d0x + c1 * d1x + c2 * d2x,
    y: c0 * d0y + c1 * d1y + c2 * d2y,
  }
}

/**
 * Compute the unit normal (perpendicular to tangent) at parameter t.
 */
export function normalAt(bez: CubicBezier, t: number): Point {
  const tan = tangentAt(bez, t)
  const len = Math.sqrt(tan.x * tan.x + tan.y * tan.y)
  if (len < 1e-10) return { x: 0, y: 1 }
  // Rotate tangent 90 degrees: (-y, x)
  return { x: -tan.y / len, y: tan.x / len }
}

/**
 * Split a cubic bezier at parameter t using De Casteljau's algorithm.
 * Returns [left, right] halves.
 */
export function splitAt(bez: CubicBezier, t: number): [CubicBezier, CubicBezier] {
  const mt = 1 - t
  // Level 1
  const p10 = { x: mt * bez.start.x + t * bez.cp1.x, y: mt * bez.start.y + t * bez.cp1.y }
  const p11 = { x: mt * bez.cp1.x + t * bez.cp2.x, y: mt * bez.cp1.y + t * bez.cp2.y }
  const p12 = { x: mt * bez.cp2.x + t * bez.end.x, y: mt * bez.cp2.y + t * bez.end.y }
  // Level 2
  const p20 = { x: mt * p10.x + t * p11.x, y: mt * p10.y + t * p11.y }
  const p21 = { x: mt * p11.x + t * p12.x, y: mt * p11.y + t * p12.y }
  // Level 3 (split point)
  const p30 = { x: mt * p20.x + t * p21.x, y: mt * p20.y + t * p21.y }

  const left: CubicBezier = {
    start: bez.start,
    cp1: p10,
    cp2: p20,
    end: p30,
  }
  const right: CubicBezier = {
    start: p30,
    cp1: p21,
    cp2: p12,
    end: bez.end,
  }
  return [left, right]
}

/**
 * Estimate arc length of a bezier curve by summing chord lengths.
 */
export function lengthEstimate(bez: CubicBezier, segments: number = 16): number {
  let length = 0
  let prev = bez.start
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const p = evaluateAt(bez, t)
    const dx = p.x - prev.x
    const dy = p.y - prev.y
    length += Math.sqrt(dx * dx + dy * dy)
    prev = p
  }
  return length
}

/**
 * Sample evenly-spaced points along a CurvePath.
 */
export function samplePoints(path: CurvePath, count: number): Point[] {
  if (path.segments.length === 0) return []
  if (count === 1) return [evaluateAt(path.segments[0]!, 0)]

  const points: Point[] = []
  const segCount = path.segments.length

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const globalT = t * segCount
    const segIdx = Math.min(Math.floor(globalT), segCount - 1)
    const segT = Math.min(globalT - segIdx, 1)
    points.push(evaluateAt(path.segments[segIdx]!, segT))
  }

  return points
}

/**
 * Compute the axis-aligned bounding box of a cubic bezier.
 */
export function boundingBox(bez: CubicBezier): { min: Point; max: Point } {
  // Sample points to find approximate bounding box
  const samples = 20
  let minX = bez.start.x
  let minY = bez.start.y
  let maxX = bez.start.x
  let maxY = bez.start.y

  for (let i = 1; i <= samples; i++) {
    const p = evaluateAt(bez, i / samples)
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
}

/**
 * Create a smooth CurvePath through the given points using
 * Catmull-Rom to cubic bezier conversion.
 */
export function pathFromPoints(points: Point[], closed: boolean = false): CurvePath {
  if (points.length < 2) {
    return { segments: [], closed }
  }

  const segments: CubicBezier[] = []
  const n = points.length

  // For each consecutive pair, compute cubic bezier control points
  // using Catmull-Rom tangent computation
  const alpha = 1 / 3 // tension factor

  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0
      ? (closed ? points[n - 1]! : points[0]!)
      : points[i - 1]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = i + 2 >= n
      ? (closed ? points[(i + 2) % n]! : points[n - 1]!)
      : points[i + 2]!

    // Catmull-Rom tangents scaled for cubic bezier
    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) * alpha,
      y: p1.y + (p2.y - p0.y) * alpha,
    }
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) * alpha,
      y: p2.y - (p3.y - p1.y) * alpha,
    }

    segments.push({ start: p1, cp1, cp2, end: p2 })
  }

  // If closed, add a segment from last to first point
  if (closed && n >= 2) {
    const p0 = points[n - 2]!
    const p1 = points[n - 1]!
    const p2 = points[0]!
    const p3 = points[1]!

    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) * alpha,
      y: p1.y + (p2.y - p0.y) * alpha,
    }
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) * alpha,
      y: p2.y - (p3.y - p1.y) * alpha,
    }

    segments.push({ start: p1, cp1, cp2, end: p2 })
  }

  return { segments, closed }
}
