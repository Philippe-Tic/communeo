export interface OpeningHoursEntry {
  day: string
  hours: string
}

export function getOpeningHoursEntries(hours: unknown): OpeningHoursEntry[] {
  if (!hours || typeof hours !== 'object') return []

  if (!Array.isArray(hours)) {
    return Object.entries(hours as Record<string, unknown>).map(([day, h]) => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      hours: String(h),
    }))
  }

  return (hours as Array<{ day?: string; hours?: string }>)
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
  if (!hours || typeof hours !== 'object') return []

  const entries = Array.isArray(hours)
    ? (hours as Array<{ day?: string; hours?: string }>)
        .filter((e) => e?.day && e?.hours)
        .map((e) => [e.day!.toLowerCase(), e.hours!] as const)
    : Object.entries(hours as Record<string, unknown>).map(
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
