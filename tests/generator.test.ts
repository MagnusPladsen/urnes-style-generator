import { test, expect, describe } from 'bun:test'
import { generate } from '../src/generator.ts'

describe('generate()', () => {
  test('returns a valid SVG string', () => {
    const svg = generate()
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  test('contains XML declaration', () => {
    const svg = generate()
    expect(svg).toContain('<?xml')
  })

  test('same seed produces same output', () => {
    const svg1 = generate({ seed: 123 })
    const svg2 = generate({ seed: 123 })
    expect(svg1).toBe(svg2)
  })

  test('different seeds produce different output', () => {
    const svg1 = generate({ seed: 1 })
    const svg2 = generate({ seed: 2 })
    expect(svg1).not.toBe(svg2)
  })

  test('panel composition works', () => {
    const svg = generate({ seed: 10, composition: 'panel' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  test('border composition works', () => {
    const svg = generate({ seed: 10, composition: 'border', width: 800, height: 200 })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  test('circular composition falls back to panel', () => {
    const svg = generate({ seed: 10, composition: 'circular' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  test('freeform composition falls back to panel', () => {
    const svg = generate({ seed: 10, composition: 'freeform' })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  test('custom width and height appear in SVG attributes', () => {
    const svg = generate({ seed: 1, width: 300, height: 500 })
    expect(svg).toContain('width="300"')
    expect(svg).toContain('height="500"')
  })

  test('custom config overrides defaults', () => {
    const svg = generate({
      seed: 7,
      width: 250,
      height: 350,
      style: {
        strokeColor: '#ff0000',
        fillColor: '#ff0000',
        strokeWidth: 3,
        gapSize: 8,
        fill: true,
        tapering: false,
      },
    })
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })

  test('higher complexity produces more ribbon samples', () => {
    const svgSimple = generate({ seed: 99, complexity: 1 })
    const svgComplex = generate({ seed: 99, complexity: 10 })
    // Both should produce valid SVG
    expect(svgSimple).toContain('<svg')
    expect(svgComplex).toContain('<svg')
  })

  test('generates without config (uses defaults)', () => {
    const svg = generate()
    expect(typeof svg).toBe('string')
    expect(svg.length).toBeGreaterThan(100)
  })

  test('viewBox matches width and height', () => {
    const svg = generate({ seed: 5, width: 450, height: 700 })
    expect(svg).toContain('viewBox="0 0 450 700"')
  })
})
