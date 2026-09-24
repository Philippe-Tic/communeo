/** Pastille de date des événements : « 5 » / « oct. », ou « 6–7 » pour un événement sur plusieurs jours. */
import { TIME_ZONE } from '@communeo/core';

const part = (options: Intl.DateTimeFormatOptions, iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, ...options }).format(new Date(iso));

export function dateBadge(start: string, end?: string | null): { day: string; month: string } {
  const day = part({ day: 'numeric' }, start);
  const month = part({ month: 'short' }, start);
  if (!end) return { day, month };
  const endDay = part({ day: 'numeric' }, end);
  const endMonth = part({ month: 'short' }, end);
  if (endDay === day && endMonth === month) return { day, month };
  return endMonth === month
    ? { day: `${day}–${endDay}`, month }
    : { day: `${day} ${month}`, month: `→ ${endDay} ${endMonth}` };
}
