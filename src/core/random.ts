export interface Rng {
  next(): number           // 0-1
  range(min: number, max: number): number  // min-max float
  int(min: number, max: number): number    // min-max integer inclusive
  pick<T>(arr: T[]): T
  shuffle<T>(arr: T[]): T[]
  chance(probability: number): boolean
}

export function createRng(seed: number): Rng {
  let state = seed | 0

  function next(): number {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range(min, max) { return min + next() * (max - min) },
    int(min, max) { return Math.floor(min + next() * (max - min + 1)) },
    pick(arr) { return arr[Math.floor(next() * arr.length)]! },
    shuffle(arr) {
      const result = [...arr]
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[result[i], result[j]] = [result[j]!, result[i]!]
      }
      return result
    },
    chance(p) { return next() < p },
  }
}
