import type { Point } from '../core/types.ts'

/**
 * Generate SVG path data for an Urnes-style almond-shaped animal head in profile.
 * The head faces in the direction of the tangent vector.
 * Returns only the `d` attribute content (the path commands).
 */
export function generateHead(position: Point, tangent: Point, size: number): string {
  const len = Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y)
  const tx = len > 1e-10 ? tangent.x / len : 1
  const ty = len > 1e-10 ? tangent.y / len : 0

  // Normal (perpendicular to tangent, pointing "up")
  const nx = -ty
  const ny = tx

  const halfLen = size * 0.55  // forward length
  const halfW = size * 0.32    // lateral width

  // Key head points
  // Snout tip (pointed, facing tangent direction)
  const snout = {
    x: position.x + tx * halfLen,
    y: position.y + ty * halfLen,
  }

  // Back of head (rounded)
  const back = {
    x: position.x - tx * halfLen * 0.7,
    y: position.y - ty * halfLen * 0.7,
  }

  // Top of head (cranial curve)
  const topMid = {
    x: position.x + nx * halfW + tx * halfLen * 0.1,
    y: position.y + ny * halfW + ty * halfLen * 0.1,
  }

  // Jaw line (lower, slight curve)
  const botMid = {
    x: position.x - nx * halfW * 0.7 + tx * halfLen * 0.05,
    y: position.y - ny * halfW * 0.7 + ty * halfLen * 0.05,
  }

  // Lip curl point (slight upturn at snout bottom)
  const lipCurl = {
    x: snout.x - nx * halfW * 0.25,
    y: snout.y - ny * halfW * 0.25,
  }

  // Control points for top curve (snout → top → back)
  const cpSnoutTop = {
    x: snout.x + nx * halfW * 0.5,
    y: snout.y + ny * halfW * 0.5,
  }
  const cpTopBack = {
    x: back.x + nx * halfW * 0.6,
    y: back.y + ny * halfW * 0.6,
  }

  // Control points for jaw line (back → jaw → lip curl)
  const cpBackBot = {
    x: back.x - nx * halfW * 0.5,
    y: back.y - ny * halfW * 0.5,
  }
  const cpBotLip = {
    x: lipCurl.x - nx * halfW * 0.4 - tx * halfLen * 0.2,
    y: lipCurl.y - ny * halfW * 0.4 - ty * halfLen * 0.2,
  }

  // Eye position: offset toward front-top of head
  const eyeX = position.x + tx * halfLen * 0.25 + nx * halfW * 0.45
  const eyeY = position.y + ty * halfLen * 0.25 + ny * halfW * 0.45
  const eyeRx = size * 0.1
  const eyeRy = size * 0.065
  const eyeAngle = Math.atan2(ty, tx) * 180 / Math.PI

  // Head outline path: snout → top curve → back → jaw → lip curl → snout
  const headPath = [
    `M ${snout.x.toFixed(2)} ${snout.y.toFixed(2)}`,
    // Top curve: snout to back via top
    `C ${cpSnoutTop.x.toFixed(2)} ${cpSnoutTop.y.toFixed(2)} ${topMid.x.toFixed(2)} ${topMid.y.toFixed(2)} ${back.x.toFixed(2)} ${back.y.toFixed(2)}`,
    // Jaw line: back to bottom jaw
    `C ${cpBackBot.x.toFixed(2)} ${cpBackBot.y.toFixed(2)} ${botMid.x.toFixed(2)} ${botMid.y.toFixed(2)} ${lipCurl.x.toFixed(2)} ${lipCurl.y.toFixed(2)}`,
    // Lip curl back to snout
    `C ${cpBotLip.x.toFixed(2)} ${cpBotLip.y.toFixed(2)} ${snout.x.toFixed(2)} ${snout.y.toFixed(2)} ${snout.x.toFixed(2)} ${snout.y.toFixed(2)}`,
    'Z',
  ].join(' ')

  // Almond eye path
  const eyePath = [
    `M ${(eyeX + eyeRx).toFixed(2)} ${eyeY.toFixed(2)}`,
    `A ${eyeRx.toFixed(2)} ${eyeRy.toFixed(2)} ${eyeAngle.toFixed(1)} 0 1 ${(eyeX - eyeRx).toFixed(2)} ${eyeY.toFixed(2)}`,
    `A ${eyeRx.toFixed(2)} ${eyeRy.toFixed(2)} ${eyeAngle.toFixed(1)} 0 1 ${(eyeX + eyeRx).toFixed(2)} ${eyeY.toFixed(2)}`,
    'Z',
  ].join(' ')

  // Return combined path data (head outline + eye)
  return `${headPath} ${eyePath}`
}
