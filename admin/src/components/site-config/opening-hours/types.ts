export interface TimeSlot {
  start: string // "HH:MM"
  end: string   // "HH:MM"
}

export interface DaySchedule {
  open: boolean
  morning: TimeSlot
  afternoon: TimeSlot
}

export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const

export type DayKey = (typeof DAYS)[number]

export type WeekSchedule = Record<DayKey, DaySchedule>

export const DAY_LABELS: Record<DayKey, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
}

const DEFAULT_WEEKDAY: DaySchedule = {
  open: true,
  morning: { start: '08:30', end: '12:00' },
  afternoon: { start: '14:00', end: '17:00' },
}

const DEFAULT_WEEKEND: DaySchedule = {
  open: false,
  morning: { start: '08:30', end: '12:00' },
  afternoon: { start: '14:00', end: '17:00' },
}

export function getDefaultWeekSchedule(): WeekSchedule {
  return {
    lundi: { ...DEFAULT_WEEKDAY, morning: { ...DEFAULT_WEEKDAY.morning }, afternoon: { ...DEFAULT_WEEKDAY.afternoon } },
    mardi: { ...DEFAULT_WEEKDAY, morning: { ...DEFAULT_WEEKDAY.morning }, afternoon: { ...DEFAULT_WEEKDAY.afternoon } },
    mercredi: { ...DEFAULT_WEEKDAY, morning: { ...DEFAULT_WEEKDAY.morning }, afternoon: { ...DEFAULT_WEEKDAY.afternoon } },
    jeudi: { ...DEFAULT_WEEKDAY, morning: { ...DEFAULT_WEEKDAY.morning }, afternoon: { ...DEFAULT_WEEKDAY.afternoon } },
    vendredi: { ...DEFAULT_WEEKDAY, morning: { ...DEFAULT_WEEKDAY.morning }, afternoon: { ...DEFAULT_WEEKDAY.afternoon } },
    samedi: { ...DEFAULT_WEEKEND, morning: { ...DEFAULT_WEEKEND.morning }, afternoon: { ...DEFAULT_WEEKEND.afternoon } },
    dimanche: { ...DEFAULT_WEEKEND, morning: { ...DEFAULT_WEEKEND.morning }, afternoon: { ...DEFAULT_WEEKEND.afternoon } },
  }
}
