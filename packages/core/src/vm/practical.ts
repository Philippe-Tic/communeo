import type { Alerte, SchoolMenu, WasteSchedule } from '../generated/strapi';
import { formatDayMonth, formatEventPeriod, isoDay } from '../format';
import type { MapContext } from './context';
import { dateVM } from './content';
import {
  ALERT_SEVERITY_LABELS,
  ALERT_TYPE_LABELS,
  CANTEEN_BADGE_LABELS,
  CANTEEN_COURSES,
  FRENCH_DAYS,
  WASTE_FREQUENCY_LABELS,
  WASTE_TYPES,
} from './labels';
import { mapFile, mapImage, mapLink } from './media';
import type { AlertVM, CanteenDayVM, CanteenWeekVM, WasteCollectionVM } from './types';

// --- Alertes -------------------------------------------------------------------------------------

export function mapAlert(ctx: MapContext, alert: Alerte): AlertVM {
  return {
    id: alert.documentId,
    title: alert.title,
    message: alert.message,
    severity: { key: alert.severity, label: ALERT_SEVERITY_LABELS[alert.severity] },
    type: alert.alert_type ? { key: alert.alert_type, label: ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type } : null,
    link: mapLink(ctx, alert.link_label || 'En savoir plus', alert.link_url),
    area: alert.affected_area?.trim() || null,
    location: alert.location?.trim() || null,
    period: alert.start_date ? formatEventPeriod(alert.start_date, alert.end_date) : null,
    start: alert.start_date ? dateVM(alert.start_date) : null,
    end: alert.end_date ? dateVM(alert.end_date) : null,
    displayUntil: alert.display_until,
  };
}

/** Alertes actives à un instant donné (au build, puis à nouveau dans le navigateur). */
export function isAlertVisible(alert: Pick<Alerte, 'active' | 'display_from' | 'display_until'>, now: Date): boolean {
  if (!alert.active) return false;
  if (alert.display_from && new Date(alert.display_from) > now) return false;
  if (alert.display_until && new Date(alert.display_until) <= now) return false;
  return true;
}

// --- Collecte des déchets ------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const utcDay = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

export type WasteRule = WasteCollectionVM['rule'];

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

export function mapWasteSchedules(schedules: WasteSchedule[], now: Date): WasteCollectionVM[] {
  return schedules
    .filter((schedule) => schedule.active)
    .map((schedule) => {
      const type = WASTE_TYPES[schedule.waste_type] ?? { label: schedule.waste_type, abbreviation: schedule.waste_type.slice(0, 3).toUpperCase() };
      const rule: WasteRule = {
        weekday: FRENCH_DAYS.indexOf(schedule.collection_day),
        frequency: schedule.frequency,
        startDate: schedule.start_date,
      };
      return {
        key: schedule.waste_type,
        label: type.label,
        abbreviation: type.abbreviation,
        day: { key: schedule.collection_day, label: schedule.collection_day },
        frequency: { key: schedule.frequency, label: WASTE_FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency },
        zone: schedule.zone?.trim() || null,
        notes: schedule.notes?.trim() || null,
        rule,
        upcoming: nextCollections(rule, now).map((iso) => dateVM(`${iso}T12:00:00.000Z`)),
      };
    })
    .sort((a, b) => (a.upcoming[0]?.iso ?? '').localeCompare(b.upcoming[0]?.iso ?? ''));
}

// --- Cantine -------------------------------------------------------------------------------------

const MEAL_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const;

/** Labels d'un repas : { main: ['bio'] } par plat, ou une liste appliquée au plat principal. */
function badgesFor(labels: unknown, course: string): string[] {
  const raw = Array.isArray(labels) ? (course === 'main' ? labels : []) : (labels as Record<string, unknown> | null)?.[course];
  return (Array.isArray(raw) ? raw : []).map((badge) => CANTEEN_BADGE_LABELS[String(badge)] ?? String(badge));
}

export function mapCanteenWeek(ctx: MapContext, menu: SchoolMenu): CanteenWeekVM {
  const monday = utcDay(menu.week_start);
  const days: CanteenDayVM[] = MEAL_DAYS.map((day, index) => {
    const iso = `${toIso(monday + index * DAY_MS)}T12:00:00.000Z`;
    const meal = menu.meals?.find((entry) => entry.day === day);
    const courses = meal
      ? CANTEEN_COURSES.flatMap((course) => {
          const dish = (meal[course.field] as string | null)?.trim();
          return dish ? [{ key: course.key, label: course.label, dish, badges: badgesFor(meal.labels, course.key) }] : [];
        })
      : [];
    return { day: { key: day, label: day }, date: dateVM(iso), closed: courses.length === 0, courses };
  });
  const friday = `${toIso(monday + 4 * DAY_MS)}T12:00:00.000Z`;
  const mondayIso = `${menu.week_start}T12:00:00.000Z`;
  const sameMonth = menu.week_start.slice(5, 7) === friday.slice(5, 7);
  return {
    id: menu.documentId,
    start: dateVM(mondayIso),
    label: `Semaine du ${sameMonth ? Number(menu.week_start.slice(8, 10)) : formatDayMonth(mondayIso)} au ${formatDayMonth(friday)}`,
    school: menu.school_name?.trim() || null,
    mode: menu.menu_mode === 'manual' ? 'detailed' : 'file',
    days,
    file: mapFile(ctx, menu.menu_pdf),
    image: mapImage(ctx, menu.menu_image),
  };
}
