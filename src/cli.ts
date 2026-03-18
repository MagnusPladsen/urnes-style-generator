#!/usr/bin/env bun
import { generate } from './generator.ts'
import { toCssBackground } from './render/css.ts'
import type { GeneratorConfig } from './core/types.ts'

function printHelp(): void {
  console.log(`
Urnes Style Generator — CLI

Usage:
  bun run src/cli.ts [options]

Options:
  --seed <number>          Random seed (default: random)
  --width <number>         SVG width in pixels (default: 400)
  --height <number>        SVG height in pixels (default: 600)
  --composition <type>     Layout: panel | border (default: panel)
  --complexity <1-10>      Pattern complexity (default: 5)
  --output <path>          Output file path (default: stdout)
  --css                    Output CSS background-image instead of SVG
  --help                   Show this help message

Examples:
  bun run src/cli.ts --seed 42 --output output/test.svg
  bun run src/cli.ts --seed 7 --composition border --width 800 --height 200
  bun run src/cli.ts --seed 1 --css > pattern.css
`.trim())
}

function parseArgs(argv: string[]): {
  seed: number
  width: number
  height: number
  composition: 'panel' | 'border'
  complexity: number
  output: string | null
  css: boolean
  help: boolean
} {
  const args = argv.slice(2) // skip "bun" and script path

  let seed = Math.floor(Math.random() * 0xffffffff)
  let width = 400
  let height = 600
  let composition: 'panel' | 'border' = 'panel'
  let complexity = 5
  let output: string | null = null
  let css = false
  let help = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    switch (arg) {
      case '--help':
      case '-h':
        help = true
        break
      case '--css':
        css = true
        break
      case '--seed':
        seed = parseInt(args[++i] ?? '42', 10)
        break
      case '--width':
        width = parseInt(args[++i] ?? '400', 10)
        break
      case '--height':
        height = parseInt(args[++i] ?? '600', 10)
        break
      case '--composition': {
        const val = args[++i] ?? 'panel'
        composition = val === 'border' ? 'border' : 'panel'
        break
      }
      case '--complexity':
        complexity = Math.max(1, Math.min(10, parseInt(args[++i] ?? '5', 10)))
        break
      case '--output':
        output = args[++i] ?? null
        break
      default:
        console.error(`Unknown option: ${arg}`)
        process.exit(1)
    }
  }

  return { seed, width, height, composition, complexity, output, css, help }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv)

  if (opts.help) {
    printHelp()
    process.exit(0)
  }

  const config: Partial<GeneratorConfig> = {
    seed: opts.seed,
    width: opts.width,
    height: opts.height,
    composition: opts.composition,
    complexity: opts.complexity,
  }

  const svg = generate(config)
  const output = opts.css ? toCssBackground(svg) : svg

  if (opts.output) {
    await Bun.write(opts.output, output)
    console.error(`Urnes Pattern Generated:
  Seed: ${opts.seed}
  Size: ${opts.width}×${opts.height}
  Composition: ${opts.composition}
  Complexity: ${opts.complexity}
  Output: ${opts.output}`)
  } else {
    console.log(output)
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
