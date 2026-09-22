/**
 * Horaires d'ouverture structurés (mairie, lieux) : plages par jour et fermetures exceptionnelles.
 * Le statut « ouverte en ce moment » dépend de l'heure du visiteur : il est calculé dans le navigateur
 * (les sites sont statiques), avec les fonctions ci-dessous.
 */
import { z } from 'zod';

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, { long: string; short: string }> = {
  monday: { long: 'lundi', short: 'Lun' },
  tuesday: { long: 'mardi', short: 'Mar' },
  wednesday: { long: 'mercredi', short: 'Mer' },
  thursday: { long: 'jeudi', short: 'Jeu' },
  friday: { long: 'vendredi', short: 'Ven' },
  saturday: { long: 'samedi', short: 'Sam' },
  sunday: { long: 'dimanche', short: 'Dim' },
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timeRangeSchema = z
  .object({ open: z.string().regex(TIME, 'Heure invalide (HH:MM)'), close: z.string().regex(TIME, 'Heure invalide (HH:MM)') })
  .refine((range) => range.open < range.close, { message: "L'heure de fermeture doit être après l'ouverture" });

export const openingHoursSchema = z.object({
  days: z.object(Object.fromEntries(WEEKDAYS.map((day) => [day, z.array(timeRangeSchema).max(4)])) as Record<Weekday, z.ZodArray<typeof timeRangeSchema>>),
  closures: z
    .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), label: z.string().max(120).nullish() }))
    .max(60)
    .default([]),
  note: z.string().max(300).nullish(),
});

export type TimeRange = z.infer<typeof timeRangeSchema>;
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const emptyOpeningHours = (): OpeningHours => ({
  days: Object.fromEntries(WEEKDAYS.map((day) => [day, []])) as unknown as OpeningHours['days'],
  closures: [],
});

/** Heure française lisible : « 09:00 » → « 9h », « 17:30 » → « 17h30 ». */
export const formatTime = (time: string) => {
  const [h, m] = time.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
};

export const formatRanges = (ranges: TimeRange[]) =>
  ranges.map((range) => `${formatTime(range.open)}–${formatTime(range.close)}`).join(' / ');

/**
 * Résumé hebdomadaire : jours consécutifs aux horaires identiques regroupés.
 * Ex. [{ days: 'Lun–Ven', hours: '9h–12h / 14h–17h30' }, { days: 'Sam', hours: '9h–12h' }]
 */
export function summarizeWeek(hours: OpeningHours): { days: string; hours: string }[] {
  const groups: { from: Weekday; to: Weekday; key: string }[] = [];
  for (const day of WEEKDAYS) {
    const ranges = hours.days[day];
    if (!ranges.length) continue;
    const key = formatRanges(ranges);
    const last = groups.at(-1);
    const previousDay = WEEKDAYS[WEEKDAYS.indexOf(day) - 1];
    if (last && last.key === key && last.to === previousDay) last.to = day;
    else groups.push({ from: day, to: day, key });
  }
  return groups.map(({ from, to, key }) => ({
    days: from === to ? WEEKDAY_LABELS[from].short : `${WEEKDAY_LABELS[from].short}–${WEEKDAY_LABELS[to].short}`,
    hours: key,
  }));
}

/** Composantes date/heure dans le fuseau de la commune (Europe/Paris par défaut). */
function zoned(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    weekday: parts.weekday!.toLowerCase() as Weekday,
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export type OpeningStatus =
  | { open: true; closesAt: string }
  | { open: false; closure?: string | null; next?: { day: Weekday; time: string; today: boolean; tomorrow: boolean } };

/** Statut à un instant donné (à appeler dans le navigateur avec `new Date()`). */
export function openingStatusAt(hours: OpeningHours, date: Date, timeZone = 'Europe/Paris'): OpeningStatus {
  const now = zoned(date, timeZone);
  const closure = hours.closures.find((c) => c.date === now.isoDate);
  const todayRanges = closure ? [] : hours.days[now.weekday];

  const current = todayRanges.find((r) => r.open <= now.time && now.time < r.close);
  if (current) return { open: true, closesAt: current.close };

  const laterToday = todayRanges.find((r) => r.open > now.time);
  if (laterToday) return { open: false, closure: closure?.label, next: { day: now.weekday, time: laterToday.open, today: true, tomorrow: false } };

  const start = WEEKDAYS.indexOf(now.weekday);
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = WEEKDAYS[(start + offset) % 7]!;
    const first = hours.days[day][0];
    if (first) return { open: false, closure: closure?.label, next: { day, time: first.open, today: false, tomorrow: offset === 1 } };
  }
  return { open: false, closure: closure?.label };
}

/** Libellé court du statut : « Ouverte · ferme à 12h », « Fermée · ouvre demain à 9h ». */
export function openingStatusLabel(status: OpeningStatus, feminine = true): string {
  const open = feminine ? 'Ouverte' : 'Ouvert';
  const closed = feminine ? 'Fermée' : 'Fermé';
  if (status.open) return `${open} · ferme à ${formatTime(status.closesAt)}`;
  if (!status.next) return closed;
  const when = status.next.today ? '' : status.next.tomorrow ? 'demain ' : `${WEEKDAY_LABELS[status.next.day].long} `;
  return `${closed} · ouvre ${when}à ${formatTime(status.next.time)}`;
}

/** schema.org OpeningHoursSpecification (JSON-LD). */
export function toSchemaOrgOpeningHours(hours: OpeningHours) {
  const dayName = (day: Weekday) => `https://schema.org/${day[0]!.toUpperCase()}${day.slice(1)}`;
  return WEEKDAYS.flatMap((day) =>
    hours.days[day].map((range) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: dayName(day),
      opens: range.open,
      closes: range.close,
    })),
  );
}
