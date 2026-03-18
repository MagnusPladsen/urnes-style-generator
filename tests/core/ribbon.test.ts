import { test, expect, describe } from 'bun:test'
import { generateRibbon } from '../../src/core/ribbon.ts'
import { pathFromPoints } from '../../src/core/bezier.ts'
import type { Point } from '../../src/core/types.ts'

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

describe('generateRibbon', () => {
  // Straight horizontal line path
  const straightPoints: Point[] = [
    { x: 0, y: 100 },
    { x: 50, y: 100 },
    { x: 100, y: 100 },
  ]
  const straightPath = pathFromPoints(straightPoints)
  const uniformWidth = [10, 10, 10]

  test('ribbon spine points match sample count', () => {
    const ribbon = generateRibbon(straightPath, uniformWidth, 20)
    expect(ribbon.spine.length).toBe(20)
  })

  test('ribbon left and right have correct length', () => {
    const ribbon = generateRibbon(straightPath, uniformWidth, 30)
    expect(ribbon.left.length).toBe(30)
    expect(ribbon.right.length).toBe(30)
  })

  test('ribbon from straight horizontal line produces parallel left/right paths', () => {
    const ribbon = generateRibbon(straightPath, uniformWidth, 10)

    // For a horizontal line, left and right should be offset vertically
    for (let i = 0; i < ribbon.spine.length; i++) {
      const sp = ribbon.spine[i]!
      const lp = ribbon.left[i]!
      const rp = ribbon.right[i]!

      // Left and right should be symmetric around spine
      expect(Math.abs(lp.x - sp.x)).toBeLessThan(1e-4)
      expect(Math.abs(rp.x - sp.x)).toBeLessThan(1e-4)

      // Left should be above spine (negative y offset), right below (positive)
      // or vice versa depending on normal direction
      const lDist = Math.abs(lp.y - sp.y)
      const rDist = Math.abs(rp.y - sp.y)

      expect(lDist).toBeGreaterThan(0)
      expect(rDist).toBeGreaterThan(0)
    }
  })

  test('ribbon left and right are equidistant from spine with uniform width', () => {
    const ribbon = generateRibbon(straightPath, uniformWidth, 10)

    for (let i = 0; i < ribbon.spine.length; i++) {
      const sp = ribbon.spine[i]!
      const lp = ribbon.left[i]!
      const rp = ribbon.right[i]!

      const leftDist = dist(sp, lp)
      const rightDist = dist(sp, rp)

      // Both should be approximately half the width (5)
      expect(Math.abs(leftDist - 5)).toBeLessThan(0.5)
      expect(Math.abs(rightDist - 5)).toBeLessThan(0.5)
    }
  })

  test('ribbon with tapering width narrows at ends', () => {
    // Width profile: wide in middle, narrow at ends
    const taperingWidth = [2, 5, 10, 10, 5, 2]
    const ribbon = generateRibbon(straightPath, taperingWidth, 12)

    // Measure width at start and middle
    const startWidthL = dist(ribbon.spine[0]!, ribbon.left[0]!)
    const startWidthR = dist(ribbon.spine[0]!, ribbon.right[0]!)
    const midIdx = Math.floor(ribbon.spine.length / 2)
    const midWidthL = dist(ribbon.spine[midIdx]!, ribbon.left[midIdx]!)

    // Middle should be wider than start
    expect(midWidthL).toBeGreaterThan(startWidthL)
    expect(startWidthL + startWidthR).toBeLessThan(midWidthL * 2)
  })

  test('ribbon spine points lie approximately on the original path', () => {
    const ribbon = generateRibbon(straightPath, uniformWidth, 10)
    // For a horizontal path at y=100, all spine y values should be ~100
    for (const sp of ribbon.spine) {
      expect(Math.abs(sp.y - 100)).toBeLessThan(0.5)
    }
  })

  test('left and right points are on opposite sides of spine', () => {
    const ribbon = generateRibbon(straightPath, uniformWidth, 10)
    // For horizontal path, left and right should be on opposite y sides of spine
    for (let i = 0; i < ribbon.spine.length; i++) {
      const sp = ribbon.spine[i]!
      const lp = ribbon.left[i]!
      const rp = ribbon.right[i]!
      const lOffset = lp.y - sp.y
      const rOffset = rp.y - sp.y
      // They should have opposite signs
      expect(lOffset * rOffset).toBeLessThan(0)
    }
  })
})
