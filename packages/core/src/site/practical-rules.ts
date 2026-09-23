/**
 * Règles de vie pratique calculées dans le navigateur (sites statiques) : prochaines collectes,
 * visibilité des alertes. Sans dépendance lourde, exposées via @communeo/core/client.
 */
import { isoDay } from '../format';

export type WasteFrequency =
  | 'hebdomadaire'
  | 'semaines-paires'
  | 'semaines-impaires'
  | 'bimensuel'
  | 'mensuel'
  | 'apport-volontaire'
  | 'sur-rendez-vous';

export interface WasteRule {
  /** 0 = dimanche … 6 = samedi ; -1 sans jour (apport volontaire, sur rendez-vous) */
  weekday: number;
  frequency: WasteFrequency;
  startDate: string | null;
  /** Mensuel : 1er … 4e, 5 = dernier du mois (à défaut, le rang de la date de référence) */
  monthRank?: number | null;
  /** Saison (mois 1–12, bornes incluses, peut passer l'année : 11 → 3) */
  seasonStart?: number | null;
  seasonEnd?: number | null;
}

/** Numéro de semaine ISO 8601 (semaines paires / impaires des calendriers de collecte) */
export function isoWeek(time: number): number {
  const date = new Date(time);
  const thursday = time + (3 - ((date.getUTCDay() + 6) % 7)) * DAY_MS;
  const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.floor((thursday - yearStart) / DAY_MS / 7) + 1;
}

export function inSeason(month: number, start?: number | null, end?: number | null): boolean {
  if (!start || !end) return true;
  return start <= end ? month >= start && month <= end : month >= start || month <= end;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const utcDay = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
export const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

/**
 * Prochains passages à partir d'aujourd'hui (inclus), en jours du calendrier de la commune.
 * - hebdomadaire : chaque semaine le jour indiqué ;
 * - bimensuel : une semaine sur deux, à partir de la date de référence ;
 * - semaines paires / impaires : selon le numéro de semaine ISO ;
 * - mensuel : le rang choisi (1er … dernier), sinon celui de la date de référence (ex. 2e mardi) ;
 * - apport volontaire, sur rendez-vous : pas de passage calculé.
 * Hors saison (déchets verts d'avril à novembre), pas de passage.
 */
export function nextCollections(rule: WasteRule, now: Date, count = 3): string[] {
  if (rule.weekday < 0 || rule.frequency === 'apport-volontaire' || rule.frequency === 'sur-rendez-vous') return [];
  const today = utcDay(isoDay(now));
  const dates: string[] = [];
  const start = rule.startDate ? utcDay(rule.startDate) : null;
  const rank = start !== null ? Math.floor((new Date(start).getUTCDate() - 1) / 7) : 0;

  for (let time = today; dates.length < count && time < today + 400 * DAY_MS; time += DAY_MS) {
    const date = new Date(time);
    if (date.getUTCDay() !== rule.weekday) continue;
    if (start !== null && time < start) continue;
    if (rule.frequency === 'bimensuel' && start !== null && Math.round((time - start) / DAY_MS / 7) % 2 !== 0) continue;
    if (rule.frequency === 'semaines-paires' && isoWeek(time) % 2 !== 0) continue;
    if (rule.frequency === 'semaines-impaires' && isoWeek(time) % 2 !== 1) continue;
    if (rule.frequency === 'mensuel') {
      if (rule.monthRank === 5) {
        // Dernier du mois : plus de passage le même jour dans les 7 jours suivants
        if (new Date(time + 7 * DAY_MS).getUTCMonth() === date.getUTCMonth()) continue;
      } else if (Math.floor((date.getUTCDate() - 1) / 7) !== (rule.monthRank ? rule.monthRank - 1 : rank)) continue;
    }
    if (!inSeason(date.getUTCMonth() + 1, rule.seasonStart, rule.seasonEnd)) continue;
    dates.push(toIso(time));
  }
  return dates;
}


/** Alertes actives à un instant donné (au build, puis à nouveau dans le navigateur). */
export function isAlertVisible(alert: { active: boolean; display_from: string | null; display_until: string | null }, now: Date): boolean {
  if (!alert.active) return false;
  if (alert.display_from && new Date(alert.display_from) > now) return false;
  if (alert.display_until && new Date(alert.display_until) <= now) return false;
  return true;
}

