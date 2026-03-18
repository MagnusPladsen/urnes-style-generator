import { test, expect, describe } from 'bun:test'
import type { GeneratorConfig } from '../../src/core/types.ts'
import { createRng } from '../../src/core/random.ts'
import { composePanel } from '../../src/compose/panel.ts'

const baseConfig: GeneratorConfig = {
  seed: 42,
  width: 400,
  height: 600,
  composition: 'panel',
  complexity: 5,
  elements: {
    greatBeast: true,
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

describe('composePanel', () => {
  test('returns an array of elements', () => {
    const rng = createRng(42)
    const elements = composePanel(rng, baseConfig)

    expect(Array.isArray(elements)).toBe(true)
    expect(elements.length).toBeGreaterThan(0)
  })

  test('includes great beast when configured', () => {
    const rng = createRng(42)
    const elements = composePanel(rng, baseConfig)

    const beast = elements.find(e => e.type === 'great-beast')
    expect(beast).toBeDefined()
    expect(beast!.id).toBe('great-beast')
  })

  test('does not include great beast when not configured', () => {
    const rng = createRng(42)
    const config: GeneratorConfig = {
      ...baseConfig,
      elements: { ...baseConfig.elements, greatBeast: false },
    }
    const elements = composePanel(rng, config)

    const beast = elements.find(e => e.type === 'great-beast')
    expect(beast).toBeUndefined()
  })

  test('includes correct number of serpents', () => {
    const rng = createRng(42)
    const elements = composePanel(rng, baseConfig)

    const serpents = elements.filter(e => e.type === 'serpent')
    expect(serpents.length).toBe(baseConfig.elements.serpents)
  })

  test('omits vines for authentic Urnes sparse aesthetic', () => {
    const rng = createRng(42)
    const elements = composePanel(rng, baseConfig)

    const vines = elements.filter(e => e.type === 'vine')
    expect(vines.length).toBe(0)
  })

  test('does not include vines when not configured', () => {
    const rng = createRng(42)
    const config: GeneratorConfig = {
      ...baseConfig,
      elements: { ...baseConfig.elements, vines: false },
    }
    const elements = composePanel(rng, config)

    const vines = elements.filter(e => e.type === 'vine')
    expect(vines.length).toBe(0)
  })

  test('vine count scales with complexity', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)

    const lowComplexity = composePanel(rng1, { ...baseConfig, complexity: 2 })
    const highComplexity = composePanel(rng2, { ...baseConfig, complexity: 8 })

    const lowVines = lowComplexity.filter(e => e.type === 'vine').length
    const highVines = highComplexity.filter(e => e.type === 'vine').length

    expect(highVines).toBeGreaterThanOrEqual(lowVines)
  })

  test('draw order: vines first, then serpents, then beast', () => {
    const rng = createRng(42)
    const elements = composePanel(rng, baseConfig)

    const firstBeastIdx = elements.findIndex(e => e.type === 'great-beast')
    const lastVineIdx = elements.map(e => e.type).lastIndexOf('vine')
    const lastSerpentIdx = elements.map(e => e.type).lastIndexOf('serpent')

    if (firstBeastIdx >= 0 && lastVineIdx >= 0) {
      expect(firstBeastIdx).toBeGreaterThan(lastVineIdx)
    }
    if (firstBeastIdx >= 0 && lastSerpentIdx >= 0) {
      expect(firstBeastIdx).toBeGreaterThan(lastSerpentIdx)
    }
  })

  test('returns 0 serpents when configured', () => {
    const rng = createRng(42)
    const config: GeneratorConfig = {
      ...baseConfig,
      elements: { ...baseConfig.elements, serpents: 0 },
    }
    const elements = composePanel(rng, config)

    const serpents = elements.filter(e => e.type === 'serpent')
    expect(serpents.length).toBe(0)
  })

  test('element count scales with complexity', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)

    const low = composePanel(rng1, { ...baseConfig, complexity: 1 })
    const high = composePanel(rng2, { ...baseConfig, complexity: 10 })

    // Higher complexity should have more elements overall
    expect(high.length).toBeGreaterThanOrEqual(low.length)
  })
})
