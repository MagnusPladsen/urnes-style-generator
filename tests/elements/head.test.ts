import { test, expect, describe } from 'bun:test'
import { generateHead } from '../../src/elements/head.ts'

describe('generateHead', () => {
  test('returns non-empty SVG path string', () => {
    const pos = { x: 100, y: 100 }
    const tangent = { x: 1, y: 0 }
    const result = generateHead(pos, tangent, 20)

    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })

  test('contains M command (valid SVG path)', () => {
    const pos = { x: 50, y: 50 }
    const tangent = { x: 0, y: 1 }
    const result = generateHead(pos, tangent, 15)

    expect(result).toContain('M')
  })

  test('contains Z command (closed path)', () => {
    const pos = { x: 200, y: 300 }
    const tangent = { x: 1, y: 1 }
    const result = generateHead(pos, tangent, 25)

    expect(result).toContain('Z')
  })

  test('contains C command (cubic bezier curves)', () => {
    const pos = { x: 100, y: 100 }
    const tangent = { x: 1, y: 0 }
    const result = generateHead(pos, tangent, 20)

    expect(result).toContain('C')
  })

  test('contains A command (elliptical arc for eye)', () => {
    const pos = { x: 100, y: 100 }
    const tangent = { x: 1, y: 0 }
    const result = generateHead(pos, tangent, 20)

    expect(result).toContain('A')
  })

  test('result is a string (not SVG element)', () => {
    const pos = { x: 100, y: 100 }
    const tangent = { x: 1, y: 0 }
    const result = generateHead(pos, tangent, 20)

    // Should be path data, not an SVG element tag
    expect(typeof result).toBe('string')
    expect(result).not.toContain('<path')
    expect(result).not.toContain('<g>')
  })

  test('size parameter scales the head', () => {
    const pos = { x: 100, y: 100 }
    const tangent = { x: 1, y: 0 }

    const small = generateHead(pos, tangent, 10)
    const large = generateHead(pos, tangent, 40)

    // Larger size should produce different (larger) coordinates
    expect(small).not.toBe(large)
  })

  test('tangent direction affects orientation', () => {
    const pos = { x: 100, y: 100 }

    const rightFacing = generateHead(pos, { x: 1, y: 0 }, 20)
    const downFacing = generateHead(pos, { x: 0, y: 1 }, 20)

    expect(rightFacing).not.toBe(downFacing)
  })

  test('works with diagonal tangent', () => {
    const pos = { x: 200, y: 200 }
    const tangent = { x: 1, y: 1 }
    const result = generateHead(pos, tangent, 20)

    expect(result).toBeTruthy()
    expect(result).toContain('M')
  })

  test('works with zero-length tangent (fallback)', () => {
    const pos = { x: 100, y: 100 }
    const tangent = { x: 0, y: 0 }
    const result = generateHead(pos, tangent, 20)

    // Should not throw, should return valid path
    expect(result).toBeTruthy()
    expect(result).toContain('M')
  })
})
