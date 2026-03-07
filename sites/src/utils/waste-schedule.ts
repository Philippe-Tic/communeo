import type { WasteSchedule } from '../types/strapi';

export interface WasteTypeInfo {
  label: string;
  color: string;
  emoji: string;
}

export const WASTE_TYPE_CONFIG: Record<string, WasteTypeInfo> = {
  'ordures-menageres': { label: 'Ordures menageres', color: 'bg-gray-100 text-gray-800 border-gray-200', emoji: '🗑️' },
  'tri-selectif': { label: 'Tri selectif', color: 'bg-yellow-50 text-yellow-800 border-yellow-200', emoji: '♻️' },
  'verre': { label: 'Verre', color: 'bg-green-50 text-green-800 border-green-200', emoji: '🫙' },
  'dechets-verts': { label: 'Dechets verts', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', emoji: '🌿' },
  'encombrants': { label: 'Encombrants', color: 'bg-purple-50 text-purple-800 border-purple-200', emoji: '📦' },
};

export const DAY_MAP: Record<string, number> = {
  'dimanche': 0,
  'lundi': 1,
  'mardi': 2,
  'mercredi': 3,
  'jeudi': 4,
  'vendredi': 5,
  'samedi': 6,
};

export const FREQUENCY_LABELS: Record<string, string> = {
  'hebdomadaire': 'Chaque semaine',
  'bimensuel': 'Toutes les 2 semaines',
  'mensuel': 'Une fois par mois',
};

export interface CollectionEvent {
  date: Date;
  wasteType: string;
  typeInfo: WasteTypeInfo;
  zone?: string;
  notes?: string;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

/**
 * Calcule les N prochaines dates de collecte pour un planning donne
 */
export function getNextCollectionDates(schedule: WasteSchedule, count: number = 4, fromDate?: Date): Date[] {
  const dates: Date[] = [];
  const now = fromDate || new Date();
  const targetDay = DAY_MAP[schedule.collection_day];

  // Trouver le prochain jour correspondant
  let current = new Date(now);
  current.setHours(0, 0, 0, 0);

  // Avancer jusqu'au prochain jour de collecte
  while (current.getDay() !== targetDay) {
    current.setDate(current.getDate() + 1);
  }

  // Si c'est aujourd'hui et deja passe, on le garde quand meme (collecte du jour)

  if (schedule.frequency === 'hebdomadaire') {
    for (let i = 0; i < count; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  } else if (schedule.frequency === 'bimensuel') {
    if (schedule.start_date) {
      const startDate = new Date(schedule.start_date);
      const startWeek = getWeekNumber(startDate);
      const startParity = startWeek % 2;

      for (let attempts = 0; dates.length < count && attempts < 60; attempts++) {
        const currentWeek = getWeekNumber(current);
        if (currentWeek % 2 === startParity) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 7);
      }
    } else {
      // Sans date de reference, fallback hebdomadaire
      for (let i = 0; i < count; i++) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 14);
      }
    }
  } else if (schedule.frequency === 'mensuel') {
    if (schedule.start_date) {
      const startDate = new Date(schedule.start_date);
      const targetWeekOfMonth = getWeekOfMonth(startDate);

      for (let monthOffset = 0; dates.length < count && monthOffset < 12; monthOffset++) {
        const checkMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        // Trouver le bon jour dans la bonne semaine du mois
        let day = new Date(checkMonth);
        while (day.getDay() !== targetDay) {
          day.setDate(day.getDate() + 1);
        }
        // Avancer a la bonne semaine
        day.setDate(day.getDate() + (targetWeekOfMonth - 1) * 7);
        // Verifier qu'on est toujours dans le bon mois et dans le futur
        if (day.getMonth() === checkMonth.getMonth() && day >= now) {
          dates.push(new Date(day));
        }
      }
    } else {
      // Sans date de reference, premiere occurrence du jour dans chaque mois
      for (let monthOffset = 0; dates.length < count && monthOffset < 12; monthOffset++) {
        const checkMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
        let day = new Date(checkMonth);
        while (day.getDay() !== targetDay) {
          day.setDate(day.getDate() + 1);
        }
        if (day >= now) {
          dates.push(new Date(day));
        }
      }
    }
  }

  return dates;
}

/**
 * Aggrege toutes les prochaines collectes, triees par date
 */
export function getNextCollections(schedules: WasteSchedule[], count: number = 5): CollectionEvent[] {
  const events: CollectionEvent[] = [];

  for (const schedule of schedules) {
    const typeInfo = WASTE_TYPE_CONFIG[schedule.waste_type] || WASTE_TYPE_CONFIG['ordures-menageres'];
    const dates = getNextCollectionDates(schedule, Math.min(count, 4));

    for (const date of dates) {
      events.push({
        date,
        wasteType: schedule.waste_type,
        typeInfo,
        zone: schedule.zone,
        notes: schedule.notes,
      });
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events.slice(0, count);
}

/**
 * Formate une date de collecte en francais
 */
export function formatCollectionDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
