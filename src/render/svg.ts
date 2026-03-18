import type { Point, Ribbon, RenderConfig } from '../core/types.ts'

/** Round to 2 decimal places for compact SVG output. */
function r(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Convert an array of points to an SVG path d attribute using smooth
 * cubic bezier curves (Catmull-Rom interpolation).
 */
export function pointsToSmoothPath(points: Point[], closed: boolean = false): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${r(points[0]!.x)} ${r(points[0]!.y)}`
  if (points.length === 2) {
    return `M ${r(points[0]!.x)} ${r(points[0]!.y)} L ${r(points[1]!.x)} ${r(points[1]!.y)}`
  }

  const n = points.length
  const alpha = 1 / 3

  let d = `M ${r(points[0]!.x)} ${r(points[0]!.y)}`

  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? (closed ? points[n - 1]! : points[0]!) : points[i - 1]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = i + 2 >= n
      ? (closed ? points[(i + 2) % n]! : points[n - 1]!)
      : points[i + 2]!

    const cp1x = r(p1.x + (p2.x - p0.x) * alpha)
    const cp1y = r(p1.y + (p2.y - p0.y) * alpha)
    const cp2x = r(p2.x - (p3.x - p1.x) * alpha)
    const cp2y = r(p2.y - (p3.y - p1.y) * alpha)

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${r(p2.x)} ${r(p2.y)}`
  }

  if (closed) {
    const p0 = points[n - 2]!
    const p1 = points[n - 1]!
    const p2 = points[0]!
    const p3 = points[1]!

    const cp1x = r(p1.x + (p2.x - p0.x) * alpha)
    const cp1y = r(p1.y + (p2.y - p0.y) * alpha)
    const cp2x = r(p2.x - (p3.x - p1.x) * alpha)
    const cp2y = r(p2.y - (p3.y - p1.y) * alpha)

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${r(p2.x)} ${r(p2.y)}`
    d += ' Z'
  }

  return d
}

/**
 * Create a semicircular arc between two points (for rounded ribbon ends).
 */
function roundedCap(from: Point, to: Point): string {
  const mx = r((from.x + to.x) / 2)
  const my = r((from.y + to.y) / 2)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const radius = r(Math.sqrt(dx * dx + dy * dy) / 2)
  if (radius < 0.5) return `L ${r(to.x)} ${r(to.y)}`
  return `A ${radius} ${radius} 0 0 1 ${r(to.x)} ${r(to.y)}`
}

/**
 * Render a ribbon as a filled SVG path.
 * Traces left points forward, then right points in reverse to close the shape.
 * Uses rounded end-caps for clean interlace gap appearance.
 */
export function renderRibbon(
  ribbon: Ribbon,
  style: { fill: string; stroke: string; strokeWidth: number }
): string {
  const { left, right } = ribbon

  if (left.length === 0) return ''

  // Build path: left forward + rounded cap + right reversed + rounded cap close
  const leftPath = pointsToSmoothPath(left, false)
  const reversedRight = [...right].reverse()

  const rightSegments = pointsToSmoothPath(reversedRight, false)
  const rightCommands = rightSegments.replace(/^M [0-9.-]+ [0-9.-]+/, '').trim()

  // Rounded end-cap at the "far" end (left end → right end)
  const farCap = roundedCap(left[left.length - 1]!, reversedRight[0]!)
  // Rounded end-cap closing back to start
  const nearCap = roundedCap(reversedRight[reversedRight.length - 1]!, left[0]!)

  const d = `${leftPath} ${farCap} ${rightCommands} ${nearCap} Z`

  return `<path d="${d}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`
}

/**
 * Render an almond-shaped Urnes-style animal head with eye.
 */
export function renderHead(
  position: Point,
  tangent: Point,
  size: number,
  style: { fill: string; stroke: string; strokeWidth: number }
): string {
  const len = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y)
  const tx = len > 1e-10 ? tangent.x / len : 1
  const ty = len > 1e-10 ? tangent.y / len : 0

  // Normal vector (perpendicular to tangent)
  const nx = -ty
  const ny = tx

  const halfW = size * 0.35
  const halfH = size * 0.6

  // Almond shape: tip at front, wide in middle, narrow at back
  const frontTip = { x: position.x + tx * halfH, y: position.y + ty * halfH }
  const backTip = { x: position.x - tx * halfH, y: position.y - ty * halfH }
  const topMid = { x: position.x + nx * halfW, y: position.y + ny * halfW }
  const botMid = { x: position.x - nx * halfW, y: position.y - ny * halfW }

  // Control points for the almond curves
  const cpTopFront = {
    x: position.x + tx * halfH * 0.5 + nx * halfW,
    y: position.y + ty * halfH * 0.5 + ny * halfW,
  }
  const cpTopBack = {
    x: position.x - tx * halfH * 0.5 + nx * halfW,
    y: position.y - ty * halfH * 0.5 + ny * halfW,
  }
  const cpBotFront = {
    x: position.x + tx * halfH * 0.5 - nx * halfW,
    y: position.y + ty * halfH * 0.5 - ny * halfW,
  }
  const cpBotBack = {
    x: position.x - tx * halfH * 0.5 - nx * halfW,
    y: position.y - ty * halfH * 0.5 - ny * halfW,
  }

  const bodyPath = [
    `M ${r(frontTip.x)} ${r(frontTip.y)}`,
    `C ${r(cpTopFront.x)} ${r(cpTopFront.y)} ${r(cpTopBack.x)} ${r(cpTopBack.y)} ${r(backTip.x)} ${r(backTip.y)}`,
    `C ${r(cpBotBack.x)} ${r(cpBotBack.y)} ${r(cpBotFront.x)} ${r(cpBotFront.y)} ${r(frontTip.x)} ${r(frontTip.y)}`,
    'Z',
  ].join(' ')

  // Almond-shaped eye offset toward front-top
  const eyeR = r(size * 0.08)
  const eyeX = r(position.x + tx * halfH * 0.2 + nx * halfW * 0.35)
  const eyeY = r(position.y + ty * halfH * 0.2 + ny * halfW * 0.35)

  // Upper lip lappet — curling tendril from snout tip
  const lapLen = size * 0.5
  const upperLap = [
    `M ${r(frontTip.x)} ${r(frontTip.y)}`,
    `C ${r(frontTip.x + tx * lapLen * 0.3 + nx * lapLen * 0.6)} ${r(frontTip.y + ty * lapLen * 0.3 + ny * lapLen * 0.6)}`,
    `${r(frontTip.x - tx * lapLen * 0.2 + nx * lapLen * 0.8)} ${r(frontTip.y - ty * lapLen * 0.2 + ny * lapLen * 0.8)}`,
    `${r(frontTip.x - tx * lapLen * 0.1 + nx * lapLen * 0.4)} ${r(frontTip.y - ty * lapLen * 0.1 + ny * lapLen * 0.4)}`,
  ].join(' ')

  // Lower lip lappet — shorter curl from lower jaw
  const lowerLapLen = size * 0.35
  const lowerLap = [
    `M ${r(frontTip.x)} ${r(frontTip.y)}`,
    `C ${r(frontTip.x + tx * lowerLapLen * 0.3 - nx * lowerLapLen * 0.5)} ${r(frontTip.y + ty * lowerLapLen * 0.3 - ny * lowerLapLen * 0.5)}`,
    `${r(frontTip.x - tx * lowerLapLen * 0.1 - nx * lowerLapLen * 0.6)} ${r(frontTip.y - ty * lowerLapLen * 0.1 - ny * lowerLapLen * 0.6)}`,
    `${r(frontTip.x - tx * lowerLapLen * 0.05 - nx * lowerLapLen * 0.3)} ${r(frontTip.y - ty * lowerLapLen * 0.05 - ny * lowerLapLen * 0.3)}`,
  ].join(' ')

  const headEl = `<path d="${bodyPath}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linejoin="round"/>`
  const eyeEl = `<circle cx="${eyeX}" cy="${eyeY}" r="${eyeR}" fill="#1a1a1a" stroke="none"/>`
  const upperLapEl = `<path d="${upperLap}" fill="none" stroke="${style.stroke}" stroke-width="${r(style.strokeWidth * 0.8)}" stroke-linecap="round"/>`
  const lowerLapEl = `<path d="${lowerLap}" fill="none" stroke="${style.stroke}" stroke-width="${r(style.strokeWidth * 0.6)}" stroke-linecap="round"/>`

  return `<g>${headEl}${upperLapEl}${lowerLapEl}${eyeEl}</g>`
}

/**
 * Wrap SVG content in a complete SVG document.
 */
export function renderSvg(content: string, config: RenderConfig): string {
  const { width, height, background } = config
  const bgRect = background
    ? `<rect width="${width}" height="${height}" fill="${background}"/>`
    : ''

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    bgRect,
    content,
    `</svg>`,
  ].join('\n')
}
