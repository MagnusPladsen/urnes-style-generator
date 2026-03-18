import type { GeneratorConfig, UrnesElement, RenderConfig } from './core/types.ts'
import { DEFAULT_CONFIG } from './core/types.ts'
import { createRng } from './core/random.ts'
import { generateRibbon } from './core/ribbon.ts'
import { evaluateAt, tangentAt } from './core/bezier.ts'
import { renderRibbon, renderHead, renderSvg, pointsToSmoothPath } from './render/svg.ts'
import { assignCrossings, createInterlaceGaps } from './interlace/weave.ts'
import { composePanel } from './compose/panel.ts'
import { composeBorder } from './compose/border.ts'

/**
 * Deep merge two objects. Values from `overrides` take precedence.
 */
function deepMerge<T extends Record<string, unknown>>(base: T, overrides: Partial<T>): T {
  const result = { ...base }
  for (const key in overrides) {
    const val = overrides[key]
    if (val !== undefined) {
      if (
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          val as Record<string, unknown>
        ) as T[Extract<keyof T, string>]
      } else {
        result[key] = val as T[Extract<keyof T, string>]
      }
    }
  }
  return result
}

/**
 * Get the tangent at the start of an element's spine.
 */
function getSpineStartTangent(el: UrnesElement): { x: number; y: number } {
  const seg = el.spine.segments[0]
  if (!seg) return { x: 1, y: 0 }
  return tangentAt(seg, 0)
}

/**
 * Get the position at the start of an element's spine.
 */
function getSpineStartPoint(el: UrnesElement): { x: number; y: number } {
  const seg = el.spine.segments[0]
  if (!seg) return { x: 0, y: 0 }
  return evaluateAt(seg, 0)
}

/**
 * Get the position at the end of an element's spine.
 */
function getSpineEndPoint(el: UrnesElement): { x: number; y: number } {
  const segs = el.spine.segments
  if (segs.length === 0) return { x: 0, y: 0 }
  const last = segs[segs.length - 1]!
  return evaluateAt(last, 1)
}

/**
 * Get the tangent at the end of an element's spine.
 */
function getSpineEndTangent(el: UrnesElement): { x: number; y: number } {
  const segs = el.spine.segments
  if (segs.length === 0) return { x: 1, y: 0 }
  const last = segs[segs.length - 1]!
  return tangentAt(last, 1)
}

/**
 * Render a single element's ribbon using interlace gap segments.
 * Returns an array of SVG path strings, grouped by over/under.
 */
function renderElementRibbon(
  el: UrnesElement,
  segments: { x: number; y: number }[][],
  isOverArr: boolean[],
  style: GeneratorConfig['style'],
  onlyOver: boolean
): string[] {
  const parts: string[] = []
  const fillColor = style.fill ? style.fillColor : 'none'

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!
    const isOver = isOverArr[i] ?? true

    if (onlyOver !== isOver) continue
    if (seg.length < 2) continue

    // Build a simplified ribbon from the segment points (spine-only segments)
    // We need to generate a proper ribbon from these spine points
    // by computing the width profile subset that matches this segment position
    const spineTotal = el.spine.segments.length * 60 // approximate total sample count
    const ribbon = el.ribbon

    if (!ribbon) continue

    // Find the corresponding left/right points from the full ribbon
    // The segment points are spine samples; map them to ribbon indices
    const totalSpinePoints = ribbon.spine.length
    const segLeft: { x: number; y: number }[] = []
    const segRight: { x: number; y: number }[] = []

    for (const pt of seg) {
      // Find closest spine point index
      let bestIdx = 0
      let bestDist = Infinity
      for (let j = 0; j < totalSpinePoints; j++) {
        const sp = ribbon.spine[j]!
        const dx = sp.x - pt.x
        const dy = sp.y - pt.y
        const d = dx * dx + dy * dy
        if (d < bestDist) {
          bestDist = d
          bestIdx = j
        }
      }
      segLeft.push(ribbon.left[bestIdx]!)
      segRight.push(ribbon.right[bestIdx]!)
    }

    const segRibbon = { left: segLeft, right: segRight, spine: seg }
    parts.push(
      renderRibbon(segRibbon, {
        fill: fillColor,
        stroke: style.strokeColor,
        strokeWidth: style.strokeWidth,
      })
    )
  }

  return parts
}

/**
 * Main generator function. Orchestrates element composition, interlacing, and rendering.
 */
export function generate(userConfig?: Partial<GeneratorConfig>): string {
  const config = deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, (userConfig ?? {}) as Record<string, unknown>) as GeneratorConfig

  const rng = createRng(config.seed)

  // Compose elements based on composition type
  let elements: UrnesElement[]
  switch (config.composition) {
    case 'border':
      elements = composeBorder(rng, config)
      break
    case 'panel':
    case 'circular':
    case 'freeform':
    default:
      elements = composePanel(rng, config)
      break
  }

  // Generate ribbons for all elements (including children/limbs)
  const sampleCount = Math.max(40, config.complexity * 8)

  function buildRibbon(el: UrnesElement): void {
    el.ribbon = generateRibbon(el.spine, el.widthProfile, sampleCount)
    if (el.children) {
      for (const child of el.children) {
        buildRibbon(child)
      }
    }
  }

  for (const el of elements) {
    buildRibbon(el)
  }

  // Flatten all elements (including children) for interlace processing
  function flattenElements(el: UrnesElement): UrnesElement[] {
    const result: UrnesElement[] = [el]
    if (el.children) {
      for (const child of el.children) {
        result.push(...flattenElements(child))
      }
    }
    return result
  }

  const allElements = elements.flatMap(flattenElements)

  // Run interlace engine
  const crossings = assignCrossings(allElements)
  const gapMap = createInterlaceGaps(allElements, crossings, config.style.gapSize)

  const fillColor = config.style.fill ? config.style.fillColor : 'none'
  const styleArgs = {
    fill: fillColor,
    stroke: config.style.strokeColor,
    strokeWidth: config.style.strokeWidth,
  }

  // Collect SVG parts
  const underParts: string[] = []
  const overParts: string[] = []
  const headParts: string[] = []

  function processElement(el: UrnesElement): void {
    if (!el.ribbon) return

    const gapData = gapMap.get(el.id)

    if (!gapData || gapData.segments.length === 0) {
      // No interlace data: render full ribbon
      overParts.push(renderRibbon(el.ribbon, styleArgs))
    } else {
      // Render under segments first (they will be drawn behind)
      const underSegs = renderElementRibbon(el, gapData.segments, gapData.isOver, config.style, false)
      underParts.push(...underSegs)

      // Render over segments
      const overSegs = renderElementRibbon(el, gapData.segments, gapData.isOver, config.style, true)
      overParts.push(...overSegs)
    }

    // Render head if element has one
    if (el.headPosition && el.spine.segments.length > 0) {
      const headSize = el.type === 'great-beast'
        ? Math.max(config.style.strokeWidth * 4, 18)
        : Math.max(config.style.strokeWidth * 3, 12)

      if (el.headPosition === 'start') {
        const pos = getSpineStartPoint(el)
        const tan = getSpineStartTangent(el)
        headParts.push(renderHead(pos, tan, headSize, styleArgs))
      } else {
        const pos = getSpineEndPoint(el)
        const tan = getSpineEndTangent(el)
        headParts.push(renderHead(pos, tan, headSize, styleArgs))
      }
    }

    // Process children
    if (el.children) {
      for (const child of el.children) {
        processElement(child)
      }
    }
  }

  for (const el of elements) {
    processElement(el)
  }

  // Assemble SVG content: under → over → heads
  const content = [
    underParts.join('\n'),
    overParts.join('\n'),
    headParts.join('\n'),
  ].filter(Boolean).join('\n')

  const renderConfig: RenderConfig = {
    width: config.width,
    height: config.height,
    style: config.style,
  }

  return renderSvg(content, renderConfig)
}
