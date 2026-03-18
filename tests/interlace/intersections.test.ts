import { test, expect, describe } from 'bun:test'
import type { CubicBezier } from '../../src/core/types.ts'
import { findCurveIntersections, findPathIntersections } from '../../src/interlace/intersections.ts'
import { pathFromPoints } from '../../src/core/bezier.ts'

describe('findCurveIntersections', () => {
  test('two straight-line beziers crossing at known point', () => {
    // Line from (0,0) to (100,100) — diagonal
    const a: CubicBezier = {
      start: { x: 0, y: 0 },
      cp1: { x: 33, y: 33 },
      cp2: { x: 66, y: 66 },
      end: { x: 100, y: 100 },
    }

    // Line from (0,100) to (100,0) — anti-diagonal
    const b: CubicBezier = {
      start: { x: 0, y: 100 },
      cp1: { x: 33, y: 66 },
      cp2: { x: 66, y: 33 },
      end: { x: 100, y: 0 },
    }

    const intersections = findCurveIntersections(a, b, 1.0)

    expect(intersections.length).toBeGreaterThan(0)

    // The crossing should be near (50, 50) — within ~2 units
    const ix = intersections[0]!
    const dist = Math.sqrt(
      Math.pow(ix.point.x - 50, 2) + Math.pow(ix.point.y - 50, 2)
    )
    expect(dist).toBeLessThan(2)
  })

  test('two parallel beziers produce no intersections', () => {
    // Horizontal line at y=20
    const a: CubicBezier = {
      start: { x: 0, y: 20 },
      cp1: { x: 33, y: 20 },
      cp2: { x: 66, y: 20 },
      end: { x: 100, y: 20 },
    }

    // Horizontal line at y=80 (parallel)
    const b: CubicBezier = {
      start: { x: 0, y: 80 },
      cp1: { x: 33, y: 80 },
      cp2: { x: 66, y: 80 },
      end: { x: 100, y: 80 },
    }

    const intersections = findCurveIntersections(a, b, 1.0)
    expect(intersections.length).toBe(0)
  })

  test('intersection point is approximately correct within tolerance', () => {
    // Crossing at roughly (50, 50)
    const a: CubicBezier = {
      start: { x: 10, y: 10 },
      cp1: { x: 30, y: 30 },
      cp2: { x: 70, y: 70 },
      end: { x: 90, y: 90 },
    }

    const b: CubicBezier = {
      start: { x: 10, y: 90 },
      cp1: { x: 30, y: 70 },
      cp2: { x: 70, y: 30 },
      end: { x: 90, y: 10 },
    }

    const intersections = findCurveIntersections(a, b, 2.0)

    expect(intersections.length).toBeGreaterThan(0)

    const ix = intersections[0]!
    // Point should be within 5 units of (50,50)
    const dist = Math.sqrt(
      Math.pow(ix.point.x - 50, 2) + Math.pow(ix.point.y - 50, 2)
    )
    expect(dist).toBeLessThan(5)
  })

  test('non-crossing beziers in same area produce no intersections', () => {
    // Two curves that are near each other but don't cross
    const a: CubicBezier = {
      start: { x: 0, y: 0 },
      cp1: { x: 50, y: 10 },
      cp2: { x: 50, y: 10 },
      end: { x: 100, y: 0 },
    }

    const b: CubicBezier = {
      start: { x: 0, y: 30 },
      cp1: { x: 50, y: 40 },
      cp2: { x: 50, y: 40 },
      end: { x: 100, y: 30 },
    }

    const intersections = findCurveIntersections(a, b, 1.0)
    expect(intersections.length).toBe(0)
  })
})

describe('findPathIntersections', () => {
  test('crossing paths return intersections', () => {
    const pathA = pathFromPoints([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ])
    const pathB = pathFromPoints([
      { x: 0, y: 100 },
      { x: 100, y: 0 },
    ])

    const intersections = findPathIntersections(pathA, pathB)
    expect(intersections.length).toBeGreaterThan(0)
  })

  test('global params are in 0-1 range', () => {
    const pathA = pathFromPoints([
      { x: 0, y: 0 },
      { x: 50, y: 50 },
      { x: 100, y: 100 },
    ])
    const pathB = pathFromPoints([
      { x: 0, y: 100 },
      { x: 100, y: 0 },
    ])

    const intersections = findPathIntersections(pathA, pathB)
    for (const ix of intersections) {
      expect(ix.paramA).toBeGreaterThanOrEqual(0)
      expect(ix.paramA).toBeLessThanOrEqual(1)
      expect(ix.paramB).toBeGreaterThanOrEqual(0)
      expect(ix.paramB).toBeLessThanOrEqual(1)
    }
  })

  test('empty paths return no intersections', () => {
    const pathA = pathFromPoints([{ x: 0, y: 0 }])
    const pathB = pathFromPoints([{ x: 100, y: 100 }])

    const intersections = findPathIntersections(pathA, pathB)
    expect(intersections.length).toBe(0)
  })
})
