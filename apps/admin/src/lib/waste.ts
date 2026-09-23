/**
 * Collecte des déchets (handoff 6.13) : une ligne par collecte (type, jour, fréquence, zone), sans
 * brouillon : chaque enregistrement part à la prochaine mise en ligne du site. Les prochains passages
 * sont calculés comme sur le site (@communeo/core).
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import {
  FRENCH_DAYS,
  nextCollections,
  WASTE_FREQUENCIES_WITHOUT_DAY,
  type WasteFrequency,
  type WasteRule,
} from '@communeo/core';
import { api } from './api';

export interface WasteSchedule {
  documentId: string;
  waste_type: string;
  collection_day: string | null;
  frequency: WasteFrequency;
  month_rank: number | null;
  season_start_month: number | null;
  season_end_month: number | null;
  start_date: string | null;
  zone: string | null;
  notes: string | null;
  active: boolean;
}

export type WasteScheduleData = Omit<WasteSchedule, 'documentId'>;

/** Ordre du tableau : celui des types dans la maquette */
export const WASTE_TYPE_ORDER = ['ordures-menageres', 'tri-selectif', 'verre', 'dechets-verts', 'encombrants'];

export const wasteQuery = queryOptions({
  queryKey: ['waste'],
  queryFn: async () => {
    const response = await api<{ data: WasteSchedule[] }>(
      '/api/waste-schedules?pagination[pageSize]=100&sort[0]=createdAt:asc',
    );
    return [...response.data].sort(
      (a, b) => WASTE_TYPE_ORDER.indexOf(a.waste_type) - WASTE_TYPE_ORDER.indexOf(b.waste_type),
    );
  },
});

export const hasDay = (frequency: string) => !WASTE_FREQUENCIES_WITHOUT_DAY.includes(frequency);

/** Prochains passages, calculés comme sur le site */
export function upcoming(
  schedule: Pick<
    WasteSchedule,
    'collection_day' | 'frequency' | 'month_rank' | 'season_start_month' | 'season_end_month' | 'start_date'
  >,
  now = new Date(),
  count = 3,
) {
  const rule: WasteRule = {
    weekday:
      schedule.collection_day && hasDay(schedule.frequency)
        ? FRENCH_DAYS.indexOf(schedule.collection_day as (typeof FRENCH_DAYS)[number])
        : -1,
    frequency: schedule.frequency,
    startDate: schedule.start_date,
    monthRank: schedule.month_rank,
    seasonStart: schedule.season_start_month,
    seasonEnd: schedule.season_end_month,
  };
  return nextCollections(rule, now, count);
}

export async function saveSchedule(documentId: string | null, data: WasteScheduleData): Promise<WasteSchedule> {
  const response = documentId
    ? await api<{ data: WasteSchedule }>(`/api/waste-schedules/${documentId}`, { method: 'PUT', json: { data } })
    : await api<{ data: WasteSchedule }>('/api/waste-schedules', { method: 'POST', json: { data } });
  return response.data;
}

export const deleteSchedule = (documentId: string) => api(`/api/waste-schedules/${documentId}`, { method: 'DELETE' });

/** Le tableau, et l'en-tête « Mettre en ligne » : une collecte modifiée attend la prochaine mise en ligne */
export const refreshWaste = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: ['waste'] }),
    client.invalidateQueries({ queryKey: ['publication'] }),
  ]);
