/**
 * Dates de l'admin : toujours à l'heure de Paris (les communes sont en France), quel que soit
 * le fuseau du navigateur.
 */
const ZONE = 'Europe/Paris';

/** Instant correspondant à une date (AAAA-MM-JJ) et une heure (HH:MM) à Paris */
export function parisToDate(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [hh, mm] = (time || '00:00').split(':').map(Number) as [number, number];
  // Premier essai en UTC, corrigé du décalage de Paris à cet instant (heure d'été comprise)
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = parisOffsetMinutes(new Date(guess));
  const date = new Date(guess - offset * 60_000);
  const corrected = parisOffsetMinutes(date);
  return corrected === offset ? date : new Date(guess - corrected * 60_000);
}

function parisOffsetMinutes(date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** « vendredi 3 octobre à 9 h 00 » */
export function formatParisDateTime(date: Date): string {
  const day = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const [hour, minute] = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date).split(':');
  return `${day} à ${Number(hour)} h ${minute}`;
}

/** « 3 nov. à 8h » (badges) */
export function formatShortParisDateTime(date: Date): string {
  const day = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, day: 'numeric', month: 'short' }).format(date);
  const [hour, minute] = new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date).split(':');
  return `${day} à ${Number(hour)}h${minute === '00' ? '' : minute}`;
}

/** « il y a 5 s », « il y a 2 min » */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 5) return "à l'instant";
  if (seconds < 60) return `il y a ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)} h`;
}
