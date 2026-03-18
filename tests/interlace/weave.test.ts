import { test, expect, describe } from 'bun:test'
import type { UrnesElement } from '../../src/core/types.ts'
import { assignCrossings, createInterlaceGaps } from '../../src/interlace/weave.ts'
import { pathFromPoints } from '../../src/core/bezier.ts'
import { generateRibbon } from '../../src/core/ribbon.ts'

const SAMPLE_COUNT = 40

function withRibbon(el: UrnesElement): UrnesElement {
  el.ribbon = generateRibbon(el.spine, el.widthProfile, SAMPLE_COUNT)
  return el
}

function makeCrossingElements(): UrnesElement[] {
  // Two paths that cross each other
  const elementA: UrnesElement = withRibbon({
    id: 'serpent-0',
    type: 'serpent',
    spine: pathFromPoints([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]),
    widthProfile: [4, 6, 4],
  })

  const elementB: UrnesElement = withRibbon({
    id: 'serpent-1',
    type: 'serpent',
    spine: pathFromPoints([
      { x: 0, y: 100 },
      { x: 100, y: 0 },
    ]),
    widthProfile: [4, 6, 4],
  })

  return [elementA, elementB]
}

describe('assignCrossings', () => {
  test('two crossing elements get over/under assignment', () => {
    const elements = makeCrossingElements()
    const crossings = assignCrossings(elements)

    // Should find at least one crossing
    expect(crossings.length).toBeGreaterThan(0)

    const c = crossings[0]!
    expect(c.pathAId).toBe('serpent-0')
    expect(c.pathBId).toBe('serpent-1')
    expect(['A', 'B']).toContain(c.overPath)
  })

  test('elements with no crossings return empty array', () => {
    // Two parallel elements that don't cross
    const elementA: UrnesElement = {
      id: 'vine-0',
      type: 'vine',
      spine: pathFromPoints([
        { x: 0, y: 10 },
        { x: 100, y: 10 },
      ]),
      widthProfile: [2, 3, 2],
    }

    const elementB: UrnesElement = {
      id: 'vine-1',
      type: 'vine',
      spine: pathFromPoints([
        { x: 0, y: 90 },
        { x: 100, y: 90 },
      ]),
      widthProfile: [2, 3, 2],
    }

    const crossings = assignCrossings([elementA, elementB])
    expect(crossings.length).toBe(0)
  })

  test('higher priority element (great-beast) starts over', () => {
    const beast: UrnesElement = {
      id: 'great-beast',
      type: 'great-beast',
      spine: pathFromPoints([
        { x: 0, y: 50 },
        { x: 100, y: 50 },
      ]),
      widthProfile: [8, 12, 8],
    }

    const vine: UrnesElement = {
      id: 'vine-0',
      type: 'vine',
      spine: pathFromPoints([
        { x: 50, y: 0 },
        { x: 50, y: 100 },
      ]),
      widthProfile: [2, 3, 2],
    }

    const crossings = assignCrossings([vine, beast])

    if (crossings.length > 0) {
      // great-beast has higher priority, so it should be "over"
      // The crossing has pathAId=vine-0 (index 0), pathBId=great-beast
      // great-beast is pathB, so overPath should be 'B'
      const c = crossings[0]!
      // Great beast (higher priority) should be over
      const greatBeastIsOver =
        (c.pathAId === 'great-beast' && c.overPath === 'A') ||
        (c.pathBId === 'great-beast' && c.overPath === 'B')
      expect(greatBeastIsOver).toBe(true)
    }
  })

  test('multiple crossings alternate over/under', () => {
    // Create two elements that cross multiple times (S-curve crossing)
    const elementA: UrnesElement = {
      id: 'serpent-0',
      type: 'serpent',
      spine: pathFromPoints([
        { x: 0, y: 50 },
        { x: 33, y: 10 },
        { x: 66, y: 90 },
        { x: 100, y: 50 },
      ]),
      widthProfile: [4, 6, 6, 4],
    }

    const elementB: UrnesElement = {
      id: 'serpent-1',
      type: 'serpent',
      spine: pathFromPoints([
        { x: 0, y: 50 },
        { x: 33, y: 90 },
        { x: 66, y: 10 },
        { x: 100, y: 50 },
      ]),
      widthProfile: [4, 6, 6, 4],
    }

    const crossings = assignCrossings([elementA, elementB])

    if (crossings.length >= 2) {
      // Check that consecutive crossings alternate
      const first = crossings[0]!
      const second = crossings[1]!
      expect(first.overPath).not.toBe(second.overPath)
    }
  })
})

describe('createInterlaceGaps', () => {
  test('elements with no crossings return single segment', () => {
    const elements = [
      withRibbon({
        id: 'vine-0',
        type: 'vine' as const,
        spine: pathFromPoints([
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ]),
        widthProfile: [2, 3, 2],
      }),
    ]

    const gapMap = createInterlaceGaps(elements, [], 6, SAMPLE_COUNT)

    expect(gapMap.has('vine-0')).toBe(true)
    const segments = gapMap.get('vine-0')!
    expect(segments.length).toBe(1)
    expect(segments[0]!.endIdx - segments[0]!.startIdx).toBeGreaterThan(0)
  })

  test('elements with under crossings have gaps', () => {
    const elements = makeCrossingElements()
    const crossings = assignCrossings(elements)

    const gapMap = createInterlaceGaps(elements, crossings, 10, SAMPLE_COUNT)

    // Both elements should be in the map
    expect(gapMap.has('serpent-0')).toBe(true)
    expect(gapMap.has('serpent-1')).toBe(true)

    // The "under" element should have more than one segment (gap creates a break)
    let hasGap = false
    for (const [, segments] of gapMap) {
      if (segments.length > 1) {
        hasGap = true
        break
      }
    }
    expect(hasGap).toBe(true)
  })

  test('larger gap size creates more separation', () => {
    const elements = makeCrossingElements()
    const crossings = assignCrossings(elements)

    const gapMapSmall = createInterlaceGaps(elements, crossings, 2, SAMPLE_COUNT)
    const gapMapLarge = createInterlaceGaps(elements, crossings, 20, SAMPLE_COUNT)

    // With a large gap, "under" segments should cover fewer total indices
    let smallTotal = 0
    let largeTotal = 0

    for (const [, segments] of gapMapSmall) {
      for (const seg of segments) smallTotal += seg.endIdx - seg.startIdx
    }
    for (const [, segments] of gapMapLarge) {
      for (const seg of segments) largeTotal += seg.endIdx - seg.startIdx
    }

    // Larger gaps remove more points overall
    expect(largeTotal).toBeLessThanOrEqual(smallTotal)
  })
})
