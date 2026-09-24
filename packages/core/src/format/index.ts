/**
 * Formats français partagés par les thèmes : dates, heures, périodes d'événements, fichiers.
 * Toujours dans le fuseau de la commune (Europe/Paris) : un build hors de France ne décale rien.
 */

export const TIME_ZONE = 'Europe/Paris';

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, ...options });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Formate une date en écrivant « 1er » pour le premier jour du mois (« 1er octobre », pas « 1 octobre »). */
const withOrdinal = (options: Intl.DateTimeFormatOptions) => (date: Date) =>
  fmt(options)
    .formatToParts(date)
    .map((part) => (part.type === 'day' && part.value === '1' ? '1er' : part.value))
    .join('');

type DateInput = string | Date;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

/** « 24 juin 2026 », « 1er octobre 2026 » */
export const formatDate = (value: DateInput) => withOrdinal({ day: 'numeric', month: 'long', year: 'numeric' })(toDate(value));

/** « 24 juin » */
export const formatDayMonth = (value: DateInput) => withOrdinal({ day: 'numeric', month: 'long' })(toDate(value));

/** « Samedi 5 octobre 2026 » */
export const formatLongDate = (value: DateInput) =>
  capitalize(withOrdinal({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })(toDate(value)));

/** « jeu. 25 sept. » */
export const formatShortDate = (value: DateInput) =>
  withOrdinal({ weekday: 'short', day: 'numeric', month: 'short' })(toDate(value));

/** Heure française : « 14h », « 14h30 » */
export function formatHour(value: DateInput): string {
  const [h, m] = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(toDate(value)).split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

/** « 2026-10-05 » dans le fuseau de la commune */
export function isoDay(value: DateInput): string {
  const parts = Object.fromEntries(
    fmt({ year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(toDate(value))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Vrai si l'heure est minuit pile : l'événement est alors considéré « sur la journée ». */
const isMidnight = (value: DateInput) => formatHour(value) === '0h';

/**
 * Période d'un événement en toutes lettres :
 * - « Samedi 5 octobre 2026, de 14h à 18h »
 * - « Samedi 5 octobre 2026 à 20h30 »
 * - « Du 12 au 14 juillet 2026 », « Du 30 juin au 2 juillet 2026 »
 */
export function formatEventPeriod(start: DateInput, end?: DateInput | null): string {
  const startDate = toDate(start);
  const endDate = end ? toDate(end) : null;

  if (!endDate || isoDay(startDate) === isoDay(endDate)) {
    const day = formatLongDate(startDate);
    if (isMidnight(startDate) && (!endDate || isMidnight(endDate))) return day;
    if (!endDate || formatHour(endDate) === formatHour(startDate)) return `${day} à ${formatHour(startDate)}`;
    return `${day}, de ${formatHour(startDate)} à ${formatHour(endDate)}`;
  }

  const sameYear = fmt({ year: 'numeric' }).format(startDate) === fmt({ year: 'numeric' }).format(endDate);
  const sameMonth = sameYear && fmt({ month: 'numeric' }).format(startDate) === fmt({ month: 'numeric' }).format(endDate);
  const from = sameMonth
    ? withOrdinal({ day: 'numeric' })(startDate)
    : sameYear
      ? formatDayMonth(startDate)
      : formatDate(startDate);
  return `Du ${from} au ${formatDate(endDate)}`;
}

/** Vrai si l'événement dure plusieurs jours. */
export const isMultiDay = (start: DateInput, end?: DateInput | null) => !!end && isoDay(start) !== isoDay(end);

/** Taille de fichier : « 240 Ko », « 1,2 Mo » (Strapi fournit la taille en Ko). */
export function formatFileSize(sizeInKb: number): string {
  if (sizeInKb < 1) return '1 Ko';
  if (sizeInKb < 1000) return `${Math.round(sizeInKb)} Ko`;
  const mb = sizeInKb / 1000;
  return `${mb.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}

/** Format de fichier lisible depuis l'extension : « .pdf » → « PDF ». */
export const formatFileType = (ext: string | null | undefined) => (ext ?? '').replace(/^\./, '').toUpperCase() || 'Fichier';

/** Libellé de téléchargement accessible : « PDF – 1,2 Mo » */
export const formatFileLabel = (ext: string | null | undefined, sizeInKb: number) => `${formatFileType(ext)} – ${formatFileSize(sizeInKb)}`;
export * from './rgpd';
