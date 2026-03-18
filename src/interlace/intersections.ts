import type { CubicBezier, Point, CurvePath } from '../core/types.ts'
import { boundingBox, splitAt, evaluateAt } from '../core/bezier.ts'

export interface Intersection {
  paramA: number
  paramB: number
  point: Point
}

function boxesOverlap(
  a: { min: Point; max: Point },
  b: { min: Point; max: Point }
): boolean {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y
  )
}

function boxSize(box: { min: Point; max: Point }): number {
  return Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
}

function subdivide(
  bezA: CubicBezier,
  bezB: CubicBezier,
  tA0: number,
  tA1: number,
  tB0: number,
  tB1: number,
  tolerance: number,
  depth: number,
  results: Intersection[]
): void {
  if (depth > 20) return

  const boxA = boundingBox(bezA)
  const boxB = boundingBox(bezB)

  if (!boxesOverlap(boxA, boxB)) return

  if (boxSize(boxA) < tolerance && boxSize(boxB) < tolerance) {
    const tA = (tA0 + tA1) / 2
    const tB = (tB0 + tB1) / 2
    const point: Point = {
      x: (boxA.min.x + boxA.max.x) / 2,
      y: (boxA.min.y + boxA.max.y) / 2,
    }

    // Deduplicate: check if a nearby result already exists
    for (const r of results) {
      if (Math.abs(r.paramA - tA) < tolerance * 2 && Math.abs(r.paramB - tB) < tolerance * 2) {
        return
      }
    }

    results.push({ paramA: tA, paramB: tB, point })
    return
  }

  const tAMid = (tA0 + tA1) / 2
  const tBMid = (tB0 + tB1) / 2

  const [aLeft, aRight] = splitAt(bezA, 0.5)
  const [bLeft, bRight] = splitAt(bezB, 0.5)

  subdivide(aLeft, bLeft, tA0, tAMid, tB0, tBMid, tolerance, depth + 1, results)
  subdivide(aLeft, bRight, tA0, tAMid, tBMid, tB1, tolerance, depth + 1, results)
  subdivide(aRight, bLeft, tAMid, tA1, tB0, tBMid, tolerance, depth + 1, results)
  subdivide(aRight, bRight, tAMid, tA1, tBMid, tB1, tolerance, depth + 1, results)
}

/**
 * Find intersections between two cubic bezier curves using bounding box subdivision.
 */
export function findCurveIntersections(
  a: CubicBezier,
  b: CubicBezier,
  tolerance: number = 0.5
): Intersection[] {
  const results: Intersection[] = []
  subdivide(a, b, 0, 1, 0, 1, tolerance, 0, results)
  return results
}

/**
 * Find all intersections between two CurvePaths.
 * Parameters are adjusted to be global (0-1 across entire path).
 */
export function findPathIntersections(pathA: CurvePath, pathB: CurvePath): Intersection[] {
  const results: Intersection[] = []
  const nA = pathA.segments.length
  const nB = pathB.segments.length

  if (nA === 0 || nB === 0) return results

  for (let i = 0; i < nA; i++) {
    for (let j = 0; j < nB; j++) {
      const segA = pathA.segments[i]!
      const segB = pathB.segments[j]!
      const local = findCurveIntersections(segA, segB)

      for (const ix of local) {
        // Convert local segment param to global path param
        const globalA = (i + ix.paramA) / nA
        const globalB = (j + ix.paramB) / nB
        results.push({
          paramA: globalA,
          paramB: globalB,
          point: ix.point,
        })
      }
    }
  }

  return results
}
