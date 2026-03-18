import { test, expect, describe } from 'bun:test'
import {
  pointsToSmoothPath,
  renderRibbon,
  renderSvg,
  renderHead,
} from '../../src/render/svg.ts'
import type { Point, Ribbon, RenderConfig } from '../../src/core/types.ts'
import { DEFAULT_CONFIG } from '../../src/core/types.ts'

describe('pointsToSmoothPath', () => {
  test('starts with M command', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]
    const d = pointsToSmoothPath(points)
    expect(d.startsWith('M')).toBe(true)
  })

  test('includes coordinates of first point', () => {
    const points: Point[] = [{ x: 5, y: 10 }, { x: 20, y: 30 }, { x: 40, y: 20 }]
    const d = pointsToSmoothPath(points)
    expect(d).toContain('5')
    expect(d).toContain('10')
  })

  test('returns empty string for no points', () => {
    const d = pointsToSmoothPath([])
    expect(d).toBe('')
  })

  test('returns just M for single point', () => {
    const d = pointsToSmoothPath([{ x: 5, y: 10 }])
    expect(d).toBe('M 5 10')
  })

  test('uses C (cubic bezier) commands for smooth curves', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
      { x: 30, y: 10 },
    ]
    const d = pointsToSmoothPath(points)
    expect(d).toContain('C')
  })

  test('closed path ends with Z', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]
    const d = pointsToSmoothPath(points, true)
    expect(d.endsWith('Z')).toBe(true)
  })

  test('open path does not end with Z', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]
    const d = pointsToSmoothPath(points, false)
    expect(d.endsWith('Z')).toBe(false)
  })

  test('two-point path uses L command', () => {
    const d = pointsToSmoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])
    expect(d).toContain('L')
  })
})

describe('renderRibbon', () => {
  const ribbon: Ribbon = {
    left: [
      { x: 0, y: -5 },
      { x: 5, y: -5 },
      { x: 10, y: -5 },
    ],
    right: [
      { x: 0, y: 5 },
      { x: 5, y: 5 },
      { x: 10, y: 5 },
    ],
    spine: [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ],
  }

  const style = { fill: '#ff0000', stroke: '#000000', strokeWidth: 1 }

  test('creates a path element', () => {
    const result = renderRibbon(ribbon, style)
    expect(result).toContain('<path')
    expect(result).toContain('/>')
  })

  test('path has fill attribute', () => {
    const result = renderRibbon(ribbon, style)
    expect(result).toContain('fill="#ff0000"')
  })

  test('path has stroke attribute', () => {
    const result = renderRibbon(ribbon, style)
    expect(result).toContain('stroke="#000000"')
  })

  test('path has d attribute starting with M', () => {
    const result = renderRibbon(ribbon, style)
    expect(result).toMatch(/d="M/)
  })

  test('path is closed with Z', () => {
    const result = renderRibbon(ribbon, style)
    expect(result).toContain('Z')
  })

  test('returns empty string for empty ribbon', () => {
    const emptyRibbon: Ribbon = { left: [], right: [], spine: [] }
    const result = renderRibbon(emptyRibbon, style)
    expect(result).toBe('')
  })

  test('includes stroke-width attribute', () => {
    const result = renderRibbon(ribbon, style)
    expect(result).toContain('stroke-width="1"')
  })
})

describe('renderSvg', () => {
  const config: RenderConfig = {
    width: 400,
    height: 600,
    style: DEFAULT_CONFIG.style,
  }

  test('wraps in svg element', () => {
    const result = renderSvg('<rect/>', config)
    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  test('includes viewBox attribute', () => {
    const result = renderSvg('', config)
    expect(result).toContain('viewBox="0 0 400 600"')
  })

  test('includes width and height attributes', () => {
    const result = renderSvg('', config)
    expect(result).toContain('width="400"')
    expect(result).toContain('height="600"')
  })

  test('includes SVG namespace', () => {
    const result = renderSvg('', config)
    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  test('includes content inside svg element', () => {
    const result = renderSvg('<circle r="5"/>', config)
    expect(result).toContain('<circle r="5"/>')
  })

  test('includes background rect when background is set', () => {
    const configWithBg: RenderConfig = { ...config, background: '#ffffff' }
    const result = renderSvg('', configWithBg)
    expect(result).toContain('fill="#ffffff"')
    expect(result).toContain('<rect')
  })

  test('no background rect when background is not set', () => {
    const result = renderSvg('', config)
    expect(result).not.toContain('<rect')
  })

  test('is a valid XML document starting with xml declaration', () => {
    const result = renderSvg('', config)
    expect(result.startsWith('<?xml')).toBe(true)
  })
})

describe('renderHead', () => {
  const position: Point = { x: 100, y: 100 }
  const tangent: Point = { x: 1, y: 0 }
  const size = 20
  const style = { fill: '#1a1a1a', stroke: '#000000', strokeWidth: 1 }

  test('returns a group element', () => {
    const result = renderHead(position, tangent, size, style)
    expect(result).toContain('<g>')
    expect(result).toContain('</g>')
  })

  test('contains a path element for the head body', () => {
    const result = renderHead(position, tangent, size, style)
    expect(result).toContain('<path')
  })

  test('contains a circle element for the eye', () => {
    const result = renderHead(position, tangent, size, style)
    expect(result).toContain('<circle')
  })

  test('head path starts with M', () => {
    const result = renderHead(position, tangent, size, style)
    expect(result).toMatch(/d="M/)
  })

  test('head path is closed with Z', () => {
    const result = renderHead(position, tangent, size, style)
    expect(result).toContain('Z')
  })

  test('handles zero tangent gracefully', () => {
    const zeroTangent: Point = { x: 0, y: 0 }
    expect(() => renderHead(position, zeroTangent, size, style)).not.toThrow()
  })

  test('includes fill style on head', () => {
    const result = renderHead(position, tangent, size, style)
    expect(result).toContain('fill="#1a1a1a"')
  })

  test('produces valid SVG with different tangent directions', () => {
    const upTangent: Point = { x: 0, y: -1 }
    const diagTangent: Point = { x: 1, y: 1 }
    expect(() => renderHead(position, upTangent, size, style)).not.toThrow()
    expect(() => renderHead(position, diagTangent, size, style)).not.toThrow()
    const result1 = renderHead(position, upTangent, size, style)
    expect(result1).toContain('<g>')
  })
})
