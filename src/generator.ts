import type { GeneratorConfig, UrnesElement, RenderConfig } from './core/types.ts'
import { DEFAULT_CONFIG } from './core/types.ts'
import { createRng } from './core/random.ts'
import { generateRibbon } from './core/ribbon.ts'
import { evaluateAt, tangentAt } from './core/bezier.ts'
import { renderRibbon, renderHead, renderSvg } from './render/svg.ts'
import { assignCrossings, createInterlaceGaps } from './interlace/weave.ts'
import type { RibbonSegment } from './interlace/weave.ts'
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
 * Render ribbon segments for an element using index-based slicing.
 * Returns SVG path strings for segments matching the requested over/under state.
 */
function renderElementSegments(
  el: UrnesElement,
  segments: RibbonSegment[],
  style: GeneratorConfig['style'],
  onlyOver: boolean
): string[] {
  const parts: string[] = []
  const fillColor = style.fill ? style.fillColor : 'none'
  const ribbon = el.ribbon
  if (!ribbon) return parts

  for (const seg of segments) {
    if (seg.isOver !== onlyOver) continue
    if (seg.endIdx - seg.startIdx < 2) continue

    const segRibbon = {
      left: ribbon.left.slice(seg.startIdx, seg.endIdx),
      right: ribbon.right.slice(seg.startIdx, seg.endIdx),
      spine: ribbon.spine.slice(seg.startIdx, seg.endIdx),
    }

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
  // Scale sample count to spine complexity for proper resolution
  function buildRibbon(el: UrnesElement): void {
    const segCount = el.spine.segments.length
    const sampleCount = Math.max(40, segCount * 10)
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
  const gapMap = createInterlaceGaps(allElements, crossings, config.style.gapSize, 0)

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

    const segments = gapMap.get(el.id)

    if (!segments || segments.length === 0) {
      // No interlace data: render full ribbon
      overParts.push(renderRibbon(el.ribbon, styleArgs))
    } else {
      // Render under segments first (drawn behind), then over segments
      underParts.push(...renderElementSegments(el, segments, config.style, false))
      overParts.push(...renderElementSegments(el, segments, config.style, true))
    }

    // Render head if element has one
    if (el.headPosition && el.spine.segments.length > 0) {
      const headSize = el.type === 'great-beast'
        ? Math.max(config.style.strokeWidth * 6, 28)
        : Math.max(config.style.strokeWidth * 4, 18)

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
    background: '#1a1a1a',
  }

  return renderSvg(content, renderConfig)
}
