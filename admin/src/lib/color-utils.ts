export const DEFAULT_PRIMARY = '#1e40af'

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [30, 64, 175] // DEFAULT_PRIMARY fallback
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
}

export function hexToRgbString(hex: string): string {
  const [r, g, b] = hexToRgb(hex)
  return `${r} ${g} ${b}`
}

export function rgbStringToHex(rgbStr: string): string {
  const parts = rgbStr.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return DEFAULT_PRIMARY
  return rgbToHex(parts[0], parts[1], parts[2])
}

function linearize(channel: number): number {
  const s = channel / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function wcagLevel(ratio: number): 'AAA' | 'AA' | 'fail' {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  return 'fail'
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255)
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

const MIN_CONTRAST = 4.5

/** Returns hex for text ON a primary-colored background */
export function computeOnPrimaryHex(hex: string): string {
  return contrastRatio(hex, '#ffffff') >= MIN_CONTRAST ? '#ffffff' : '#111827'
}

/** Returns hex for primary-colored text ON a white background */
export function computePrimaryTextHex(hex: string): string {
  if (contrastRatio(hex, '#ffffff') >= MIN_CONTRAST) return hex
  const [h, s, l] = hexToHsl(hex)
  let currentL = l
  while (currentL > 0) {
    currentL = Math.max(0, currentL - 0.02)
    const [r, g, b] = hslToRgb(h, s, currentL)
    const darkened = rgbToHex(r, g, b)
    if (contrastRatio(darkened, '#ffffff') >= MIN_CONTRAST) return darkened
  }
  return '#111827'
}

/** Returns hex for a dark footer background derived from primary */
export function computeFooterBgHex(hex: string): string {
  const [h, s] = hexToHsl(hex)
  const [r, g, b] = hslToRgb(h, s * 0.7, 0.15)
  return rgbToHex(r, g, b)
}
