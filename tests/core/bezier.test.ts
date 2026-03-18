import { test, expect, describe } from 'bun:test'
import {
  evaluateAt,
  tangentAt,
  normalAt,
  splitAt,
  lengthEstimate,
  boundingBox,
  pathFromPoints,
  samplePoints,
} from '../../src/core/bezier.ts'
import type { CubicBezier, Point } from '../../src/core/types.ts'

const EPSILON = 1e-6

function approxEqual(a: number, b: number, eps = EPSILON): boolean {
  return Math.abs(a - b) < eps
}

function pointApproxEqual(a: Point, b: Point, eps = EPSILON): boolean {
  return approxEqual(a.x, b.x, eps) && approxEqual(a.y, b.y, eps)
}

// A straight-line bezier (collinear control points)
const straightLine: CubicBezier = {
  start: { x: 0, y: 0 },
  cp1: { x: 1, y: 0 },
  cp2: { x: 2, y: 0 },
  end: { x: 3, y: 0 },
}

// A simple curved bezier
const curveBez: CubicBezier = {
  start: { x: 0, y: 0 },
  cp1: { x: 1, y: 2 },
  cp2: { x: 3, y: 2 },
  end: { x: 4, y: 0 },
}

describe('evaluateAt', () => {
  test('t=0 returns start point', () => {
    const p = evaluateAt(curveBez, 0)
    expect(pointApproxEqual(p, curveBez.start)).toBe(true)
  })

  test('t=1 returns end point', () => {
    const p = evaluateAt(curveBez, 1)
    expect(pointApproxEqual(p, curveBez.end)).toBe(true)
  })

  test('t=0.5 on straight-line bezier returns midpoint', () => {
    const p = evaluateAt(straightLine, 0.5)
    expect(approxEqual(p.x, 1.5)).toBe(true)
    expect(approxEqual(p.y, 0)).toBe(true)
  })

  test('t=0.5 on curved bezier is within curve bounds', () => {
    const p = evaluateAt(curveBez, 0.5)
    expect(p.x).toBeGreaterThan(0)
    expect(p.x).toBeLessThan(4)
    expect(p.y).toBeGreaterThan(0)
  })
})

describe('tangentAt', () => {
  test('tangentAt returns non-zero vector on straight line', () => {
    const tan = tangentAt(straightLine, 0.5)
    const len = Math.sqrt(tan.x * tan.x + tan.y * tan.y)
    expect(len).toBeGreaterThan(0)
  })

  test('tangentAt returns non-zero vector on curve', () => {
    const tan = tangentAt(curveBez, 0.5)
    const len = Math.sqrt(tan.x * tan.x + tan.y * tan.y)
    expect(len).toBeGreaterThan(0)
  })

  test('tangentAt on straight line points in x direction', () => {
    const tan = tangentAt(straightLine, 0.5)
    // Should be horizontal
    expect(Math.abs(tan.y)).toBeLessThan(EPSILON)
    expect(tan.x).toBeGreaterThan(0)
  })
})

describe('normalAt', () => {
  test('normalAt returns unit vector', () => {
    const normal = normalAt(curveBez, 0.5)
    const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y)
    expect(approxEqual(len, 1)).toBe(true)
  })

  test('normalAt is perpendicular to tangentAt', () => {
    const tan = tangentAt(curveBez, 0.5)
    const normal = normalAt(curveBez, 0.5)
    const dot = tan.x * normal.x + tan.y * normal.y
    expect(Math.abs(dot)).toBeLessThan(1e-4)
  })

  test('normalAt on horizontal line points vertically', () => {
    const normal = normalAt(straightLine, 0.5)
    expect(Math.abs(normal.x)).toBeLessThan(EPSILON)
    expect(Math.abs(Math.abs(normal.y) - 1)).toBeLessThan(EPSILON)
  })
})

describe('splitAt', () => {
  test('splitAt t=0.5 produces two halves that join at split point', () => {
    const [left, right] = splitAt(curveBez, 0.5)
    expect(pointApproxEqual(left.end, right.start)).toBe(true)
  })

  test('splitAt preserves start of original as start of left', () => {
    const [left] = splitAt(curveBez, 0.5)
    expect(pointApproxEqual(left.start, curveBez.start)).toBe(true)
  })

  test('splitAt preserves end of original as end of right', () => {
    const [, right] = splitAt(curveBez, 0.5)
    expect(pointApproxEqual(right.end, curveBez.end)).toBe(true)
  })

  test('split point matches evaluateAt at t', () => {
    const t = 0.5
    const [left] = splitAt(curveBez, t)
    const expected = evaluateAt(curveBez, t)
    expect(pointApproxEqual(left.end, expected)).toBe(true)
  })

  test('splitAt at t=0.3 produces correct split point', () => {
    const t = 0.3
    const [left, right] = splitAt(curveBez, t)
    const expected = evaluateAt(curveBez, t)
    expect(pointApproxEqual(left.end, expected)).toBe(true)
    expect(pointApproxEqual(right.start, expected)).toBe(true)
  })
})

describe('lengthEstimate', () => {
  test('lengthEstimate on straight line approximates actual distance', () => {
    const length = lengthEstimate(straightLine, 32)
    const actualLength = 3 // from (0,0) to (3,0)
    expect(Math.abs(length - actualLength)).toBeLessThan(0.01)
  })

  test('lengthEstimate returns positive value', () => {
    const length = lengthEstimate(curveBez)
    expect(length).toBeGreaterThan(0)
  })

  test('lengthEstimate with more segments is more accurate', () => {
    const len8 = lengthEstimate(curveBez, 8)
    const len64 = lengthEstimate(curveBez, 64)
    // Both should be reasonably close (within 5%)
    expect(Math.abs(len8 - len64) / len64).toBeLessThan(0.05)
  })
})

describe('boundingBox', () => {
  test('boundingBox contains start point', () => {
    const bb = boundingBox(curveBez)
    expect(bb.min.x).toBeLessThanOrEqual(curveBez.start.x + EPSILON)
    expect(bb.min.y).toBeLessThanOrEqual(curveBez.start.y + EPSILON)
    expect(bb.max.x).toBeGreaterThanOrEqual(curveBez.start.x - EPSILON)
    expect(bb.max.y).toBeGreaterThanOrEqual(curveBez.start.y - EPSILON)
  })

  test('boundingBox contains end point', () => {
    const bb = boundingBox(curveBez)
    expect(bb.min.x).toBeLessThanOrEqual(curveBez.end.x + EPSILON)
    expect(bb.min.y).toBeLessThanOrEqual(curveBez.end.y + EPSILON)
    expect(bb.max.x).toBeGreaterThanOrEqual(curveBez.end.x - EPSILON)
    expect(bb.max.y).toBeGreaterThanOrEqual(curveBez.end.y - EPSILON)
  })

  test('boundingBox min is less than or equal to max', () => {
    const bb = boundingBox(curveBez)
    expect(bb.min.x).toBeLessThanOrEqual(bb.max.x)
    expect(bb.min.y).toBeLessThanOrEqual(bb.max.y)
  })

  test('boundingBox on straight horizontal line has zero height', () => {
    const bb = boundingBox(straightLine)
    expect(Math.abs(bb.min.y - bb.max.y)).toBeLessThan(EPSILON)
  })
})

describe('pathFromPoints', () => {
  test('returns path with correct number of segments for open path', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
    ]
    const path = pathFromPoints(points)
    // n points → n-1 segments for open path
    expect(path.segments.length).toBe(points.length - 1)
    expect(path.closed).toBe(false)
  })

  test('returns path with correct number of segments for closed path', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]
    const path = pathFromPoints(points, true)
    // n points → n segments for closed path
    expect(path.segments.length).toBe(points.length)
    expect(path.closed).toBe(true)
  })

  test('segments connect end-to-end (start of next = end of prev)', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 3, y: 1 },
      { x: 5, y: 3 },
    ]
    const path = pathFromPoints(points)
    for (let i = 0; i < path.segments.length - 1; i++) {
      const seg = path.segments[i]!
      const next = path.segments[i + 1]!
      expect(pointApproxEqual(seg.end, next.start)).toBe(true)
    }
  })

  test('first segment starts at first point', () => {
    const points: Point[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }]
    const path = pathFromPoints(points)
    expect(pointApproxEqual(path.segments[0]!.start, points[0]!)).toBe(true)
  })

  test('last segment ends at last point for open path', () => {
    const points: Point[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }]
    const path = pathFromPoints(points)
    const last = path.segments[path.segments.length - 1]!
    expect(pointApproxEqual(last.end, points[points.length - 1]!)).toBe(true)
  })

  test('returns empty path for single point', () => {
    const path = pathFromPoints([{ x: 0, y: 0 }])
    expect(path.segments.length).toBe(0)
  })
})

describe('samplePoints', () => {
  test('returns correct number of points', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
    ]
    const path = pathFromPoints(points)
    const sampled = samplePoints(path, 10)
    expect(sampled.length).toBe(10)
  })

  test('first sampled point is at start of path', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]
    const path = pathFromPoints(points)
    const sampled = samplePoints(path, 5)
    expect(pointApproxEqual(sampled[0]!, points[0]!)).toBe(true)
  })

  test('last sampled point is at end of path', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
    ]
    const path = pathFromPoints(points)
    const sampled = samplePoints(path, 5)
    const lastSampled = sampled[sampled.length - 1]!
    const lastPoint = points[points.length - 1]!
    expect(pointApproxEqual(lastSampled, lastPoint)).toBe(true)
  })

  test('returns empty array for empty path', () => {
    const path = { segments: [], closed: false }
    const sampled = samplePoints(path, 10)
    expect(sampled.length).toBe(0)
  })

  test('returns 1 point when count is 1', () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
    const path = pathFromPoints(points)
    const sampled = samplePoints(path, 1)
    expect(sampled.length).toBe(1)
  })
})
