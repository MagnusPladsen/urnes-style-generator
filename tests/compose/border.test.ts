import { test, expect, describe } from 'bun:test'
import type { GeneratorConfig } from '../../src/core/types.ts'
import { createRng } from '../../src/core/random.ts'
import { composeBorder } from '../../src/compose/border.ts'
import { samplePoints } from '../../src/core/bezier.ts'

const borderConfig: GeneratorConfig = {
  seed: 42,
  width: 800,
  height: 120,
  composition: 'border',
  complexity: 5,
  elements: {
    greatBeast: false,
    serpents: 1,
    vines: true,
  },
  style: {
    strokeWidth: 2,
    gapSize: 6,
    fill: true,
    tapering: true,
    strokeColor: '#1a1a1a',
    fillColor: '#1a1a1a',
  },
}

describe('composeBorder', () => {
  test('returns an array of elements', () => {
    const rng = createRng(42)
    const elements = composeBorder(rng, borderConfig)

    expect(Array.isArray(elements)).toBe(true)
    expect(elements.length).toBeGreaterThan(0)
  })

  test('elements flow horizontally (bounds.width > bounds.height)', () => {
    const rng = createRng(42)
    const elements = composeBorder(rng, borderConfig)

    // Verify the config used is horizontal
    expect(borderConfig.width).toBeGreaterThan(borderConfig.height)

    // The border serpent should span the horizontal extent
    const serpent = elements.find(e => e.type === 'serpent')
    expect(serpent).toBeDefined()

    if (serpent) {
      const points = samplePoints(serpent.spine, 20)
      const xValues = points.map(p => p.x)
      const xRange = Math.max(...xValues) - Math.min(...xValues)

      // The serpent should span at least 50% of the width
      expect(xRange).toBeGreaterThan(borderConfig.width * 0.5)
    }
  })

  test('includes a serpent element', () => {
    const rng = createRng(42)
    const elements = composeBorder(rng, borderConfig)

    const serpent = elements.find(e => e.type === 'serpent')
    expect(serpent).toBeDefined()
  })

  test('includes vines when configured', () => {
    const rng = createRng(42)
    const elements = composeBorder(rng, borderConfig)

    const vines = elements.filter(e => e.type === 'vine')
    expect(vines.length).toBeGreaterThan(0)
  })

  test('does not include vines when not configured', () => {
    const rng = createRng(42)
    const config: GeneratorConfig = {
      ...borderConfig,
      elements: { ...borderConfig.elements, vines: false },
    }
    const elements = composeBorder(rng, config)

    const vines = elements.filter(e => e.type === 'vine')
    expect(vines.length).toBe(0)
  })

  test('border serpent spine starts near x=0', () => {
    const rng = createRng(42)
    const elements = composeBorder(rng, borderConfig)

    const serpent = elements.find(e => e.type === 'serpent')
    expect(serpent).toBeDefined()

    if (serpent && serpent.spine.segments.length > 0) {
      const startX = serpent.spine.segments[0]!.start.x
      // Start should be at or very near x=0 (left edge)
      expect(startX).toBeLessThanOrEqual(borderConfig.width * 0.05)
    }
  })

  test('border serpent spine ends near x=width', () => {
    const rng = createRng(42)
    const elements = composeBorder(rng, borderConfig)

    const serpent = elements.find(e => e.type === 'serpent')
    expect(serpent).toBeDefined()

    if (serpent && serpent.spine.segments.length > 0) {
      const lastSeg = serpent.spine.segments[serpent.spine.segments.length - 1]!
      const endX = lastSeg.end.x
      // End should be at or very near x=width (right edge)
      expect(endX).toBeGreaterThanOrEqual(borderConfig.width * 0.95)
    }
  })

  test('is deterministic with same seed', () => {
    const elements1 = composeBorder(createRng(99), borderConfig)
    const elements2 = composeBorder(createRng(99), borderConfig)

    expect(elements1.length).toBe(elements2.length)
    expect(elements1[0]!.type).toBe(elements2[0]!.type)
  })

  test('all elements have valid spines', () => {
    const rng = createRng(42)
    const elements = composeBorder(rng, borderConfig)

    for (const el of elements) {
      expect(el.spine.segments.length).toBeGreaterThan(0)
    }
  })
})
