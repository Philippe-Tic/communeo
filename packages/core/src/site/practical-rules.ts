/**
 * Règles de vie pratique calculées dans le navigateur (sites statiques) : prochaines collectes,
 * visibilité des alertes. Sans dépendance lourde, exposées via @communeo/core/client.
 */
import { isoDay } from '../format';

export interface WasteRule {
  /** 0 = dimanche … 6 = samedi */
  weekday: number;
  frequency: 'hebdomadaire' | 'bimensuel' | 'mensuel';
  startDate: string | null;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const utcDay = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
export const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

/**
 * Prochains passages à partir d'aujourd'hui (inclus), en jours du calendrier de la commune.
 * - hebdomadaire : chaque semaine le jour indiqué ;
 * - bimensuel : une semaine sur deux, à partir de la date de référence ;
 * - mensuel : le même rang dans le mois que la date de référence (ex. 2e mardi), sinon le premier.
 */
export function nextCollections(rule: WasteRule, now: Date, count = 3): string[] {
  const today = utcDay(isoDay(now));
  const dates: string[] = [];
  const start = rule.startDate ? utcDay(rule.startDate) : null;
  const rank = start !== null ? Math.floor((new Date(start).getUTCDate() - 1) / 7) : 0;

  for (let time = today; dates.length < count && time < today + 400 * DAY_MS; time += DAY_MS) {
    const date = new Date(time);
    if (date.getUTCDay() !== rule.weekday) continue;
    if (start !== null && time < start) continue;
    if (rule.frequency === 'bimensuel' && start !== null && Math.round((time - start) / DAY_MS / 7) % 2 !== 0) continue;
    if (rule.frequency === 'mensuel' && Math.floor((date.getUTCDate() - 1) / 7) !== rank) continue;
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

