// Color utility functions for accessible contrast computation (build-time)

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [30, 64, 175] // fallback: #1e40af
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function linearize(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

function contrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = relativeLuminance(...rgb1)
  const l2 = relativeLuminance(...rgb2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(c => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ]
}

const WHITE: [number, number, number] = [255, 255, 255]
const MIN_CONTRAST = 4.5

/** Returns RGB string for text ON a primary-colored background */
export function computeOnPrimary(hex: string): string {
  const rgb = hexToRgb(hex)
  return contrastRatio(rgb, WHITE) >= MIN_CONTRAST ? '255 255 255' : '17 24 39'
}

/** Returns RGB string for primary-colored text ON a white background */
export function computePrimaryText(hex: string): string {
  const rgb = hexToRgb(hex)
  if (contrastRatio(rgb, WHITE) >= MIN_CONTRAST) {
    return `${rgb[0]} ${rgb[1]} ${rgb[2]}`
  }
  // Darken by reducing L in HSL until contrast >= 4.5
  const [h, s, l] = hexToHsl(hex)
  let currentL = l
  while (currentL > 0) {
    currentL = Math.max(0, currentL - 0.02)
    const darkened = hslToRgb(h, s, currentL)
    if (contrastRatio(darkened, WHITE) >= MIN_CONTRAST) {
      return `${darkened[0]} ${darkened[1]} ${darkened[2]}`
    }
  }
  // Fallback: gray-900
  return '17 24 39'
}

/** Returns RGB string for a dark footer background derived from primary */
export function computeFooterBg(hex: string): string {
  const [h, s] = hexToHsl(hex)
  const [r, g, b] = hslToRgb(h, s * 0.7, 0.15)
  return `${r} ${g} ${b}`
}
