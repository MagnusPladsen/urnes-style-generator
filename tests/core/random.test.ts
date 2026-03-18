import { test, expect, describe } from 'bun:test'
import { createRng } from '../../src/core/random.ts'

describe('createRng', () => {
  test('same seed produces same sequence', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(42)
    for (let i = 0; i < 20; i++) {
      expect(rng1.next()).toBe(rng2.next())
    }
  })

  test('different seeds produce different sequences', () => {
    const rng1 = createRng(42)
    const rng2 = createRng(99)
    const seq1 = Array.from({ length: 10 }, () => rng1.next())
    const seq2 = Array.from({ length: 10 }, () => rng2.next())
    expect(seq1).not.toEqual(seq2)
  })

  test('next() returns values in [0, 1)', () => {
    const rng = createRng(123)
    for (let i = 0; i < 100; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  test('range() stays within bounds', () => {
    const rng = createRng(7)
    for (let i = 0; i < 100; i++) {
      const v = rng.range(5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(10)
    }
  })

  test('range() covers both min and max extremes statistically', () => {
    const rng = createRng(1337)
    const values = Array.from({ length: 1000 }, () => rng.range(0, 100))
    const min = Math.min(...values)
    const max = Math.max(...values)
    // Should get close to both ends over 1000 samples
    expect(min).toBeLessThan(5)
    expect(max).toBeGreaterThan(95)
  })

  test('int() returns integers', () => {
    const rng = createRng(55)
    for (let i = 0; i < 100; i++) {
      const v = rng.int(1, 10)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(10)
    }
  })

  test('int() is inclusive of both min and max', () => {
    const rng = createRng(9999)
    const values = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      values.add(rng.int(1, 3))
    }
    expect(values.has(1)).toBe(true)
    expect(values.has(2)).toBe(true)
    expect(values.has(3)).toBe(true)
  })

  test('pick() selects from array', () => {
    const rng = createRng(42)
    const arr = ['a', 'b', 'c', 'd']
    for (let i = 0; i < 50; i++) {
      const v = rng.pick(arr)
      expect(arr).toContain(v)
    }
  })

  test('pick() picks all elements eventually', () => {
    const rng = createRng(42)
    const arr = [1, 2, 3, 4, 5]
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) {
      seen.add(rng.pick(arr))
    }
    for (const v of arr) {
      expect(seen.has(v)).toBe(true)
    }
  })

  test('chance(0) always returns false', () => {
    const rng = createRng(42)
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false)
    }
  })

  test('chance(1) always returns true', () => {
    const rng = createRng(42)
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(1)).toBe(true)
    }
  })

  test('shuffle() returns all elements', () => {
    const rng = createRng(42)
    const arr = [1, 2, 3, 4, 5]
    const shuffled = rng.shuffle(arr)
    expect(shuffled.length).toBe(arr.length)
    expect(shuffled.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  test('shuffle() does not mutate original array', () => {
    const rng = createRng(42)
    const arr = [1, 2, 3, 4, 5]
    const original = [...arr]
    rng.shuffle(arr)
    expect(arr).toEqual(original)
  })
})
