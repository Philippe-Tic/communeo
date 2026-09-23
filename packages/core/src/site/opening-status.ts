/**
 * Fonctions pures sur les horaires (sans zod) : utilisables dans le navigateur via @communeo/core/client.
 */
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

export interface TimeRange {
  open: string;
  close: string;
}

export interface OpeningHours {
  days: Record<Weekday, TimeRange[]>;
  /** Fermetures exceptionnelles : un jour (`date`) ou une période (`date` → `end`, inclus) */
  closures: Array<{ date: string; end?: string | null; label?: string | null }>;
  note?: string | null;
}

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

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-01-03 » → « 3 janvier », « 1er janvier » */
export function formatDay(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${day === 1 ? '1er' : day} ${MONTHS[month! - 1]}`;
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
  | {
      open: false;
      closure?: string | null;
      /** `date` (AAAA-MM-JJ) : réouverture à plus d'une semaine, après une fermeture exceptionnelle */
      next?: { day: Weekday; time: string; today: boolean; tomorrow: boolean; date?: string };
    };

/** Fermeture exceptionnelle qui couvre ce jour (AAAA-MM-JJ) */
export const closureOn = (hours: OpeningHours, isoDate: string) =>
  hours.closures.find((closure) => closure.date <= isoDate && isoDate <= (closure.end || closure.date));

/** Jour civil décalé de `offset` jours (calcul sur la date seule, sans effet des changements d'heure) */
function shiftDay(isoDate: string, offset: number): { isoDate: string; weekday: Weekday } {
  const day = new Date(`${isoDate}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return { isoDate: day.toISOString().slice(0, 10), weekday: WEEKDAYS[(day.getUTCDay() + 6) % 7]! };
}

/** Jours examinés pour trouver la réouverture (fermetures de fin d'année comprises) */
const LOOKAHEAD_DAYS = 62;

/** Statut à un instant donné (à appeler dans le navigateur avec `new Date()`). */
export function openingStatusAt(hours: OpeningHours, date: Date, timeZone = 'Europe/Paris'): OpeningStatus {
  const now = zoned(date, timeZone);
  const closure = closureOn(hours, now.isoDate);
  const todayRanges = closure ? [] : hours.days[now.weekday];

  const current = todayRanges.find((r) => r.open <= now.time && now.time < r.close);
  if (current) return { open: true, closesAt: current.close };

  const laterToday = todayRanges.find((r) => r.open > now.time);
  if (laterToday) return { open: false, closure: closure?.label, next: { day: now.weekday, time: laterToday.open, today: true, tomorrow: false } };

  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset += 1) {
    const day = shiftDay(now.isoDate, offset);
    const first = closureOn(hours, day.isoDate) ? undefined : hours.days[day.weekday][0];
    if (first) {
      return {
        open: false,
        closure: closure?.label,
        next: { day: day.weekday, time: first.open, today: false, tomorrow: offset === 1, ...(offset > 6 ? { date: day.isoDate } : {}) },
      };
    }
  }
  return { open: false, closure: closure?.label };
}

/** Libellé court du statut : « Ouverte · ferme à 12h », « Fermée · ouvre demain à 9h ». */
export function openingStatusLabel(status: OpeningStatus, feminine = true): string {
  const open = feminine ? 'Ouverte' : 'Ouvert';
  const closed = feminine ? 'Fermée' : 'Fermé';
  if (status.open) return `${open} · ferme à ${formatTime(status.closesAt)}`;
  if (!status.next) return closed;
  const when = status.next.today
    ? ''
    : status.next.tomorrow
      ? 'demain '
      : status.next.date
        ? `le ${formatDay(status.next.date)} `
        : `${WEEKDAY_LABELS[status.next.day].long} `;
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
