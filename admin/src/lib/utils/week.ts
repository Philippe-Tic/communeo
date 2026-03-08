/**
 * Retourne le lundi de la semaine pour une date donnée.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Retourne le vendredi à partir d'un lundi.
 */
export function getFriday(monday: Date): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + 4)
  return d
}

/**
 * Formate une plage de semaine : "Semaine du 3 au 7 mars 2025"
 */
export function formatWeekRange(monday: Date): string {
  const friday = getFriday(monday)
  const dayStart = monday.getDate()
  const dayEnd = friday.getDate()
  const monthEnd = friday.toLocaleDateString('fr-FR', { month: 'long' })
  const year = friday.getFullYear()

  if (monday.getMonth() === friday.getMonth()) {
    return `Semaine du ${dayStart} au ${dayEnd} ${monthEnd} ${year}`
  }

  const monthStart = monday.toLocaleDateString('fr-FR', { month: 'long' })
  return `Semaine du ${dayStart} ${monthStart} au ${dayEnd} ${monthEnd} ${year}`
}

/**
 * Formate une date en ISO "YYYY-MM-DD"
 */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
