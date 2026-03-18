import type { Point, Ribbon, RenderConfig } from '../core/types.ts'

/**
 * Convert an array of points to an SVG path d attribute using smooth
 * cubic bezier curves (Catmull-Rom interpolation).
 */
export function pointsToSmoothPath(points: Point[], closed: boolean = false): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`
  }

  const n = points.length
  const alpha = 1 / 3

  let d = `M ${points[0]!.x} ${points[0]!.y}`

  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? (closed ? points[n - 1]! : points[0]!) : points[i - 1]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = i + 2 >= n
      ? (closed ? points[(i + 2) % n]! : points[n - 1]!)
      : points[i + 2]!

    const cp1x = p1.x + (p2.x - p0.x) * alpha
    const cp1y = p1.y + (p2.y - p0.y) * alpha
    const cp2x = p2.x - (p3.x - p1.x) * alpha
    const cp2y = p2.y - (p3.y - p1.y) * alpha

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }

  if (closed) {
    const p0 = points[n - 2]!
    const p1 = points[n - 1]!
    const p2 = points[0]!
    const p3 = points[1]!

    const cp1x = p1.x + (p2.x - p0.x) * alpha
    const cp1y = p1.y + (p2.y - p0.y) * alpha
    const cp2x = p2.x - (p3.x - p1.x) * alpha
    const cp2y = p2.y - (p3.y - p1.y) * alpha

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
    d += ' Z'
  }

  return d
}

/**
 * Render a ribbon as a filled SVG path.
 * Traces left points forward, then right points in reverse to close the shape.
 */
export function renderRibbon(
  ribbon: Ribbon,
  style: { fill: string; stroke: string; strokeWidth: number }
): string {
  const { left, right } = ribbon

  if (left.length === 0) return ''

  // Build path: left forward + right reversed = closed ribbon shape
  const leftPath = pointsToSmoothPath(left, false)
  const reversedRight = [...right].reverse()

  // Connect end of left to end of right, then trace right back to start
  const rightSegments = pointsToSmoothPath(reversedRight, false)
  // Extract the commands after the M (we want to continue the path)
  const rightCommands = rightSegments.replace(/^M [0-9.-]+ [0-9.-]+/, '').trim()

  const d = `${leftPath} L ${reversedRight[0]!.x} ${reversedRight[0]!.y} ${rightCommands} Z`

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
    `M ${frontTip.x} ${frontTip.y}`,
    `C ${cpTopFront.x} ${cpTopFront.y} ${cpTopBack.x} ${cpTopBack.y} ${backTip.x} ${backTip.y}`,
    `C ${cpBotBack.x} ${cpBotBack.y} ${cpBotFront.x} ${cpBotFront.y} ${frontTip.x} ${frontTip.y}`,
    'Z',
  ].join(' ')

  // Eye: small circle offset toward front-top
  const eyeR = size * 0.08
  const eyeX = position.x + tx * halfH * 0.3 + nx * halfW * 0.4
  const eyeY = position.y + ty * halfH * 0.3 + ny * halfW * 0.4

  const headEl = `<path d="${bodyPath}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" stroke-linejoin="round"/>`
  const eyeEl = `<circle cx="${eyeX}" cy="${eyeY}" r="${eyeR}" fill="${style.stroke}" stroke="none"/>`

  return `<g>${headEl}${eyeEl}</g>`
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
