import { test, expect, describe } from 'bun:test'
import { toDataUri, toCssBackground, toCssClass } from '../../src/render/css.ts'

const sampleSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40"/></svg>'

describe('toDataUri()', () => {
  test('returns string starting with data:image/svg+xml', () => {
    const uri = toDataUri(sampleSvg)
    expect(uri).toMatch(/^data:image\/svg\+xml,/)
  })

  test('encodes the SVG content', () => {
    const uri = toDataUri(sampleSvg)
    expect(uri.length).toBeGreaterThan('data:image/svg+xml,'.length)
  })

  test('does not contain unescaped double quotes', () => {
    const uri = toDataUri(sampleSvg)
    // After the prefix, there should be no literal double quotes
    const encoded = uri.slice('data:image/svg+xml,'.length)
    expect(encoded).not.toContain('"')
  })

  test('does not contain unescaped single quotes', () => {
    const svgWithQuote = "<svg xmlns='http://www.w3.org/2000/svg'></svg>"
    const uri = toDataUri(svgWithQuote)
    const encoded = uri.slice('data:image/svg+xml,'.length)
    expect(encoded).not.toContain("'")
  })
})

describe('toCssBackground()', () => {
  test('returns valid CSS background-image property', () => {
    const css = toCssBackground(sampleSvg)
    expect(css).toMatch(/^background-image: url\(/)
    expect(css).toContain('data:image/svg+xml,')
    expect(css).toMatch(/\);$/)
  })

  test('wraps URI in url()', () => {
    const css = toCssBackground(sampleSvg)
    expect(css).toContain('url(')
    expect(css).toContain(')')
  })
})

describe('toCssClass()', () => {
  test('wraps in a CSS class selector', () => {
    const css = toCssClass(sampleSvg, 'my-pattern')
    expect(css).toMatch(/^\.my-pattern \{/)
    expect(css).toContain('}')
  })

  test('includes background-image property', () => {
    const css = toCssClass(sampleSvg, 'icon')
    expect(css).toContain('background-image')
    expect(css).toContain('data:image/svg+xml,')
  })

  test('includes background-repeat: no-repeat', () => {
    const css = toCssClass(sampleSvg, 'icon')
    expect(css).toContain('background-repeat: no-repeat')
  })

  test('includes background-size: contain', () => {
    const css = toCssClass(sampleSvg, 'icon')
    expect(css).toContain('background-size: contain')
  })

  test('uses the provided class name', () => {
    const css = toCssClass(sampleSvg, 'urnes-border')
    expect(css).toContain('.urnes-border')
  })
})
