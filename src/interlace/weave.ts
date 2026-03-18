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
 * Index range for a ribbon segment: [startIdx, endIdx) into the ribbon arrays.
 */
export interface RibbonSegment {
  startIdx: number
  endIdx: number
  isOver: boolean
}

/**
 * For each element, compute index ranges into its ribbon arrays,
 * splitting at crossing locations with gaps at "under" crossings.
 */
export function createInterlaceGaps(
  elements: UrnesElement[],
  crossings: Crossing[],
  gapSize: number,
  ribbonSampleCount: number
): Map<string, RibbonSegment[]> {
  const result = new Map<string, RibbonSegment[]>()

  for (const el of elements) {
    if (!el.ribbon || el.spine.segments.length === 0) {
      result.set(el.id, [{ startIdx: 0, endIdx: 0, isOver: true }])
      continue
    }

    const totalPoints = el.ribbon.spine.length

    // Get all crossings relevant to this element, with over/under info
    const elCrossings: Array<{ param: number; isOver: boolean }> = []

    for (const c of crossings) {
      if (c.pathAId === el.id) {
        elCrossings.push({ param: c.paramA, isOver: c.overPath === 'A' })
      } else if (c.pathBId === el.id) {
        elCrossings.push({ param: c.paramB, isOver: c.overPath === 'B' })
      }
    }

    elCrossings.sort((a, b) => a.param - b.param)

    // Estimate total spine length to convert gapSize to param space
    let totalLen = 0
    for (let i = 1; i < totalPoints; i++) {
      const dx = el.ribbon.spine[i]!.x - el.ribbon.spine[i - 1]!.x
      const dy = el.ribbon.spine[i]!.y - el.ribbon.spine[i - 1]!.y
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

    if (merged.length === 0) {
      // No gaps: single segment, all over
      result.set(el.id, [{ startIdx: 0, endIdx: totalPoints, isOver: true }])
      continue
    }

    // Determine over/under state at t=0 by checking the first crossing
    // Before any crossing, the element is "over" if it's over at the first crossing
    // or if there's no under-gap before it
    let currentIsOver = true
    if (elCrossings.length > 0) {
      currentIsOver = elCrossings[0]!.isOver
    }

    // Build segments from the non-excluded ranges
    const segments: RibbonSegment[] = []
    let segStart = 0

    for (const gap of merged) {
      const gapStartIdx = Math.round(gap.start * (totalPoints - 1))
      const gapEndIdx = Math.min(Math.round(gap.end * (totalPoints - 1)), totalPoints)

      if (gapStartIdx > segStart) {
        segments.push({ startIdx: segStart, endIdx: gapStartIdx, isOver: currentIsOver })
      }
      // After passing through an under-gap, the next segment is over
      currentIsOver = true
      segStart = gapEndIdx
    }

    if (segStart < totalPoints) {
      segments.push({ startIdx: segStart, endIdx: totalPoints, isOver: currentIsOver })
    }

    result.set(el.id, segments)
  }

  return result
}
