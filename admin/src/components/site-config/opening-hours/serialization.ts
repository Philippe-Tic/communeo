import { DAYS, getDefaultWeekSchedule, type DayKey, type DaySchedule, type TimeSlot, type WeekSchedule } from './types'

/** "08:30" → "8h30", "12:00" → "12h" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':')
  const hour = parseInt(h, 10)
  const min = parseInt(m, 10)
  if (min === 0) return `${hour}h`
  return `${hour}h${m}`
}

/** "8h30" → "08:30", "12h" → "12:00" */
export function parseTime(formatted: string): string {
  const match = formatted.match(/^(\d{1,2})h(\d{2})?$/)
  if (!match) return '00:00'
  const hour = match[1].padStart(2, '0')
  const min = match[2] || '00'
  return `${hour}:${min}`
}

function hasSlot(slot: TimeSlot): boolean {
  return slot.start !== '' && slot.end !== '' && slot.start !== slot.end
}

function formatSlot(slot: TimeSlot): string {
  return `${formatTime(slot.start)} - ${formatTime(slot.end)}`
}

export function serializeWeekSchedule(schedule: WeekSchedule): string {
  const result: Record<string, string> = {}
  for (const day of DAYS) {
    const ds = schedule[day]
    if (!ds.open) {
      result[day] = 'Fermé'
      continue
    }
    const hasMorning = hasSlot(ds.morning)
    const hasAfternoon = hasSlot(ds.afternoon)
    if (hasMorning && hasAfternoon) {
      result[day] = `${formatSlot(ds.morning)} / ${formatSlot(ds.afternoon)}`
    } else if (hasMorning) {
      result[day] = formatSlot(ds.morning)
    } else if (hasAfternoon) {
      result[day] = formatSlot(ds.afternoon)
    } else {
      result[day] = 'Fermé'
    }
  }
  return JSON.stringify(result)
}

function parseHoursString(str: string): Pick<DaySchedule, 'open' | 'morning' | 'afternoon'> {
  const trimmed = str.trim()
  if (trimmed.toLowerCase() === 'fermé' || trimmed === '') {
    return { open: false, morning: { start: '08:30', end: '12:00' }, afternoon: { start: '14:00', end: '17:00' } }
  }

  const slots = trimmed.split('/').map((s) => s.trim())
  const morning: TimeSlot = { start: '', end: '' }
  const afternoon: TimeSlot = { start: '', end: '' }

  for (const slot of slots) {
    const timeMatch = slot.match(/(\d{1,2}h\d{0,2})\s*-\s*(\d{1,2}h\d{0,2})/)
    if (!timeMatch) continue
    const start = parseTime(timeMatch[1])
    const end = parseTime(timeMatch[2])
    const startHour = parseInt(start.split(':')[0], 10)
    if (startHour < 13) {
      morning.start = start
      morning.end = end
    } else {
      afternoon.start = start
      afternoon.end = end
    }
  }

  // Fill defaults for empty slots
  if (!morning.start) { morning.start = '08:30'; morning.end = '12:00' }
  if (!afternoon.start) { afternoon.start = '14:00'; afternoon.end = '17:00' }

  return { open: true, morning, afternoon }
}

export function deserializeToWeekSchedule(jsonString: string): WeekSchedule {
  if (!jsonString || jsonString.trim() === '') {
    return getDefaultWeekSchedule()
  }

  try {
    const parsed = JSON.parse(jsonString)
    const schedule = getDefaultWeekSchedule()

    if (Array.isArray(parsed)) {
      // Array format: [{ day: "Lundi", hours: "8h30 - 12h" }]
      for (const entry of parsed) {
        if (!entry?.day || !entry?.hours) continue
        const dayKey = entry.day.toLowerCase() as DayKey
        if (DAYS.includes(dayKey)) {
          const result = parseHoursString(String(entry.hours))
          schedule[dayKey] = { ...result }
        }
      }
    } else if (typeof parsed === 'object') {
      // Object format: { lundi: "8h30 - 12h / 14h - 17h" }
      for (const [key, value] of Object.entries(parsed)) {
        const dayKey = key.toLowerCase() as DayKey
        if (DAYS.includes(dayKey)) {
          const result = parseHoursString(String(value))
          schedule[dayKey] = { ...result }
        }
      }
    }

    return schedule
  } catch {
    return getDefaultWeekSchedule()
  }
}
