import type { UrnesElement, GeneratorConfig } from '../core/types.ts'
import type { Rng } from '../core/random.ts'
import { generateGreatBeast, generateSerpent } from '../elements/serpent.ts'
import { generateVines } from '../elements/vine.ts'

/**
 * Compose a panel layout: elements arranged within rectangular bounds.
 * Returns all elements in draw order: vines first, serpents, then beast on top.
 */
export function composePanel(rng: Rng, config: GeneratorConfig): UrnesElement[] {
  const bounds = { width: config.width, height: config.height }
  const elements: UrnesElement[] = []

  // Urnes style: open interlacing with visible background — minimal fill elements
  // Vines omitted to match authentic sparse Urnes aesthetic

  // 2. Generate secondary serpents
  for (let i = 0; i < config.elements.serpents; i++) {
    elements.push(generateSerpent(rng, bounds, i))
  }

  // 3. Generate the great beast on top (~60% of space, fitting within bounds)
  if (config.elements.greatBeast) {
    const beast = generateGreatBeast(rng, bounds)
    elements.push(beast)
  }

  return elements
}
