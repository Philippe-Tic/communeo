import type { Alerte, SchoolMenu, WasteSchedule } from '../generated/strapi';
import { formatDayMonth, formatEventPeriod } from '../format';
import { DAY_MS, isAlertVisible, nextCollections, toIso, utcDay, type WasteRule } from '../site/practical-rules';

export { isAlertVisible, nextCollections, type WasteRule };
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

// --- Collecte des déchets ------------------------------------------------------------------------

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
