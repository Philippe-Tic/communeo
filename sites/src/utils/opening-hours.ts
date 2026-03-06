export interface OpeningHoursEntry {
  day: string
  hours: string
}

function resolveHours(hours: unknown): object | null {
  if (!hours) return null
  if (typeof hours === 'string') {
    try { return JSON.parse(hours) } catch { return null }
  }
  if (typeof hours === 'object') return hours as object
  return null
}

export function getOpeningHoursEntries(hours: unknown): OpeningHoursEntry[] {
  const resolved = resolveHours(hours)
  if (!resolved) return []

  if (!Array.isArray(resolved)) {
    return Object.entries(resolved as Record<string, unknown>).map(([day, h]) => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      hours: String(h),
    }))
  }

  return (resolved as Array<{ day?: string; hours?: string }>)
    .filter((e) => e?.day && e?.hours)
    .map((e) => ({ day: e.day!, hours: e.hours! }))
}

const DAY_TO_SCHEMA: Record<string, string> = {
  lundi: 'Mo',
  mardi: 'Tu',
  mercredi: 'We',
  jeudi: 'Th',
  vendredi: 'Fr',
  samedi: 'Sa',
  dimanche: 'Su',
}

/** "8h30" → "08:30" */
function parseTimeFr(str: string): string {
  const match = str.trim().match(/^(\d{1,2})h(\d{2})?$/)
  if (!match) return str.trim()
  return `${match[1].padStart(2, '0')}:${match[2] || '00'}`
}

/**
 * Converts opening hours to schema.org format.
 * e.g. ["Mo 08:30-12:00 14:00-17:00", "Tu 08:30-12:00"]
 */
export function formatSchemaOrgOpeningHours(hours: unknown): string[] {
  const resolved = resolveHours(hours)
  if (!resolved) return []

  const entries = Array.isArray(resolved)
    ? (resolved as Array<{ day?: string; hours?: string }>)
        .filter((e) => e?.day && e?.hours)
        .map((e) => [e.day!.toLowerCase(), e.hours!] as const)
    : Object.entries(resolved as Record<string, unknown>).map(
        ([day, h]) => [day.toLowerCase(), String(h)] as const,
      )

  const result: string[] = []
  for (const [day, hoursStr] of entries) {
    const schemaDay = DAY_TO_SCHEMA[day]
    if (!schemaDay) continue
    if (hoursStr.toLowerCase() === 'fermé') continue

    const slots = hoursStr.split('/').map((s) => s.trim())
    const timeRanges: string[] = []

    for (const slot of slots) {
      const match = slot.match(/(\d{1,2}h\d{0,2})\s*-\s*(\d{1,2}h\d{0,2})/)
      if (match) {
        timeRanges.push(`${parseTimeFr(match[1])}-${parseTimeFr(match[2])}`)
      }
    }

    if (timeRanges.length > 0) {
      result.push(`${schemaDay} ${timeRanges.join(' ')}`)
    }
  }

  return result
}
