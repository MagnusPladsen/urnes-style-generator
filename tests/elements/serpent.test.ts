import { test, expect, describe } from 'bun:test'
import { createRng } from '../../src/core/random.ts'
import { generateGreatBeast, generateSerpent } from '../../src/elements/serpent.ts'
import { samplePoints } from '../../src/core/bezier.ts'

const bounds = { width: 400, height: 600 }

describe('generateGreatBeast', () => {
  test('returns element with type great-beast', () => {
    const rng = createRng(42)
    const beast = generateGreatBeast(rng, bounds)
    expect(beast.type).toBe('great-beast')
    expect(beast.id).toBe('great-beast')
  })

  test('spine stays within bounds', () => {
    const rng = createRng(42)
    const beast = generateGreatBeast(rng, bounds)

    expect(beast.spine.segments.length).toBeGreaterThan(0)

    // Sample points from the spine and check they're within bounds (with margin)
    const points = samplePoints(beast.spine, 50)
    const margin = bounds.width * 0.05

    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-margin)
      expect(p.x).toBeLessThanOrEqual(bounds.width + margin)
      expect(p.y).toBeGreaterThanOrEqual(-margin)
      expect(p.y).toBeLessThanOrEqual(bounds.height + margin)
    }
  })

  test('width profile has correct tapering — wider in middle', () => {
    const rng = createRng(42)
    const beast = generateGreatBeast(rng, bounds)

    const profile = beast.widthProfile
    expect(profile.length).toBeGreaterThan(4)

    // Head (first element) should be thinner than body middle
    const headWidth = profile[0]!
    const midIdx = Math.floor(profile.length / 2)
    const midWidth = profile[midIdx]!

    expect(midWidth).toBeGreaterThan(headWidth)

    // Tail (last element) should be thin
    const tailWidth = profile[profile.length - 1]!
    expect(tailWidth).toBeLessThan(midWidth)
  })

  test('has head at start position', () => {
    const rng = createRng(42)
    const beast = generateGreatBeast(rng, bounds)
    expect(beast.headPosition).toBe('start')
  })

  test('has children (limbs)', () => {
    const rng = createRng(42)
    const beast = generateGreatBeast(rng, bounds)
    expect(beast.children).toBeDefined()
    expect(beast.children!.length).toBeGreaterThanOrEqual(1)
    expect(beast.children!.length).toBeLessThanOrEqual(2)
  })

  test('is deterministic with same seed', () => {
    const beast1 = generateGreatBeast(createRng(100), bounds)
    const beast2 = generateGreatBeast(createRng(100), bounds)

    // Same seed should produce same first spine point
    const seg1 = beast1.spine.segments[0]!
    const seg2 = beast2.spine.segments[0]!
    expect(seg1.start.x).toBeCloseTo(seg2.start.x, 5)
    expect(seg1.start.y).toBeCloseTo(seg2.start.y, 5)
  })
})

describe('generateSerpent', () => {
  test('returns element with type serpent', () => {
    const rng = createRng(42)
    const s = generateSerpent(rng, bounds, 0)
    expect(s.type).toBe('serpent')
    expect(s.id).toBe('serpent-0')
  })

  test('id includes index', () => {
    const rng = createRng(42)
    const s2 = generateSerpent(rng, bounds, 2)
    expect(s2.id).toBe('serpent-2')
  })

  test('spine stays within bounds', () => {
    const rng = createRng(42)
    const s = generateSerpent(rng, bounds, 0)

    const points = samplePoints(s.spine, 30)
    const margin = bounds.width * 0.05

    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(-margin)
      expect(p.x).toBeLessThanOrEqual(bounds.width + margin)
      expect(p.y).toBeGreaterThanOrEqual(-margin)
      expect(p.y).toBeLessThanOrEqual(bounds.height + margin)
    }
  })

  test('width profile max is thinner than great beast', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)
    const beast = generateGreatBeast(rng1, bounds)
    const serpent = generateSerpent(rng2, bounds, 0)

    const beastMax = Math.max(...beast.widthProfile)
    const serpentMax = Math.max(...serpent.widthProfile)

    // Serpent should be thinner
    expect(serpentMax).toBeLessThan(beastMax)
  })

  test('has head at start position', () => {
    const rng = createRng(42)
    const s = generateSerpent(rng, bounds, 0)
    expect(s.headPosition).toBe('start')
  })

  test('has a spine with segments', () => {
    const rng = createRng(42)
    const s = generateSerpent(rng, bounds, 0)
    expect(s.spine.segments.length).toBeGreaterThan(0)
  })
})
