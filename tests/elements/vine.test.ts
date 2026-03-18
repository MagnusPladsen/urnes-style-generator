import { test, expect, describe } from 'bun:test'
import { createRng } from '../../src/core/random.ts'
import { generateVine, generateVines } from '../../src/elements/vine.ts'
import { samplePoints } from '../../src/core/bezier.ts'

const bounds = { width: 400, height: 600 }

describe('generateVine', () => {
  test('returns element with type vine', () => {
    const rng = createRng(42)
    const vine = generateVine(rng, bounds, 0)
    expect(vine.type).toBe('vine')
  })

  test('id is vine-{index}', () => {
    const rng = createRng(42)
    const vine = generateVine(rng, bounds, 3)
    expect(vine.id).toBe('vine-3')
  })

  test('returns element within bounds', () => {
    const rng = createRng(42)
    const vine = generateVine(rng, bounds, 0)

    expect(vine.spine.segments.length).toBeGreaterThan(0)

    const points = samplePoints(vine.spine, 30)
    const margin = bounds.width * 0.1

    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-margin)
      expect(p.x).toBeLessThanOrEqual(bounds.width + margin)
      expect(p.y).toBeGreaterThanOrEqual(-margin)
      expect(p.y).toBeLessThanOrEqual(bounds.height + margin)
    }
  })

  test('width profile tapers toward end', () => {
    const rng = createRng(42)
    const vine = generateVine(rng, bounds, 0)

    const profile = vine.widthProfile
    expect(profile.length).toBeGreaterThan(2)

    // Start should be wider than end
    const startWidth = profile[0]!
    const endWidth = profile[profile.length - 1]!
    expect(startWidth).toBeGreaterThan(endWidth)
  })

  test('width profile is thin throughout (max < 5)', () => {
    const rng = createRng(42)
    const vine = generateVine(rng, bounds, 0)

    const maxWidth = Math.max(...vine.widthProfile)
    expect(maxWidth).toBeLessThanOrEqual(5)
  })

  test('has a spine with segments', () => {
    const rng = createRng(42)
    const vine = generateVine(rng, bounds, 0)
    expect(vine.spine.segments.length).toBeGreaterThan(0)
  })

  test('no head position defined', () => {
    const rng = createRng(42)
    const vine = generateVine(rng, bounds, 0)
    // Vines don't have heads
    expect(vine.headPosition).toBeUndefined()
  })

  test('custom start point is used', () => {
    const rng = createRng(42)
    const startPoint = { x: 100, y: 200 }
    const vine = generateVine(rng, bounds, 0, { startPoint })

    const firstSeg = vine.spine.segments[0]!
    expect(firstSeg.start.x).toBeCloseTo(startPoint.x, 5)
    expect(firstSeg.start.y).toBeCloseTo(startPoint.y, 5)
  })

  test('is deterministic with same seed', () => {
    const vine1 = generateVine(createRng(77), bounds, 0)
    const vine2 = generateVine(createRng(77), bounds, 0)

    const seg1 = vine1.spine.segments[0]!
    const seg2 = vine2.spine.segments[0]!
    expect(seg1.start.x).toBeCloseTo(seg2.start.x, 5)
    expect(seg1.start.y).toBeCloseTo(seg2.start.y, 5)
  })
})

describe('generateVines', () => {
  test('returns correct count', () => {
    const rng = createRng(42)
    const vines = generateVines(rng, bounds, 4)
    expect(vines.length).toBe(4)
  })

  test('returns zero when count is 0', () => {
    const rng = createRng(42)
    const vines = generateVines(rng, bounds, 0)
    expect(vines.length).toBe(0)
  })

  test('all returned elements are type vine', () => {
    const rng = createRng(42)
    const vines = generateVines(rng, bounds, 3)
    for (const vine of vines) {
      expect(vine.type).toBe('vine')
    }
  })

  test('vines have unique ids', () => {
    const rng = createRng(42)
    const vines = generateVines(rng, bounds, 5)
    const ids = vines.map(v => v.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(5)
  })

  test('each vine has a valid spine', () => {
    const rng = createRng(42)
    const vines = generateVines(rng, bounds, 3)
    for (const vine of vines) {
      expect(vine.spine.segments.length).toBeGreaterThan(0)
    }
  })
})
