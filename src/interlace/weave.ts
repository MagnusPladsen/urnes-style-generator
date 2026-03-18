import type { UrnesElement, Crossing, Point, CurvePath } from '../core/types.ts'
import { findPathIntersections } from './intersections.ts'
import { evaluateAt } from '../core/bezier.ts'

const TYPE_PRIORITY: Record<UrnesElement['type'], number> = {
  'great-beast': 3,
  serpent: 2,
  vine: 1,
}

/**
 * Find all pairwise intersections between element spines.
 * Assign alternating over/under at each crossing.
 * Resolve conflicts by type priority.
 */
export function assignCrossings(elements: UrnesElement[]): Crossing[] {
  const crossings: Crossing[] = []

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const elA = elements[i]!
      const elB = elements[j]!

      const intersections = findPathIntersections(elA.spine, elB.spine)

      for (const ix of intersections) {
        crossings.push({
          pathAId: elA.id,
          pathBId: elB.id,
          paramA: ix.paramA,
          paramB: ix.paramB,
          point: ix.point,
          overPath: 'A', // placeholder, resolved below
        })
      }
    }
  }

  // Resolve over/under assignments
  // Group crossings by element pair
  // For each element, sort crossings by paramA and alternate over/under
  // starting with the lower-priority element being "under"

  // Build a map of crossings per element-pair
  const pairMap = new Map<string, Crossing[]>()
  for (const c of crossings) {
    const key = `${c.pathAId}::${c.pathBId}`
    if (!pairMap.has(key)) pairMap.set(key, [])
    pairMap.get(key)!.push(c)
  }

  const elementMap = new Map<string, UrnesElement>()
  for (const el of elements) elementMap.set(el.id, el)

  for (const [, pairCrossings] of pairMap) {
    // Sort by paramA
    pairCrossings.sort((a, b) => a.paramA - b.paramA)

    const first = pairCrossings[0]!
    const elA = elementMap.get(first.pathAId)!
    const elB = elementMap.get(first.pathBId)!

    const priorityA = TYPE_PRIORITY[elA.type]
    const priorityB = TYPE_PRIORITY[elB.type]

    // Higher priority starts "over"
    // If equal priority, A (lower index/first found) starts over
    let aIsOver = priorityA >= priorityB

    for (const c of pairCrossings) {
      c.overPath = aIsOver ? 'A' : 'B'
      aIsOver = !aIsOver
    }
  }

  return crossings
}

/**
 * For each element, split its ribbon points at crossing locations.
 * At "under" crossings, create a gap by removing points around the crossing.
 */
export function createInterlaceGaps(
  elements: UrnesElement[],
  crossings: Crossing[],
  gapSize: number
): Map<string, { segments: Point[][]; isOver: boolean[] }> {
  const result = new Map<string, { segments: Point[][]; isOver: boolean[] }>()

  for (const el of elements) {
    // Get all crossings relevant to this element
    const elCrossings: Array<{ param: number; isOver: boolean; point: Point }> = []

    for (const c of crossings) {
      if (c.pathAId === el.id) {
        elCrossings.push({
          param: c.paramA,
          isOver: c.overPath === 'A',
          point: c.point,
        })
      } else if (c.pathBId === el.id) {
        elCrossings.push({
          param: c.paramB,
          isOver: c.overPath === 'B',
          point: c.point,
        })
      }
    }

    // Sort crossings by param
    elCrossings.sort((a, b) => a.param - b.param)

    // Get spine points for this element
    const spine = el.spine
    if (spine.segments.length === 0) {
      result.set(el.id, { segments: [[]], isOver: [true] })
      continue
    }

    // Sample spine points at regular intervals
    const sampleCount = 100
    const spinePoints: Point[] = []
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount
      const globalT = t * spine.segments.length
      const segIdx = Math.min(Math.floor(globalT), spine.segments.length - 1)
      const segT = Math.min(globalT - segIdx, 1)
      spinePoints.push(evaluateAt(spine.segments[segIdx]!, segT))
    }

    // Split into segments at crossing points, creating gaps at "under" crossings
    const segments: Point[][] = []
    const isOver: boolean[] = []

    // Compute approximate arc lengths to map param → point index
    function paramToIndex(param: number): number {
      return Math.round(param * sampleCount)
    }

    // Compute gap in param space (rough: gapSize / total length)
    // Estimate total length
    let totalLen = 0
    for (let i = 1; i < spinePoints.length; i++) {
      const dx = spinePoints[i]!.x - spinePoints[i - 1]!.x
      const dy = spinePoints[i]!.y - spinePoints[i - 1]!.y
      totalLen += Math.sqrt(dx * dx + dy * dy)
    }

    const gapParam = totalLen > 0 ? gapSize / totalLen / 2 : 0.01

    // Build excluded ranges for "under" crossings
    const excludeRanges: Array<{ start: number; end: number }> = []
    for (const cx of elCrossings) {
      if (!cx.isOver) {
        excludeRanges.push({
          start: Math.max(0, cx.param - gapParam),
          end: Math.min(1, cx.param + gapParam),
        })
      }
    }

    // Merge overlapping ranges
    excludeRanges.sort((a, b) => a.start - b.start)
    const merged: Array<{ start: number; end: number }> = []
    for (const r of excludeRanges) {
      if (merged.length > 0 && r.start <= merged[merged.length - 1]!.end) {
        merged[merged.length - 1]!.end = Math.max(merged[merged.length - 1]!.end, r.end)
      } else {
        merged.push({ ...r })
      }
    }

    // Build segments from the non-excluded ranges
    if (merged.length === 0) {
      // No gaps: single segment, all over
      segments.push([...spinePoints])
      isOver.push(true)
    } else {
      let currentSeg: Point[] = []
      let currentIsOver = true

      for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount

        // Check if this point is in an excluded range
        let inGap = false
        for (const r of merged) {
          if (t >= r.start && t <= r.end) {
            inGap = true
            break
          }
        }

        if (!inGap) {
          currentSeg.push(spinePoints[i]!)
        } else {
          // We're in a gap
          if (currentSeg.length > 0) {
            segments.push(currentSeg)
            isOver.push(currentIsOver)
            currentSeg = []
          }
          currentIsOver = false // after a gap, we're in "under" territory (next segment resumes)
        }
      }

      if (currentSeg.length > 0) {
        segments.push(currentSeg)
        isOver.push(true) // segments after gaps are "over" again
      }
    }

    result.set(el.id, { segments, isOver })
  }

  return result
}
