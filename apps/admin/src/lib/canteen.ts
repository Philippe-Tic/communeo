/**
 * Cantine (handoff 6.13) : un menu par semaine (lundi) et par école. Mode détaillé (grille jour ×
 * plat avec labels) ou simple (un PDF ou une image). Pas de brouillon : « Publier la semaine »
 * enregistre, le site est à jour à la prochaine mise en ligne. Un jour sans repas est affiché
 * « Pas de cantine ».
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { CANTEEN_COURSES } from '@communeo/core';
import { api } from './api';
import type { UploadedFile } from './media';

export const MEAL_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const;
export type MealDay = (typeof MEAL_DAYS)[number];
export type CourseKey = (typeof CANTEEN_COURSES)[number]['key'];
export type CourseField = (typeof CANTEEN_COURSES)[number]['field'];
export const LABELS = ['bio', 'local', 'fait-maison', 'vegetarien'] as const;
export type MealLabel = (typeof LABELS)[number];

export interface Meal {
  day: MealDay;
  starter: string | null;
  main_course: string | null;
  side_dish: string | null;
  dairy: string | null;
  dessert: string | null;
  snack: string | null;
  /** Labels par plat : { starter: ['bio'], main: ['vegetarien'] } */
  labels: Partial<Record<CourseKey, MealLabel[]>> | null;
}

export interface SchoolMenu {
  documentId: string;
  week_start: string;
  menu_mode: 'manual' | 'image';
  school_name: string | null;
  meals: Meal[] | null;
  menu_image: UploadedFile | null;
  menu_pdf: UploadedFile | null;
}

/** Semaine en cours d'édition : jours ouverts, plats et labels, ou fichier */
export interface WeekDraft {
  mode: 'manual' | 'image';
  /** Jours avec cantine ; les autres sont « Pas de cantine » */
  open: Record<MealDay, boolean>;
  dishes: Record<MealDay, Record<CourseKey, { dish: string; labels: MealLabel[] }>>;
  file: UploadedFile | null;
}

// --- Semaines ------------------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const isoOf = (time: number) => new Date(time).toISOString().slice(0, 10);
const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));

/** Lundi de la semaine à afficher : la semaine en cours, la suivante le week-end (heure de Paris) */
export function currentMonday(now: Date = new Date()): string {
  const today = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const time = utc(today);
  const weekday = new Date(time).getUTCDay(); // 0 = dimanche
  const offset = weekday === 0 ? 1 : weekday === 6 ? 2 : 1 - weekday;
  return isoOf(time + offset * DAY_MS);
}

export const shiftWeek = (monday: string, weeks: number) => isoOf(utc(monday) + weeks * 7 * DAY_MS);
export const dayDate = (monday: string, index: number) => isoOf(utc(monday) + index * DAY_MS);
export const isMonday = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && new Date(utc(iso)).getUTCDay() === 1;

const monthName = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long' }).format(new Date(utc(iso)));

/** « Semaine du 22 au 26 septembre », « Semaine du 29 septembre au 3 octobre » */
export function weekLabel(monday: string): string {
  const friday = dayDate(monday, 4);
  const [d1, d2] = [Number(monday.slice(8, 10)), Number(friday.slice(8, 10))];
  return monday.slice(5, 7) === friday.slice(5, 7)
    ? `Semaine du ${d1 === 1 ? '1er' : d1} au ${d2} ${monthName(friday)}`
    : `Semaine du ${d1 === 1 ? '1er' : d1} ${monthName(monday)} au ${d2 === 1 ? '1er' : d2} ${monthName(friday)}`;
}

// --- Lecture -------------------------------------------------------------------------------------

const POPULATE = 'populate[meals]=true&populate[menu_image]=true&populate[menu_pdf]=true';

/** Menu d'une semaine et d'une école (`''` : sans nom d'école) */
export const menuQuery = (monday: string, school: string) =>
  queryOptions({
    queryKey: ['canteen', 'week', monday, school],
    queryFn: async () => {
      const filter = school
        ? `filters[school_name][$eq]=${encodeURIComponent(school)}`
        : 'filters[school_name][$null]=true';
      const response = await api<{ data: SchoolMenu[] }>(
        `/api/school-menus?filters[week_start][$eq]=${monday}&${filter}&${POPULATE}`,
      );
      return response.data[0] ?? null;
    },
  });

/** Écoles connues (noms des menus existants) ; `''` quand des menus n'ont pas de nom d'école */
export const schoolsQuery = queryOptions({
  queryKey: ['canteen', 'schools'],
  queryFn: async () => {
    const names = new Set<string>();
    for (let page = 1; ; page += 1) {
      const response = await api<{
        data: Array<{ school_name: string | null }>;
        meta: { pagination: { pageCount: number } };
      }>(`/api/school-menus?fields[0]=school_name&pagination[page]=${page}&pagination[pageSize]=100`);
      for (const menu of response.data) names.add(menu.school_name?.trim() ?? '');
      if (page >= response.meta.pagination.pageCount) break;
    }
    return [...names].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b, 'fr')));
  },
});

// --- Brouillon de la semaine ---------------------------------------------------------------------

const emptyDishes = () =>
  Object.fromEntries(
    CANTEEN_COURSES.map((course) => [course.key, { dish: '', labels: [] as MealLabel[] }]),
  ) as WeekDraft['dishes'][MealDay];

export function toDraft(menu: SchoolMenu | null): WeekDraft {
  const open = Object.fromEntries(
    MEAL_DAYS.map((day) => [day, menu ? !!menu.meals?.some((meal) => meal.day === day) : true]),
  ) as WeekDraft['open'];
  const dishes = Object.fromEntries(
    MEAL_DAYS.map((day) => {
      const meal = menu?.meals?.find((entry) => entry.day === day);
      const courses = emptyDishes();
      for (const course of CANTEEN_COURSES) {
        const raw = meal?.labels;
        // Anciennes données : une liste de labels pour le plat principal
        const labels = Array.isArray(raw) ? (course.key === 'main' ? raw : []) : (raw?.[course.key] ?? []);
        courses[course.key] = {
          dish: (meal?.[course.field] as string | null) ?? '',
          labels: labels.filter((label): label is MealLabel => (LABELS as readonly string[]).includes(label)),
        };
      }
      return [day, courses];
    }),
  ) as WeekDraft['dishes'];
  return { mode: menu?.menu_mode ?? 'manual', open, dishes, file: menu?.menu_pdf ?? menu?.menu_image ?? null };
}

/** Semaine précédente dupliquée : plats, labels et jours fermés repris */
export const duplicateDraft = (previous: SchoolMenu): WeekDraft => ({
  ...toDraft(previous),
  mode: 'manual',
  file: null,
});

export const draftHasContent = (draft: WeekDraft) =>
  draft.mode === 'image'
    ? !!draft.file
    : MEAL_DAYS.some((day) => draft.open[day] && Object.values(draft.dishes[day]).some((course) => course.dish.trim()));

function toMeals(draft: WeekDraft): Meal[] {
  return MEAL_DAYS.filter((day) => draft.open[day]).map((day) => {
    const meal: Meal = {
      day,
      starter: null,
      main_course: null,
      side_dish: null,
      dairy: null,
      dessert: null,
      snack: null,
      labels: {},
    };
    for (const course of CANTEEN_COURSES) {
      const { dish, labels } = draft.dishes[day][course.key];
      meal[course.field as CourseField] = dish.trim() || null;
      if (dish.trim() && labels.length) meal.labels![course.key] = labels;
    }
    return meal;
  });
}

export async function publishWeek(
  existing: SchoolMenu | null,
  monday: string,
  school: string,
  draft: WeekDraft,
): Promise<SchoolMenu> {
  const isImage = draft.file?.mime?.startsWith('image/') ?? false;
  const data = {
    week_start: monday,
    school_name: school || null,
    menu_mode: draft.mode,
    meals: draft.mode === 'manual' ? toMeals(draft) : [],
    menu_pdf: draft.mode === 'image' && draft.file && !isImage ? draft.file.id : null,
    menu_image: draft.mode === 'image' && draft.file && isImage ? draft.file.id : null,
  };
  const response = existing
    ? await api<{ data: SchoolMenu }>(`/api/school-menus/${existing.documentId}`, { method: 'PUT', json: { data } })
    : await api<{ data: SchoolMenu }>('/api/school-menus', { method: 'POST', json: { data } });
  return response.data;
}

export const deleteWeek = (documentId: string) => api(`/api/school-menus/${documentId}`, { method: 'DELETE' });

export const refreshCanteen = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: ['canteen'] }),
    client.invalidateQueries({ queryKey: ['publication'] }),
  ]);
