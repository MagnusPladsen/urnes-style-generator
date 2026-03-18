export interface Point {
  x: number
  y: number
}

export interface CubicBezier {
  start: Point
  cp1: Point
  cp2: Point
  end: Point
}

export interface CurvePath {
  segments: CubicBezier[]
  closed: boolean
}

export interface Ribbon {
  left: Point[]
  right: Point[]
  spine: Point[]
}

export interface Crossing {
  pathAId: string
  pathBId: string
  paramA: number
  paramB: number
  point: Point
  overPath: 'A' | 'B'
}

export interface UrnesElement {
  id: string
  type: 'great-beast' | 'serpent' | 'vine'
  spine: CurvePath
  widthProfile: number[]
  ribbon?: Ribbon
  headPosition?: 'start' | 'end'
  children?: UrnesElement[] // limbs
}

export interface GeneratorConfig {
  seed: number
  width: number
  height: number
  composition: 'panel' | 'border' | 'circular' | 'freeform'
  complexity: number // 1-10
  elements: {
    greatBeast: boolean
    serpents: number // 0-3
    vines: boolean
  }
  style: {
    strokeWidth: number
    gapSize: number
    fill: boolean
    tapering: boolean
    strokeColor: string
    fillColor: string
  }
}

export interface RenderConfig {
  width: number
  height: number
  style: GeneratorConfig['style']
  background?: string
}

export const DEFAULT_CONFIG: GeneratorConfig = {
  seed: 42,
  width: 400,
  height: 600,
  composition: 'panel',
  complexity: 5,
  elements: {
    greatBeast: true,
    serpents: 1,
    vines: true,
  },
  style: {
    strokeWidth: 2,
    gapSize: 6,
    fill: true,
    tapering: true,
    strokeColor: '#1a1a1a',
    fillColor: '#1a1a1a',
  },
}
