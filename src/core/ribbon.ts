import type { CurvePath, Ribbon, Point } from './types.ts'
import { samplePoints, normalAt } from './bezier.ts'

export function generateRibbon(
  spine: CurvePath,
  widthProfile: number[],
  sampleCount: number = 60
): Ribbon {
  // Sample spine points
  const spinePoints = samplePoints(spine, sampleCount)
  const left: Point[] = []
  const right: Point[] = []

  for (let i = 0; i < spinePoints.length; i++) {
    const t = i / (spinePoints.length - 1)
    // Interpolate width from profile
    const profileT = t * (widthProfile.length - 1)
    const profileIdx = Math.floor(profileT)
    const profileFrac = profileT - profileIdx
    const w0 = widthProfile[Math.min(profileIdx, widthProfile.length - 1)]!
    const w1 = widthProfile[Math.min(profileIdx + 1, widthProfile.length - 1)]!
    const width = (w0 + (w1 - w0) * profileFrac) / 2

    // Get normal at this point
    const segIdx = Math.min(
      Math.floor(t * spine.segments.length),
      spine.segments.length - 1
    )
    const segT = (t * spine.segments.length) - segIdx
    const seg = spine.segments[segIdx]!
    const normal = normalAt(seg, Math.min(segT, 1))

    const sp = spinePoints[i]!
    left.push({ x: sp.x + normal.x * width, y: sp.y + normal.y * width })
    right.push({ x: sp.x - normal.x * width, y: sp.y - normal.y * width })
  }

  return { left, right, spine: spinePoints }
}
