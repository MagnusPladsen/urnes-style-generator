import { generate } from '../src/generator.ts'
import { toCssBackground } from '../src/render/css.ts'
import type { GeneratorConfig } from '../src/core/types.ts'

let currentSvg = ''

function getConfig(): Partial<GeneratorConfig> {
  const seed = parseInt((document.getElementById('seed') as HTMLInputElement).value, 10)
  const width = parseInt((document.getElementById('width') as HTMLInputElement).value, 10)
  const height = parseInt((document.getElementById('height') as HTMLInputElement).value, 10)
  const composition = (document.getElementById('composition') as HTMLSelectElement).value as 'panel' | 'border'
  const complexity = parseInt((document.getElementById('complexity') as HTMLInputElement).value, 10)
  const fill = (document.getElementById('fill') as HTMLInputElement).checked
  const tapering = (document.getElementById('tapering') as HTMLInputElement).checked
  const strokeWidth = parseFloat((document.getElementById('strokeWidth') as HTMLInputElement).value)
  const gapSize = parseInt((document.getElementById('gapSize') as HTMLInputElement).value, 10)
  const strokeColor = (document.getElementById('strokeColor') as HTMLInputElement).value
  const fillColor = (document.getElementById('fillColor') as HTMLInputElement).value

  return {
    seed,
    width,
    height,
    composition,
    complexity,
    style: {
      fill,
      tapering,
      strokeWidth,
      gapSize,
      strokeColor,
      fillColor,
    },
  }
}

function setStatus(msg: string): void {
  const el = document.getElementById('status')
  if (el) el.textContent = msg
}

function doGenerate(): void {
  const config = getConfig()
  const t0 = performance.now()
  try {
    const svg = generate(config)
    currentSvg = svg
    const container = document.getElementById('svg-container')!
    container.innerHTML = svg
    const elapsed = (performance.now() - t0).toFixed(1)
    setStatus(`Generated in ${elapsed}ms  ·  seed ${config.seed}`)
  } catch (err) {
    setStatus(`Error: ${err}`)
    console.error(err)
  }
}

// Debounce helper
function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}

const debouncedGenerate = debounce(doGenerate, 400)

// Wire up controls
document.getElementById('generate-btn')!.addEventListener('click', doGenerate)

document.getElementById('randomize')!.addEventListener('click', () => {
  const seed = Math.floor(Math.random() * 0xffffffff)
  ;(document.getElementById('seed') as HTMLInputElement).value = String(seed)
  doGenerate()
})

// Slider value displays
function wireSlider(id: string): void {
  const slider = document.getElementById(id) as HTMLInputElement
  const display = document.getElementById(`${id}-val`)!
  slider.addEventListener('input', () => {
    display.textContent = slider.value
    debouncedGenerate()
  })
}

wireSlider('complexity')
wireSlider('strokeWidth')
wireSlider('gapSize')

// Auto-regenerate on change for other inputs
const autoInputs = ['seed', 'width', 'height', 'composition', 'fill', 'tapering', 'strokeColor', 'fillColor']
for (const id of autoInputs) {
  document.getElementById(id)!.addEventListener('change', debouncedGenerate)
}

// Export: Download SVG
document.getElementById('download-svg')!.addEventListener('click', () => {
  if (!currentSvg) return
  const blob = new Blob([currentSvg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const seed = (document.getElementById('seed') as HTMLInputElement).value
  a.href = url
  a.download = `urnes-${seed}.svg`
  a.click()
  URL.revokeObjectURL(url)
})

// Export: Copy CSS
document.getElementById('copy-css')!.addEventListener('click', async () => {
  if (!currentSvg) return
  const css = toCssBackground(currentSvg)
  await navigator.clipboard.writeText(css)
  setStatus('CSS copied to clipboard!')
  setTimeout(() => setStatus(''), 2000)
})

// Export: Copy SVG
document.getElementById('copy-svg')!.addEventListener('click', async () => {
  if (!currentSvg) return
  await navigator.clipboard.writeText(currentSvg)
  setStatus('SVG copied to clipboard!')
  setTimeout(() => setStatus(''), 2000)
})

// Generate on load
doGenerate()
