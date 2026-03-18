/**
 * Convert an SVG string to a data URI.
 */
export function toDataUri(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml,${encoded}`
}

/**
 * Convert an SVG string to a CSS background-image property value.
 */
export function toCssBackground(svg: string): string {
  return `background-image: url("${toDataUri(svg)}");`
}

/**
 * Wrap an SVG string as a CSS class with background-image.
 */
export function toCssClass(svg: string, className: string): string {
  return `.${className} {\n  ${toCssBackground(svg)}\n  background-repeat: no-repeat;\n  background-size: contain;\n}`
}
